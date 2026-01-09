"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface HowItWorksModalProps {
  isOpen: boolean
  onClose: () => void
}

const slides = [
  {
    title: "Upload & Describe",
    content: (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-accent/20 border border-accent/40 rounded-lg flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
        </div>
        <p className="text-muted-foreground leading-relaxed text-center mb-4">
          Start by uploading your photo using the upload area or paste an image URL. You can upload one or two images to combine or edit.
        </p>
        <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            <strong className="text-primary">Tip:</strong> Drag and drop images directly onto the upload areas for quick access.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: "Customize & Generate",
    content: (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-accent/20 border border-accent/40 rounded-lg flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          </div>
        </div>
        <p className="text-muted-foreground leading-relaxed text-center mb-4">
          Describe what you want to create or edit in the prompt box. Choose your preferred style, background, color mood, and aspect ratio.
        </p>
        <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 space-y-2">
          <p className="text-sm text-muted-foreground">
            <strong className="text-primary">Pro Tip:</strong> Use <kbd className="px-1.5 py-0.5 bg-foreground/10 rounded text-xs">⌘/Ctrl + Enter</kbd> to quickly generate images.
          </p>
        </div>
      </div>
    ),
  },
  {
    title: "View & Share",
    content: (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-accent/20 border border-accent/40 rounded-lg flex items-center justify-center">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        <p className="text-muted-foreground leading-relaxed text-center mb-4">
          View your generated images in the output section. All generations are saved in your browser history. You can download, copy, or use them as input for further editing.
        </p>
        <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 space-y-2">
          <p className="text-sm text-muted-foreground mb-2">
            <strong className="text-primary">Quick Actions:</strong>
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-2">
            <li>Click image to view fullscreen</li>
            <li>Download or copy to clipboard</li>
            <li>Load as input for more editing</li>
            <li>Browse history to switch between generations</li>
          </ul>
        </div>
      </div>
    ),
  },
]

export function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0)

  // Reset to first slide when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentSlide(0)
    }
  }, [isOpen])

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length)
  }

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)
  }

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Handle close
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] bg-background border border-border text-foreground flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl font-bold text-center">How it works</DialogTitle>
          <DialogDescription className="sr-only">
            Learn how to use the AI Avatar Studio in 3 simple steps
          </DialogDescription>
        </DialogHeader>

        <div className="relative flex-1 flex flex-col min-h-0 my-4">
          {/* Slide Content */}
          <div className="flex-1 relative overflow-y-auto overflow-x-hidden min-h-0 pr-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <div className="px-2 py-4">
                  <h3 className="text-xl font-semibold text-foreground mb-6 text-center">{slides[currentSlide].title}</h3>
                  <div className="w-full pb-4">
                    {slides[currentSlide].content}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-border flex-shrink-0">
            <Button
              onClick={prevSlide}
              disabled={currentSlide === 0}
              variant="outline"
              size="sm"
              className="bg-transparent border-border text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </Button>

            {/* Slide Indicators */}
            <div className="flex gap-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSlide ? "bg-foreground w-8" : "bg-border hover:bg-accent"
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            <Button
              onClick={nextSlide}
              disabled={currentSlide === slides.length - 1}
              variant="outline"
              size="sm"
              className="bg-transparent border-border text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>

          {/* Slide Counter */}
          <div className="text-center mt-4 text-sm text-muted-foreground">
            {currentSlide + 1} of {slides.length}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
