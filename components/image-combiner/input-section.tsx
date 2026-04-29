"use client"

import type React from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Briefcase, Linkedin, Sparkles, Zap, Tv, Smile, Film, X } from "lucide-react"
import { ImageUploadBox } from "./image-upload-box"
import { cn } from "@/lib/utils"
import { AVATAR_STYLES, BACKGROUND_OPTIONS, COLOR_MOOD_OPTIONS } from "./constants"
import { Skeleton } from "@/components/ui/skeleton"

const btnClassName =
  "w-full min-h-12 rounded-md text-sm md:text-base font-semibold bg-primary text-primary-foreground hover:bg-[var(--accent)] focus-ring"

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
  vintage: <Film className="size-4" />,
  simpsons: <Tv className="size-4" />,
  "family-guy": <Smile className="size-4" />,
}

const styleGlowColors: Record<string, string> = {
  corporate: "shadow-[0_0_15px_rgba(59,130,246,0.5)]",
  linkedin: "shadow-[0_0_15px_rgba(14,165,233,0.5)]",
  anime: "shadow-[0_0_15px_rgba(236,72,153,0.5)]",
  cyberpunk: "shadow-[0_0_15px_rgba(168,85,247,0.5)]",
  vintage: "shadow-[0_0_15px_rgba(210,105,30,0.5)]",
  simpsons: "shadow-[0_0_15px_rgba(255,193,7,0.5)]",
  "family-guy": "shadow-[0_0_15px_rgba(255,87,34,0.5)]",
}

const viralPresets = [
  {
    label: "Founder Glow",
    style: "linkedin",
    mood: "warm",
    background: "gradient-soft",
    prompt: "Make this look like a confident founder profile photo with premium studio lighting and a magnetic smile.",
  },
  {
    label: "Anime Reveal",
    style: "anime",
    mood: "vibrant",
    background: "gradient-soft",
    prompt: "Turn this into a crisp anime profile reveal with expressive eyes, clean linework, and a share-worthy poster feel.",
  },
  {
    label: "Cyber Recruiter",
    style: "cyberpunk",
    mood: "high-contrast",
    background: "studio-neutral",
    prompt: "Create a cinematic cyberpunk portrait with controlled neon edge light, sharp confidence, and viral profile energy.",
  },
  {
    label: "Old Money",
    style: "vintage",
    mood: "muted",
    background: "studio-light",
    prompt: "Create a refined vintage editorial portrait with timeless styling, soft film tones, and understated luxury.",
  },
]

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
  isAuthenticated,
  remaining,
  usageLoading,
  onShowAuthModal,
  avatarStyle,
  setAvatarStyle,
  background,
  setBackground,
  colorMood,
  setColorMood,
  isLoading,
}: InputSectionProps) {
  const applyPreset = (preset: (typeof viralPresets)[number]) => {
    setAvatarStyle(preset.style)
    setColorMood(preset.mood)
    setBackground(preset.background)
    setPrompt(preset.prompt)
    window.setTimeout(() => promptTextareaRef.current?.focus(), 0)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-0 flex-col gap-4 md:gap-5">
        <section className="rounded-lg border border-[var(--accent)]/20 bg-[var(--accent)]/8 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--studio-cyan)]">
                Viral Mode
              </p>
              <h2 className="truncate text-sm font-semibold text-foreground md:text-base">Pick a Feed-Ready Direction</h2>
            </div>
            <span className="hidden rounded-full border border-white/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:inline">
              1 tap
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {viralPresets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset)}
                className="focus-ring min-h-11 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-left text-xs font-semibold text-foreground transition-[background-color,border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)]/60 hover:bg-white/10"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </section>

        {/* Photo Upload Section */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <div className="flex items-start justify-between gap-3 select-none">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-foreground md:text-base">Upload Your Photo</label>
              <span className="text-xs text-muted-foreground">Use a clear face photo for stronger results.</span>
            </div>
            <div className="inline-flex min-h-10 rounded-md border border-white/10 bg-black/30 p-1" role="group" aria-label="Image source">
              <button
                type="button"
                onClick={() => setUseUrls(false)}
                aria-pressed={!useUrls}
                className={cn(
                  "focus-ring rounded px-3 text-xs font-semibold transition-[background-color,color] duration-200 md:text-sm",
                  !useUrls ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                File
              </button>
              <button
                type="button"
                onClick={() => setUseUrls(true)}
                aria-pressed={useUrls}
                className={cn(
                  "focus-ring rounded px-3 text-xs font-semibold transition-[background-color,color] duration-200 md:text-sm",
                  useUrls ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                URL
              </button>
            </div>
          </div>

          {useUrls ? (
            <div className="relative">
              <input
                id="image-url"
                name="image-url"
                type="url"
                inputMode="url"
                autoComplete="off"
                aria-label="Image URL"
                value={image1Url}
                onChange={(e) => onUrlChange(e.target.value, 1)}
                placeholder="Paste image URL here…"
                className="focus-ring w-full min-h-12 rounded-md border border-white/10 bg-black/35 p-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground select-text"
              />
              {image1Url && (
                <button
                  type="button"
                  onClick={() => onClearImage(1)}
                  className="focus-ring absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors duration-200 hover:bg-white/10 hover:text-foreground"
                  aria-label="Clear image URL"
                >
                  <X className="size-4" aria-hidden="true" />
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
          className="space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <label className="text-sm font-semibold text-foreground md:text-base select-none">Avatar Style</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
            {AVATAR_STYLES.map((style, index) => (
              <motion.button
                key={style.value}
                type="button"
                onClick={() => setAvatarStyle(style.value)}
                aria-pressed={avatarStyle === style.value}
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
                  "focus-ring min-h-14 rounded-md border p-3 text-left transition-[border-color,background-color,color,box-shadow] duration-200",
                  "flex min-w-0 items-center gap-2",
                  avatarStyle === style.value
                    ? `border-[var(--accent)] bg-[var(--accent)]/10 text-foreground ${styleGlowColors[style.value] || ""}`
                    : "border-white/10 bg-black/30 text-muted-foreground hover:border-white/25 hover:text-foreground",
                )}
              >
                {styleIcons[style.value] || null}
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-semibold md:text-sm">{style.label}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Background & Color Options - Add entrance animation */}
        <motion.div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground select-none">Background</label>
            <Select value={background} onValueChange={setBackground}>
              <SelectTrigger
                aria-label="Background"
                className="focus-ring w-full !h-11 rounded-md border border-white/10 bg-black/35 px-3 text-sm text-foreground"
              >
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent className="rounded-md border-white/10 bg-card text-card-foreground">
                {BACKGROUND_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-sm">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground select-none">Color Mood</label>
            <Select value={colorMood} onValueChange={setColorMood}>
              <SelectTrigger
                aria-label="Color Mood"
                className="focus-ring w-full !h-11 rounded-md border border-white/10 bg-black/35 px-3 text-sm text-foreground"
              >
                <SelectValue placeholder="Select…" />
              </SelectTrigger>
              <SelectContent className="rounded-md border-white/10 bg-card text-card-foreground">
                {COLOR_MOOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-sm">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Additional Instructions - Add entrance animation */}
        <motion.div
          className="space-y-3"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <div className="flex items-center justify-between select-none">
            <label htmlFor="avatar-instructions" className="text-sm font-semibold text-foreground md:text-base">
              Additional Instructions
            </label>
            <Button
              onClick={onClearAll}
              disabled={!prompt.trim() && !hasImages}
              variant="outline"
              size="sm"
              className="focus-ring h-9 rounded-md border-white/10 bg-transparent px-3 text-xs text-foreground hover:bg-white/10 disabled:opacity-50"
              aria-label="Clear photo and instructions"
            >
              <Trash2 className="size-3" aria-hidden="true" />
            </Button>
          </div>
          <textarea
            id="avatar-instructions"
            name="avatar-instructions"
            ref={promptTextareaRef as React.RefObject<HTMLTextAreaElement>}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={onKeyDown}
            onPaste={onPromptPaste}
            autoComplete="off"
            placeholder="e.g., Keep my glasses, slight smile, looking at camera…"
            className="focus-ring w-full min-h-[96px] max-h-[160px] resize-y rounded-md border border-white/10 bg-black/35 p-3 text-sm text-foreground placeholder:text-muted-foreground select-text"
            style={{ fontSize: "16px" }}
          />
        </motion.div>

        {/* Generate Button - Add entrance + micro-interactions */}
        <motion.div
          className="pt-0 space-y-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.25 }}
        >
          {usageLoading ? (
            <div className="flex justify-center">
              <Skeleton className="h-4 w-32 bg-gray-800/50" />
            </div>
          ) : (
            <>
              {!isAuthenticated && (
                <div className="text-center text-xs text-muted-foreground" aria-live="polite">
                  <span>
                    {remaining} free {remaining === 1 ? "generation" : "generations"} remaining
                    {remaining === 0 && " (sign in for 3 more)"}
                  </span>
                </div>
              )}
              {isAuthenticated && (
                <div className="text-center text-xs text-[var(--studio-cyan)]" aria-live="polite">
                  {remaining % 1 === 0 ? remaining : remaining.toFixed(1)} {remaining === 1 ? "credit" : "credits"} remaining
                </div>
              )}
            </>
          )}
          <motion.div whileHover={canGenerate ? { scale: 1.01, y: -1 } : {}} whileTap={canGenerate ? { scale: 0.98 } : {}} transition={{ duration: 0.15 }}>
            <Button
              type="button"
              onClick={() => {
                if (!canGenerate && !isAuthenticated) {
                  onShowAuthModal()
                } else {
                  onGenerate()
                }
              }}
              disabled={isConvertingHeic || isLoading || usageLoading}
              className={cn(
                btnClassName,
                "transition-shadow duration-200",
                canGenerate && !isLoading && "hover:shadow-[0_4px_20px_rgba(255,255,255,0.2)]",
                !canGenerate && !isAuthenticated && "opacity-75 cursor-pointer",
              )}
            >
              {isConvertingHeic ? "Converting…" : isLoading || usageLoading ? "Generating…" : "Transform Photo"}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
