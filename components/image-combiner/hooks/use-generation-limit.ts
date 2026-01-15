"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "@/lib/auth-client"

const STORAGE_KEY = "generation_count"
const STORAGE_KEY_AUTH = "generation_count_auth"
const STORAGE_KEY_PAID_USED = "paid_generations_used"
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
  const [paidGenerations, setPaidGenerations] = useState<number>(0)
  const [paidGenerationsUsed, setPaidGenerationsUsed] = useState<number>(0)

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

  // Fetch paid credits from API
  const fetchPaidCredits = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setPaidGenerations(0)
      return
    }

    try {
      const response = await fetch("/api/payments/credits")
      if (response.ok) {
        const data = await response.json()
        setPaidGenerations(data.paidGenerations || 0)
      }
    } catch (error) {
      console.error("Error fetching paid credits:", error)
    }
  }, [isAuthenticated, userId])

  // Load paid generations used from localStorage
  const loadPaidGenerationsUsed = useCallback((): number => {
    if (typeof window === "undefined" || !userId) {
      return 0
    }

    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PAID_USED}_${userId}`)
      if (!stored) {
        return 0
      }
      return parseInt(stored, 10) || 0
    } catch (error) {
      console.error("Error loading paid generations used:", error)
      return 0
    }
  }, [userId])

  // Save paid generations used to localStorage
  const savePaidGenerationsUsed = useCallback((count: number) => {
    if (typeof window === "undefined" || !userId) return
    try {
      localStorage.setItem(`${STORAGE_KEY_PAID_USED}_${userId}`, count.toString())
    } catch (error) {
      console.error("Error saving paid generations used:", error)
    }
  }, [userId])

  // Initialize remaining count and fetch paid credits
  useEffect(() => {
    if (isAuthenticated && userId) {
      const authData = loadAuthGenerationCount()
      const freeUsed = authData ? authData.count : 0
      const paidUsed = loadPaidGenerationsUsed()
      setPaidGenerationsUsed(paidUsed)
      
      // Fetch paid credits from API
      fetchPaidCredits()
      
      // Calculate remaining: free limit + paid credits - used
      // Will be updated when paidGenerations is fetched
      setRemaining(Math.max(0, AUTH_LIMIT - freeUsed))
    } else {
      const data = loadGenerationCount()
      setRemaining(Math.max(0, FREE_LIMIT - data.count))
      setPaidGenerations(0)
      setPaidGenerationsUsed(0)
    }
  }, [isAuthenticated, userId, loadGenerationCount, loadAuthGenerationCount, loadPaidGenerationsUsed, fetchPaidCredits])

  // Update remaining when paid credits are fetched
  useEffect(() => {
    if (isAuthenticated && userId) {
      const authData = loadAuthGenerationCount()
      const freeUsed = authData ? authData.count : 0
      const availablePaid = Math.max(0, paidGenerations - paidGenerationsUsed)
      setRemaining(Math.max(0, AUTH_LIMIT - freeUsed + availablePaid))
    }
  }, [isAuthenticated, userId, paidGenerations, paidGenerationsUsed, loadAuthGenerationCount])

  // Decrement count optimistically (for UI updates)
  const decrementOptimistic = useCallback(() => {
    setUsageLoading(true)
    
    if (isAuthenticated && userId) {
      const authData = loadAuthGenerationCount()
      const freeUsed = authData?.count || 0
      const paidUsed = paidGenerationsUsed
      
      // Check if we should use free generations first
      if (freeUsed < AUTH_LIMIT) {
        // Use free generation
        const newCount = freeUsed + 1
        const newData: AuthGenerationData = {
          count: newCount,
          userId,
          timestamp: authData?.timestamp || Date.now(),
        }
        saveAuthGenerationCount(newData)
        const availablePaid = Math.max(0, paidGenerations - paidUsed)
        setRemaining(Math.max(0, AUTH_LIMIT - newCount + availablePaid))
      } else {
        // Use paid generation
        const newPaidUsed = paidUsed + 1
        savePaidGenerationsUsed(newPaidUsed)
        setPaidGenerationsUsed(newPaidUsed)
        const availablePaid = Math.max(0, paidGenerations - newPaidUsed)
        setRemaining(Math.max(0, availablePaid))
      }
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
  }, [isAuthenticated, userId, paidGenerations, paidGenerationsUsed, loadGenerationCount, loadAuthGenerationCount, saveGenerationCount, saveAuthGenerationCount, savePaidGenerationsUsed])

  // Check if user can generate
  const canGenerate = remaining > 0

  // Refresh paid credits (useful after payment)
  const refreshCredits = useCallback(async () => {
    await fetchPaidCredits()
  }, [fetchPaidCredits])

  return {
    isAuthenticated,
    remaining,
    canGenerate,
    decrementOptimistic,
    usageLoading,
    paidGenerations,
    refreshCredits,
  }
}

