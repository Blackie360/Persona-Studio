"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function PaymentModal({ isOpen, onClose, onSuccess }: PaymentModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "")
    
    // If starts with 0, replace with 254
    if (digits.startsWith("0")) {
      return "254" + digits.slice(1)
    }
    
    // If doesn't start with 254, add it
    if (!digits.startsWith("254")) {
      return "254" + digits
    }
    
    return digits.slice(0, 12) // Max 12 digits (254 + 9 digits)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value)
    setPhoneNumber(formatted)
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    // Validate phone number format (254XXXXXXXXX)
    if (!phoneNumber.match(/^254\d{9}$/)) {
      setError("Please enter a valid Kenyan phone number (e.g., 254712345678)")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phoneNumber }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || "Payment initiation failed")
      }

      setSuccess(true)
      
      // Poll for payment status (optional - can also rely on webhook)
      // For now, just show success message
      setTimeout(() => {
        onSuccess?.()
        handleClose()
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setPhoneNumber("")
    setError(null)
    setSuccess(false)
    setIsLoading(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-black/95 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {success ? "Payment Initiated!" : "Purchase More Generations"}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {success
              ? "Please check your phone for the M-Pesa prompt. Your 5 generations will be available once payment is confirmed."
              : "Pay KES 5 via M-Pesa to unlock 5 additional generations"}
          </DialogDescription>
        </DialogHeader>
        
        {!success ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="phone" className="text-sm font-medium">
                Phone Number
              </label>
              <Input
                id="phone"
                type="tel"
                placeholder="254712345678"
                value={phoneNumber}
                onChange={handlePhoneChange}
                disabled={isLoading}
                className="bg-gray-900 border-gray-700 text-white"
                required
              />
              <p className="text-xs text-gray-500">
                Enter your M-Pesa registered phone number (format: 254712345678)
              </p>
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-700 text-red-400 p-3 rounded text-sm">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                disabled={isLoading || !phoneNumber.match(/^254\d{9}$/)}
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                {isLoading ? "Initiating Payment..." : "Pay KES 5 via M-Pesa"}
              </Button>
              <p className="text-xs text-gray-500 text-center">
                You will receive an M-Pesa prompt on your phone to complete the payment
              </p>
            </div>
          </form>
        ) : (
          <div className="flex flex-col items-center gap-4 mt-4 py-4">
            <div className="w-16 h-16 rounded-full bg-green-600 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-center text-gray-300">
              Payment request sent! Check your phone for the M-Pesa prompt.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

