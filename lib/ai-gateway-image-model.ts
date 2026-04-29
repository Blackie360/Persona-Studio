/**
 * AI Gateway image model (provider/model slug). Routes through Gateway using
 * AI_GATEWAY_API_KEY or VERCEL_OIDC_TOKEN; BYOK keys configured in the Vercel
 * dashboard apply per provider (e.g. OpenAI keys under openai/* models).
 *
 * Default favors OpenAI image generation when BYOK is attached to OpenAI.
 */
export function getAiGatewayImageModel(): string {
  const raw = process.env.AI_GATEWAY_IMAGE_MODEL?.trim()
  return raw || "openai/gpt-image-1"
}

/** OpenAI image models use AI SDK `generateImage`; Gemini-style ids use `generateText` + files. */
export function usesAiSdkGenerateImage(model: string): boolean {
  return model.startsWith("openai/")
}

export function gatewayImageAspectRatio(formAspectRatio: string): `${number}:${number}` {
  switch (formAspectRatio) {
    case "portrait":
      return "3:4"
    case "landscape":
      return "4:3"
    case "square":
    default:
      return "1:1"
  }
}
