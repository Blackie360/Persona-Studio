"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface PartialRegenerationModalProps {
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
  onConfirm: (instructions?: string) => Promise<void>
}

export function PartialRegenerationModal({
  isOpen,
  isSubmitting,
  onClose,
  onConfirm,
}: PartialRegenerationModalProps) {
  const [instructions, setInstructions] = useState("")

  useEffect(() => {
    if (isOpen) {
      setInstructions("")
    }
  }, [isOpen])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const cleaned = instructions.trim()
    await onConfirm(cleaned.length > 0 ? cleaned : undefined)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg bg-background border border-border text-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl">Describe your changes</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Partial Regen costs 0.5 credit and only updates background and lighting.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">What should change?</label>
            <textarea
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              placeholder="e.g., warm lighting, blurred office background, subtle vignette"
              className="w-full min-h-[110px] p-3 bg-black/50 border border-gray-600 resize-none focus:outline-none focus:border-white text-white text-sm"
              style={{ fontSize: "16px" }}
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              We will keep the face and identity unchanged.
            </p>
          </div>

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              className="bg-transparent border-border text-foreground hover:bg-accent"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-white text-black hover:bg-gray-200"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Regenerating..." : "Regenerate (0.5 credit)"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
