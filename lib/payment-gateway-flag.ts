/**
 * When true, skips Paystack-related UX (pricing modal), relaxed generation limits,
 * and IP/user quota enforcement on `/api/generate-image` for local testing.
 *
 * Set in `.env.local`:
 *   NEXT_PUBLIC_DISABLE_PAYMENT_GATEWAY=true
 *
 * (`DISABLE_PAYMENT_GATEWAY=true` is also read on the server.)
 */
export function isPaymentGatewayDisabled(): boolean {
  return (
    process.env.DISABLE_PAYMENT_GATEWAY === "true" ||
    process.env.NEXT_PUBLIC_DISABLE_PAYMENT_GATEWAY === "true"
  )
}
