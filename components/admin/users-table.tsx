"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"

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
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-white text-sm sm:text-base">Users</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-300 text-xs sm:text-sm whitespace-nowrap">User</TableHead>
                      <TableHead className="text-gray-300 text-xs sm:text-sm whitespace-nowrap">Email</TableHead>
                      <TableHead className="text-gray-300 text-xs sm:text-sm whitespace-nowrap">Generations</TableHead>
                      <TableHead className="text-gray-300 text-xs sm:text-sm whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-gray-300 text-xs sm:text-sm whitespace-nowrap">Joined</TableHead>
                      <TableHead className="text-gray-300 text-xs sm:text-sm whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[1, 2, 3, 4, 5].map((i) => (
                      <TableRow key={i} className="border-gray-700">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Skeleton className="h-8 w-8 rounded-full bg-gray-800" />
                            <Skeleton className="h-4 w-24 bg-gray-800" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-32 bg-gray-800" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-12 bg-gray-800" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-16 bg-gray-800" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20 bg-gray-800" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-8 w-20 bg-gray-800" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-300 text-xs sm:text-sm whitespace-nowrap">User</TableHead>
                      <TableHead className="text-gray-300 text-xs sm:text-sm whitespace-nowrap">Email</TableHead>
                      <TableHead className="text-gray-300 text-xs sm:text-sm whitespace-nowrap">Generations</TableHead>
                      <TableHead className="text-gray-300 text-xs sm:text-sm whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-gray-300 text-xs sm:text-sm whitespace-nowrap">Joined</TableHead>
                      <TableHead className="text-gray-300 text-xs sm:text-sm whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id} className="border-gray-700">
                        <TableCell className="text-white text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                              <AvatarImage src={user.image || undefined} />
                              <AvatarFallback className="bg-gray-700 text-gray-300 text-xs sm:text-sm">
                                {user.name?.charAt(0)?.toUpperCase() || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate max-w-[100px] sm:max-w-none">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-300 text-xs sm:text-sm">
                          <div className="max-w-[150px] sm:max-w-none truncate">{user.email}</div>
                        </TableCell>
                        <TableCell className="text-white text-xs sm:text-sm">{user.generationCount}</TableCell>
                        <TableCell>
                          <Badge variant={user.isBlocked ? "destructive" : "default"} className="text-xs">
                            {user.isBlocked ? "Blocked" : "Active"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-400 text-xs sm:text-sm whitespace-nowrap">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {user.isBlocked ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnblock(user.id)}
                              className="text-white border-gray-700 hover:bg-gray-800 text-xs sm:text-sm"
                            >
                              Unblock
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleBlock(user.id)}
                              className="text-xs sm:text-sm"
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
            </div>
            {users.length === 0 && (
              <div className="text-center text-gray-400 py-8 text-sm">No users found</div>
            )}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="text-white border-gray-700 text-xs sm:text-sm w-full sm:w-auto"
                >
                  Previous
                </Button>
                <span className="text-gray-400 text-xs sm:text-sm">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="text-white border-gray-700 text-xs sm:text-sm w-full sm:w-auto"
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





