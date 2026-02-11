"use client"

import type React from "react"

import { useState } from "react"
import type { Generation } from "../types"

interface UseImageGenerationProps {
  prompt: string
  aspectRatio: string
  image1: File | null
  image2: File | null
  image1Url: string
  image2Url: string
  useUrls: boolean
  generations: Generation[]
  setGenerations: React.Dispatch<React.SetStateAction<Generation[]>>
  addGeneration: (generation: Generation) => Promise<void>
  onToast: (message: string, type?: "success" | "error") => void
  onImageUpload: (file: File, imageNumber: 1 | 2) => Promise<void>
  avatarStyle: string
  background: string
  colorMood: string
  canGenerate: boolean
  onShowAuthModal: () => void
  decrementOptimistic: () => void
  decrementOptimisticPartial?: () => void
  fetchServerRemaining?: () => Promise<void>
  isAuthenticated: boolean
  canUsePartialRegeneration: boolean
}

const playSuccessSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime)
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.15)
  } catch (error) {
    console.log("Could not play sound:", error)
  }
}

function buildAvatarPrompt(
  style: string,
  background: string,
  colorMood: string,
  additionalInstructions: string,
): string {
  const styleDescriptions: Record<string, string> = {
    corporate: `Professional corporate headshot style.
- Neutral or light studio background
- Business or smart-casual attire appearance
- Soft studio lighting
- Photorealistic, high-end corporate photography look`,
    linkedin: `Clean, modern LinkedIn profile style.
- Friendly and approachable expression
- Subtle depth-of-field background
- Balanced natural lighting
- Photorealistic and polished appearance`,
    anime: `High-quality modern anime illustration style.
- Preserve facial identity and proportions
- Large expressive eyes, clean line art
- Soft shading and vibrant balanced colors
- Smooth anime aesthetic without exaggeration`,
    cyberpunk: `Futuristic cyberpunk portrait style.
- Neon lighting with cyan, purple, blue accents
- Cinematic high-contrast lighting
- Sci-fi atmosphere
- Ultra-detailed, sharp, futuristic look`,
    vintage: `High-quality classic vintage film portrait style.
- Authentic film photography look (1970s-80s portrait or timeless film stock aesthetic)
- Warm, slightly faded color grading with period-appropriate tones
- Subtle film grain and soft, flattering lighting
- Photorealistic with authentic vintage character - no cartoon elements`,
    simpsons: `Classic Simpsons cartoon animation style.
- Distinctive yellow skin tone (Simpsons signature color)
- Bold black outlines around all features
- Simple, flat colors with minimal shading
- Large expressive eyes with small pupils
- Oversized head proportions typical of Simpsons characters
- Clean, cel-shaded animation aesthetic
- No photorealistic elements - pure cartoon style`,
    "family-guy": `Family Guy cartoon animation style.
- Bold, thick black outlines defining all features
- Flat, solid colors with minimal gradient shading
- Slightly exaggerated facial features
- Clean, simplified cartoon aesthetic
- Distinctive animation style with sharp edges
- No photorealistic elements - pure cartoon illustration`,
  }

  const backgroundDescriptions: Record<string, string> = {
    "studio-neutral": "Neutral studio background with professional lighting",
    "studio-light": "Light gray or white studio background",
    "gradient-soft": "Soft gradient background transitioning smoothly",
    "blur-office": "Blurred modern office environment in background",
    "blur-nature": "Blurred natural outdoor setting in background",
    "solid-white": "Clean solid white background",
    "solid-gray": "Solid gray background",
    transparent: "Clean background suitable for transparency",
  }

  const colorMoodDescriptions: Record<string, string> = {
    natural: "Natural, true-to-life color tones",
    warm: "Warm color palette with golden undertones",
    cool: "Cool color palette with blue undertones",
    vibrant: "Vibrant, saturated colors",
    muted: "Muted, subtle color palette",
    "high-contrast": "High contrast with bold colors",
  }

  const isCartoonStyle = style === "simpsons" || style === "family-guy"
  
  const basePrompt = isCartoonStyle
    ? `Transform this photo into a cartoon avatar in the specified style.

CRITICAL REQUIREMENTS:
- Preserve the person's facial identity, structure, proportions, and expression exactly
- Do NOT change gender, age, ethnicity, or facial features
- The person must remain clearly recognizable as the original person
- Convert to pure cartoon illustration style - NO photorealistic elements`

    : `Transform this photo into a professional profile picture avatar.

CRITICAL REQUIREMENTS:
- Preserve the person's facial identity, structure, proportions, and expression exactly
- Do NOT change gender, age, ethnicity, or facial features
- The person must remain clearly recognizable`

  const imageQualitySection = isCartoonStyle
    ? `IMAGE QUALITY:
- Bold, clean outlines defining all features
- Flat colors with minimal shading
- High resolution, crisp cartoon illustration
- Clean composition with sharp edges`
    : `IMAGE QUALITY:
- Improve lighting, sharpness, and clarity
- Enhance skin tone naturally without over-smoothing
- Maintain realistic textures
- High resolution, clean composition`

  const prompt = `${basePrompt}

STYLE: ${styleDescriptions[style] || styleDescriptions.linkedin}

BACKGROUND: ${backgroundDescriptions[background] || backgroundDescriptions["studio-neutral"]}

COLOR MOOD: ${colorMoodDescriptions[colorMood] || colorMoodDescriptions.natural}

${imageQualitySection}

COMPOSITION:
- Crop to head and shoulders
- Center the subject
- Clean, uncluttered result

${additionalInstructions ? `ADDITIONAL INSTRUCTIONS: ${additionalInstructions}` : ""}

OUTPUT: Single final edited image${isCartoonStyle ? ", pure cartoon illustration style" : ", professional and visually appealing"}.`

  return prompt
}

/**
 * Builds a prompt for partial regeneration that only modifies background and lighting/mood
 * while preserving all facial features and characteristics.
 * Used when user wants to save credits by only changing non-face elements.
 *
 * @param background - The background style to apply
 * @param colorMood - The color mood/lighting to apply
 * @param additionalInstructions - Optional additional user instructions
 * @returns Complete prompt string for partial regeneration
 */
function buildPartialRegenerationPrompt(
  background: string,
  colorMood: string,
  additionalInstructions: string,
): string {
  const backgroundDescriptions: Record<string, string> = {
    "studio-neutral": "Neutral studio background with professional lighting",
    "studio-light": "Light gray or white studio background",
    "gradient-soft": "Soft gradient background transitioning smoothly",
    "blur-office": "Blurred modern office environment in background",
    "blur-nature": "Blurred natural outdoor setting in background",
    "solid-white": "Clean solid white background",
    "solid-gray": "Solid gray background",
    transparent: "Clean background suitable for transparency",
  }

  const colorMoodDescriptions: Record<string, string> = {
    natural: "Natural, true-to-life color tones",
    warm: "Warm color palette with golden undertones",
    cool: "Cool color palette with blue undertones",
    vibrant: "Vibrant, saturated colors",
    muted: "Muted, subtle color palette",
    "high-contrast": "High contrast with bold colors",
  }

  const prompt = `Transform this photo by ONLY changing the background and adjusting lighting/mood.

CRITICAL REQUIREMENTS - FACE PRESERVATION:
- Keep the person's face, facial features, expression, and identity COMPLETELY UNCHANGED
- Do NOT modify hair, skin tone, age, gender, ethnicity, or any facial characteristics
- The person must remain EXACTLY recognizable as the original
- ONLY modify background and lighting/mood

BACKGROUND CHANGE: ${backgroundDescriptions[background] || backgroundDescriptions["studio-neutral"]}

LIGHTING/MOOD ADJUSTMENT: ${colorMoodDescriptions[colorMood] || colorMoodDescriptions.natural}

IMAGE QUALITY:
- Maintain natural skin texture and facial details
- Adjust overall lighting to match the selected mood
- Ensure smooth integration between subject and new background
- High resolution, clean composition

COMPOSITION:
- Keep the same framing and subject positioning
- Maintain head and shoulders crop
- Clean, professional result

${additionalInstructions ? `ADDITIONAL INSTRUCTIONS: ${additionalInstructions}` : ""}

OUTPUT: Single final edited image with new background and adjusted lighting, preserving all facial features.`

  return prompt
}

export function useImageGeneration({
  prompt,
  aspectRatio,
  image1,
  image2,
  image1Url,
  image2Url,
  useUrls,
  generations,
  setGenerations,
  addGeneration,
  onToast,
  onImageUpload,
  avatarStyle,
  background,
  colorMood,
  canGenerate,
  onShowAuthModal,
  decrementOptimistic,
  decrementOptimisticPartial,
  fetchServerRemaining,
  isAuthenticated,
  canUsePartialRegeneration,
}: UseImageGenerationProps) {
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)

  const getErrorMessage = async (response: Response, rawBody?: string) => {
    if (response.status === 404) {
      return "Image not found. Please re-upload the photo and try again."
    }

    if (rawBody) {
      try {
        const errorData = JSON.parse(rawBody)
        // Prioritize message field, then details, then error
        if (errorData?.message) {
          return errorData.message
        }
        if (errorData?.error || errorData?.details) {
          return `${errorData.error ?? "Request failed"}${errorData.details ? `: ${errorData.details}` : ""}`
        }
      } catch (error) {
        if (rawBody.trim()) return rawBody
      }
    }

    try {
      const errorData = await response.json()
      // Prioritize message field, then details, then error
      if (errorData?.message) {
        return errorData.message
      }
      if (errorData?.error || errorData?.details) {
        return `${errorData.error ?? "Request failed"}${errorData.details ? `: ${errorData.details}` : ""}`
      }
    } catch (error) {
      const text = await response.text().catch(() => "")
      if (text) return text
    }

    return `Request failed with status ${response.status} ${response.statusText}`.trim()
  }

  const cancelGeneration = (generationId: string) => {
    const generation = generations.find((g) => g.id === generationId)
    if (generation?.abortController) {
      generation.abortController.abort()
    }

    setGenerations((prev) =>
      prev.map((gen) =>
        gen.id === generationId && gen.status === "loading"
          ? { ...gen, status: "error" as const, error: "Cancelled by user", progress: 0, abortController: undefined }
          : gen,
      ),
    )
    onToast("Generation cancelled", "error")
  }

  const generateImage = async (
    regenerationType: "full" | "partial" = "full",
    additionalInstructionsOverride?: string,
  ) => {
    const hasImages = useUrls ? image1Url : image1

    if (!hasImages) {
      onToast("Please upload a photo first", "error")
      return
    }

    // Partial regeneration requires authentication and paid credits
    if (regenerationType === "partial" && !canUsePartialRegeneration) {
      onToast("Partial regeneration requires paid credits", "error")
      onShowAuthModal()
      return
    }

    // Check generation limit
    if (!canGenerate) {
      onShowAuthModal()
      return
    }

    // Decrement optimistic count
    // Note: For partial regeneration, credit is already deducted by partialRegeneration()
    // Only deduct for full regeneration to avoid double-charging
    if (regenerationType === "full") {
      decrementOptimistic()
    }

    const additionalInstructions =
      regenerationType === "partial" ? additionalInstructionsOverride ?? prompt : prompt

    const fullPrompt =
      regenerationType === "partial"
        ? buildPartialRegenerationPrompt(background, colorMood, additionalInstructions)
        : buildAvatarPrompt(avatarStyle, background, colorMood, additionalInstructions)

    const generationId = `gen-${Date.now()}-${Math.random().toString(36).substring(7)}`
    const controller = new AbortController()

    const newGeneration: Generation = {
      id: generationId,
      status: "loading",
      progress: 0,
      imageUrl: null,
      prompt: regenerationType === "partial" ? "Partial regeneration" : `${avatarStyle} style avatar`,
      timestamp: Date.now(),
      abortController: controller,
      avatarStyle,
      regenerationType,
    }

    setGenerations((prev) => [newGeneration, ...prev])
    setSelectedGenerationId(generationId)

    const progressInterval = setInterval(() => {
      setGenerations((prev) =>
        prev.map((gen) => {
          if (gen.id === generationId && gen.status === "loading") {
            const next =
              gen.progress >= 98
                ? 98
                : gen.progress >= 96
                  ? gen.progress + 0.2
                  : gen.progress >= 90
                    ? gen.progress + 0.5
                    : gen.progress >= 75
                      ? gen.progress + 0.8
                      : gen.progress >= 50
                        ? gen.progress + 1
                        : gen.progress >= 25
                          ? gen.progress + 1.2
                          : gen.progress + 1.5
            return { ...gen, progress: Math.min(next, 98) }
          }
          return gen
        }),
      )
    }, 100)

    try {
      const formData = new FormData()
      formData.append("mode", "image-editing")
      formData.append("prompt", fullPrompt)
      formData.append("aspectRatio", "square")
      formData.append("avatarStyle", avatarStyle)
      formData.append("background", background)
      formData.append("colorMood", colorMood)
      formData.append("regenerationType", regenerationType)

      if (useUrls) {
        formData.append("image1Url", image1Url)
      } else if (image1) {
        formData.append("image1", image1)
      }

      const response = await fetch("/api/generate-image", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "")
        let errorData: { error?: string; details?: string; message?: string } | null = null
        if (errorBody) {
          try {
            errorData = JSON.parse(errorBody)
          } catch (parseError) {
            errorData = null
          }
        }

        if (errorData?.error === "Configuration error" && errorData.details?.includes("AI_GATEWAY_API_KEY")) {
          clearInterval(progressInterval)
          setGenerations((prev) => prev.filter((gen) => gen.id !== generationId))
          onToast("AI_GATEWAY_API_KEY is not configured. Add the key to continue.", "error")
          return
        }

        // Handle rate limit error specifically
        if (response.status === 429) {
          clearInterval(progressInterval)
          setGenerations((prev) => prev.filter((gen) => gen.id !== generationId))
          const rateLimitMessage = errorData?.message || errorData?.error || "Rate limit exceeded. Please sign up to continue generating images."
          onToast(rateLimitMessage, "error")
          // Re-fetch the actual remaining count from the server
          if (fetchServerRemaining) {
            fetchServerRemaining()
          }
          onShowAuthModal()
          return
        }

        const errorMessage = await getErrorMessage(response, errorBody)
        throw new Error(errorMessage)
      }

      const data = await response.json()

      clearInterval(progressInterval)

      // Re-fetch the remaining count from the server after generation
      if (!isAuthenticated && fetchServerRemaining) {
        fetchServerRemaining()
      }

      if (data.url) {
        const completedGeneration: Generation = {
          id: generationId,
          status: "complete",
          progress: 100,
          imageUrl: data.url,
          prompt: regenerationType === "partial" ? "Partial regeneration" : `${avatarStyle} style avatar`,
          timestamp: Date.now(),
          createdAt: new Date().toISOString(),
          aspectRatio: "square",
          mode: "avatar",
          avatarStyle,
          regenerationType,
        }

        setGenerations((prev) => prev.filter((gen) => gen.id !== generationId))
        await addGeneration(completedGeneration)
      }

      if (selectedGenerationId === generationId) {
        setImageLoaded(true)
      }

      playSuccessSound()
    } catch (error) {
      console.error("Error in generation:", error)
      clearInterval(progressInterval)

      if (error instanceof Error && error.name === "AbortError") {
        return
      }

      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
      setGenerations((prev) => prev.filter((gen) => gen.id !== generationId))
      onToast(`Error: ${errorMessage}`, "error")
    }
  }

  const loadGeneratedAsInput = async () => {
    const selectedGeneration = generations.find((g) => g.id === selectedGenerationId)
    if (!selectedGeneration?.imageUrl) return

    try {
      const response = await fetch(selectedGeneration.imageUrl)
      const blob = await response.blob()
      const file = new File([blob], "generated-avatar.png", { type: "image/png" })

      await onImageUpload(file, 1)
      onToast("Avatar loaded as input", "success")
    } catch (error) {
      console.error("Error loading image as input:", error)
      onToast("Error loading image", "error")
    }
  }

  const partialRegeneration = async (additionalInstructions?: string) => {
    // Check authentication
    if (!isAuthenticated) {
      onShowAuthModal()
      onToast("Please sign in to use partial regeneration", "error")
      return
    }

    // Check if user can use partial regeneration
    if (!canUsePartialRegeneration) {
      onToast("You need at least 0.5 paid credits to use partial regeneration", "error")
      return
    }

    // Ensure there's a generated image to regenerate from
    const selectedGeneration = generations.find((g) => g.id === selectedGenerationId)
    if (!selectedGeneration?.imageUrl) {
      onToast("Please generate an image first before using partial regeneration", "error")
      return
    }

    // Validate that the image is complete (not loading or error)
    if (selectedGeneration.status !== "complete") {
      onToast("Please wait for the current generation to complete", "error")
      return
    }

    try {
      const response = await fetch(selectedGeneration.imageUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`)
      }

      const blob = await response.blob()
      const file = new File([blob], "generated-avatar.png", { type: "image/png" })

      await onImageUpload(file, 1)

      // Decrement partial credit (0.5 credits = 1 unit)
      if (decrementOptimisticPartial) {
        decrementOptimisticPartial()
      }

      // Run generation with partial type
      await generateImage("partial", additionalInstructions)
    } catch (error) {
      console.error("Error in partial regeneration:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      onToast(`Failed to start partial regeneration: ${errorMessage}`, "error")
    }
  }

  return {
    selectedGenerationId,
    setSelectedGenerationId,
    imageLoaded,
    setImageLoaded,
    generateImage,
    cancelGeneration,
    loadGeneratedAsInput,
    partialRegeneration,
  }
}
