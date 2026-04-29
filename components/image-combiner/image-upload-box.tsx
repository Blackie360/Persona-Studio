"use client"

import type React from "react"

import { cn } from "@/lib/utils"

interface ImageUploadBoxProps {
  imageNumber: 1 | 2
  preview: string | null
  onDrop: (e: React.DragEvent) => void
  onClear: () => void
  onSelect: () => void
}

export function ImageUploadBox({ imageNumber, preview, onDrop, onClear, onSelect }: ImageUploadBoxProps) {
  return (
    <div
      className={cn(
        "focus-ring group relative flex h-32 w-full cursor-pointer items-center justify-center rounded-lg border border-dashed border-white/15 bg-black/30 transition-[background-color,border-color,box-shadow] duration-200 hover:border-[var(--accent)]/70 sm:h-36 lg:h-[18vh] xl:h-[20vh]",
        preview && "border-[var(--accent)] bg-black/45",
      )}
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-label={`Upload image ${imageNumber}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      {preview ? (
        <div className="relative h-full w-full p-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onClear()
            }}
            className="focus-ring absolute right-2 top-2 z-10 flex size-9 items-center justify-center rounded-md border border-white/20 bg-black/85 text-white shadow-lg transition-[background-color,color,border-color] duration-200 hover:bg-white hover:text-black"
            aria-label={`Clear image ${imageNumber}`}
          >
            <svg
              className="w-3 h-3 sm:w-4 sm:h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <img
            src={preview}
            alt={`Image ${imageNumber}`}
            className="h-full w-full object-contain"
          />
        </div>
      ) : (
        <div className="px-4 py-4 text-center text-muted-foreground">
          <svg
            className="mx-auto mb-2 size-7 text-[var(--studio-cyan)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-sm font-semibold text-foreground">{imageNumber === 1 ? "Upload Image" : "Second Image"}</p>
          <p className="mt-1 hidden text-xs text-muted-foreground lg:block">Drag & Drop or Click to Browse</p>
        </div>
      )}
    </div>
  )
}
