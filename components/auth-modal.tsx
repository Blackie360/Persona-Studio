"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  afterPayment?: boolean
  isGeneralLogin?: boolean
}

export function AuthModal({ isOpen, onClose, afterPayment = false, isGeneralLogin = false }: AuthModalProps) {
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

  const getTitle = () => {
    if (afterPayment) return "Sign Up to Link Your Payment"
    if (isGeneralLogin) return "Sign In"
    return "Sign in to Continue"
  }

  const getDescription = () => {
    if (afterPayment) {
      return "Your payment was successful! Sign up with Google using the same email you used for payment to link your credits to your account."
    }
    if (isGeneralLogin) {
      return "Sign in with Google to access your account and manage your generations."
    }
    return "You've reached the free generation limit. Sign in with Google to get 3 more generations."
  }

  const getFooterText = () => {
    if (afterPayment) {
      return "Use the same email address you used for payment to automatically link your credits."
    }
    if (isGeneralLogin) {
      return "Sign in to access your account, view your generation history, and manage your credits."
    }
    return "Sign in to get 3 additional generations."
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black/95 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {getTitle()}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {getDescription()}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-4">
          <Button
            onClick={handleSignIn}
            disabled={isLoading}
            className="w-full h-12 bg-white text-black hover:bg-gray-200 font-semibold cursor-pointer"
          >
            {isLoading ? "Signing in..." : "Sign in with Google"}
          </Button>
          <p className="text-xs text-gray-500 text-center">
            {getFooterText()}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}

