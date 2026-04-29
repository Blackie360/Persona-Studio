"use client"

import { Button } from "@/components/ui/button"

interface ProgressBarProps {
  progress: number
  onCancel: () => void
  isConverting?: boolean
}

export function ProgressBar({ progress, onCancel, isConverting = false }: ProgressBarProps) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center px-4 select-none">
      <div className="w-full max-w-md">
        <div
          className="relative h-4 md:h-8 bg-black/50 border border-gray-600 overflow-hidden mb-4"
          role="progressbar"
          aria-label={isConverting ? "Converting HEIC image" : "Generation progress"}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          style={{ zIndex: 30 }}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                linear-gradient(90deg, transparent 0%, transparent 49%, #333 49%, #333 51%, transparent 51%),
                linear-gradient(0deg, transparent 0%, transparent 49%, #333 49%, #333 51%, transparent 51%)
              `,
              backgroundSize: "8px 8px",
            }}
          />

          <div
            className="absolute top-0 left-0 h-full transition-[width] duration-100 ease-out"
            style={{
              width: `${progress}%`,
              backgroundImage: `
                repeating-linear-gradient(
                  90deg,
                  #005B5B 0px,
                  #005B5B 6px,
                  #007070 6px,
                  #007070 8px
                ),
                repeating-linear-gradient(
                  0deg,
                  #005B5B 0px,
                  #005B5B 6px,
                  #007070 6px,
                  #007070 8px
                )
              `,
              backgroundSize: "8px 8px",
            }}
          />

          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs md:text-sm font-mono text-white/80" style={{ zIndex: 40 }}>
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        <div className="text-center space-y-2">
          <p className="text-xs md:text-sm font-medium text-white animate-pulse" role="status" aria-live="polite">
            {isConverting ? "Converting HEIC Image…" : "Running…"}
          </p>
          {!isConverting && (
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              size="sm"
              className="focus-ring text-xs min-h-9 px-3 bg-transparent border-gray-600 text-white hover:bg-gray-700"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
