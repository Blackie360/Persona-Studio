"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface DashboardStats {
  totalGenerations: number
  totalUsers: number
  blockedUsers: number
  recentGenerations: number
  generationsByStatus: Record<string, number>
  generationsOverTime: Array<{ date: string; count: number }>
}

interface StatsCardsProps {
  stats: DashboardStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="bg-black/40 border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-gray-300 text-sm font-medium">
            Total Generations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-white">
            {stats.totalGenerations.toLocaleString()}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            All time generations
          </p>
        </CardContent>
      </Card>

      <Card className="bg-black/40 border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-gray-300 text-sm font-medium">
            Total Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-white">
            {stats.totalUsers.toLocaleString()}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Registered users
          </p>
        </CardContent>
      </Card>

      <Card className="bg-black/40 border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-gray-300 text-sm font-medium">
            Blocked Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-red-400">
            {stats.blockedUsers.toLocaleString()}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Currently blocked
          </p>
        </CardContent>
      </Card>

      <Card className="bg-black/40 border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-gray-300 text-sm font-medium">
            Recent Generations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-white">
            {stats.recentGenerations.toLocaleString()}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Last 7 days
          </p>
        </CardContent>
      </Card>

      {Object.keys(stats.generationsByStatus).length > 0 && (
        <Card className="bg-black/40 border-gray-700 backdrop-blur-sm md:col-span-2 lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-gray-300 text-sm font-medium">
              Generations by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.generationsByStatus).map(([status, count]) => (
                <Badge
                  key={status}
                  variant={status === "complete" ? "default" : status === "error" ? "destructive" : "secondary"}
                  className="text-sm"
                >
                  {status}: {count.toLocaleString()}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

