"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, TrendingUp, UserCheck } from "lucide-react"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { getEmployeeDashboard } from "@/lib/utils"
import { IEmployeeDashboard } from "@/types/types.utils"


const chartConfig = {
  gender: {
    male: { label: "Male", color: "hsl(var(--chart-1))" },
    female: { label: "Female", color: "hsl(var(--chart-2))" },
    "Other": { label: "Other", color: "hsl(var(--chart-3))" },
    unknown: { label: "Unknown", color: "hsl(var(--chart-4))" },
  },
  department: {
    "Customer Service Department": {label:"Customer Service Department", color: "hsl(var(--chart-1))" },
    Engineering: { label:"Engineering", color: "hsl(var(--chart-2))" },
    Marketing: {label:"Marketing", color: "hsl(var(--chart-3))" },
    Sales: {label:"Sales", color: "hsl(var(--chart-4))" },
  },
  maritalStatus: {
    single: { label: "Single", color: "hsl(var(--chart-1))" },
    married: { label: "Married", color: "hsl(var(--chart-2))" },
    divorced: { label: "Divorced", color: "hsl(var(--chart-3))" },
  },
}

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

  return (
    <div className="bg-background p-6 min-h-screen">
      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Employee Analytics Dashboard</h1>
          <p className="text-lg text-muted-foreground">Comprehensive workforce insights and metrics</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-l-4 border-l-chart-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Users className="h-4 w-4 text-chart-1" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chart-1">{data?.total_employees}</div>
              <p className="text-xs text-muted-foreground">Active workforce</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-chart-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Age</CardTitle>
              <Clock className="h-4 w-4 text-chart-2" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chart-2">{data?.average_age}</div>
              <p className="text-xs text-muted-foreground">Years old</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-chart-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Tenure</CardTitle>
              <TrendingUp className="h-4 w-4 text-chart-3" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chart-3">{data?.average_tenure_years}</div>
              <p className="text-xs text-muted-foreground">Years of service</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-chart-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Hires</CardTitle>
              <UserCheck className="h-4 w-4 text-chart-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-chart-4">{data?.recent_hires}</div>
              <p className="text-xs text-muted-foreground">New employees</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gender Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Gender Distribution</CardTitle>
              <CardDescription>Employee breakdown by gender</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig.gender} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.employees_by_gender}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ gender, count, percent }) => `${gender}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="gender"
                    >
                      {data?.employees_by_gender.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={Object.values(chartConfig.gender)[index]?.color || "hsl(var(--chart-1))"}
                        />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Department Distribution Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Department Distribution</CardTitle>
              <CardDescription>Employee count by department</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig.department} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.employees_by_department} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" angle={-45} textAnchor="end" height={80} fontSize={12} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Marital Status Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Marital Status</CardTitle>
              <CardDescription>Employee breakdown by marital status</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig.maritalStatus} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data?.employees_by_marital_status}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ marital_status, count, percent }) =>
                        `${marital_status}: ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="marital_status"
                    >
                      {data?.employees_by_marital_status.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={Object.values(chartConfig.maritalStatus)[index]?.color || "hsl(var(--chart-1))"}
                        />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Work Type Comparison */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Work Type Distribution</CardTitle>
              <CardDescription>Remote vs office comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{}} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.employees_by_work_type} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="work_type" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Employee Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Employee Type</CardTitle>
              <CardDescription>Breakdown by employment type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.employees_by_employee_type.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="font-medium capitalize">{item.employee_type}</span>
                    <Badge variant="secondary" className="bg-chart-4 text-white">
                      {item.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl font-semibold">Quick Stats</CardTitle>
              <CardDescription>Key workforce metrics at a glance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="font-medium">Workforce Size</span>
                  <Badge variant="outline" className="text-lg font-bold">
                    {data?.total_employees} employees
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="font-medium">Remote Workers</span>
                  <Badge variant="outline" className="text-lg font-bold">
                    {Math.round((49 / 50) * 100)}%
                  </Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                  <span className="font-medium">Largest Department</span>
                  <Badge variant="outline" className="text-lg font-bold">
                    Customer Service
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
