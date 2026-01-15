"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

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
}

interface PaymentStatsProps {
  analytics: PaymentAnalytics
}

export function PaymentStats({ analytics }: PaymentStatsProps) {
  const {
    payingUsersCount,
    activeSubscriptions,
    paymentStatusBreakdown,
    paymentAttemptHistory,
    revenue,
    revenueOverTime,
    totalTransactions,
    successfulTransactions,
  } = analytics

  const successRate =
    totalTransactions > 0
      ? ((successfulTransactions / totalTransactions) * 100).toFixed(1)
      : "0.0"

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white mb-3 sm:mb-4">Payment Analytics</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-black/40 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-gray-300 text-sm font-medium">
                Paying Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                {payingUsersCount.toLocaleString()}
              </div>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Users with successful payments
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-gray-300 text-sm font-medium">
                Active Subscriptions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                {activeSubscriptions.toLocaleString()}
              </div>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Currently active
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-gray-300 text-sm font-medium">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-400 break-words">
                {revenue.currency} {revenue.total.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                Last {revenue.period.days} days
              </p>
            </CardContent>
          </Card>

          <Card className="bg-black/40 border-gray-700 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-gray-300 text-sm font-medium">
                Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                {successRate}%
              </div>
              <p className="text-xs sm:text-sm text-gray-400 mt-1 break-words">
                {successfulTransactions} / {totalTransactions} transactions
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="status" className="w-full">
        <TabsList className="bg-black/40 border-gray-700 w-full overflow-x-auto flex-nowrap sm:flex-wrap">
          <TabsTrigger value="status" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white text-xs sm:text-sm whitespace-nowrap">
            Payment Status
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white text-xs sm:text-sm whitespace-nowrap">
            Payment History
          </TabsTrigger>
          <TabsTrigger value="revenue" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white text-xs sm:text-sm whitespace-nowrap">
            Revenue Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="mt-3 sm:mt-4">
          <Card className="bg-black/40 border-gray-700 backdrop-blur-sm">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-gray-300 text-sm sm:text-base font-medium">
                Payment Status Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
                <Badge
                  variant="default"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Success: {paymentStatusBreakdown.success.toLocaleString()}
                </Badge>
                <Badge
                  variant="destructive"
                  className="bg-red-600 hover:bg-red-700"
                >
                  Failed: {paymentStatusBreakdown.failed.toLocaleString()}
                </Badge>
                <Badge
                  variant="secondary"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  Pending: {paymentStatusBreakdown.pending.toLocaleString()}
                </Badge>
                <Badge
                  variant="secondary"
                  className="bg-gray-600 hover:bg-gray-700 text-white"
                >
                  Abandoned: {paymentStatusBreakdown.abandoned.toLocaleString()}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Success Rate</span>
                  <span className="text-white font-medium">{successRate}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{ width: `${successRate}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-3 sm:mt-4">
          <Card className="bg-black/40 border-gray-700 backdrop-blur-sm">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-gray-300 text-sm sm:text-base font-medium">
                Payment Attempt History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <Table>
                <TableHeader>
                  <TableRow className="border-gray-700 hover:bg-gray-800/50">
                    <TableHead className="text-gray-300">Category</TableHead>
                    <TableHead className="text-gray-300 text-right">Count</TableHead>
                    <TableHead className="text-gray-300 text-right">Percentage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="border-gray-700 hover:bg-gray-800/50">
                    <TableCell className="text-white font-medium">
                      First Time Payers
                    </TableCell>
                    <TableCell className="text-white text-right">
                      {paymentAttemptHistory.firstTimePayers.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-gray-400 text-right">
                      {paymentAttemptHistory.totalCustomers > 0
                        ? (
                            (paymentAttemptHistory.firstTimePayers /
                              paymentAttemptHistory.totalCustomers) *
                            100
                          ).toFixed(1)
                        : "0.0"}
                      %
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-gray-700 hover:bg-gray-800/50">
                    <TableCell className="text-white font-medium">
                      Repeat Payers (2+ times)
                    </TableCell>
                    <TableCell className="text-white text-right">
                      {paymentAttemptHistory.repeatPayers.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-gray-400 text-right">
                      {paymentAttemptHistory.totalCustomers > 0
                        ? (
                            (paymentAttemptHistory.repeatPayers /
                              paymentAttemptHistory.totalCustomers) *
                            100
                          ).toFixed(1)
                        : "0.0"}
                      %
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-gray-700 hover:bg-gray-800/50">
                    <TableCell className="text-white font-medium">
                      Third Time+ Payers
                    </TableCell>
                    <TableCell className="text-white text-right">
                      {paymentAttemptHistory.thirdTimePayers.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-gray-400 text-right">
                      {paymentAttemptHistory.totalCustomers > 0
                        ? (
                            (paymentAttemptHistory.thirdTimePayers /
                              paymentAttemptHistory.totalCustomers) *
                            100
                          ).toFixed(1)
                        : "0.0"}
                      %
                    </TableCell>
                  </TableRow>
                  <TableRow className="border-gray-700 hover:bg-gray-800/50">
                    <TableCell className="text-white font-medium">
                      Total Customers
                    </TableCell>
                    <TableCell className="text-white text-right">
                      {paymentAttemptHistory.totalCustomers.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-gray-400 text-right">100%</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="mt-3 sm:mt-4">
          <Card className="bg-black/40 border-gray-700 backdrop-blur-sm">
            <CardHeader className="pb-3 sm:pb-6">
              <CardTitle className="text-gray-300 text-sm sm:text-base font-medium">
                Revenue Over Time (Last {revenue.period.days} days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {revenueOverTime.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
                    Total: {revenue.currency}{" "}
                    {revenue.total.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {revenueOverTime.map((item) => (
                      <div
                        key={item.date}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0 p-2 sm:p-3 rounded bg-gray-800/50 hover:bg-gray-800"
                      >
                        <span className="text-gray-300 text-xs sm:text-sm">
                          {new Date(item.date).toLocaleDateString()}
                        </span>
                        <span className="text-green-400 font-medium text-xs sm:text-sm">
                          {revenue.currency} {item.amount.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  No revenue data available for this period
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

