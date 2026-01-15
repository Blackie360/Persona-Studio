"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

interface PayingCustomer {
  customerId: number
  email: string | null
  phone: string | null
  totalSpent: number
  transactionCount: number
  firstPaymentDate: string | null
  lastPaymentDate: string | null
}

interface PayingCustomersProps {
  customers: PayingCustomer[]
  currency?: string
}

export function PayingCustomers({ customers, currency = "KES" }: PayingCustomersProps) {
  if (!customers || customers.length === 0) {
    return (
      <Card className="bg-black/40 border-gray-700 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-gray-300 text-sm font-medium">
            Paying Customers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-400 py-8">No paying customers found</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-black/40 border-gray-700 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-gray-300 text-sm font-medium">
          Paying Customers ({customers.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700 hover:bg-gray-800/50">
                <TableHead className="text-gray-300">Email</TableHead>
                <TableHead className="text-gray-300">Phone</TableHead>
                <TableHead className="text-gray-300 text-right">Total Spent</TableHead>
                <TableHead className="text-gray-300 text-right">Transactions</TableHead>
                <TableHead className="text-gray-300">First Payment</TableHead>
                <TableHead className="text-gray-300">Last Payment</TableHead>
                <TableHead className="text-gray-300">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow
                  key={customer.customerId}
                  className="border-gray-700 hover:bg-gray-800/50"
                >
                  <TableCell className="text-white">
                    {customer.email || (
                      <span className="text-gray-500 italic">No email</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {customer.phone || (
                      <span className="text-gray-500 italic">No phone</span>
                    )}
                  </TableCell>
                  <TableCell className="text-white text-right font-medium">
                    {currency} {customer.totalSpent.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </TableCell>
                  <TableCell className="text-white text-right">
                    {customer.transactionCount}
                  </TableCell>
                  <TableCell className="text-gray-400">
                    {customer.firstPaymentDate
                      ? new Date(customer.firstPaymentDate).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell className="text-gray-400">
                    {customer.lastPaymentDate
                      ? new Date(customer.lastPaymentDate).toLocaleDateString()
                      : "-"}
                  </TableCell>
                  <TableCell>
                    {customer.transactionCount >= 3 ? (
                      <Badge className="bg-green-600 hover:bg-green-700 text-white">
                        Repeat Customer
                      </Badge>
                    ) : customer.transactionCount === 1 ? (
                      <Badge variant="secondary" className="bg-blue-600 hover:bg-blue-700 text-white">
                        First Time
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-purple-600 hover:bg-purple-700 text-white">
                        Returning
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

