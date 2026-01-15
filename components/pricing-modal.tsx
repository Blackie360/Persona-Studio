"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useSession } from "@/lib/auth-client"

interface PricingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const PRICING_PLANS = [
  {
    amount: 5,
    generations: 5,
    label: "Starter",
    description: "Perfect for trying out",
  },
  {
    amount: 100,
    generations: 20,
    label: "Value Pack",
    description: "Best value for more generations",
    popular: true,
  },
]

export function PricingModal({ isOpen, onClose, onSuccess }: PricingModalProps) {
  const { data: session } = useSession()
  const [selectedPlan, setSelectedPlan] = useState<typeof PRICING_PLANS[0] | null>(null)
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showEmailInput, setShowEmailInput] = useState(false)

  const isAuthenticated = !!session?.user
  const userEmail = session?.user?.email || ""

  const handlePlanSelect = (plan: typeof PRICING_PLANS[0]) => {
    setSelectedPlan(plan)
    setError(null)

    // If not authenticated, show email input
    if (!isAuthenticated) {
      setShowEmailInput(true)
      setEmail("")
    } else {
      // If authenticated, proceed directly to payment
      handlePay(plan)
    }
  }

  const handlePay = async (plan?: typeof PRICING_PLANS[0]) => {
    const planToUse = plan || selectedPlan
    if (!planToUse) return

    setError(null)
    setIsLoading(true)

    // Validate email for unauthenticated users
    if (!isAuthenticated) {
      if (!email || !email.includes("@")) {
        setError("Please enter a valid email address")
        setIsLoading(false)
        return
      }
    }

    try {
      const response = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: planToUse.amount,
          generationsGranted: planToUse.generations,
          email: isAuthenticated ? undefined : email,
        }),
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
    setSelectedPlan(null)
    setShowEmailInput(false)
    setEmail("")
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-black/95 border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-bold text-center">
            Choose Your Plan 💰
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-center text-sm sm:text-base">
            Select a plan and pay via M-Pesa to unlock generations
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 sm:gap-6 mt-4 sm:mt-6">
          {error && (
            <div className="bg-red-900/20 border border-red-700 text-red-400 p-3 rounded text-sm">
              {error}
            </div>
          )}

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {PRICING_PLANS.map((plan) => (
              <Card
                key={plan.amount}
                className={`bg-black/40 border-gray-700 backdrop-blur-sm cursor-pointer transition-all hover:border-gray-600 ${
                  selectedPlan?.amount === plan.amount ? "border-green-500 ring-2 ring-green-500/50" : ""
                } ${plan.popular ? "ring-2 ring-yellow-500/50" : ""}`}
                onClick={() => handlePlanSelect(plan)}
              >
                <CardHeader className="pb-3 sm:pb-6">
                  {plan.popular && (
                    <div className="text-xs sm:text-sm font-semibold text-yellow-400 mb-2">POPULAR</div>
                  )}
                  <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-white">
                    KES {plan.amount}
                  </CardTitle>
                  <div className="text-xs sm:text-sm text-gray-400">{plan.label}</div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-400">
                      {plan.generations} Generations
                    </div>
                    <div className="text-xs sm:text-sm text-gray-400">{plan.description}</div>
                    {selectedPlan?.amount === plan.amount && showEmailInput && !isAuthenticated && (
                      <div className="mt-4 space-y-2">
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="bg-gray-800 border-gray-600 text-white"
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && email) {
                              handlePay(plan)
                            }
                          }}
                        />
                        <Button
                          onClick={() => handlePay(plan)}
                          disabled={isLoading || !email}
                          className="w-full h-10 bg-green-600 hover:bg-green-700 text-white font-semibold cursor-pointer"
                        >
                          {isLoading ? "Processing..." : "Pay via M-Pesa"}
                        </Button>
                      </div>
                    )}
                    {selectedPlan?.amount === plan.amount && (!showEmailInput || isAuthenticated) && (
                      <Button
                        onClick={() => handlePay(plan)}
                        disabled={isLoading}
                        className="w-full h-10 bg-green-600 hover:bg-green-700 text-white font-semibold mt-4 cursor-pointer"
                      >
                        {isLoading ? "Redirecting to checkout..." : "Pay via M-Pesa"}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {!isAuthenticated && !showEmailInput && (
            <div className="text-xs sm:text-sm text-gray-400 text-center">
              You'll need to provide your email to complete the payment
            </div>
          )}

          <div className="text-xs sm:text-sm text-gray-500 text-center pt-3 sm:pt-4 border-t border-gray-700">
            You'll be redirected to the secure Paystack checkout page to complete your M-Pesa payment
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

