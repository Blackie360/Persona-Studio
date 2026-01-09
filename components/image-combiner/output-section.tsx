"use client"

import type React from "react"
import { useRef, useEffect } from "react"

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
    icon,
    label,
  }: {
    onClick: () => void
    disabled: boolean
    title: string
    icon: React.ReactNode
    label: string
  }) => (
    <motion.div whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.95 }} transition={{ duration: 0.15 }}>
      <Button
        onClick={onClick}
        disabled={disabled}
        variant="outline"
        size="sm"
        className="text-xs h-7 px-2 md:px-3 bg-transparent border-border text-foreground hover:bg-accent flex items-center gap-1 lg:bg-background/80 lg:backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed transition-shadow hover:shadow-[0_2px_10px_rgba(255,255,255,0.1)]"
        title={title}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </Button>
    </motion.div>
  )

  const renderButtons = (className?: string) => (
    <div className={className}>
      <AnimatedButton
        onClick={onLoadAsInput}
        disabled={!generatedImage}
        title="Use as Input"
        icon={
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        }
        label="Use as Input"
      />
      <AnimatedButton
        onClick={onCopy}
        disabled={!generatedImage}
        title="Copy to clipboard"
        icon={
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" strokeWidth="2" />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" strokeWidth="2" />
          </svg>
        }
        label="Copy"
      />
      <AnimatedButton
        onClick={onDownload}
        disabled={!generatedImage}
        title="Download image"
        icon={
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
            />
          </svg>
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
                  src={generatedImage.url || "/placeholder.svg"}
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
