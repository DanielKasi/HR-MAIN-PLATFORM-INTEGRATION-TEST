"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, TrendingUp, UserCheck } from "lucide-react"
import { getEmployeeDashboard } from "@/lib/utils"
import type { IEmployeeDashboard } from "@/types/types.utils"

export default function EmployeeDashboard() {
  const [data, setData] = useState<IEmployeeDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const dashboardData = await getEmployeeDashboard()
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
        <div className="text-lg text-muted-foreground">Loading employee dashboard...</div>
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
        <div className="text-lg text-muted-foreground">No data available</div>
      </div>
    )
  }

  return (
    <div className="bg-background p-6">
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Employee Analytics Dashboard</h1>
          <p className="text-lg text-muted-foreground">Comprehensive workforce insights and metrics</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-accent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-accent">{data.total_employees}</div>
              <p className="text-xs text-muted-foreground">Active workforce</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-chart-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Age</CardTitle>
              <Clock className="h-4 w-4 text-chart-3" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chart-3">{data.average_age}</div>
              <p className="text-xs text-muted-foreground">Years old</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-chart-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Tenure</CardTitle>
              <TrendingUp className="h-4 w-4 text-chart-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chart-4">{data.average_tenure_years}</div>
              <p className="text-xs text-muted-foreground">Years of service</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-chart-5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Hires</CardTitle>
              <UserCheck className="h-4 w-4 text-chart-5" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chart-5">{data.recent_hires}</div>
              <p className="text-xs text-muted-foreground">New employees</p>
            </CardContent>
          </Card>
        </div>

        {/* Demographics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gender Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Gender Distribution</CardTitle>
              <CardDescription>Employee breakdown by gender</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.employees_by_gender.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="font-medium capitalize">{item.gender}</span>
                    <Badge variant="secondary" className="bg-accent text-accent-foreground">
                      {item.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Department Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Department Distribution</CardTitle>
              <CardDescription>Employee breakdown by department</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.employees_by_department.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="font-medium">{item.department}</span>
                    <Badge variant="secondary" className="bg-chart-3 text-white">
                      {item.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Employee Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Employee Type</CardTitle>
              <CardDescription>Breakdown by employment type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.employees_by_employee_type.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="font-medium">{item.employee_type}</span>
                    <Badge variant="secondary" className="bg-chart-4 text-white">
                      {item.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Work Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Work Type</CardTitle>
              <CardDescription>Remote vs office distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.employees_by_work_type.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="font-medium">{item.work_type}</span>
                    <Badge variant="secondary" className="bg-chart-5 text-white">
                      {item.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Shift Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Shift Status</CardTitle>
              <CardDescription>Current shift distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.shift_statuses.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="font-medium capitalize">{item.status}</span>
                    <Badge variant="secondary" className="bg-primary text-primary-foreground">
                      {item.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Marital Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Marital Status</CardTitle>
              <CardDescription>Employee marital status breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.employees_by_marital_status.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="font-medium capitalize">{item.marital_status}</span>
                    <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                      {item.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
