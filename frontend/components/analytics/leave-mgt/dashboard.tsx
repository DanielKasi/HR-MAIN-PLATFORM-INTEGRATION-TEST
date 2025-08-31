"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, Clock, CheckCircle, XCircle, AlertCircle, Users } from "lucide-react"
import { getLeaveDashboard } from "@/lib/utils"
import type { ILeaveDashboard } from "@/types/types.utils"

export default function LeaveDashboard() {
  const [data, setData] = useState<ILeaveDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const dashboardData = await getLeaveDashboard()
        setData(dashboardData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading leave dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "pending":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-800 border-green-200"
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-balance">Leave Management Dashboard</h1>
          <p className="text-muted-foreground text-pretty">
            Monitor leave applications, balances, and approval workflows
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_leave_applications}</div>
            <p className="text-xs text-muted-foreground">All time applications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{data.pending_approvals}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Days Taken</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.average_leave_days_taken}</div>
            <p className="text-xs text-muted-foreground">Per approved application</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leave Types</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.applications_by_leave_type.length}</div>
            <p className="text-xs text-muted-foreground">Active leave types</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Applications by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Applications by Status</CardTitle>
            <CardDescription>Current status breakdown of all leave applications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.applications_by_status.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(item.status)}
                    <span className="font-medium capitalize">{item.status}</span>
                  </div>
                  <Badge variant="outline" className={getStatusColor(item.status)}>
                    {item.count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Applications by Leave Type */}
        <Card>
          <CardHeader>
            <CardTitle>Applications by Leave Type</CardTitle>
            <CardDescription>Distribution of applications across different leave types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.applications_by_leave_type.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    <span className="font-medium">{item.leave_type}</span>
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    {item.count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leave Balances */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Balances by Type</CardTitle>
          <CardDescription>Overview of allocated, used, and available leave days</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Leave Type</th>
                  <th className="text-right p-3 font-medium">Allocated</th>
                  <th className="text-right p-3 font-medium">Used</th>
                  <th className="text-right p-3 font-medium">Available</th>
                  <th className="text-right p-3 font-medium">Usage %</th>
                </tr>
              </thead>
              <tbody>
                {data.leave_balances_by_type.map((balance, index) => {
                  const usagePercentage =
                    balance.total_allocated_days > 0
                      ? Math.round((balance.total_used_days / balance.total_allocated_days) * 100)
                      : 0

                  return (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="p-3 font-medium">{balance.leave_type}</td>
                      <td className="p-3 text-right">{balance.total_allocated_days}</td>
                      <td className="p-3 text-right">{balance.total_used_days}</td>
                      <td className="p-3 text-right">{balance.total_available_days}</td>
                      <td className="p-3 text-right">
                        <Badge
                          variant="outline"
                          className={
                            usagePercentage > 80
                              ? "bg-red-100 text-red-800 border-red-200"
                              : usagePercentage > 60
                                ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                : "bg-green-100 text-green-800 border-green-200"
                          }
                        >
                          {usagePercentage}%
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Applications Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Applications Timeline</CardTitle>
          <CardDescription>Leave applications submitted over the last 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.applications_over_time.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{item.date}</span>
                </div>
                <Badge variant="outline" className="bg-card text-card-foreground">
                  {item.count} applications
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
