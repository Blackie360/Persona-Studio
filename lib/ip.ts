import { type NextRequest } from "next/server"

/**
 * Extracts the client IP address from a Next.js request.
 * Handles proxy headers correctly by checking X-Forwarded-For first,
 * then X-Real-IP, then falling back to the request IP or "unknown".
 */
export function getClientIp(request: NextRequest): string {
  // Check X-Forwarded-For header (first IP in the chain)
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim()
    if (firstIp) {
      return firstIp
    }
  }

  // Check X-Real-IP header
  const realIp = request.headers.get("x-real-ip")
  if (realIp) {
    return realIp.trim()
  }

  // Fallback to request IP (may be undefined in some environments)
  const ip = request.ip
  if (ip) {
    return ip
  }

  // Final fallback
  return "unknown"
}





