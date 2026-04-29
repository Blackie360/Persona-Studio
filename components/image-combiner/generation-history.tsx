"use client"

import type React from "react"

import { cn } from "@/lib/utils"
import type { Generation } from "./types"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import Image from "next/image"
import { Skeleton } from "@/components/ui/skeleton"

interface GenerationHistoryProps {
  generations: Generation[]
  selectedId?: string
  onSelect: (id: string) => void
  onCancel: (id: string) => void
  onDelete?: (id: string) => Promise<void>
  onImageClick?: (imageUrl: string) => void
  isLoading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  isLoadingMore?: boolean
  className?: string
  compact?: boolean // Added compact prop
}

export function GenerationHistory({
  generations,
  selectedId,
  onSelect,
  onCancel,
  onDelete,
  onImageClick,
  isLoading = false,
  hasMore = false,
  onLoadMore,
  isLoadingMore = false,
  className,
  compact = false, // Default to false
}: GenerationHistoryProps) {
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()

    if (!onDelete) return

    setDeletingId(id)
    try {
      await onDelete(id)
    } catch (error) {
      console.error("Failed to delete generation:", error)
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className={cn("flex flex-col w-full", className)}>
      {!compact && (
        <div className="mb-2 flex items-center justify-between gap-3">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground md:text-sm">Reveal Roll</h4>
          <p className="hidden text-xs text-muted-foreground sm:block">Compare, remix, share.</p>
        </div>
      )}
      <div
        className={cn(
          "studio-panel-soft w-full flex gap-2 overflow-x-auto rounded-lg p-2 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent min-h-24 md:min-h-32 items-center",
          compact ? "pb-1" : "pb-2",
        )}
      >
        {isLoading ? (
          <div className="flex h-20 w-full items-center gap-2 md:h-28">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton
                key={i}
                className="size-20 rounded-md border border-white/10 bg-gray-800/50 md:size-24"
              />
            ))}
          </div>
        ) : generations.length === 0 ? (
          <div className="flex min-h-20 w-full items-center justify-center text-xs text-muted-foreground md:text-sm">
            No Generations Yet
          </div>
        ) : (
          <>
            {generations.map((gen, index) => (
              <div
                key={gen.id}
                className={cn(
                  "group relative size-20 flex-shrink-0 overflow-hidden rounded-md transition-[border-color,opacity,transform] duration-200 md:size-24",
                  selectedId === gen.id
                    ? "border-2 border-[var(--accent)] opacity-100"
                    : "border border-white/15 opacity-70 hover:border-white/35 hover:opacity-100",
                  index === 0 && "animate-in fade-in-0 slide-in-from-left-4 duration-500",
                  deletingId === gen.id && "opacity-50 pointer-events-none",
                )}
              >
                {gen.status === "loading" ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-sm md:text-base text-white/90 font-mono font-semibold drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                      {Math.round(gen.progress)}%
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onCancel(gen.id)
                      }}
                      className="focus-ring mt-2 rounded border border-white/10 bg-white/10 px-2 py-1 text-[10px] text-white transition-[background-color,color] duration-200 hover:bg-white hover:text-black"
                      aria-label="Cancel generation"
                    >
                      Cancel
                    </button>
                  </div>
                ) : gen.status === "error" ? (
                  <button
                    type="button"
                    onClick={() => onSelect(gen.id)}
                    className="focus-ring absolute inset-0 flex items-center justify-center bg-gray-900/50"
                    aria-label={`Select failed generation ${index + 1}`}
                  >
                    <svg
                      className="w-6 h-6 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="sr-only">Generation failed</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(gen.id)
                      if (gen.imageUrl && onImageClick) {
                        onImageClick(gen.imageUrl)
                      }
                    }}
                    className="focus-ring absolute inset-0"
                    aria-label={`Open generation ${index + 1}`}
                  >
                    <Image
                      src={gen.imageUrl!}
                      alt={gen.prompt || "Generated image"}
                      fill
                      sizes="(max-width: 768px) 80px, 96px"
                      className={cn(
                        "object-cover transition-opacity duration-300",
                        loadedImages.has(gen.id) ? "opacity-100" : "opacity-0",
                      )}
                      onLoad={() => {
                        setLoadedImages((prev) => new Set(prev).add(gen.id))
                      }}
                      unoptimized={gen.imageUrl?.includes("blob:") ?? false}
                    />
                    {!loadedImages.has(gen.id) && <div className="absolute inset-0 bg-gray-800 animate-pulse" />}
                  </button>
                )}

                {gen.status === "error" ? (
                  <>
                    {onDelete && (
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, gen.id)}
                        disabled={deletingId === gen.id}
                        className="focus-ring absolute right-1 top-1 z-10 flex size-7 items-center justify-center rounded bg-black/75 text-white opacity-100 transition-[background-color,color] duration-200 hover:bg-white hover:text-black disabled:opacity-50"
                        aria-label="Delete generation"
                      >
                        {deletingId === gen.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {gen.status !== "loading" && onDelete && (
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, gen.id)}
                        disabled={deletingId === gen.id}
                        className="focus-ring absolute right-1 top-1 z-10 flex size-7 items-center justify-center rounded bg-black/75 text-white opacity-100 transition-[background-color,color] duration-200 hover:bg-white hover:text-black disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
                        aria-label="Delete generation"
                      >
                        {deletingId === gen.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <svg
                            className="w-3 h-3"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
            {hasMore && onLoadMore && (
              <button
                type="button"
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="focus-ring flex size-20 flex-shrink-0 items-center justify-center rounded-md border border-white/15 bg-black/30 text-xs text-muted-foreground transition-[background-color,border-color,color] duration-200 hover:border-white/35 hover:bg-black/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 md:size-24"
                aria-label="Load more generations"
              >
                {isLoadingMore ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <span className="font-medium">
                    Load
                    <br />
                    More
                  </span>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
