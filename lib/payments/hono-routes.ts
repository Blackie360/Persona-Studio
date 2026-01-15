import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { nanoid } from "nanoid"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { payment, userCredits } from "@/lib/db/schema"
import { initializeTransaction, verifyWebhookSignature } from "./paystack"
import { eq } from "drizzle-orm"

export const paymentRoutes = new Hono()

// No phone number required - Paystack checkout will collect it
const initiatePaymentSchema = z.object({})

paymentRoutes.post(
  "/initiate",
  zValidator("json", initiatePaymentSchema),
  async (c) => {
    try {
      // Get user session - convert Hono request to headers format
      const headers = new Headers()
      const reqHeaders = c.req.raw.headers
      reqHeaders.forEach((value, key) => {
        headers.set(key, value)
      })

      const session = await auth.api.getSession({ headers })
      const userId = session?.user?.id || null
      const sessionId = session?.session?.id || null
      const userEmail = session?.user?.email || null

      if (!userId) {
        return c.json({ error: "Authentication required" }, 401)
      }

      if (!userEmail) {
        return c.json({ error: "Email required for payment" }, 400)
      }

      const amount = 5 // KES 5
      const generationsGranted = 5

      // Create payment record
      const paymentId = nanoid()
      const paystackReference = `ref_${Date.now()}_${paymentId}`

      // Get base URL for callback
      const origin = c.req.header("origin") || process.env.BETTER_AUTH_URL || "http://localhost:3000"
      const callbackUrl = `${origin}/api/payments/callback`

      await db.insert(payment).values({
        id: paymentId,
        userId,
        sessionId,
        paystackReference,
        phoneNumber: null, // Will be populated from webhook after payment
        amount: amount * 100, // Convert to smallest currency unit
        currency: "KES",
        status: "pending",
        generationsGranted,
        metadata: JSON.stringify({ userEmail }),
      })

      // Initialize Paystack transaction to get checkout URL
      try {
        const paystackResponse = await initializeTransaction({
          email: userEmail,
          amount: amount * 100, // KES 5.00 = 500 in smallest unit
          currency: "KES",
          channels: ["mobile_money"], // Prioritize M-Pesa
          callback_url: callbackUrl,
          metadata: {
            paymentId,
            userId,
            generationsGranted,
          },
        })

        if (!paystackResponse.status) {
          // Update payment status to failed
          await db
            .update(payment)
            .set({ status: "failed", updatedAt: new Date() })
            .where(eq(payment.id, paymentId))

          return c.json(
            {
              error: "Payment initiation failed",
              message: paystackResponse.message,
            },
            400
          )
        }

        // Update payment with Paystack reference
        if (paystackResponse.data.reference !== paystackReference) {
          await db
            .update(payment)
            .set({
              paystackReference: paystackResponse.data.reference,
              updatedAt: new Date(),
            })
            .where(eq(payment.id, paymentId))
        }

        return c.json({
          success: true,
          paymentId,
          authorizationUrl: paystackResponse.data.authorization_url,
          reference: paystackResponse.data.reference,
          message: "Redirecting to Paystack checkout...",
        })
      } catch (error) {
        // Update payment status to failed
        await db
          .update(payment)
          .set({ status: "failed", updatedAt: new Date() })
          .where(eq(payment.id, paymentId))

        console.error("Paystack error:", error)
        return c.json(
          {
            error: "Failed to initiate payment",
            message: error instanceof Error ? error.message : "Unknown error",
          },
          500
        )
      }
    } catch (error) {
      console.error("Payment initiation error:", error)
      return c.json(
        {
          error: "Internal server error",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        500
      )
    }
  }
)

paymentRoutes.get("/callback", async (c) => {
  try {
    const reference = c.req.query("reference")
    
    if (!reference) {
      // Redirect to home page with error
      return c.redirect("/?payment=error&message=Missing reference")
    }

    // Verify payment status
    const { verifyPayment } = await import("./paystack")
    try {
      const verification = await verifyPayment(reference)
      
      if (verification.status && verification.data.status === "success") {
        // Payment successful - redirect to home with success message
        return c.redirect("/?payment=success&reference=" + reference)
      } else {
        // Payment failed or pending
        return c.redirect("/?payment=failed&reference=" + reference)
      }
    } catch (error) {
      console.error("Payment verification error:", error)
      // Still redirect but with error status
      return c.redirect("/?payment=error&reference=" + reference)
    }
  } catch (error) {
    console.error("Callback error:", error)
    return c.redirect("/?payment=error")
  }
})

paymentRoutes.get("/credits", async (c) => {
  try {
    // Get user session
    const headers = new Headers()
    const reqHeaders = c.req.raw.headers
    reqHeaders.forEach((value, key) => {
      headers.set(key, value)
    })

    const session = await auth.api.getSession({ headers })
    const userId = session?.user?.id || null

    if (!userId) {
      return c.json({ error: "Authentication required" }, 401)
    }

    // Get user credits
    const credits = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.userId, userId))
      .limit(1)

    const paidGenerations = credits.length > 0 ? credits[0].paidGenerations : 0

    return c.json({
      paidGenerations,
      hasCredits: paidGenerations > 0,
    })
  } catch (error) {
    console.error("Credits fetch error:", error)
    return c.json(
      {
        error: "Failed to fetch credits",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    )
  }
})

paymentRoutes.post("/webhook", async (c) => {
  try {
    // Get raw body for signature verification
    const rawBody = await c.req.text()
    const signature = c.req.header("x-paystack-signature")

    if (!signature) {
      return c.json({ error: "Missing signature" }, 401)
    }

    // Verify webhook signature
    if (!verifyWebhookSignature(rawBody, signature)) {
      return c.json({ error: "Invalid signature" }, 401)
    }

    const event = JSON.parse(rawBody)

    // Handle charge.success event
    if (event.event === "charge.success") {
      const data = event.data
      const paystackReference = data.reference

      if (!paystackReference) {
        return c.json({ error: "Missing reference" }, 400)
      }

      // Find payment record
      const payments = await db
        .select()
        .from(payment)
        .where(eq(payment.paystackReference, paystackReference))
        .limit(1)

      if (payments.length === 0) {
        console.warn(`Payment not found for reference: ${paystackReference}`)
        return c.json({ error: "Payment not found" }, 404)
      }

      const paymentRecord = payments[0]

      // Skip if already processed
      if (paymentRecord.status === "success") {
        return c.json({ message: "Payment already processed" })
      }

      // Extract phone number from Paystack data if available
      const phoneNumber = data.customer?.phone || data.authorization?.mobile_money?.phone || null

      // Update payment status and phone number
      await db
        .update(payment)
        .set({
          status: "success",
          phoneNumber: phoneNumber || paymentRecord.phoneNumber, // Update if available, keep existing otherwise
          completedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(payment.id, paymentRecord.id))

      // Grant credits to user
      if (paymentRecord.userId) {
        // Check if user already has credits record
        const existingCredits = await db
          .select()
          .from(userCredits)
          .where(eq(userCredits.userId, paymentRecord.userId))
          .limit(1)

        if (existingCredits.length > 0) {
          // Update existing credits
          await db
            .update(userCredits)
            .set({
              paidGenerations:
                existingCredits[0].paidGenerations + paymentRecord.generationsGranted,
              lastUpdated: new Date(),
            })
            .where(eq(userCredits.userId, paymentRecord.userId))
        } else {
          // Create new credits record
          await db.insert(userCredits).values({
            id: nanoid(),
            userId: paymentRecord.userId,
            paidGenerations: paymentRecord.generationsGranted,
            lastUpdated: new Date(),
          })
        }
      }

      return c.json({ message: "Webhook processed successfully" })
    }

    // Handle other events (charge.failed, etc.)
    if (event.event === "charge.failed") {
      const data = event.data
      const paystackReference = data.reference

      if (paystackReference) {
        await db
          .update(payment)
          .set({
            status: "failed",
            updatedAt: new Date(),
          })
          .where(eq(payment.paystackReference, paystackReference))
      }
    }

    return c.json({ message: "Webhook received" })
  } catch (error) {
    console.error("Webhook error:", error)
    return c.json(
      {
        error: "Webhook processing failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    )
  }
})

