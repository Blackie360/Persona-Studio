"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "@/lib/auth-client"

const STORAGE_KEY = "generation_count"
const STORAGE_KEY_AUTH = "generation_count_auth"
const STORAGE_KEY_PAID_USED = "paid_generations_used"
const STORAGE_KEY_PAID_UNITS_USED = "paid_generation_units_used"
const FREE_LIMIT = 2
const AUTH_LIMIT = 3 // Additional generations after authentication
const RESET_DAYS = 7
const UNITS_PER_CREDIT = 2 // 2 units = 1 credit, allows 0.5 credit (1 unit) for partial regen
const FULL_GENERATION_UNITS = 2 // 1 full credit = 2 units
const PARTIAL_GENERATION_UNITS = 1 // 0.5 credits = 1 unit

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
  const [paidUnitsUsed, setPaidUnitsUsed] = useState<number>(0)
  const [serverRemaining, setServerRemaining] = useState<number | null>(null)

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

  // Fetch remaining generations from server for unauthenticated users
  const fetchServerRemaining = useCallback(async () => {
    if (isAuthenticated) {
      return // Authenticated users use different logic
    }

    try {
      const response = await fetch("/api/generation-usage")
      if (response.ok) {
        const data = await response.json()
        // Ignore 999 value (placeholder for authenticated users)
        // This prevents showing 999 briefly when session hasn't loaded yet
        if (data.remaining === 999) {
          // Fallback to localStorage if we get the placeholder value
          const localData = loadGenerationCount()
          const calculatedRemaining = Math.max(0, FREE_LIMIT - localData.count)
          setServerRemaining(calculatedRemaining)
          setRemaining(calculatedRemaining)
        } else {
          setServerRemaining(data.remaining ?? FREE_LIMIT)
          setRemaining(data.remaining ?? FREE_LIMIT)
        }
      }
    } catch (error) {
      console.error("Error fetching server remaining:", error)
      // Fallback to localStorage on error
      const data = loadGenerationCount()
      setRemaining(Math.max(0, FREE_LIMIT - data.count))
    }
  }, [isAuthenticated, loadGenerationCount])

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

  // Load paid generation units used from localStorage
  const loadPaidUnitsUsed = useCallback((): number => {
    if (typeof window === "undefined" || !userId) {
      return 0
    }

    try {
      const stored = localStorage.getItem(`${STORAGE_KEY_PAID_UNITS_USED}_${userId}`)
      if (!stored) {
        return 0
      }
      return parseInt(stored, 10) || 0
    } catch (error) {
      console.error("Error loading paid units used:", error)
      return 0
    }
  }, [userId])

  // Save paid generation units used to localStorage
  const savePaidUnitsUsed = useCallback((units: number) => {
    if (typeof window === "undefined" || !userId) return
    try {
      localStorage.setItem(`${STORAGE_KEY_PAID_UNITS_USED}_${userId}`, units.toString())
    } catch (error) {
      console.error("Error saving paid units used:", error)
    }
  }, [userId])

  // Initialize remaining count and fetch paid credits
  useEffect(() => {
    if (isAuthenticated && userId) {
      const authData = loadAuthGenerationCount()
      const freeUsed = authData ? authData.count : 0
      const paidUsed = loadPaidGenerationsUsed()
      const unitsUsed = loadPaidUnitsUsed()
      setPaidGenerationsUsed(paidUsed)
      setPaidUnitsUsed(unitsUsed)
      
      // Fetch paid credits from API
      fetchPaidCredits()
      
      // Calculate remaining: free limit + paid credits - used
      // Will be updated when paidGenerations is fetched
      setRemaining(Math.max(0, AUTH_LIMIT - freeUsed))
    } else {
      // For unauthenticated users, fetch from server (IP-based limit)
      fetchServerRemaining()
      setPaidGenerations(0)
      setPaidGenerationsUsed(0)
      setPaidUnitsUsed(0)
    }
  }, [isAuthenticated, userId, loadGenerationCount, loadAuthGenerationCount, loadPaidGenerationsUsed, loadPaidUnitsUsed, fetchPaidCredits, fetchServerRemaining])

  // Update remaining when paid credits are fetched
  useEffect(() => {
    if (isAuthenticated && userId) {
      const authData = loadAuthGenerationCount()
      const freeUsed = authData ? authData.count : 0
      // Calculate available paid credits in terms of units (2 units = 1 credit)
      const totalPaidUnits = paidGenerations * UNITS_PER_CREDIT
      const availablePaidUnits = Math.max(0, totalPaidUnits - paidUnitsUsed)
      // Convert units back to fractional credits for display
      const availablePaidCredits = availablePaidUnits / UNITS_PER_CREDIT
      setRemaining(Math.max(0, AUTH_LIMIT - freeUsed + availablePaidCredits))
    }
  }, [isAuthenticated, userId, paidGenerations, paidUnitsUsed, loadAuthGenerationCount])

  // Decrement count optimistically (for UI updates) - full credit (2 units)
  const decrementOptimistic = useCallback(() => {
    setUsageLoading(true)
    
    if (isAuthenticated && userId) {
      const authData = loadAuthGenerationCount()
      const freeUsed = authData?.count || 0
      const unitsUsed = paidUnitsUsed
      
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
        const totalPaidUnits = paidGenerations * UNITS_PER_CREDIT
        const availablePaidUnits = Math.max(0, totalPaidUnits - unitsUsed)
        const availablePaidCredits = availablePaidUnits / UNITS_PER_CREDIT
        setRemaining(Math.max(0, AUTH_LIMIT - newCount + availablePaidCredits))
      } else {
        // Use paid generation (2 units = 1 full credit)
        const newUnitsUsed = unitsUsed + FULL_GENERATION_UNITS
        savePaidUnitsUsed(newUnitsUsed)
        setPaidUnitsUsed(newUnitsUsed)
        const totalPaidUnits = paidGenerations * UNITS_PER_CREDIT
        const availablePaidUnits = Math.max(0, totalPaidUnits - newUnitsUsed)
        const availablePaidCredits = availablePaidUnits / UNITS_PER_CREDIT
        setRemaining(Math.max(0, availablePaidCredits))
      }
    } else {
      // For unauthenticated users, optimistically decrement
      // The server will update the actual count, and we'll sync from API response
      const currentRemaining = serverRemaining !== null ? serverRemaining : remaining
      setRemaining(Math.max(0, currentRemaining - 1))
    }
    
    setUsageLoading(false)
  }, [isAuthenticated, userId, paidGenerations, paidUnitsUsed, loadAuthGenerationCount, saveAuthGenerationCount, savePaidUnitsUsed, serverRemaining, remaining])

  // Decrement count optimistically for partial regeneration (half credit = 1 unit)
  const decrementOptimisticPartial = useCallback(() => {
    setUsageLoading(true)

    if (isAuthenticated && userId) {
      const authData = loadAuthGenerationCount()
      const freeUsed = authData?.count || 0
      const unitsUsed = paidUnitsUsed

      // Partial regeneration can only use paid credits, not free generations
      if (freeUsed >= AUTH_LIMIT) {
        // Use paid generation (1 unit = 0.5 credits)
        const newUnitsUsed = unitsUsed + PARTIAL_GENERATION_UNITS
        savePaidUnitsUsed(newUnitsUsed)
        setPaidUnitsUsed(newUnitsUsed)
        const totalPaidUnits = paidGenerations * UNITS_PER_CREDIT
        const availablePaidUnits = Math.max(0, totalPaidUnits - newUnitsUsed)
        const availablePaidCredits = availablePaidUnits / UNITS_PER_CREDIT
        setRemaining(Math.max(0, availablePaidCredits))
      } else {
        // Should not happen - partial regen should only be available when using paid credits
        console.warn("Partial regeneration attempted with free credits")
      }
    }

    setUsageLoading(false)
  }, [isAuthenticated, userId, paidGenerations, paidUnitsUsed, savePaidUnitsUsed])

  // Update remaining from server response
  const updateRemainingFromServer = useCallback((serverRemainingCount: number) => {
    setServerRemaining(serverRemainingCount)
    setRemaining(serverRemainingCount)
  }, [])

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
    decrementOptimisticPartial,
    usageLoading,
    paidGenerations,
    refreshCredits,
    updateRemainingFromServer,
    fetchServerRemaining,
  }
}

