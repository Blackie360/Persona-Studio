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

// Payment schema - accepts optional plan parameters and email for unauthenticated users
const initiatePaymentSchema = z.object({
  amount: z.number().optional(), // Amount in KES (e.g., 5 or 100)
  generationsGranted: z.number().optional(), // Number of generations (e.g., 5 or 20)
  email: z.string().email().optional(), // Email for unauthenticated users
})

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
      const sessionUserEmail = session?.user?.email || null

      // Get request body (validated by zValidator)
      const body = c.req.valid("json")
      const requestEmail = body.email || null
      const requestAmount = body.amount || null
      const requestGenerations = body.generationsGranted || null

      // Determine email - use session email if authenticated, otherwise use provided email
      const userEmail = sessionUserEmail || requestEmail

      if (!userEmail) {
        return c.json({ error: "Email required for payment" }, 400)
      }

      // Determine amount and generations - use provided values or defaults
      let amount: number
      let generationsGranted: number

      if (requestAmount && requestGenerations) {
        // Use provided values
        amount = requestAmount
        generationsGranted = requestGenerations
      } else if (requestAmount === 5 || (!requestAmount && !requestGenerations)) {
        // Default plan: KES 5 for 5 generations
        amount = 5
        generationsGranted = 5
      } else if (requestAmount === 100) {
        // Plan 2: KES 100 for 20 generations
        amount = 100
        generationsGranted = 20
      } else {
        // Fallback to default
        amount = 5
        generationsGranted = 5
      }

      // Create payment record
      const paymentId = nanoid()
      const paystackReference = `ref_${Date.now()}_${paymentId}`

      // Get base URL for callback
      const origin = c.req.header("origin") || process.env.BETTER_AUTH_URL || "http://localhost:3000"
      const callbackUrl = `${origin}/api/payments/callback`

      await db.insert(payment).values({
        id: paymentId,
        userId, // null for unauthenticated users
        sessionId,
        paystackReference,
        phoneNumber: null, // Will be populated from webhook after payment
        amount: amount * 100, // Convert to smallest currency unit
        currency: "KES",
        status: "pending",
        generationsGranted,
        metadata: JSON.stringify({ 
          userEmail,
          isUnauthenticated: !userId,
          amount,
          generationsGranted,
        }),
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
        // Check if payment was made by an unauthenticated user
        const payments = await db
          .select()
          .from(payment)
          .where(eq(payment.paystackReference, reference))
          .limit(1)

        const paymentRecord = payments.length > 0 ? payments[0] : null
        const isUnauthenticated = paymentRecord && !paymentRecord.userId

        if (isUnauthenticated) {
          // Redirect to home with signup prompt
          return c.redirect("/?payment=success&signup=true&reference=" + reference)
        } else {
          // Payment successful - redirect to home with success message
          return c.redirect("/?payment=success&reference=" + reference)
        }
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
      } else {
        // For unauthenticated users, try to link payment to account if user signs up later
        // Extract email from metadata
        try {
          const metadata = paymentRecord.metadata ? JSON.parse(paymentRecord.metadata) : {}
          const paymentEmail = metadata.userEmail

          if (paymentEmail) {
            // Try to find user by email and link credits
            const { user } = await import("@/lib/db/schema")
            const users = await db
              .select()
              .from(user)
              .where(eq(user.email, paymentEmail))
              .limit(1)

            if (users.length > 0) {
              const foundUserId = users[0].id
              
              // Update payment with userId
              await db
                .update(payment)
                .set({ userId: foundUserId, updatedAt: new Date() })
                .where(eq(payment.id, paymentRecord.id))

              // Grant credits to found user
              const existingCredits = await db
                .select()
                .from(userCredits)
                .where(eq(userCredits.userId, foundUserId))
                .limit(1)

              if (existingCredits.length > 0) {
                await db
                  .update(userCredits)
                  .set({
                    paidGenerations:
                      existingCredits[0].paidGenerations + paymentRecord.generationsGranted,
                    lastUpdated: new Date(),
                  })
                  .where(eq(userCredits.userId, foundUserId))
              } else {
                await db.insert(userCredits).values({
                  id: nanoid(),
                  userId: foundUserId,
                  paidGenerations: paymentRecord.generationsGranted,
                  lastUpdated: new Date(),
                })
              }
            }
          }
        } catch (error) {
          console.error("Error linking unauthenticated payment:", error)
          // Continue - credits will be linked when user signs up
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

