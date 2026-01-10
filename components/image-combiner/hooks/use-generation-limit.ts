"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "@/lib/auth-client"

const STORAGE_KEY = "generation_count"
const FREE_LIMIT = 2
const RESET_DAYS = 7

interface GenerationData {
  count: number
  timestamp: number
}

export function useGenerationLimit() {
  const { data: session } = useSession()
  const isAuthenticated = !!session?.user

  const [remaining, setRemaining] = useState<number>(FREE_LIMIT)
  const [usageLoading, setUsageLoading] = useState(false)

  // Load and validate generation count from localStorage
  const loadGenerationCount = useCallback((): GenerationData => {
    if (typeof window === "undefined") {
      return { count: 0, timestamp: Date.now() }
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        return { count: 0, timestamp: Date.now() }
      }

      const data: GenerationData = JSON.parse(stored)
      const now = Date.now()
      const daysSince = (now - data.timestamp) / (1000 * 60 * 60 * 24)

      // Reset if 7 days have passed
      if (daysSince >= RESET_DAYS) {
        const resetData = { count: 0, timestamp: now }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(resetData))
        return resetData
      }

      return data
    } catch (error) {
      console.error("Error loading generation count:", error)
      return { count: 0, timestamp: Date.now() }
    }
  }, [])

  // Save generation count to localStorage
  const saveGenerationCount = useCallback((data: GenerationData) => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error("Error saving generation count:", error)
    }
  }, [])

  // Initialize remaining count
  useEffect(() => {
    if (isAuthenticated) {
      // Authenticated users have unlimited generations
      setRemaining(Infinity)
    } else {
      const data = loadGenerationCount()
      setRemaining(Math.max(0, FREE_LIMIT - data.count))
    }
  }, [isAuthenticated, loadGenerationCount])

  // Decrement count optimistically (for UI updates)
  const decrementOptimistic = useCallback(() => {
    if (isAuthenticated) {
      // No limit for authenticated users
      return
    }

    setUsageLoading(true)
    const data = loadGenerationCount()
    const newCount = data.count + 1
    const newData: GenerationData = {
      count: newCount,
      timestamp: data.timestamp, // Keep original timestamp for 7-day reset
    }
    saveGenerationCount(newData)
    setRemaining(Math.max(0, FREE_LIMIT - newCount))
    setUsageLoading(false)
  }, [isAuthenticated, loadGenerationCount, saveGenerationCount])

  // Check if user can generate
  const canGenerate = isAuthenticated || remaining > 0

  return {
    isAuthenticated,
    remaining: isAuthenticated ? Infinity : remaining,
    canGenerate,
    decrementOptimistic,
    usageLoading,
  }
}

