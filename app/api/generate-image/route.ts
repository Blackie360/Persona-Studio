import { type NextRequest, NextResponse } from "next/server"
import { generateText } from "ai"
import { logGenerationStart, logGenerationComplete } from "@/lib/generation-logger"
import { auth } from "@/lib/auth"
import { getClientIp } from "@/lib/ip"
import { hasReachedLimit, incrementIpGenerationCount, getRemainingGenerations } from "@/lib/redis"

export const dynamic = "force-dynamic"

const MAX_PROMPT_LENGTH = 5000
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

interface GenerateImageResponse {
  url: string
  prompt: string
  description?: string
  remaining?: number
}

interface ErrorResponse {
  error: string
  message?: string
  details?: string
  remaining?: number
}

export async function POST(request: NextRequest) {
  let logId: string | null = null
  try {
    // Get user session and request metadata for logging
    const session = await auth.api.getSession({ headers: request.headers })
    const userId = session?.user?.id || null
    const sessionId = session?.session?.id || null
    const userEmail = session?.user?.email || null
    const ipAddress = getClientIp(request)
    const userAgent = request.headers.get("user-agent") || "unknown"
    const isAuthenticated = !!userId

    // Check IP-based rate limit for unauthenticated users
    if (!isAuthenticated) {
      const reachedLimit = await hasReachedLimit(ipAddress)
      if (reachedLimit) {
        const remaining = await getRemainingGenerations(ipAddress)
        return NextResponse.json<ErrorResponse>(
          {
            error: "Rate limit exceeded",
            message: "You have reached the maximum number of free generations. Please sign up to continue generating images.",
            remaining: remaining,
          },
          { status: 429 },
        )
      }
    }

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

    const model = "google/gemini-3-pro-image-preview"

    // Log generation start
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

    if (mode === "text-to-image") {
      const imageGenerationPrompt = `Generate an image: ${prompt}`

      const result = await generateText({
        model,
        prompt: imageGenerationPrompt,
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

      // Increment IP generation count for unauthenticated users
      let remaining: number | undefined
      if (!isAuthenticated) {
        await incrementIpGenerationCount(ipAddress)
        remaining = await getRemainingGenerations(ipAddress)
      }

      return NextResponse.json<GenerateImageResponse>({
        url: imageUrl,
        prompt: prompt,
        description: result.text || "",
        remaining,
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

      const editingPrompt = hasImage2
        ? `${prompt}. Combine these two images creatively while following the instructions. Generate a new image.`
        : `${prompt}. Edit or transform this image based on the instructions. Generate a new image.`

      contentParts.push({ type: "text", text: editingPrompt })

      const result = await generateText({
        model,
        messages: [
          {
            role: "user",
            content: contentParts,
          },
        ],
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

      // Increment IP generation count for unauthenticated users
      let remaining: number | undefined
      if (!isAuthenticated) {
        await incrementIpGenerationCount(ipAddress)
        remaining = await getRemainingGenerations(ipAddress)
      }

      return NextResponse.json<GenerateImageResponse>({
        url: imageUrl,
        prompt: editingPrompt,
        description: result.text || "",
        remaining,
      })
    } else {
      return NextResponse.json<ErrorResponse>(
        { error: "Invalid mode", details: "Mode must be 'text-to-image' or 'image-editing'" },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("Error in generate-image route:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"

    // Log generation error
    if (logId) {
      await logGenerationComplete(logId, null, "error")
    }

    // Get remaining count for error response if unauthenticated
    let remaining: number | undefined
    const session = await auth.api.getSession({ headers: request.headers })
    const isAuthenticated = !!session?.user?.id
    if (!isAuthenticated) {
      const ipAddress = getClientIp(request)
      remaining = await getRemainingGenerations(ipAddress)
    }

    return NextResponse.json<ErrorResponse>(
      {
        error: "Failed to generate image",
        details: errorMessage,
        remaining,
      },
      { status: 500 },
    )
  }
}
