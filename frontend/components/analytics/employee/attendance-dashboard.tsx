"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getAttendanceDashboard } from "@/lib/utils"
import type { IAttendanceDashboard } from "@/types/types.utils"

export default function AttendanceDashboard() {
  const [data, setData] = useState<IAttendanceDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const dashboardData = await getAttendanceDashboard()
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
        <div className="text-lg text-muted-foreground">Loading attendance dashboard...</div>
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
          <h1 className="text-4xl font-bold text-foreground">Attendance Analytics</h1>
          <p className="text-lg text-muted-foreground">
            Monitor attendance patterns, overtime, and spot check compliance
          </p>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-card-foreground">Total Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{data.total_attendance_records.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-card-foreground">Avg Overtime</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">{data.average_overtime_hours}h</div>
              <p className="text-xs text-muted-foreground mt-1">Per employee</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-card-foreground">Avg Late Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">{data.average_late_minutes}min</div>
              <p className="text-xs text-muted-foreground mt-1">Per late arrival</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-card-foreground">Spot Check Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">{data.spot_check_response_rate}%</div>
              <p className="text-xs text-muted-foreground mt-1">Response rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Status Breakdown */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-card-foreground">Attendance by Status</CardTitle>
            <CardDescription className="text-muted-foreground">
              Distribution of attendance records by status (last 30 days)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {data.attendance_by_status.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium text-foreground capitalize">{item.status}</p>
                    <p className="text-2xl font-bold text-primary">{item.count}</p>
                  </div>
                  <Badge variant="secondary" className="bg-accent text-accent-foreground">
                    {((item.count / data.total_attendance_records) * 100).toFixed(1)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Time Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-card-foreground">Time Metrics</CardTitle>
              <CardDescription className="text-muted-foreground">Average time-related metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Overtime Hours</p>
                  <p className="text-sm text-muted-foreground">Average per employee</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-accent">{data.average_overtime_hours}h</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Late Minutes</p>
                  <p className="text-sm text-muted-foreground">Average per late arrival</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-destructive">{data.average_late_minutes}min</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="font-medium text-foreground">Early Checkout</p>
                  <p className="text-sm text-muted-foreground">Average minutes early</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{data.average_early_checkout_minutes}min</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Spot Check Status */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-card-foreground">Spot Check Status</CardTitle>
              <CardDescription className="text-muted-foreground">Spot check compliance breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-accent/10 rounded-lg border border-accent/20">
                  <div>
                    <p className="font-medium text-foreground">Response Rate</p>
                    <p className="text-sm text-muted-foreground">Overall compliance</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-accent">{data.spot_check_response_rate}%</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {data.spot_checks_by_status.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <p className="font-medium text-foreground capitalize">{item.status}</p>
                      <Badge variant="outline" className="border-accent text-accent">
                        {item.count}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Attendance Timeline */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-card-foreground">Daily Attendance Trends</CardTitle>
            <CardDescription className="text-muted-foreground">
              Attendance records over the last 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.attendance_over_time.slice(-10).map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{new Date(item.date).toLocaleDateString()}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(item.date).toLocaleDateString("en-US", { weekday: "long" })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-primary">{item.count}</p>
                    <p className="text-sm text-muted-foreground">records</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
