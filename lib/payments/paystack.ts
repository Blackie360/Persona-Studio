/**
 * Paystack API client for M-Pesa STK Push payments
 */

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY
const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY
const PAYSTACK_BASE_URL = "https://api.paystack.co"

if (!PAYSTACK_SECRET_KEY) {
  console.warn("PAYSTACK_SECRET_KEY is not set")
}

export interface InitiateSTKPushRequest {
  phoneNumber: string // Format: 254712345678
  amount: number // Amount in KES (will be converted to pesewas)
  email?: string
  metadata?: Record<string, unknown>
}

export interface InitiateSTKPushResponse {
  status: boolean
  message: string
  data: {
    authorization_url: string
    access_code: string
    reference: string
  }
}

export interface VerifyPaymentResponse {
  status: boolean
  message: string
  data: {
    id: number
    domain: string
    status: "success" | "failed" | "pending" | "reversed"
    reference: string
    amount: number
    currency: string
    customer: {
      id: number
      email: string | null
      phone: string | null
    }
    authorization: {
      authorization_code: string
      bin: string
      last4: string
      exp_month: string
      exp_year: string
      channel: string
      card_type: string
      bank: string
      country_code: string
      brand: string
      reusable: boolean
      signature: string
      account_name: string | null
    }
    paid_at: string | null
    created_at: string
    metadata: Record<string, unknown> | null
  }
}

/**
 * Initiate M-Pesa STK Push payment
 */
export async function initiateSTKPush(
  request: InitiateSTKPushRequest
): Promise<InitiateSTKPushResponse> {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured")
  }

  // Convert amount from KES to pesewas (smallest currency unit)
  // KES 5 = 500 pesewas
  const amountInPesewas = request.amount * 100

  const response = await fetch(`${PAYSTACK_BASE_URL}/charge`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: request.email || `user@example.com`,
      amount: amountInPesewas,
      currency: "KES",
      mobile_money: {
        phone: request.phoneNumber,
        provider: "mpesa",
      },
      metadata: request.metadata || {},
    }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }))
    throw new Error(`Paystack API error: ${error.message || response.statusText}`)
  }

  return response.json()
}

/**
 * Verify payment status using Paystack reference
 */
export async function verifyPayment(reference: string): Promise<VerifyPaymentResponse> {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured")
  }

  const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/verify/${reference}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }))
    throw new Error(`Paystack API error: ${error.message || response.statusText}`)
  }

  return response.json()
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  if (!PAYSTACK_SECRET_KEY || !process.env.PAYSTACK_WEBHOOK_SECRET) {
    console.warn("Webhook secret not configured, skipping signature verification")
    return true // In development, allow without verification
  }

  const crypto = require("crypto")
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_WEBHOOK_SECRET)
    .update(payload)
    .digest("hex")

  return hash === signature
}


