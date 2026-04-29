/**
 * AI Gateway occasionally returns response shapes where `warnings[]` does not match
 * the AI SDK schema; validation throws ZodError even when `images[]` succeeded.
 * Depth-first scan of the error tree for successful image payloads.
 */
export function recoverGatewayImagesFromValidationError(error: unknown): Array<{
  base64: string
  mediaType: string
}> | null {
  const seen = new Set<unknown>()

  function getInspectableValues(obj: object): unknown[] {
    const values: unknown[] = []

    for (const key of Object.getOwnPropertyNames(obj)) {
      try {
        values.push((obj as Record<string, unknown>)[key])
      } catch {
        /* Some SDK error objects expose throwing getters. */
      }
    }

    for (const symbol of Object.getOwnPropertySymbols(obj)) {
      try {
        values.push((obj as Record<symbol, unknown>)[symbol])
      } catch {
        /* ignore */
      }
    }

    return values
  }

  function looksLikeBase64Payload(value: string): boolean {
    if (value.length < 100) return false
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return false
    if (value.length % 4 === 1) return false
    return true
  }

  function mediaTypeForBase64(value: string): string {
    if (value.startsWith("/9j/")) return "image/jpeg"
    if (value.startsWith("UklGR")) return "image/webp"
    if (value.startsWith("R0lGOD")) return "image/gif"
    return "image/png"
  }

  function extractFromImagesArray(candidate: unknown): Array<{ base64: string; mediaType: string }> | null {
    if (!Array.isArray(candidate) || candidate.length === 0) return null
    const out: Array<{ base64: string; mediaType: string }> = []
    for (const item of candidate) {
      if (typeof item === "string" && looksLikeBase64Payload(item)) {
        out.push({
          base64: item,
          mediaType: mediaTypeForBase64(item),
        })
        continue
      }

      if (
        item &&
        typeof item === "object" &&
        typeof (item as { base64?: unknown }).base64 === "string"
      ) {
        const base64 = (item as { base64: string }).base64
        if (!looksLikeBase64Payload(base64)) continue

        const mediaType =
          typeof (item as { mediaType?: unknown }).mediaType === "string"
            ? (item as { mediaType: string }).mediaType
            : mediaTypeForBase64(base64)

        out.push({
          base64,
          mediaType,
        })
      }
    }
    return out.length > 0 ? out : null
  }

  function scan(obj: unknown, depth: number): Array<{ base64: string; mediaType: string }> | null {
    if (depth > 28 || obj == null) return null

    if (typeof obj !== "object") return null

    if (seen.has(obj)) return null
    seen.add(obj)

    if (Array.isArray(obj)) {
      for (const el of obj) {
        const found = scan(el, depth + 1)
        if (found) return found
      }
      return null
    }

    if (ArrayBuffer.isView(obj) || obj instanceof ArrayBuffer) return null

    const record = obj as Record<string, unknown>

    const direct = extractFromImagesArray(record.images)
    if (direct) return direct

    for (const v of getInspectableValues(obj)) {
      const found = scan(v, depth + 1)
      if (found) return found
    }

    return null
  }

  return scan(error, 0)
}
