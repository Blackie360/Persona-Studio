import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY
const PAYSTACK_BASE_URL = "https://api.paystack.co"

interface PaystackTransaction {
  id: number
  domain: string
  status: "success" | "failed" | "pending" | "reversed" | "abandoned"
  reference: string
  amount: number
  currency: string
  customer: {
    id: number
    email: string | null
    phone: string | null
  }
  paid_at: string | null
  created_at: string
  metadata: Record<string, unknown> | null
}

interface PaystackTransactionResponse {
  status: boolean
  message: string
  data: PaystackTransaction[]
  meta: {
    total: number
    skipped: number
    perPage: number
    page: number
    pageCount: number
  }
}

interface PaystackCustomer {
  id: number
  email: string | null
  phone: string | null
  created_at: string
}

interface PaystackCustomerResponse {
  status: boolean
  message: string
  data: PaystackCustomer[]
  meta: {
    total: number
    skipped: number
    perPage: number
    page: number
    pageCount: number
  }
}

interface PaystackSubscription {
  id: number
  customer: number
  plan: number
  status: "active" | "non-renewing" | "cancelled" | "complete"
  created_at: string
}

interface PaystackSubscriptionResponse {
  status: boolean
  message: string
  data: PaystackSubscription[]
  meta: {
    total: number
    skipped: number
    perPage: number
    page: number
    pageCount: number
  }
}

async function fetchAllPaystackTransactions(
  from?: Date,
  to?: Date
): Promise<PaystackTransaction[]> {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured")
  }

  const allTransactions: PaystackTransaction[] = []
  let page = 1
  const perPage = 100
  let hasMore = true

  while (hasMore) {
    const params = new URLSearchParams({
      perPage: perPage.toString(),
      page: page.toString(),
    })

    if (from) {
      params.append("from", from.toISOString())
    }
    if (to) {
      params.append("to", to.toISOString())
    }

    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction?${params.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }))
      throw new Error(`Paystack API error: ${error.message || response.statusText}`)
    }

    const data: PaystackTransactionResponse = await response.json()

    if (data.status && data.data) {
      allTransactions.push(...data.data)
    }

    hasMore = data.meta && page < data.meta.pageCount
    page++
  }

  return allTransactions
}

async function fetchAllPaystackCustomers(): Promise<PaystackCustomer[]> {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured")
  }

  const allCustomers: PaystackCustomer[] = []
  let page = 1
  const perPage = 100
  let hasMore = true

  while (hasMore) {
    const params = new URLSearchParams({
      perPage: perPage.toString(),
      page: page.toString(),
    })

    const response = await fetch(`${PAYSTACK_BASE_URL}/customer?${params.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }))
      throw new Error(`Paystack API error: ${error.message || response.statusText}`)
    }

    const data: PaystackCustomerResponse = await response.json()

    if (data.status && data.data) {
      allCustomers.push(...data.data)
    }

    hasMore = data.meta && page < data.meta.pageCount
    page++
  }

  return allCustomers
}

async function fetchAllPaystackSubscriptions(): Promise<PaystackSubscription[]> {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured")
  }

  const allSubscriptions: PaystackSubscription[] = []
  let page = 1
  const perPage = 100
  let hasMore = true

  while (hasMore) {
    const params = new URLSearchParams({
      perPage: perPage.toString(),
      page: page.toString(),
    })

    const response = await fetch(`${PAYSTACK_BASE_URL}/subscription?${params.toString()}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      // Subscriptions endpoint might not be available, return empty array
      if (response.status === 404) {
        return []
      }
      const error = await response.json().catch(() => ({ message: "Unknown error" }))
      throw new Error(`Paystack API error: ${error.message || response.statusText}`)
    }

    const data: PaystackSubscriptionResponse = await response.json()

    if (data.status && data.data) {
      allSubscriptions.push(...data.data)
    }

    hasMore = data.meta && page < data.meta.pageCount
    page++
  }

  return allSubscriptions
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    // Get date range from query params (default: last 30 days)
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get("days") || "30", 10)
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - days)

    // Fetch all data from Paystack
    const [transactions, customers, subscriptions] = await Promise.all([
      fetchAllPaystackTransactions(fromDate),
      fetchAllPaystackCustomers(),
      fetchAllPaystackSubscriptions().catch(() => []), // Gracefully handle if subscriptions endpoint doesn't exist
    ])

    // Calculate analytics
    const successfulTransactions = transactions.filter((t) => t.status === "success")
    const failedTransactions = transactions.filter((t) => t.status === "failed")
    const pendingTransactions = transactions.filter((t) => t.status === "pending")
    const abandonedTransactions = transactions.filter((t) => t.status === "abandoned")

    // Get unique paying customers (customers with at least one successful transaction)
    const payingCustomerIds = new Set(
      successfulTransactions.map((t) => t.customer?.id).filter((id): id is number => !!id)
    )
    const payingUsersCount = payingCustomerIds.size

    // Calculate payment attempt history
    const customerPaymentCounts = new Map<number, number>()
    transactions.forEach((t) => {
      if (t.customer?.id) {
        customerPaymentCounts.set(t.customer.id, (customerPaymentCounts.get(t.customer.id) || 0) + 1)
      }
    })

    const firstTimePayers = Array.from(customerPaymentCounts.values()).filter((count) => count === 1).length
    const repeatPayers = Array.from(customerPaymentCounts.values()).filter((count) => count > 1).length
    const thirdTimePayers = Array.from(customerPaymentCounts.values()).filter((count) => count >= 3).length

    // Calculate revenue
    const totalRevenue = successfulTransactions.reduce((sum, t) => sum + t.amount, 0)
    const revenueInMainCurrency = totalRevenue / 100 // Convert from smallest unit to main currency

    // Active subscriptions count
    const activeSubscriptions = subscriptions.filter((s) => s.status === "active").length

    // Payment status breakdown
    const paymentStatusBreakdown = {
      success: successfulTransactions.length,
      failed: failedTransactions.length,
      pending: pendingTransactions.length,
      abandoned: abandonedTransactions.length,
    }

    // Revenue over time (last 30 days, grouped by day)
    const revenueByDay = new Map<string, number>()
    successfulTransactions.forEach((t) => {
      if (t.paid_at) {
        const date = new Date(t.paid_at).toISOString().split("T")[0]
        revenueByDay.set(date, (revenueByDay.get(date) || 0) + t.amount)
      }
    })

    const revenueOverTime = Array.from(revenueByDay.entries())
      .map(([date, amount]) => ({
        date,
        amount: amount / 100, // Convert to main currency
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Build paying customers list with payment details
    const payingCustomersMap = new Map<number, {
      customerId: number
      email: string | null
      phone: string | null
      totalSpent: number
      transactionCount: number
      firstPaymentDate: string | null
      lastPaymentDate: string | null
    }>()

    successfulTransactions.forEach((t) => {
      if (t.customer?.id) {
        const customerId = t.customer.id
        const existing = payingCustomersMap.get(customerId)

        if (existing) {
          existing.totalSpent += t.amount
          existing.transactionCount += 1
          if (t.paid_at) {
            const paidDate = new Date(t.paid_at)
            if (!existing.lastPaymentDate || paidDate > new Date(existing.lastPaymentDate)) {
              existing.lastPaymentDate = t.paid_at
            }
            if (!existing.firstPaymentDate || paidDate < new Date(existing.firstPaymentDate)) {
              existing.firstPaymentDate = t.paid_at
            }
          }
        } else {
          payingCustomersMap.set(customerId, {
            customerId,
            email: t.customer.email,
            phone: t.customer.phone,
            totalSpent: t.amount,
            transactionCount: 1,
            firstPaymentDate: t.paid_at || t.created_at,
            lastPaymentDate: t.paid_at || t.created_at,
          })
        }
      }
    })

    // Convert to array and sort by total spent (descending)
    const payingCustomers = Array.from(payingCustomersMap.values())
      .map((customer) => ({
        ...customer,
        totalSpent: customer.totalSpent / 100, // Convert to main currency
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)

    return NextResponse.json({
      payingUsersCount,
      activeSubscriptions,
      paymentStatusBreakdown,
      paymentAttemptHistory: {
        firstTimePayers,
        repeatPayers,
        thirdTimePayers,
        totalCustomers: customers.length,
      },
      revenue: {
        total: revenueInMainCurrency,
        currency: transactions[0]?.currency || "KES",
        period: {
          days,
          from: fromDate.toISOString(),
          to: new Date().toISOString(),
        },
      },
      revenueOverTime,
      totalTransactions: transactions.length,
      successfulTransactions: successfulTransactions.length,
      payingCustomers,
    })
  } catch (error) {
    console.error("Error fetching Paystack analytics:", error)
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      if (error.message.includes("PAYSTACK_SECRET_KEY")) {
        return NextResponse.json(
          { error: "Paystack not configured", message: error.message },
          { status: 500 }
        )
      }
    }
    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}

