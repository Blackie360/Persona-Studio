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
  onApiKeyMissing?: () => void
  avatarStyle: string
  background: string
  colorMood: string
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

  const prompt = `Transform this photo into a professional profile picture avatar.

CRITICAL REQUIREMENTS:
- Preserve the person's facial identity, structure, proportions, and expression exactly
- Do NOT change gender, age, ethnicity, or facial features
- The person must remain clearly recognizable

STYLE: ${styleDescriptions[style] || styleDescriptions.linkedin}

BACKGROUND: ${backgroundDescriptions[background] || backgroundDescriptions["studio-neutral"]}

COLOR MOOD: ${colorMoodDescriptions[colorMood] || colorMoodDescriptions.natural}

IMAGE QUALITY:
- Improve lighting, sharpness, and clarity
- Enhance skin tone naturally without over-smoothing
- Maintain realistic textures
- High resolution, clean composition

COMPOSITION:
- Crop to head and shoulders
- Center the subject
- Clean, uncluttered result

${additionalInstructions ? `ADDITIONAL INSTRUCTIONS: ${additionalInstructions}` : ""}

OUTPUT: Single final edited image, professional and visually appealing.`

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
  onApiKeyMissing,
  avatarStyle,
  background,
  colorMood,
}: UseImageGenerationProps) {
  const [selectedGenerationId, setSelectedGenerationId] = useState<string | null>(null)
  const [imageLoaded, setImageLoaded] = useState(false)

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

  const generateImage = async () => {
    const hasImages = useUrls ? image1Url : image1

    if (!hasImages) {
      onToast("Please upload a photo first", "error")
      return
    }

    const fullPrompt = buildAvatarPrompt(avatarStyle, background, colorMood, prompt)

    const generationId = `gen-${Date.now()}-${Math.random().toString(36).substring(7)}`
    const controller = new AbortController()

    const newGeneration: Generation = {
      id: generationId,
      status: "loading",
      progress: 0,
      imageUrl: null,
      prompt: `${avatarStyle} style avatar`,
      timestamp: Date.now(),
      abortController: controller,
      avatarStyle,
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
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))

        if (errorData.error === "Configuration error" && errorData.details?.includes("AI_GATEWAY_API_KEY")) {
          clearInterval(progressInterval)
          setGenerations((prev) => prev.filter((gen) => gen.id !== generationId))
          onApiKeyMissing?.()
          return
        }

        throw new Error(`${errorData.error}${errorData.details ? `: ${errorData.details}` : ""}`)
      }

      const data = await response.json()

      clearInterval(progressInterval)

      if (data.url) {
        const completedGeneration: Generation = {
          id: generationId,
          status: "complete",
          progress: 100,
          imageUrl: data.url,
          prompt: `${avatarStyle} style avatar`,
          timestamp: Date.now(),
          createdAt: new Date().toISOString(),
          aspectRatio: "square",
          mode: "avatar",
          avatarStyle,
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

  return {
    selectedGenerationId,
    setSelectedGenerationId,
    imageLoaded,
    setImageLoaded,
    generateImage,
    cancelGeneration,
    loadGeneratedAsInput,
  }
}
