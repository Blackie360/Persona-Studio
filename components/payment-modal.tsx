"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function PaymentModal({ isOpen, onClose, onSuccess }: PaymentModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePay = async () => {
    setError(null)
    setIsLoading(true)

    try {
      const response = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || "Payment initiation failed")
      }

      // Redirect to checkout page
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl
      } else {
        throw new Error("No authorization URL received")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setError(null)
    setIsLoading(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-black/95 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Purchase More Generations
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Pay KES 5 via M-Pesa to unlock 5 additional generations. You'll be redirected to our secure checkout page.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 mt-4">
          {error && (
            <div className="bg-red-900/20 border border-red-700 text-red-400 p-3 rounded text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button
              onClick={handlePay}
              disabled={isLoading}
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold"
            >
              {isLoading ? "Redirecting to checkout..." : "Pay via M-Pesa"}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              You'll be redirected to the checkout page to complete your M-Pesa payment
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


