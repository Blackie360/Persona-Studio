"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface FullscreenViewerProps {
  isOpen: boolean
  imageUrl: string
  onClose: () => void
}

export function FullscreenViewer({ isOpen, imageUrl, onClose }: FullscreenViewerProps) {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Reset states when image URL changes
  useEffect(() => {
    if (imageUrl) {
      setImageLoaded(false)
      setImageError(false)
    }
  }, [imageUrl])

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
      }
    }

    document.addEventListener("keydown", handleEscape)
    return () => document.removeEventListener("keydown", handleEscape)
  }, [isOpen, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => {
      document.body.style.overflow = "unset"
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 select-none overflow-hidden"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Fullscreen image view"
        style={{
          width: "100vw",
          height: "100vh",
          maxWidth: "100vw",
          maxHeight: "100vh",
        }}
      >
        <div
          className="relative w-full h-full flex items-center justify-center"
          style={{
            width: "100%",
            height: "100%",
            maxWidth: "100vw",
            maxHeight: "100vh",
          }}
        >
          {/* Close Button - More visible and accessible */}
          <motion.button
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20 bg-background/90 hover:bg-background border border-border text-foreground p-2 sm:p-2.5 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
            title="Close (ESC)"
            aria-label="Close fullscreen view"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </motion.button>

          {/* Image Container */}
          <div
            className="relative w-full h-full flex items-center justify-center"
            style={{
              width: "100%",
              height: "100%",
              padding: "clamp(0.5rem, 2vw, 2rem)",
            }}
          >
            {/* Loading State */}
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-2 border-border border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">Loading image...</p>
                </div>
              </div>
            )}

            {/* Error State */}
            {imageError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-muted-foreground mb-2">Failed to load image</p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setImageError(false)
                      setImageLoaded(false)
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            )}

            {/* Image - Responsive to device screen */}
            <motion.img
              src={imageUrl || "/placeholder.svg"}
              alt="Fullscreen generated image"
              className="object-contain mx-auto shadow-2xl rounded-lg"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                width: "auto",
                height: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setImageError(true)
                setImageLoaded(false)
              }}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{
                opacity: imageLoaded ? 1 : 0,
                scale: imageLoaded ? 1 : 0.95,
              }}
              transition={{ duration: 0.3 }}
              draggable={false}
            />

            {/* Hint Text - Hidden on mobile, shown on larger screens */}
            {imageLoaded && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="absolute bottom-2 sm:bottom-4 left-1/2 transform -translate-x-1/2 bg-background/80 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 text-xs text-muted-foreground pointer-events-none hidden sm:block"
              >
                Click outside or press ESC to close
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
