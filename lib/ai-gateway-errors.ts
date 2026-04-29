/**
 * Detects Vercel AI Gateway responses where free-tier / abuse restrictions block models.
 */

function appendFromUnknown(parts: string[], err: unknown, depth: number): void {
  if (depth > 10 || err == null) return
  if (typeof err === "string") {
    parts.push(err)
    return
  }
  if (err instanceof Error) {
    parts.push(err.message)
    if (err.cause !== undefined) appendFromUnknown(parts, err.cause, depth + 1)
    return
  }
  if (typeof err === "object") {
    const o = err as Record<string, unknown>
    if (typeof o.message === "string") parts.push(o.message)
    if (typeof o.responseBody === "string") parts.push(o.responseBody)
    if (o.cause !== undefined) appendFromUnknown(parts, o.cause, depth + 1)
  }
}

export function collectAiGatewayErrorText(error: unknown): string {
  const parts: string[] = []
  appendFromUnknown(parts, error, 0)
  return parts.join(" ")
}

export function isAiGatewayCreditRestriction(error: unknown): boolean {
  const text = collectAiGatewayErrorText(error).toLowerCase()
  if (!text) return false
  if (text.includes("free credits temporarily")) return true
  if (text.includes("restrictedmodelserror")) return true
  if (text.includes("restricted access due to abuse")) return true
  if (text.includes("no_providers_available") && text.includes("gateway")) return true
  return false
}
