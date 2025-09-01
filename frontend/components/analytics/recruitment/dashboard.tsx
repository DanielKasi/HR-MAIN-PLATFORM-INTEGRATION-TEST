"use client"

import { useState, useEffect } from "react"
import type { IRecruitmentDashboard } from "@/types/types.utils"
import { getRecruitmentDashboard } from "@/lib/utils"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

import { Filter, Users, Briefcase, CalendarDays, Clock, UserCheck, TrendingUp } from "lucide-react"
import { KPICard } from "./kpi-card"
import { SourceChart } from "./source-chart"
import { TimelineChart } from "./timeline-chart"
import { StatusChart } from "./status-chart"

export function RecruitmentDashboard() {
  const [data, setData] = useState<IRecruitmentDashboard | null>(null)
  const [timeRange, setTimeRange] = useState("6months")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await getRecruitmentDashboard()
        setData(res)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (error) {
    return <div className="flex items-center justify-center min-h-screen text-red-500">{error}</div>
  }

  if (!data) {
    return <div className="flex items-center justify-center min-h-screen">No data available</div>
  }

  return (
    <div className="w-full">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-balance">Recruitment Analytics</h1>
              <p className="text-muted-foreground mt-1">Track your hiring pipeline performance</p>
            </div>
            <div className="flex items-center gap-4">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1month">Last Month</SelectItem>
                  <SelectItem value="3months">Last 3 Months</SelectItem>
                  <SelectItem value="6months">Last 6 Months</SelectItem>
                  <SelectItem value="1year">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className=" px-6 py-8 space-y-8">
        {/* KPI Overview */}
        <section>
          <h2 className="text-2xl font-semibold mb-6 text-balance">Key Performance Indicators</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Total Applications"
              value={data.total_applications}
              icon={<Users className="h-5 w-5" />}
              trend="+12%"
              trendUp={true}
            />
            <KPICard
              title="Active Positions"
              value={data.active_job_positions}
              icon={<Briefcase className="h-5 w-5" />}
              trend="+3"
              trendUp={true}
            />
            <KPICard
              title="Upcoming Interviews"
              value={data.upcoming_interviews}
              icon={<CalendarDays className="h-5 w-5" />}
              trend="This week"
              trendUp={null}
            />
            <KPICard
              title="Avg. Time to Hire"
              value={`${data.average_time_to_hire_days} days`}
              icon={<Clock className="h-5 w-5" />}
              trend="-5 days"
              trendUp={true}
            />
          </div>
        </section>

        {/* Charts Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Applications by Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Applications by Status
              </CardTitle>
              <CardDescription>Current application pipeline breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <StatusChart data={data.applications_by_status} />
            </CardContent>
          </Card>

          {/* Interview Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                Interview Status
              </CardTitle>
              <CardDescription>Interview pipeline overview</CardDescription>
            </CardHeader>
            <CardContent>
              <StatusChart data={data.interviews_by_status} />
            </CardContent>
          </Card>

          {/* Applications Over Time */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Applications Over Time
              </CardTitle>
              <CardDescription>Application trends for the last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <TimelineChart data={data.applications_over_time} />
            </CardContent>
          </Card>

          {/* Application Sources */}
          <Card>
            <CardHeader>
              <CardTitle>Application Sources</CardTitle>
              <CardDescription>Where candidates are coming from</CardDescription>
            </CardHeader>
            <CardContent>
              <SourceChart data={data.applications_sources} />
            </CardContent>
          </Card>

          {/* Onboarding Status */}
          <Card>
            <CardHeader>
              <CardTitle>Onboarding Status</CardTitle>
              <CardDescription>Current onboarding pipeline</CardDescription>
            </CardHeader>
            <CardContent>
              <StatusChart data={data.onboardings_by_status} />
            </CardContent>
          </Card>
        </section>

        {/* Summary Stats */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Pipeline Summary</CardTitle>
              <CardDescription>Complete recruitment funnel overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{data.total_job_positions}</div>
                  <div className="text-sm text-muted-foreground">Total Positions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{data.total_adverts}</div>
                  <div className="text-sm text-muted-foreground">Total Adverts</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{data.total_interviews}</div>
                  <div className="text-sm text-muted-foreground">Total Interviews</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{data.total_onboardings}</div>
                  <div className="text-sm text-muted-foreground">Total Onboardings</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}

