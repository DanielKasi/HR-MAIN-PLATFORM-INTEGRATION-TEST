"use client"

import { useState, useEffect } from "react"
import type { IRecruitmentDashboard } from "@/types/types.utils"
import { getRecruitmentDashboard } from "@/lib/utils"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"

import { Filter, Users, Briefcase, CalendarDays, Clock, UserCheck, TrendingUp, AlertCircle } from "lucide-react"
import { EnhancedKPICard } from "./kpi-card"
import { DashboardSkeleton } from "./loading-skeleton"
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
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <div className="flex items-center space-x-2 text-destructive">
          <AlertCircle className="h-6 w-6" />
          <h2 className="text-xl font-semibold">Error Loading Dashboard</h2>
        </div>
        <p className="text-muted-foreground text-center max-w-md">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <div className="flex items-center space-x-2 text-muted-foreground">
          <Users className="h-6 w-6" />
          <h2 className="text-xl font-semibold">No Data Available</h2>
        </div>
        <p className="text-muted-foreground text-center max-w-md">
          There's no recruitment data to display at the moment.
        </p>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-background to-muted/20">
      <header className="border-b bg-card/80 backdrop-blur-xl supports-[backdrop-filter]:bg-card/80 sticky top-0 z-10">
        <div className="w-full px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h1 className="text-4xl font-bold text-balance bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Recruitment Analytics
              </h1>
              <p className="text-muted-foreground text-lg">Track your hiring pipeline performance and insights</p>
            </div>
            <div className="flex items-center gap-4">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-44 h-11 border-2 hover:border-accent/50 transition-colors">
                  <Filter className="h-4 w-4 mr-2 text-accent" />
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
      <div className="px-6 py-8 space-y-10">
        <section>
          <div className="flex items-center space-x-3 mb-8">
            <div className="h-8 w-1 bg-accent rounded-full"></div>
            <h2 className="text-3xl font-bold text-balance">Key Performance Indicators</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <EnhancedKPICard
              title="Total Applications"
              value={data.total_applications.toLocaleString()}
              icon={<Users className="h-6 w-6" />}
              trend="+12%"
              trendUp={true}
              description="vs. previous period"
            />
            <EnhancedKPICard
              title="Active Positions"
              value={data.active_job_positions}
              icon={<Briefcase className="h-6 w-6" />}
              trend="+3 new"
              trendUp={true}
              description="currently hiring"
            />
            <EnhancedKPICard
              title="Upcoming Interviews"
              value={data.upcoming_interviews}
              icon={<CalendarDays className="h-6 w-6" />}
              trend="This week"
              trendUp={null}
              description="scheduled interviews"
            />
            <EnhancedKPICard
              title="Avg. Time to Hire"
              value={`${data.average_time_to_hire_days} days`}
              icon={<Clock className="h-6 w-6" />}
              trend="-5 days"
              trendUp={true}
              description="improvement"
            />
          </div>
        </section>

        <section className="space-y-8">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-1 bg-accent rounded-full"></div>
            <h2 className="text-3xl font-bold text-balance">Analytics Overview</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Applications by Status */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80 hover:shadow-xl transition-all duration-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <UserCheck className="h-5 w-5 text-accent" />
                  </div>
                  Applications by Status
                </CardTitle>
                <CardDescription className="text-base">Current application pipeline breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <StatusChart data={data.applications_by_status} />
              </CardContent>
            </Card>

            {/* Interview Status */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80 hover:shadow-xl transition-all duration-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <CalendarDays className="h-5 w-5 text-accent" />
                  </div>
                  Interview Status
                </CardTitle>
                <CardDescription className="text-base">Interview pipeline overview</CardDescription>
              </CardHeader>
              <CardContent>
                <StatusChart data={data.interviews_by_status} />
              </CardContent>
            </Card>

            {/* Applications Over Time */}
            <Card className="lg:col-span-2 border-0 shadow-lg bg-gradient-to-br from-card to-card/80 hover:shadow-xl transition-all duration-200">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl">
                  <div className="p-2 bg-accent/10 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-accent" />
                  </div>
                  Applications Over Time
                </CardTitle>
                <CardDescription className="text-base">Application trends for the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <TimelineChart data={data.applications_over_time} />
              </CardContent>
            </Card>

            {/* Application Sources */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80 hover:shadow-xl transition-all duration-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Application Sources</CardTitle>
                <CardDescription className="text-base">Where candidates are coming from</CardDescription>
              </CardHeader>
              <CardContent>
                <SourceChart data={data.applications_sources} />
              </CardContent>
            </Card>

            {/* Onboarding Status */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80 hover:shadow-xl transition-all duration-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl">Onboarding Status</CardTitle>
                <CardDescription className="text-base">Current onboarding pipeline</CardDescription>
              </CardHeader>
              <CardContent>
                <StatusChart data={data.onboardings_by_status} />
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <div className="flex items-center space-x-3 mb-8">
            <div className="h-8 w-1 bg-accent rounded-full"></div>
            <h2 className="text-3xl font-bold text-balance">Pipeline Summary</h2>
          </div>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-card to-card/80">
            <CardHeader className="pb-6">
              <CardTitle className="text-xl">Complete Recruitment Funnel Overview</CardTitle>
              <CardDescription className="text-base">
                Comprehensive metrics across all recruitment stages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="text-center space-y-2">
                  <div className="text-4xl font-bold text-accent">{data.total_job_positions}</div>
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Total Positions
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-4xl font-bold text-accent">{data.total_adverts}</div>
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Total Adverts</div>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-4xl font-bold text-accent">{data.total_interviews}</div>
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Total Interviews
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-4xl font-bold text-accent">{data.total_onboardings}</div>
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Total Onboardings
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
