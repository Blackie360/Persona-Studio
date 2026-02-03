import type React from "react"

export interface GeneratedImage {
  url: string
  prompt: string
  description?: string
}

/**
 * Represents a single image generation request and its state
 */
export interface Generation {
  id: string
  status: "loading" | "complete" | "error"
  progress: number
  imageUrl: string | null
  prompt: string
  error?: string
  timestamp: number
  abortController?: AbortController
  thumbnailLoaded?: boolean
  createdAt?: string
  aspectRatio?: string
  mode?: string
  avatarStyle?: string
  /** Type of regeneration: "full" (1 credit) or "partial" (0.5 credits, background/lighting only) */
  regenerationType?: "full" | "partial"
}

export type AspectRatioOption = {
  value: string
  label: string
  ratio: number
  icon: React.ReactNode
}
