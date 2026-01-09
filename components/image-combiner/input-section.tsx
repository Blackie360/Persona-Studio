"use client"

import type React from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Briefcase, Linkedin, Sparkles, Zap } from "lucide-react"
import { ImageUploadBox } from "./image-upload-box"
import { cn } from "@/lib/utils"
import { AVATAR_STYLES, BACKGROUND_OPTIONS, COLOR_MOOD_OPTIONS } from "./constants"

const btnClassName = "w-full h-10 md:h-12 text-sm md:base font-semibold bg-white text-black hover:bg-gray-200"

interface InputSectionProps {
  prompt: string
  setPrompt: (prompt: string) => void
  aspectRatio: string
  setAspectRatio: (ratio: string) => void
  availableAspectRatios: Array<{ value: string; label: string; icon: React.ReactNode }>
  useUrls: boolean
  setUseUrls: (use: boolean) => void
  image1Preview: string | null
  image2Preview: string | null
  image1Url: string
  image2Url: string
  isConvertingHeic: boolean
  canGenerate: boolean
  hasImages: boolean
  onGenerate: () => void
  onClearAll: () => void
  onImageUpload: (file: File, slot: 1 | 2) => Promise<void>
  onUrlChange: (url: string, slot: 1 | 2) => void
  onClearImage: (slot: 1 | 2) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
  onPromptPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void
  onImageFullscreen: (url: string) => void
  promptTextareaRef: React.RefObject<HTMLTextAreaElement | null>
  isAuthenticated: boolean
  remaining: number
  decrementOptimistic: () => void
  usageLoading: boolean
  onShowAuthModal: () => void
  generations: any[]
  selectedGenerationId: string | null
  onSelectGeneration: (id: string) => void
  onCancelGeneration: (id: string) => void
  onDeleteGeneration: (id: string) => Promise<void>
  historyLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
  isLoadingMore: boolean
  avatarStyle: string
  setAvatarStyle: (style: string) => void
  background: string
  setBackground: (bg: string) => void
  colorMood: string
  setColorMood: (mood: string) => void
  isLoading?: boolean
}

const styleIcons: Record<string, React.ReactNode> = {
  corporate: <Briefcase className="size-4" />,
  linkedin: <Linkedin className="size-4" />,
  anime: <Sparkles className="size-4" />,
  cyberpunk: <Zap className="size-4" />,
}

const styleGlowColors: Record<string, string> = {
  corporate: "shadow-[0_0_15px_rgba(59,130,246,0.5)]",
  linkedin: "shadow-[0_0_15px_rgba(14,165,233,0.5)]",
  anime: "shadow-[0_0_15px_rgba(236,72,153,0.5)]",
  cyberpunk: "shadow-[0_0_15px_rgba(168,85,247,0.5)]",
}

export function InputSection({
  prompt,
  setPrompt,
  useUrls,
  setUseUrls,
  image1Preview,
  image2Preview,
  image1Url,
  image2Url,
  isConvertingHeic,
  canGenerate,
  hasImages,
  onGenerate,
  onClearAll,
  onImageUpload,
  onUrlChange,
  onClearImage,
  onKeyDown,
  onPromptPaste,
  onImageFullscreen,
  promptTextareaRef,
  avatarStyle,
  setAvatarStyle,
  background,
  setBackground,
  colorMood,
  setColorMood,
  isLoading,
}: InputSectionProps) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="space-y-3 md:space-y-4 min-h-0 flex flex-col">
        {/* Photo Upload Section */}
        <motion.div
          className="space-y-2 md:space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <div className="flex items-center justify-between mb-2 select-none">
            <div className="flex flex-col gap-1">
              <label className="text-sm md:text-base font-medium text-gray-300">Upload Your Photo</label>
              <span className="text-xs text-gray-500">Upload a clear photo of your face</span>
            </div>
            <div className="inline-flex bg-black/50 border border-gray-600">
              <button
                onClick={() => setUseUrls(false)}
                className={cn(
                  "px-2 py-1 md:px-4 md:py-2 text-xs md:text-sm font-medium transition-all",
                  !useUrls ? "bg-white text-black" : "text-gray-300 hover:text-white",
                )}
              >
                File
              </button>
              <button
                onClick={() => setUseUrls(true)}
                className={cn(
                  "px-2 py-1 md:px-4 md:py-2 text-xs md:text-sm font-medium transition-all",
                  useUrls ? "bg-white text-black" : "text-gray-300 hover:text-white",
                )}
              >
                URL
              </button>
            </div>
          </div>

          {useUrls ? (
            <div className="relative">
              <input
                type="url"
                value={image1Url}
                onChange={(e) => onUrlChange(e.target.value, 1)}
                placeholder="Paste image URL here..."
                className="w-full p-2 md:p-3 pr-8 bg-black/50 border border-gray-600 text-white text-xs focus:outline-none focus:ring-2 focus:ring-white select-text"
              />
              {image1Url && (
                <button
                  onClick={() => onClearImage(1)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          ) : (
            <div className="select-none">
              <motion.div
                key={image1Preview ? "has-image" : "no-image"}
                initial={image1Preview ? { scale: 0.95, opacity: 0 } : false}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <ImageUploadBox
                  imageNumber={1}
                  preview={image1Preview}
                  onDrop={(e) => {
                    e.preventDefault()
                    const file = e.dataTransfer.files[0]
                    if (file && file.type.startsWith("image/")) {
                      onImageUpload(file, 1)
                    }
                  }}
                  onClear={() => onClearImage(1)}
                  onSelect={() => {
                    if (image1Preview) {
                      onImageFullscreen(image1Preview)
                    } else {
                      document.getElementById("file1")?.click()
                    }
                  }}
                />
              </motion.div>
              <input
                id="file1"
                type="file"
                accept="image/*,.heic,.heif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    onImageUpload(file, 1)
                    e.target.value = ""
                  }
                }}
              />
            </div>
          )}
        </motion.div>

        {/* Style Selection - Add staggered entrance + selection animations */}
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <label className="text-sm md:text-base font-medium text-gray-300 select-none">Avatar Style</label>
          <div className="grid grid-cols-2 gap-2">
            {AVATAR_STYLES.map((style, index) => (
              <motion.button
                key={style.value}
                onClick={() => setAvatarStyle(style.value)}
                initial={{ opacity: 0, y: 10 }}
                animate={{
                  opacity: avatarStyle === style.value ? 1 : 0.7,
                  y: 0,
                  scale: avatarStyle === style.value ? 1.02 : 1,
                }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                transition={{
                  duration: 0.2,
                  delay: index * 0.04,
                }}
                className={cn(
                  "flex items-center gap-2 p-3 border transition-all text-left",
                  avatarStyle === style.value
                    ? `border-white bg-white/10 text-white ${styleGlowColors[style.value]}`
                    : "border-gray-600 bg-black/50 text-gray-400 hover:border-gray-400 hover:text-gray-200",
                )}
              >
                {styleIcons[style.value]}
                <div className="flex flex-col">
                  <span className="text-xs md:text-sm font-medium">{style.label}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Background & Color Options - Add entrance animation */}
        <motion.div
          className="grid grid-cols-2 gap-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <div className="space-y-2">
            <label className="text-xs md:text-sm font-medium text-gray-300 select-none">Background</label>
            <Select value={background} onValueChange={setBackground}>
              <SelectTrigger className="w-full !h-9 px-3 bg-black/50 border border-gray-600 text-white text-xs focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent className="bg-black/95 border-gray-600 text-white">
                {BACKGROUND_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs md:text-sm font-medium text-gray-300 select-none">Color Mood</label>
            <Select value={colorMood} onValueChange={setColorMood}>
              <SelectTrigger className="w-full !h-9 px-3 bg-black/50 border border-gray-600 text-white text-xs focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent className="bg-black/95 border-gray-600 text-white">
                {COLOR_MOOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Additional Instructions - Add entrance animation */}
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="flex items-center justify-between select-none">
            <label className="text-sm md:text-base font-medium text-gray-300">Additional Instructions</label>
            <Button
              onClick={onClearAll}
              disabled={!prompt.trim() && !hasImages}
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs bg-transparent border border-gray-600 text-white hover:bg-gray-700 disabled:opacity-50"
            >
              <Trash2 className="size-3" />
            </Button>
          </div>
          <textarea
            ref={promptTextareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPromptPaste}
            placeholder="e.g., Keep my glasses, slight smile, looking at camera..."
            className="w-full min-h-[60px] max-h-[100px] p-2 md:p-3 bg-black/50 border border-gray-600 resize-none focus:outline-none focus:border-white text-white text-xs md:text-sm select-text"
            style={{ fontSize: "16px" }}
          />
        </motion.div>

        {/* Generate Button - Add entrance + micro-interactions */}
        <motion.div
          className="pt-0"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          <motion.div whileHover={{ scale: 1.01, y: -1 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>
            <Button
              onClick={onGenerate}
              disabled={!canGenerate || isConvertingHeic || isLoading}
              className={cn(
                btnClassName,
                "transition-shadow duration-200",
                canGenerate && !isLoading && "hover:shadow-[0_4px_20px_rgba(255,255,255,0.2)]",
              )}
            >
              {isConvertingHeic ? "Converting..." : isLoading ? "Generating..." : "Transform Photo"}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
