/**
 * Normalize thrown values from AI SDK / Gateway into a string safe for JSON `details`.
 * Avoids `"Unknown error occurred"` when the value is not `instanceof Error` but still informative.
 */
export function serializeCaughtError(error: unknown, maxLen = 4000): string {
  if (error == null) {
    return "Unknown error"
  }
  if (typeof error === "string") {
    return error.slice(0, maxLen)
  }
  if (typeof error === "number" || typeof error === "boolean") {
    return String(error).slice(0, maxLen)
  }

  if (error instanceof Error) {
    const msg = error.message?.trim()
    if (msg) {
      return msg.slice(0, maxLen)
    }
    if (error.cause !== undefined) {
      const nested = serializeCaughtError(error.cause, maxLen)
      if (nested && nested !== "Unknown error") {
        return nested.slice(0, maxLen)
      }
    }
    return (error.name || "Error").slice(0, maxLen)
  }

  if (typeof error === "object") {
    const o = error as Record<string, unknown>
    if (typeof o.message === "string" && o.message.trim()) {
      return o.message.trim().slice(0, maxLen)
    }
    if (typeof o.responseBody === "string" && o.responseBody.trim()) {
      return o.responseBody.trim().slice(0, maxLen)
    }
    try {
      const j = JSON.stringify(error)
      if (j && j !== "{}") {
        return j.slice(0, maxLen)
      }
    } catch {
      /* ignore */
    }
  }

  try {
    return String(error).slice(0, maxLen)
  } catch {
    return "Unknown error"
  }
}
