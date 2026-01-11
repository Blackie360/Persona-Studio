"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "@/lib/auth-client"

const STORAGE_KEY = "generation_count"
const STORAGE_KEY_AUTH = "generation_count_auth"
const FREE_LIMIT = 2
const AUTH_LIMIT = 3 // Additional generations after authentication
const RESET_DAYS = 7

interface GenerationData {
  count: number
}

interface AuthGenerationData {
  count: number
  userId: string
  timestamp: number
}

export function useGenerationLimit() {
  const { data: session } = useSession()
  const isAuthenticated = !!session?.user
  const userId = session?.user?.id

  const [remaining, setRemaining] = useState<number>(FREE_LIMIT)
  const [usageLoading, setUsageLoading] = useState(false)

  // Load and validate unauthenticated generation count from localStorage
  const loadGenerationCount = useCallback((): GenerationData => {
    if (typeof window === "undefined") {
      return { count: 0 }
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) {
        return { count: 0 }
      }

      const data: GenerationData = JSON.parse(stored)
      // No reset logic - once anonymous users use their 2 generations, they must sign up
      return data
    } catch (error) {
      console.error("Error loading generation count:", error)
      return { count: 0 }
    }
  }, [])

  // Load authenticated generation count from localStorage
  const loadAuthGenerationCount = useCallback((): AuthGenerationData | null => {
    if (typeof window === "undefined" || !userId) {
      return null
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY_AUTH)
      if (!stored) {
        return null
      }

      const data: AuthGenerationData = JSON.parse(stored)
      
      // If user ID changed, reset the count
      if (data.userId !== userId) {
        return null
      }

      const now = Date.now()
      const daysSince = (now - data.timestamp) / (1000 * 60 * 60 * 24)

      // Reset if 7 days have passed
      if (daysSince >= RESET_DAYS) {
        return null
      }

      return data
    } catch (error) {
      console.error("Error loading auth generation count:", error)
      return null
    }
  }, [userId])

  // Save unauthenticated generation count to localStorage
  const saveGenerationCount = useCallback((data: GenerationData) => {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch (error) {
      console.error("Error saving generation count:", error)
    }
  }, [])

  // Save authenticated generation count to localStorage
  const saveAuthGenerationCount = useCallback((data: AuthGenerationData) => {
    if (typeof window === "undefined" || !userId) return
    try {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(data))
    } catch (error) {
      console.error("Error saving auth generation count:", error)
    }
  }, [userId])

  // Initialize remaining count
  useEffect(() => {
    if (isAuthenticated && userId) {
      const authData = loadAuthGenerationCount()
      if (authData) {
        setRemaining(Math.max(0, AUTH_LIMIT - authData.count))
      } else {
        // New authenticated session, reset to full auth limit
        setRemaining(AUTH_LIMIT)
      }
    } else {
      const data = loadGenerationCount()
      setRemaining(Math.max(0, FREE_LIMIT - data.count))
    }
  }, [isAuthenticated, userId, loadGenerationCount, loadAuthGenerationCount])

  // Decrement count optimistically (for UI updates)
  const decrementOptimistic = useCallback(() => {
    setUsageLoading(true)
    
    if (isAuthenticated && userId) {
      const authData = loadAuthGenerationCount()
      const currentCount = authData?.count || 0
      const newCount = currentCount + 1
      const newData: AuthGenerationData = {
        count: newCount,
        userId,
        timestamp: authData?.timestamp || Date.now(),
      }
      saveAuthGenerationCount(newData)
      setRemaining(Math.max(0, AUTH_LIMIT - newCount))
    } else {
      const data = loadGenerationCount()
      const newCount = data.count + 1
      const newData: GenerationData = {
        count: newCount,
      }
      saveGenerationCount(newData)
      setRemaining(Math.max(0, FREE_LIMIT - newCount))
    }
    
    setUsageLoading(false)
  }, [isAuthenticated, userId, loadGenerationCount, loadAuthGenerationCount, saveGenerationCount, saveAuthGenerationCount])

  // Check if user can generate
  const canGenerate = remaining > 0

  return {
    isAuthenticated,
    remaining,
    canGenerate,
    decrementOptimistic,
    usageLoading,
  }
}

