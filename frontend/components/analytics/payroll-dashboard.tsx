"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getPayrollDashboard } from "@/lib/utils"
import type { IPayrollDashboard } from "@/types/types.utils"

export default function PayrollDashboard() {
  const [data, setData] = useState<IPayrollDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const dashboardData = await getPayrollDashboard()
        setData(dashboardData)
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading payroll dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-destructive">Error: {error}</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">No data available</div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  return (
    <div className="bg-background p-6">
      <div className=" space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Payroll Analytics Dashboard</h1>
          <p className="text-lg text-muted-foreground">Comprehensive payroll metrics and financial insights</p>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Payroll Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{formatCurrency(data.total_payroll_amount)}</div>
              <p className="text-xs text-muted-foreground mt-1">Current year</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Salary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{formatCurrency(data.average_salary)}</div>
              <p className="text-xs text-muted-foreground mt-1">Per employee</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Penalties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{data.total_penalties}</div>
              <p className="text-xs text-muted-foreground mt-1">Current year</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Average Overtime Pay</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-secondary">{formatCurrency(data.average_overtime_pay)}</div>
              <p className="text-xs text-muted-foreground mt-1">Per employee</p>
            </CardContent>
          </Card>
        </div>

        {/* Department Breakdown */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">Payroll by Department</CardTitle>
            <CardDescription className="text-muted-foreground">
              Current year payroll distribution across departments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.payroll_by_department.map((dept, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-primary"></div>
                    <span className="font-medium text-foreground">{dept.department}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-foreground">{formatCurrency(dept.total_amount)}</div>
                    <div className="text-sm text-muted-foreground">
                      {((dept.total_amount / data.total_payroll_amount) * 100).toFixed(1)}% of total
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payroll Timeline */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">Payroll Over Time</CardTitle>
            <CardDescription className="text-muted-foreground">
              Monthly payroll amounts for the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.payroll_over_time.map((month, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-accent"></div>
                    <span className="font-medium text-foreground">{month.month}</span>
                  </div>
                  <div className="font-semibold text-foreground">{formatCurrency(month.total_amount)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-foreground">Payroll Summary</CardTitle>
            <CardDescription className="text-muted-foreground">Key financial metrics and insights</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-muted-foreground">Total Departments</span>
                  <span className="font-semibold text-foreground">{data.payroll_by_department.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-muted-foreground">Highest Department Cost</span>
                  <span className="font-semibold text-foreground">
                    {formatCurrency(Math.max(...data.payroll_by_department.map((d) => d.total_amount)))}
                  </span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-muted-foreground">Penalty Rate</span>
                  <span className="font-semibold text-destructive">
                    {data.total_penalties > 0 ? `{data.total_penalties} instances` : "No penalties"}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="text-muted-foreground">Overtime Contribution</span>
                  <span className="font-semibold text-secondary">{formatCurrency(data.average_overtime_pay)} avg</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
