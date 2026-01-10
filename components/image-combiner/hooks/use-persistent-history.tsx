"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import type { Generation } from "../types"

const STORAGE_KEY = "nb2_generations"
const MAX_STORED = 50

function getLocalGenerations(): Generation[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    return JSON.parse(stored)
  } catch (error) {
    console.error("Error loading generations from localStorage:", error)
    return []
  }
}

function saveLocalGeneration(generation: Generation, onQuotaExceeded?: () => void) {
  try {
    const current = getLocalGenerations()
    let updated = [generation, ...current]
    
    // Try saving with MAX_STORED items first
    let itemsToSave = Math.min(updated.length, MAX_STORED)
    let saved = false
    
    while (itemsToSave > 0 && !saved) {
      try {
        const toSave = updated.slice(0, itemsToSave)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
        saved = true
      } catch (error) {
        if (error instanceof DOMException && error.name === "QuotaExceededError") {
          // Reduce items and try again
          itemsToSave = Math.max(1, Math.floor(itemsToSave * 0.7)) // Reduce by 30%
          
          // If we can't even save 1 item, clear and try again
          if (itemsToSave < 1) {
            // Try to save just the new generation without history
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify([generation]))
              saved = true
            } catch {
              // Last resort: clear everything and save just the new one
              localStorage.removeItem(STORAGE_KEY)
              localStorage.setItem(STORAGE_KEY, JSON.stringify([generation]))
              saved = true
              if (onQuotaExceeded) {
                onQuotaExceeded()
              }
            }
          }
        } else {
          // Other error, just log it
          console.error("Error saving generation to localStorage:", error)
          saved = true // Exit loop
        }
      }
    }
    
    if (!saved && onQuotaExceeded) {
      onQuotaExceeded()
    }
  } catch (error) {
    console.error("Error saving generation to localStorage:", error)
    if (error instanceof DOMException && error.name === "QuotaExceededError" && onQuotaExceeded) {
      onQuotaExceeded()
    }
  }
}

function deleteLocalGeneration(id: string) {
  try {
    const current = getLocalGenerations()
    const updated = current.filter((g) => g.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      // This shouldn't happen on delete, but handle it just in case
      console.warn("QuotaExceededError on delete - this is unexpected")
    }
    console.error("Error deleting generation from localStorage:", error)
  }
}

function clearLocalGenerations() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error("Error clearing localStorage:", error)
  }
}
// </CHANGE>

export function usePersistentHistory(onToast?: (message: string, type: "success" | "error") => void) {
  const [generations, setGenerations] = useState<Generation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const loadGenerations = async () => {
      setIsLoading(true)

      const localGens = getLocalGenerations()
      if (isMountedRef.current) {
        setGenerations(localGens)
      }

      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }

    loadGenerations()
  }, [])

  const addGeneration = useCallback(
    async (generation: Generation) => {
      const handleQuotaExceeded = () => {
        if (onToast) {
          onToast(
            "Storage limit reached. Some older generations may have been removed to save space.",
            "error"
          )
        }
      }
      
      saveLocalGeneration(generation, handleQuotaExceeded)

      setGenerations((prev) => {
        const updated = [generation, ...prev]
        return updated
      })
    },
    [onToast],
  )

  const updateGeneration = useCallback((id: string, updates: Partial<Generation>) => {
    setGenerations((prev) => {
      const updated = prev.map((g) => (g.id === id ? { ...g, ...updates } : g))
      return updated
    })
  }, [])

  const clearHistory = async () => {
    clearLocalGenerations()
    setGenerations([])
  }

  const deleteGeneration = async (id: string) => {
    setGenerations((prev) => prev.filter((g) => g.id !== id))
    deleteLocalGeneration(id)
  }

  return {
    generations,
    setGenerations,
    addGeneration,
    clearHistory,
    deleteGeneration,
    isLoading,
    hasMore: false,
    loadMore: () => {},
    isLoadingMore: false,
    updateGeneration,
  }
}
