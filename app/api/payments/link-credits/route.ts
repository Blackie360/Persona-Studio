import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { payment, userCredits } from "@/lib/db/schema"
import { eq, and, isNull, inArray } from "drizzle-orm"
import { nanoid } from "nanoid"

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await auth.api.getSession({ headers: request.headers })
    const userId = session?.user?.id || null
    const userEmail = session?.user?.email || null

    if (!userId || !userEmail) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Find all successful payments with this email that don't have a userId (unlinked)
    const unlinkedPayments = await db
      .select()
      .from(payment)
      .where(
        and(
          eq(payment.status, "success"),
          isNull(payment.userId)
        )
      )

    let totalCreditsToAdd = 0
    const paymentIdsToLink: string[] = []

    // Check each payment's metadata for matching email
    for (const paymentRecord of unlinkedPayments) {
      try {
        const metadata = paymentRecord.metadata ? JSON.parse(paymentRecord.metadata) : {}
        const paymentEmail = metadata.userEmail

        if (paymentEmail && paymentEmail.toLowerCase() === userEmail.toLowerCase()) {
          // This payment belongs to this user
          totalCreditsToAdd += paymentRecord.generationsGranted
          paymentIdsToLink.push(paymentRecord.id)
        }
      } catch (error) {
        console.error("Error parsing payment metadata:", error)
        // Continue to next payment
      }
    }

    if (paymentIdsToLink.length === 0) {
      return NextResponse.json({
        success: true,
        creditsLinked: 0,
        message: "No unlinked payments found",
      })
    }

    // Link all payments to this user
    if (paymentIdsToLink.length > 0) {
      await db
        .update(payment)
        .set({
          userId,
          updatedAt: new Date(),
        })
        .where(inArray(payment.id, paymentIdsToLink))
    }

    // Grant credits to user (add to existing, don't replace)
    const existingCredits = await db
      .select()
      .from(userCredits)
      .where(eq(userCredits.userId, userId))
      .limit(1)

    if (existingCredits.length > 0) {
      // Add to existing credits
      await db
        .update(userCredits)
        .set({
          paidGenerations: existingCredits[0].paidGenerations + totalCreditsToAdd,
          lastUpdated: new Date(),
        })
        .where(eq(userCredits.userId, userId))
    } else {
      // Create new credits record
      await db.insert(userCredits).values({
        id: nanoid(),
        userId,
        paidGenerations: totalCreditsToAdd,
        lastUpdated: new Date(),
      })
    }

    return NextResponse.json({
      success: true,
      creditsLinked: totalCreditsToAdd,
      paymentsLinked: paymentIdsToLink.length,
      message: `Successfully linked ${totalCreditsToAdd} generations from ${paymentIdsToLink.length} payment(s)`,
    })
  } catch (error) {
    console.error("Error linking credits:", error)
    return NextResponse.json(
      {
        error: "Failed to link credits",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

