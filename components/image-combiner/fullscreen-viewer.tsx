"use client"

interface FullscreenViewerProps {
  isOpen: boolean
  imageUrl: string
  onClose: () => void
}

export function FullscreenViewer({ isOpen, imageUrl, onClose }: FullscreenViewerProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-8 select-none overflow-hidden"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Fullscreen image view"
    >
      <div className="relative max-w-[90vw] max-h-[90vh] flex items-center justify-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-black/80 hover:bg-black/90 text-white p-2 transition-all duration-200"
          title="Close (ESC)"
          aria-label="Close fullscreen"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <img
          src={imageUrl || "/placeholder.svg"}
          alt="Fullscreen"
          className="max-w-full max-h-[90vh] object-contain mx-auto shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  )
}
