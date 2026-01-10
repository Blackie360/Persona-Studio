"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleSignIn = async () => {
    setIsLoading(true)
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: window.location.href,
      })
    } catch (error) {
      console.error("Error signing in:", error)
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/95 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Sign in to Continue</DialogTitle>
          <DialogDescription className="text-gray-400">
            You've reached the free generation limit. Sign in with Google to generate unlimited photos.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-4">
          <Button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full h-12 bg-white text-black hover:bg-gray-200 font-semibold"
          >
            {isLoading ? "Signing in..." : "Sign in with Google"}
          </Button>
          <p className="text-xs text-gray-500 text-center">
            Your free limit resets every 7 days. Sign in for unlimited access.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

