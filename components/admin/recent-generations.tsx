"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

interface Generation {
  id: string
  userId: string | null
  sessionId: string | null
  status: string
  prompt: string
  imageUrl: string | null
  userName: string | null
  userEmail: string | null
  createdAt: string
  completedAt: string | null
}

export function RecentGenerations() {
  const [generations, setGenerations] = useState<Generation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchGenerations()
  }, [])

  const fetchGenerations = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/generations?limit=10")
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || `Failed to fetch generations: ${response.status} ${response.statusText}`)
      }
      const data = await response.json()
      setGenerations(data.generations || [])
    } catch (error) {
      console.error("Error fetching generations:", error)
      setGenerations([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "complete":
        return <Badge variant="default">Complete</Badge>
      case "error":
        return <Badge variant="destructive">Error</Badge>
      case "loading":
        return <Badge variant="secondary">Loading</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  return (
    <Card className="bg-black/40 border-gray-700 backdrop-blur-sm">
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-white text-sm sm:text-base">Recent Generations</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300 text-xs sm:text-sm whitespace-nowrap">User</TableHead>
                    <TableHead className="text-gray-300 text-xs sm:text-sm">Prompt</TableHead>
                    <TableHead className="text-gray-300 text-xs sm:text-sm whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-gray-300 text-xs sm:text-sm whitespace-nowrap">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <TableRow key={i} className="border-gray-700">
                      <TableCell>
                        <Skeleton className="h-4 w-24 bg-gray-800" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-48 bg-gray-800" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-16 bg-gray-800" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32 bg-gray-800" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300 text-xs sm:text-sm whitespace-nowrap">User</TableHead>
                    <TableHead className="text-gray-300 text-xs sm:text-sm">Prompt</TableHead>
                    <TableHead className="text-gray-300 text-xs sm:text-sm whitespace-nowrap">Status</TableHead>
                    <TableHead className="text-gray-300 text-xs sm:text-sm whitespace-nowrap">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generations.map((gen) => (
                    <TableRow key={gen.id} className="border-gray-700">
                      <TableCell className="text-white text-xs sm:text-sm">
                        <div className="max-w-[100px] sm:max-w-none truncate">
                          {gen.userName || gen.userEmail || "Anonymous"}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300 text-xs sm:text-sm max-w-[200px] sm:max-w-md truncate">
                        {gen.prompt}
                      </TableCell>
                      <TableCell>
                        <Badge variant={gen.status === "complete" ? "default" : gen.status === "error" ? "destructive" : "secondary"} className="text-xs">
                          {gen.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-400 text-xs sm:text-sm whitespace-nowrap">
                        {new Date(gen.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {generations.length === 0 && (
              <div className="text-center text-gray-400 py-8 text-sm">No generations found</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}





