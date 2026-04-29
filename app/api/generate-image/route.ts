import { type NextRequest, NextResponse } from "next/server"
import { generateImage, generateText } from "ai"
import { logGenerationStart, logGenerationComplete, hasReachedLimit } from "@/lib/generation-logger"
import { auth } from "@/lib/auth"
import { getClientIp } from "@/lib/ip"
import { isAiGatewayCreditRestriction } from "@/lib/ai-gateway-errors"
import { serializeCaughtError } from "@/lib/serialize-caught-error"
import {
  gatewayImageAspectRatio,
  getAiGatewayImageModel,
  usesAiSdkGenerateImage,
} from "@/lib/ai-gateway-image-model"
import { recoverGatewayImagesFromValidationError } from "@/lib/recover-gateway-image-result"
import { isPaymentGatewayDisabled } from "@/lib/payment-gateway-flag"

export const dynamic = "force-dynamic"

const MAX_PROMPT_LENGTH = 5000
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

interface GenerateImageResponse {
  url: string
  prompt: string
  description?: string
}

interface ErrorResponse {
  /** Stable code for clients (e.g. gateway_credit_restricted) */
  error: string
  message?: string
  details?: string
}

function gatewayUsageOptions(userId: string | null) {
  return {
    gateway: {
      ...(userId ? { user: userId } : {}),
      tags: ["persona-studio:avatar"],
    },
  }
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  return (
    value !== null &&
    (typeof value === "object" || typeof value === "function") &&
    typeof (value as { then?: unknown }).then === "function"
  )
}

async function resolveCaughtError(error: unknown): Promise<unknown> {
  if (!isThenable(error)) return error

  try {
    return await error
  } catch (resolvedError) {
    return resolvedError
  }
}

/** Gateway sometimes returns valid images while `warnings[]` fails AI SDK Zod validation — recover pixels from the thrown error tree. */
async function generateImageOrRecover(options: Parameters<typeof generateImage>[0]) {
  try {
    return await generateImage(options)
  } catch (error) {
    const resolvedError = await resolveCaughtError(error)
    const recovered =
      recoverGatewayImagesFromValidationError(resolvedError) ??
      recoverGatewayImagesFromValidationError(error)
    if (!recovered?.length) throw resolvedError
    console.warn(
      "[generate-image] Gateway returned images but AI SDK rejected the response (warnings schema). Using recovered pixels.",
    )
    const images = recovered.map((img) => ({
      base64: img.base64,
      mediaType: img.mediaType,
      uint8Array: Buffer.from(img.base64, "base64"),
    }))
    return { images }
  }
}

export async function POST(request: NextRequest) {
  let logId: string | null = null
  try {
    // Get user session and request metadata for logging
    const session = await auth.api.getSession({ headers: request.headers })
    const userId = session?.user?.id || null
    const sessionId = session?.session?.id || null
    const ipAddress = getClientIp(request)
    const userAgent = request.headers.get("user-agent") || "unknown"
    const isAuthenticated = !!userId

    const formData = await request.formData()
    const mode = formData.get("mode") as string
    const prompt = formData.get("prompt") as string
    const aspectRatio = formData.get("aspectRatio") as string || "square"
    const avatarStyle = formData.get("avatarStyle") as string || null
    const background = formData.get("background") as string || null
    const colorMood = formData.get("colorMood") as string || null
    const regenerationType = (formData.get("regenerationType") as string) || "full"

    if (!mode) {
      return NextResponse.json<ErrorResponse>({ error: "Mode is required" }, { status: 400 })
    }

    if (!prompt?.trim()) {
      return NextResponse.json<ErrorResponse>({ error: "Prompt is required" }, { status: 400 })
    }

    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json<ErrorResponse>(
        { error: `Prompt too long. Maximum ${MAX_PROMPT_LENGTH} characters allowed.` },
        { status: 400 },
      )
    }

    const model = getAiGatewayImageModel()

    // Insert a "loading" row first to reserve a slot, then check the limit.
    // This prevents concurrent requests from all passing the check before
    // any of them are visible in the count.
    logId = await logGenerationStart({
      userId,
      sessionId: sessionId || undefined,
      prompt,
      avatarStyle: avatarStyle || undefined,
      background: background || undefined,
      colorMood: colorMood || undefined,
      regenerationType: regenerationType || undefined,
      ipAddress,
      userAgent,
    })

    // Enforce free generation limit for unauthenticated users.
    // The count now includes this request's "loading" row, so concurrent
    // requests will see it and be correctly rejected.
    if (!isAuthenticated && !isPaymentGatewayDisabled()) {
      const reachedLimit = await hasReachedLimit(ipAddress)
      if (reachedLimit) {
        // Mark the reserved row as an error so it doesn't permanently
        // consume a slot
        if (logId) {
          await logGenerationComplete(logId, null, "error")
        }
        return NextResponse.json<ErrorResponse>(
          {
            error: "Rate limit exceeded",
            message: "You have reached the maximum number of free generations. Please sign up to continue generating images.",
          },
          { status: 429 },
        )
      }
    }

    if (mode === "text-to-image") {
      const imageGenerationPrompt = `Generate an image: ${prompt}`
      const aspect = gatewayImageAspectRatio(aspectRatio)

      if (usesAiSdkGenerateImage(model)) {
        const imgResult = await generateImageOrRecover({
          model,
          prompt: imageGenerationPrompt,
          aspectRatio: aspect,
          providerOptions: gatewayUsageOptions(userId),
        })

        const firstImage = imgResult.images[0]
        if (!firstImage) {
          return NextResponse.json<ErrorResponse>(
            { error: "No image generated", details: "The model did not return any images" },
            { status: 500 },
          )
        }

        const imageUrl = `data:${firstImage.mediaType};base64,${firstImage.base64}`

        if (logId) {
          await logGenerationComplete(logId, imageUrl, "complete")
        }

        return NextResponse.json<GenerateImageResponse>({
          url: imageUrl,
          prompt: prompt,
          description: "",
        })
      }

      const result = await generateText({
        model,
        prompt: imageGenerationPrompt,
        providerOptions: gatewayUsageOptions(userId),
      })

      const imageFiles = result.files?.filter((f) => f.mediaType?.startsWith("image/")) || []

      if (imageFiles.length === 0) {
        return NextResponse.json<ErrorResponse>(
          { error: "No image generated", details: "The model did not return any images" },
          { status: 500 },
        )
      }

      const firstImage = imageFiles[0]
      const imageUrl = `data:${firstImage.mediaType};base64,${firstImage.base64}`

      // Log generation complete
      if (logId) {
        await logGenerationComplete(logId, imageUrl, "complete")
      }

      return NextResponse.json<GenerateImageResponse>({
        url: imageUrl,
        prompt: prompt,
        description: result.text || "",
      })
    } else if (mode === "image-editing") {
      const image1 = formData.get("image1") as File
      const image2 = formData.get("image2") as File
      const image1Url = formData.get("image1Url") as string
      const image2Url = formData.get("image2Url") as string

      const hasImage1 = image1 || image1Url
      const hasImage2 = image2 || image2Url

      if (!hasImage1) {
        return NextResponse.json<ErrorResponse>(
          { error: "At least one image is required for editing mode" },
          { status: 400 },
        )
      }

      if (image1) {
        if (image1.size > MAX_FILE_SIZE) {
          return NextResponse.json<ErrorResponse>(
            { error: `Image 1 too large. Maximum ${MAX_FILE_SIZE / 1024 / 1024}MB allowed.` },
            { status: 400 },
          )
        }
        if (!ALLOWED_IMAGE_TYPES.includes(image1.type)) {
          return NextResponse.json<ErrorResponse>(
            { error: "Image 1 has invalid format. Allowed: JPEG, PNG, WebP, GIF" },
            { status: 400 },
          )
        }
      }

      if (image2) {
        if (image2.size > MAX_FILE_SIZE) {
          return NextResponse.json<ErrorResponse>(
            { error: `Image 2 too large. Maximum ${MAX_FILE_SIZE / 1024 / 1024}MB allowed.` },
            { status: 400 },
          )
        }
        if (!ALLOWED_IMAGE_TYPES.includes(image2.type)) {
          return NextResponse.json<ErrorResponse>(
            { error: "Image 2 has invalid format. Allowed: JPEG, PNG, WebP, GIF" },
            { status: 400 },
          )
        }
      }

      const convertToBase64 = async (source: File | string): Promise<{ base64: string; mediaType: string }> => {
        if (typeof source === "string") {
          // Fetch image from URL with error handling
          let response: Response
          try {
            response = await fetch(source, {
              headers: {
                "User-Agent": "Mozilla/5.0 (compatible; ImageFetcher/1.0)",
              },
            })
          } catch (fetchError) {
            throw new Error(`Failed to fetch image from URL: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}`)
          }

          if (!response.ok) {
            throw new Error(`Failed to fetch image: HTTP ${response.status} ${response.statusText}`)
          }

          const contentType = response.headers.get("content-type") || ""
          
          // Validate content type
          if (!contentType.startsWith("image/")) {
            throw new Error(`Invalid content type: ${contentType}. Expected an image.`)
          }

          // Validate allowed image types
          const isValidType = ALLOWED_IMAGE_TYPES.some(type => contentType.includes(type.split("/")[1]))
          if (!isValidType && !contentType.includes("image/jpeg") && !contentType.includes("image/png") && !contentType.includes("image/webp")) {
            throw new Error(`Unsupported image format: ${contentType}. Allowed: JPEG, PNG, WebP, GIF`)
          }

          const arrayBuffer = await response.arrayBuffer()
          
          // Check file size
          if (arrayBuffer.byteLength > MAX_FILE_SIZE) {
            throw new Error(`Image too large: ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(2)}MB. Maximum ${MAX_FILE_SIZE / 1024 / 1024}MB allowed.`)
          }

          // Validate that we actually got image data
          if (arrayBuffer.byteLength === 0) {
            throw new Error("Received empty image data")
          }

          const buffer = Buffer.from(arrayBuffer)
          const base64 = buffer.toString("base64")
          
          // Normalize content type for Gemini API
          let mediaType = contentType
          if (contentType.includes("image/jpeg") || contentType.includes("image/jpg")) {
            mediaType = "image/jpeg"
          } else if (contentType.includes("image/png")) {
            mediaType = "image/png"
          } else if (contentType.includes("image/webp")) {
            mediaType = "image/webp"
          } else if (contentType.includes("image/gif")) {
            mediaType = "image/gif"
          }

          return { base64, mediaType }
        } else {
          const arrayBuffer = await source.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          const base64 = buffer.toString("base64")
          return { base64, mediaType: source.type }
        }
      }

      const image1Data = await convertToBase64(image1 || image1Url)
      const image2Data = hasImage2 ? await convertToBase64(image2 || image2Url) : null

      const editingPrompt = hasImage2
        ? `${prompt}. Combine these two images creatively while following the instructions. Generate a new image.`
        : `${prompt}. Edit or transform this image based on the instructions. Generate a new image.`

      const aspect = gatewayImageAspectRatio(aspectRatio)

      if (usesAiSdkGenerateImage(model)) {
        const dataUrl = (d: { base64: string; mediaType: string }) =>
          `data:${d.mediaType};base64,${d.base64}`

        const promptPayload =
          image2Data !== null
            ? {
                images: [dataUrl(image1Data), dataUrl(image2Data)],
                text: editingPrompt,
              }
            : {
                images: [dataUrl(image1Data)],
                text: editingPrompt,
              }

        const imgResult = await generateImageOrRecover({
          model,
          prompt: promptPayload,
          aspectRatio: aspect,
          providerOptions: gatewayUsageOptions(userId),
        })

        const firstImage = imgResult.images[0]
        if (!firstImage) {
          return NextResponse.json<ErrorResponse>(
            { error: "No image generated", details: "The model did not return any images" },
            { status: 500 },
          )
        }

        const imageUrl = `data:${firstImage.mediaType};base64,${firstImage.base64}`

        if (logId) {
          await logGenerationComplete(logId, imageUrl, "complete")
        }

        return NextResponse.json<GenerateImageResponse>({
          url: imageUrl,
          prompt: editingPrompt,
          description: "",
        })
      }

      const contentParts: Array<{ type: "text"; text: string } | { type: "image"; image: string; mimeType: string }> =
        []

      contentParts.push({
        type: "image",
        image: image1Data.base64,
        mimeType: image1Data.mediaType,
      })

      if (image2Data) {
        contentParts.push({
          type: "image",
          image: image2Data.base64,
          mimeType: image2Data.mediaType,
        })
      }

      contentParts.push({ type: "text", text: editingPrompt })

      const result = await generateText({
        model,
        messages: [
          {
            role: "user",
            content: contentParts,
          },
        ],
        providerOptions: gatewayUsageOptions(userId),
      })

      const imageFiles = result.files?.filter((f) => f.mediaType?.startsWith("image/")) || []

      if (imageFiles.length === 0) {
        return NextResponse.json<ErrorResponse>(
          { error: "No image generated", details: "The model did not return any images" },
          { status: 500 },
        )
      }

      const firstImage = imageFiles[0]
      const imageUrl = `data:${firstImage.mediaType};base64,${firstImage.base64}`

      // Log generation complete
      if (logId) {
        await logGenerationComplete(logId, imageUrl, "complete")
      }

      return NextResponse.json<GenerateImageResponse>({
        url: imageUrl,
        prompt: editingPrompt,
        description: result.text || "",
      })
    } else {
      return NextResponse.json<ErrorResponse>(
        { error: "Invalid mode", details: "Mode must be 'text-to-image' or 'image-editing'" },
        { status: 400 },
      )
    }
  } catch (error) {
    if (logId) {
      await logGenerationComplete(logId, null, "error")
    }

    const resolvedError = await resolveCaughtError(error)

    if (isAiGatewayCreditRestriction(resolvedError)) {
      console.warn(
        "[generate-image] AI Gateway declined request (free tier / credits). Client receives 503 gateway_credit_restricted.",
      )
      return NextResponse.json<ErrorResponse>(
        {
          error: "gateway_credit_restricted",
          message:
            "Vercel AI Gateway has temporarily limited free-tier usage. Add paid AI Gateway credits in your Vercel team, then try again.",
        },
        { status: 503 },
      )
    }

    console.error("Error in generate-image route:", resolvedError)

    return NextResponse.json<ErrorResponse>(
      {
        error: "Failed to generate image",
        details: serializeCaughtError(resolvedError),
      },
      { status: 500 },
    )
  }
}
