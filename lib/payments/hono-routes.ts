import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { nanoid } from "nanoid"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { payment, userCredits } from "@/lib/db/schema"
import { initiateSTKPush, verifyWebhookSignature } from "./paystack"
import { eq } from "drizzle-orm"

export const paymentRoutes = new Hono()

// Phone number validation schema (Kenyan format: 254712345678)
const phoneNumberSchema = z
  .string()
  .regex(/^254\d{9}$/, "Phone number must be in format 254712345678")

const initiatePaymentSchema = z.object({
  phoneNumber: phoneNumberSchema,
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
      const userEmail = session?.user?.email || null

      if (!userId) {
        return c.json({ error: "Authentication required" }, 401)
      }

      const { phoneNumber } = c.req.valid("json")
      const amount = 5 // KES 5
      const generationsGranted = 5

      // Create payment record
      const paymentId = nanoid()
      const paystackReference = `ref_${Date.now()}_${paymentId}`

      await db.insert(payment).values({
        id: paymentId,
        userId,
        sessionId,
        paystackReference,
        phoneNumber,
        amount: amount * 100, // Convert to pesewas
        currency: "KES",
        status: "pending",
        generationsGranted,
        metadata: JSON.stringify({ userEmail }),
      })

      // Initiate STK push with Paystack
      try {
        const paystackResponse = await initiateSTKPush({
          phoneNumber,
          amount,
          email: userEmail || undefined,
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

        // Update payment with Paystack reference if different
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
          reference: paystackResponse.data.reference,
          message: "Payment initiated. Please check your phone for M-Pesa prompt.",
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

      // Update payment status
      await db
        .update(payment)
        .set({
          status: "success",
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

