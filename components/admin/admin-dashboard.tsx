"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { StatsCards } from "./stats-cards"
import { UsersTable } from "./users-table"
import { RecentGenerations } from "./recent-generations"
import { PaymentStats } from "./payment-stats"
import { PayingCustomers } from "./paying-customers"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

interface DashboardStats {
  totalGenerations: number
  totalUsers: number
  blockedUsers: number
  recentGenerations: number
  generationsByStatus: Record<string, number>
  generationsOverTime: Array<{ date: string; count: number }>
}

interface PaymentAnalytics {
  payingUsersCount: number
  activeSubscriptions: number
  paymentStatusBreakdown: {
    success: number
    failed: number
    pending: number
    abandoned: number
  }
  paymentAttemptHistory: {
    firstTimePayers: number
    repeatPayers: number
    thirdTimePayers: number
    totalCustomers: number
  }
  revenue: {
    total: number
    currency: string
    period: {
      days: number
      from: string
      to: string
    }
  }
  revenueOverTime: Array<{ date: string; amount: number }>
  totalTransactions: number
  successfulTransactions: number
  payingCustomers: Array<{
    customerId: number
    email: string | null
    phone: string | null
    totalSpent: number
    transactionCount: number
    firstPaymentDate: string | null
    lastPaymentDate: string | null
  }>
}

export function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [paymentAnalytics, setPaymentAnalytics] = useState<PaymentAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [paymentLoading, setPaymentLoading] = useState(true)

  useEffect(() => {
    fetchStats()
    fetchPaymentAnalytics()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/stats")
      if (response.status === 401) {
        router.push("/admin/login")
        return
      }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.message || errorData.error || `Failed to fetch stats: ${response.status}`
        console.error("Error fetching stats:", errorMessage, errorData)
        throw new Error(errorMessage)
      }
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error("Error fetching stats:", error)
      // Set default stats on error to prevent undefined errors
      setStats({
        totalGenerations: 0,
        totalUsers: 0,
        blockedUsers: 0,
        recentGenerations: 0,
        generationsByStatus: {},
        generationsOverTime: [],
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPaymentAnalytics = async () => {
    try {
      const response = await fetch("/api/admin/payments")
      if (response.status === 401) {
        router.push("/admin/login")
        return
      }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.message || errorData.error || `Failed to fetch payment analytics: ${response.status}`
        console.error("Error fetching payment analytics:", errorMessage, errorData)
        // Set default payment analytics on error
        setPaymentAnalytics({
          payingUsersCount: 0,
          activeSubscriptions: 0,
          paymentStatusBreakdown: {
            success: 0,
            failed: 0,
            pending: 0,
            abandoned: 0,
          },
          paymentAttemptHistory: {
            firstTimePayers: 0,
            repeatPayers: 0,
            thirdTimePayers: 0,
            totalCustomers: 0,
          },
          revenue: {
            total: 0,
            currency: "KES",
            period: {
              days: 30,
              from: new Date().toISOString(),
              to: new Date().toISOString(),
            },
          },
          revenueOverTime: [],
          totalTransactions: 0,
          successfulTransactions: 0,
          payingCustomers: [],
        })
        return
      }
      const data = await response.json()
      setPaymentAnalytics(data)
    } catch (error) {
      console.error("Error fetching payment analytics:", error)
      // Set default payment analytics on error
      setPaymentAnalytics({
        payingUsersCount: 0,
        activeSubscriptions: 0,
        paymentStatusBreakdown: {
          success: 0,
          failed: 0,
          pending: 0,
          abandoned: 0,
        },
        paymentAttemptHistory: {
          firstTimePayers: 0,
          repeatPayers: 0,
          thirdTimePayers: 0,
          totalCustomers: 0,
        },
        revenue: {
          total: 0,
          currency: "KES",
          period: {
            days: 30,
            from: new Date().toISOString(),
            to: new Date().toISOString(),
          },
        },
          revenueOverTime: [],
          totalTransactions: 0,
          successfulTransactions: 0,
          payingCustomers: [],
      })
    } finally {
      setPaymentLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" })
      router.push("/admin/login")
    } catch (error) {
      console.error("Error logging out:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black/95">
        <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm">
          <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
            <Skeleton className="h-7 sm:h-8 w-40 sm:w-48 bg-gray-800" />
            <Skeleton className="h-9 sm:h-10 w-full sm:w-24 bg-gray-800" />
          </div>
        </header>
        <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="bg-black/40 border-gray-700 backdrop-blur-sm">
                <CardHeader>
                  <Skeleton className="h-4 w-24 bg-gray-800" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-20 mb-2 bg-gray-800" />
                  <Skeleton className="h-3 w-32 bg-gray-800" />
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black/95">
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <h1 className="text-xl sm:text-2xl font-bold text-white">Admin Dashboard</h1>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="text-white border-gray-700 hover:bg-gray-800 text-sm sm:text-base w-full sm:w-auto"
          >
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8">
        <StatsCards stats={stats} />
        
        {paymentLoading ? (
          <div className="mt-8">
            <Card className="bg-black/40 border-gray-700 backdrop-blur-sm">
              <CardHeader>
                <Skeleton className="h-6 w-48 bg-gray-800" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-8 w-20 bg-gray-800" />
                      <Skeleton className="h-3 w-32 bg-gray-800" />
                    </div>
                  ))}
                </div>
                <Skeleton className="h-32 w-full bg-gray-800" />
              </CardContent>
            </Card>
          </div>
        ) : paymentAnalytics ? (
          <>
            <div className="mt-8">
              <PaymentStats analytics={paymentAnalytics} />
            </div>
            {paymentAnalytics.payingCustomers.length > 0 && (
              <div className="mt-8">
                <PayingCustomers
                  customers={paymentAnalytics.payingCustomers}
                  currency={paymentAnalytics.revenue.currency}
                />
              </div>
            )}
          </>
        ) : null}
        
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lg:col-span-2">
            <UsersTable />
          </div>
          <div className="lg:col-span-2">
            <RecentGenerations />
          </div>
        </div>
      </main>
    </div>
  )
}

