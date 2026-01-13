import { Hono } from "hono"
import { zValidator } from "@hono/zod-validator"
import { z } from "zod"
import { nanoid } from "nanoid"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { payment } from "@/lib/db/schema"
import { initiateSTKPush } from "./paystack"
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

