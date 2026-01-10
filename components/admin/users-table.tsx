"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface User {
  id: string
  name: string
  email: string
  image: string | null
  createdAt: string
  generationCount: number
  isBlocked: boolean
}

interface UsersTableProps {
  page?: number
  limit?: number
}

export function UsersTable({ page: initialPage = 1, limit = 50 }: UsersTableProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(initialPage)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchUsers()
  }, [page])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/users?page=${page}&limit=${limit}`)
      if (!response.ok) {
        throw new Error("Failed to fetch users")
      }
      const data = await response.json()
      setUsers(data.users)
      setTotalPages(data.pagination.totalPages)
    } catch (error) {
      console.error("Error fetching users:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleBlock = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Blocked by admin" }),
      })
      if (response.ok) {
        fetchUsers()
      }
    } catch (error) {
      console.error("Error blocking user:", error)
    }
  }

  const handleUnblock = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/unblock`, {
        method: "POST",
      })
      if (response.ok) {
        fetchUsers()
      }
    } catch (error) {
      console.error("Error unblocking user:", error)
    }
  }

  return (
    <Card className="bg-black/40 border-gray-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-white">Users</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-gray-400">Loading users...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">User</TableHead>
                    <TableHead className="text-gray-300">Email</TableHead>
                    <TableHead className="text-gray-300">Generations</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Joined</TableHead>
                    <TableHead className="text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="border-gray-700">
                      <TableCell className="text-white">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.image || undefined} />
                            <AvatarFallback className="bg-gray-700 text-gray-300">
                              {user.name?.charAt(0)?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span>{user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300">{user.email}</TableCell>
                      <TableCell className="text-white">{user.generationCount}</TableCell>
                      <TableCell>
                        {user.isBlocked ? (
                          <Badge variant="destructive">Blocked</Badge>
                        ) : (
                          <Badge variant="default">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {user.isBlocked ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnblock(user.id)}
                            className="text-white border-gray-700 hover:bg-gray-800"
                          >
                            Unblock
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleBlock(user.id)}
                          >
                            Block
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {users.length === 0 && (
              <div className="text-center text-gray-400 py-8">No users found</div>
            )}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-white border-gray-700"
                >
                  Previous
                </Button>
                <span className="text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="text-white border-gray-700"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

