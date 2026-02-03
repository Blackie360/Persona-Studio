"use client"

import type React from "react"
import { useRef, useEffect, useState } from "react"

import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useMobile } from "@/hooks/use-mobile"
import type { Generation } from "./hooks/use-image-generation"

interface OutputSectionProps {
  generatedImage: { url: string; prompt: string } | null
  isLoading: boolean
  loadingGeneration: Generation | undefined
  selectedGeneration: Generation | undefined
  imageLoaded: boolean
  setImageLoaded: (loaded: boolean) => void
  onFullscreen: () => void
  onDownload: () => void
  onCopy: () => void
  onOpenInNewTab: () => void
  onLoadAsInput: () => void
  onPartialRegeneration: () => void
  isAuthenticated: boolean
  canUsePartialRegeneration: boolean
}

function ShimmerSkeleton() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="relative w-full h-full max-w-md max-h-md m-8 overflow-hidden rounded-lg bg-muted/50">
        {/* Base skeleton */}
        <div className="absolute inset-0 bg-gradient-to-br from-muted/50 to-background/50" />

        {/* Shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 1.5,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />

        {/* Pulsing glow */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"
          animate={{
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
        />

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <motion.div className="flex gap-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 bg-white/60 rounded-full"
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 1, 0.5],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Number.POSITIVE_INFINITY,
                  delay: i * 0.15,
                }}
              />
            ))}
          </motion.div>
          <motion.p
            className="text-sm text-muted-foreground font-medium"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
          >
            Generating your avatar...
          </motion.p>
        </div>
      </div>
    </div>
  )
}

export function OutputSection({
  generatedImage,
  isLoading,
  loadingGeneration,
  selectedGeneration,
  imageLoaded,
  setImageLoaded,
  onFullscreen,
  onDownload,
  onCopy,
  onOpenInNewTab,
  onLoadAsInput,
  onPartialRegeneration,
  isAuthenticated,
  canUsePartialRegeneration,
}: OutputSectionProps) {
  const isMobile = useMobile()
  const containerRef = useRef<HTMLDivElement>(null)

  // Scroll to image when it finishes loading on mobile
  useEffect(() => {
    if (isMobile && imageLoaded && generatedImage && containerRef.current) {
      // Small delay to ensure the image is fully rendered
      const timeoutId = setTimeout(() => {
        containerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        })
      }, 100)

      return () => clearTimeout(timeoutId)
    }
  }, [isMobile, imageLoaded, generatedImage])

  const AnimatedButton = ({
    onClick,
    disabled,
    title,
    tooltip,
    icon,
    label,
    isLoading = false,
  }: {
    onClick: () => void | Promise<void>
    disabled: boolean
    title: string
    tooltip: string
    icon: React.ReactNode
    label: string
    isLoading?: boolean
  }) => {
    const [isHovered, setIsHovered] = useState(false)
    const [showTooltip, setShowTooltip] = useState(false)

    useEffect(() => {
      if (isHovered && !disabled) {
        const timer = setTimeout(() => setShowTooltip(true), 300)
        return () => clearTimeout(timer)
      } else {
        setShowTooltip(false)
      }
    }, [isHovered, disabled])

    return (
      <motion.div
        className="relative"
        whileHover={{ scale: disabled ? 1 : 1.05, y: disabled ? 0 : -1 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        transition={{ duration: 0.15 }}
        onHoverStart={() => !disabled && setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
      >
        <Button
          onClick={onClick}
          disabled={disabled || isLoading}
          variant="outline"
          size="sm"
          className={cn(
            "text-xs h-7 px-2 md:px-3 bg-transparent border-border text-foreground",
            "flex items-center gap-1 lg:bg-background/80 lg:backdrop-blur-sm",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-all duration-200",
            !disabled && !isLoading && [
              "hover:bg-accent/80 hover:border-accent",
              "hover:shadow-[0_2px_12px_rgba(255,255,255,0.15)]",
              "hover:text-white hover:scale-105",
              "active:scale-95",
            ],
            isLoading && "opacity-70 cursor-wait",
          )}
          title={title}
          aria-label={title}
        >
          {isLoading ? (
            <motion.div
              className="w-3 h-3 border-2 border-current border-t-transparent rounded-full"
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
            />
          ) : (
            icon
          )}
          <span className="hidden sm:inline">{label}</span>
        </Button>

        {/* Tooltip - Only show on desktop */}
        <AnimatePresence>
          {showTooltip && !disabled && !isMobile && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none hidden lg:block"
            >
              <div className="bg-background/95 backdrop-blur-sm border border-border rounded-md px-2 py-1 text-xs text-foreground whitespace-nowrap shadow-lg">
                {tooltip}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
                  <div className="w-2 h-2 bg-background border-r border-b border-border rotate-45" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  const [buttonStates, setButtonStates] = useState({
    loadAsInput: { loading: false, success: false },
    copy: { loading: false, success: false },
    download: { loading: false, success: false },
    partialRegen: { loading: false, success: false },
  })

  // Reset success states after animation
  useEffect(() => {
    if (buttonStates.loadAsInput.success) {
      const timer = setTimeout(() => {
        setButtonStates((prev) => ({ ...prev, loadAsInput: { ...prev.loadAsInput, success: false } }))
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [buttonStates.loadAsInput.success])

  useEffect(() => {
    if (buttonStates.copy.success) {
      const timer = setTimeout(() => {
        setButtonStates((prev) => ({ ...prev, copy: { ...prev.copy, success: false } }))
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [buttonStates.copy.success])

  useEffect(() => {
    if (buttonStates.download.success) {
      const timer = setTimeout(() => {
        setButtonStates((prev) => ({ ...prev, download: { ...prev.download, success: false } }))
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [buttonStates.download.success])

  useEffect(() => {
    if (buttonStates.partialRegen.success) {
      const timer = setTimeout(() => {
        setButtonStates((prev) => ({ ...prev, partialRegen: { ...prev.partialRegen, success: false } }))
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [buttonStates.partialRegen.success])

  const handleLoadAsInput = async () => {
    setButtonStates((prev) => ({ ...prev, loadAsInput: { loading: true, success: false } }))
    try {
      await onLoadAsInput()
      setButtonStates((prev) => ({ ...prev, loadAsInput: { loading: false, success: true } }))
    } catch (error) {
      setButtonStates((prev) => ({ ...prev, loadAsInput: { loading: false, success: false } }))
    }
  }

  const handleCopy = async () => {
    setButtonStates((prev) => ({ ...prev, copy: { loading: true, success: false } }))
    try {
      await onCopy()
      setButtonStates((prev) => ({ ...prev, copy: { loading: false, success: true } }))
    } catch (error) {
      setButtonStates((prev) => ({ ...prev, copy: { loading: false, success: false } }))
    }
  }

  const handleDownload = async () => {
    setButtonStates((prev) => ({ ...prev, download: { loading: true, success: false } }))
    try {
      await onDownload()
      setButtonStates((prev) => ({ ...prev, download: { loading: false, success: true } }))
    } catch (error) {
      setButtonStates((prev) => ({ ...prev, download: { loading: false, success: false } }))
    }
  }

  const handlePartialRegeneration = async () => {
    setButtonStates((prev) => ({ ...prev, partialRegen: { loading: true, success: false } }))
    try {
      await onPartialRegeneration()
      setButtonStates((prev) => ({ ...prev, partialRegen: { loading: false, success: true } }))
    } catch (error) {
      setButtonStates((prev) => ({ ...prev, partialRegen: { loading: false, success: false } }))
    }
  }

  const renderButtons = (className?: string) => (
    <div className={className}>
      <AnimatedButton
        onClick={handleLoadAsInput}
        disabled={!generatedImage}
        title="Use as Input"
        tooltip="Load this image as input for editing"
        isLoading={buttonStates.loadAsInput.loading}
        icon={
          buttonStates.loadAsInput.success ? (
            <motion.svg
              className="w-3 h-3 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </motion.svg>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          )
        }
        label="Use as Input"
      />
      <AnimatedButton
        onClick={handlePartialRegeneration}
        disabled={!generatedImage || !canUsePartialRegeneration}
        title={isAuthenticated ? "Partial Regen (0.5 credit)" : "Sign in to use Partial Regeneration"}
        tooltip={isAuthenticated ? "Change background & lighting only - Save 50% credits!" : "Sign in to use this feature"}
        isLoading={buttonStates.partialRegen.loading}
        icon={
          buttonStates.partialRegen.success ? (
            <motion.svg
              className="w-3 h-3 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </motion.svg>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )
        }
        label="Partial Regen"
      />
      <AnimatedButton
        onClick={handleCopy}
        disabled={!generatedImage}
        title="Copy to clipboard"
        tooltip="Copy image to clipboard"
        isLoading={buttonStates.copy.loading}
        icon={
          buttonStates.copy.success ? (
            <motion.svg
              className="w-3 h-3 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </motion.svg>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2" />
            </svg>
          )
        }
        label="Copy"
      />
      <AnimatedButton
        onClick={handleDownload}
        disabled={!generatedImage}
        title="Download image"
        tooltip="Download image file"
        isLoading={buttonStates.download.loading}
        icon={
          buttonStates.download.success ? (
            <motion.svg
              className="w-3 h-3 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </motion.svg>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
          )
        }
        label="Download"
      />
    </div>
  )

  return (
    <div ref={containerRef} className="flex flex-col h-full min-h-0 select-none relative group/output">
      <div className="relative flex-1 min-h-0 flex flex-col">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ShimmerSkeleton />
            </motion.div>
          ) : generatedImage ? (
            <motion.div
              key={generatedImage.url}
              className="absolute inset-0 flex flex-col select-none"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <div className="flex-1 flex items-center justify-center relative group max-w-full max-h-full overflow-hidden">
                {/* Hover overlay hint */}
                <div className="absolute inset-0 bg-background/0 group-hover:bg-background/5 transition-colors duration-200 rounded-lg pointer-events-none z-10 flex items-center justify-center">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileHover={{ opacity: 1, y: 0 }}
                    className="bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground pointer-events-none hidden group-hover:block"
                  >
                    Click to view fullscreen
                  </motion.div>
                </div>
                <motion.img
                  src={generatedImage.url}
                  alt="Generated avatar image"
                  className={cn(
                    "max-w-full max-h-full cursor-pointer transition-transform duration-200",
                    "lg:w-full lg:h-full lg:object-contain",
                    "group-hover:scale-[1.02] group-hover:shadow-2xl"
                  )}
                  initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                  animate={{
                    opacity: imageLoaded ? 1 : 0,
                    scale: imageLoaded ? 1 : 0.95,
                    filter: imageLoaded ? "blur(0px)" : "blur(4px)",
                  }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  onLoad={() => setImageLoaded(true)}
                  onClick={onFullscreen}
                  loading="lazy"
                  draggable={false}
                />
              </div>
            </motion.div>
          ) : (
            // Empty state
            <motion.div
              key="empty"
              className="absolute inset-0 flex items-center justify-center text-center py-6 select-none bg-background/20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div>
                <div className="w-8 h-8 md:w-16 md:h-16 mx-auto mb-3 border border-border flex items-center justify-center bg-background/50">
                  <svg
                    className="w-4 h-4 md:w-8 md:h-8 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21,15 16,10 5,21" />
                  </svg>
                </div>
                <p className="text-xs text-muted-foreground font-medium py-1 md:py-2">Ready to generate</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Desktop Controls Container */}
        {generatedImage && (
          <motion.div
            className="hidden lg:flex flex-col items-center w-full absolute bottom-6 z-30 pointer-events-none gap-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <div className="pointer-events-auto">
              {renderButtons("flex justify-center gap-2 transition-all duration-200")}
            </div>
          </motion.div>
        )}
      </div>

      {/* Mobile/Tablet buttons */}
      {generatedImage && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          {renderButtons("mt-3 md:mt-4 flex lg:hidden justify-center gap-2 flex-shrink-0")}
        </motion.div>
      )}
    </div>
  )
}
