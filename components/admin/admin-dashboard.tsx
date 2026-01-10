"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { StatsCards } from "./stats-cards"
import { UsersTable } from "./users-table"
import { RecentGenerations } from "./recent-generations"
import { Button } from "@/components/ui/button"

interface DashboardStats {
  totalGenerations: number
  totalUsers: number
  blockedUsers: number
  recentGenerations: number
  generationsByStatus: Record<string, number>
  generationsOverTime: Array<{ date: string; count: number }>
}

export function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
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
      <div className="min-h-screen bg-black/95 p-8">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black/95">
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
          <Button
            onClick={handleLogout}
            variant="outline"
            className="text-white border-gray-700 hover:bg-gray-800"
          >
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <StatsCards stats={stats} />
        
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

