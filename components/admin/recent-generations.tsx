"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

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
        throw new Error("Failed to fetch generations")
      }
      const data = await response.json()
      setGenerations(data.generations)
    } catch (error) {
      console.error("Error fetching generations:", error)
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
      <CardHeader>
        <CardTitle className="text-white">Recent Generations</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-gray-400">Loading generations...</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700">
                  <TableHead className="text-gray-300">User</TableHead>
                  <TableHead className="text-gray-300">Prompt</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generations.map((gen) => (
                  <TableRow key={gen.id} className="border-gray-700">
                    <TableCell className="text-white">
                      {gen.userName || gen.userEmail || "Anonymous"}
                    </TableCell>
                    <TableCell className="text-gray-300 max-w-md truncate">
                      {gen.prompt}
                    </TableCell>
                    <TableCell>{getStatusBadge(gen.status)}</TableCell>
                    <TableCell className="text-gray-400">
                      {new Date(gen.createdAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {generations.length === 0 && (
              <div className="text-center text-gray-400 py-8">No generations found</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}



