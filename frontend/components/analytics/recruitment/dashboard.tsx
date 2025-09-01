"use client"

import { useState, useEffect } from "react"
import type { IRecruitmentDashboard } from "@/types/types.utils"
import { getRecruitmentDashboard } from "@/lib/utils"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import {
  Filter,
  Users,
  Briefcase,
  CalendarDays,
  Clock,
  UserCheck,
  TrendingUp,
  AlertCircle,
  Search,
  Download,
  RefreshCw,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Zap,
} from "lucide-react"
import { EnhancedKPICard } from "./kpi-card"
import { DashboardSkeleton } from "./loading-skeleton"
import { AdvancedMetricsCard } from "./advanced-metrics-card"
import { InteractiveChart } from "./interactive-chart"
import { RealtimeUpdates } from "./realtime-updates"

export function RecruitmentDashboard() {
  const [data, setData] = useState<IRecruitmentDashboard | null>(null)
  const [timeRange, setTimeRange] = useState("6months")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDepartment, setSelectedDepartment] = useState("all")
  const [refreshing, setRefreshing] = useState(false)

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

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await getRecruitmentDashboard()
      setData(res)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setRefreshing(false)
    }
  }

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
    <div className="w-full min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <header className="border-b bg-card/95 backdrop-blur-xl supports-[backdrop-filter]:bg-card/95 sticky top-0 z-50 shadow-sm">
        <div className="w-full px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-accent to-accent/80 rounded-xl shadow-lg">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <h1 className="text-4xl font-bold text-balance bg-gradient-to-r from-foreground via-foreground to-accent bg-clip-text text-transparent">
                  Recruitment Analytics
                </h1>
                <Badge variant="secondary" className="ml-2 bg-accent/10 text-accent border-accent/20">
                  Live
                </Badge>
              </div>
              <p className="text-muted-foreground text-lg">Advanced hiring pipeline insights and performance metrics</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search positions, candidates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64 h-11 border-2 hover:border-accent/50 focus:border-accent transition-colors"
                />
              </div>

              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-44 h-11 border-2 hover:border-accent/50 transition-colors">
                  <Users className="h-4 w-4 mr-2 text-accent" />
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="engineering">Engineering</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="hr">Human Resources</SelectItem>
                </SelectContent>
              </Select>

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

              <Button
                variant="outline"
                size="default"
                onClick={handleRefresh}
                disabled={refreshing}
                className="h-11 border-2 hover:border-accent/50 hover:bg-accent/5 bg-transparent"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>

              <Button size="default" className="h-11 bg-accent hover:bg-accent/90">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      <RealtimeUpdates />

      {/* Main Content */}
      <div className="px-6 py-8 space-y-12">
        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-1 bg-gradient-to-b from-accent to-accent/60 rounded-full"></div>
              <h2 className="text-3xl font-bold text-balance">Key Performance Indicators</h2>
            </div>
            <Badge variant="outline" className="text-sm px-3 py-1">
              <Activity className="h-3 w-3 mr-1" />
              Real-time
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <EnhancedKPICard
              title="Total Applications"
              value={data.total_applications.toLocaleString()}
              icon={<Users className="h-6 w-6" />}
              trend="+12%"
              trendUp={true}
              description="vs. previous period"
              className="hover:scale-105 transition-transform duration-200"
            />
            <EnhancedKPICard
              title="Active Positions"
              value={data.active_job_positions}
              icon={<Briefcase className="h-6 w-6" />}
              trend="+3 new"
              trendUp={true}
              description="currently hiring"
              className="hover:scale-105 transition-transform duration-200"
            />
            <EnhancedKPICard
              title="Upcoming Interviews"
              value={data.upcoming_interviews}
              icon={<CalendarDays className="h-6 w-6" />}
              trend="This week"
              trendUp={null}
              description="scheduled interviews"
              className="hover:scale-105 transition-transform duration-200"
            />
            <EnhancedKPICard
              title="Avg. Time to Hire"
              value={`${data.average_time_to_hire_days} days`}
              icon={<Clock className="h-6 w-6" />}
              trend="-5 days"
              trendUp={true}
              description="improvement"
              className="hover:scale-105 transition-transform duration-200"
            />
          </div>
        </section>

        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-1 bg-gradient-to-b from-accent to-accent/60 rounded-full"></div>
              <h2 className="text-3xl font-bold text-balance">Advanced Metrics</h2>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-accent" />
              <span className="text-sm font-medium text-muted-foreground">Performance Insights</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <AdvancedMetricsCard
              title="Conversion Rate"
              value="24.5%"
              subtitle="Application to Interview"
              trend="+3.2%"
              trendUp={true}
              icon={<Target className="h-5 w-5" />}
            />
            <AdvancedMetricsCard
              title="Quality Score"
              value="8.7/10"
              subtitle="Candidate Quality Rating"
              trend="+0.4"
              trendUp={true}
              icon={<Zap className="h-5 w-5" />}
            />
            <AdvancedMetricsCard
              title="Efficiency Index"
              value="92%"
              subtitle="Process Optimization"
              trend="+5%"
              trendUp={true}
              icon={<Activity className="h-5 w-5" />}
            />
          </div>
        </section>

        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-1 bg-gradient-to-b from-accent to-accent/60 rounded-full"></div>
              <h2 className="text-3xl font-bold text-balance">Interactive Analytics</h2>
            </div>
            <div className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-accent" />
              <span className="text-sm font-medium text-muted-foreground">Dynamic Insights</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Applications by Status */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-card/90 hover:shadow-2xl transition-all duration-300 group">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl group-hover:text-accent transition-colors">
                  <div className="p-2 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
                    <UserCheck className="h-5 w-5 text-accent" />
                  </div>
                  Applications by Status
                </CardTitle>
                <CardDescription className="text-base">
                  Current application pipeline breakdown with trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InteractiveChart data={data.applications_by_status} type="status" />
              </CardContent>
            </Card>

            {/* Interview Status */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-card/90 hover:shadow-2xl transition-all duration-300 group">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl group-hover:text-accent transition-colors">
                  <div className="p-2 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
                    <CalendarDays className="h-5 w-5 text-accent" />
                  </div>
                  Interview Pipeline
                </CardTitle>
                <CardDescription className="text-base">Interview status with success predictions</CardDescription>
              </CardHeader>
              <CardContent>
                <InteractiveChart data={data.interviews_by_status} type="interviews" />
              </CardContent>
            </Card>

            {/* Applications Over Time */}
            <Card className="lg:col-span-2 border-0 shadow-xl bg-gradient-to-br from-card via-card to-card/90 hover:shadow-2xl transition-all duration-300 group">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3 text-xl group-hover:text-accent transition-colors">
                  <div className="p-2 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
                    <TrendingUp className="h-5 w-5 text-accent" />
                  </div>
                  Applications Timeline Analysis
                </CardTitle>
                <CardDescription className="text-base">
                  Advanced trend analysis with forecasting and seasonality insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InteractiveChart data={data.applications_over_time} type="timeline" />
              </CardContent>
            </Card>

            {/* Application Sources */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-card/90 hover:shadow-2xl transition-all duration-300 group">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl group-hover:text-accent transition-colors">Source Performance</CardTitle>
                <CardDescription className="text-base">ROI analysis by recruitment channel</CardDescription>
              </CardHeader>
              <CardContent>
                <InteractiveChart data={data.applications_sources} type="sources" />
              </CardContent>
            </Card>

            {/* Onboarding Status */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card to-card/90 hover:shadow-2xl transition-all duration-300 group">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl group-hover:text-accent transition-colors">Onboarding Success</CardTitle>
                <CardDescription className="text-base">New hire integration and retention metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <InteractiveChart data={data.onboardings_by_status} type="onboarding" />
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-1 bg-gradient-to-b from-accent to-accent/60 rounded-full"></div>
              <h2 className="text-3xl font-bold text-balance">Complete Pipeline Overview</h2>
            </div>
            <Badge variant="outline" className="text-sm px-3 py-1">
              <BarChart3 className="h-3 w-3 mr-1" />
              Full Funnel
            </Badge>
          </div>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-card via-card/95 to-accent/5 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="pb-6">
              <CardTitle className="text-2xl flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <Activity className="h-6 w-6 text-accent" />
                </div>
                Recruitment Funnel Metrics
              </CardTitle>
              <CardDescription className="text-base">
                End-to-end recruitment performance with conversion rates and efficiency metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="text-center space-y-3 group hover:scale-105 transition-transform duration-200">
                  <div className="text-5xl font-bold bg-gradient-to-r from-accent to-accent/80 bg-clip-text text-transparent">
                    {data.total_job_positions}
                  </div>
                  <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Positions
                  </div>
                  <div className="h-1 w-full bg-gradient-to-r from-accent/20 to-accent rounded-full group-hover:from-accent/40 group-hover:to-accent/80 transition-all duration-200"></div>
                </div>
                <div className="text-center space-y-3 group hover:scale-105 transition-transform duration-200">
                  <div className="text-5xl font-bold bg-gradient-to-r from-accent to-accent/80 bg-clip-text text-transparent">
                    {data.total_adverts}
                  </div>
                  <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Adverts
                  </div>
                  <div className="h-1 w-full bg-gradient-to-r from-accent/20 to-accent rounded-full group-hover:from-accent/40 group-hover:to-accent/80 transition-all duration-200"></div>
                </div>
                <div className="text-center space-y-3 group hover:scale-105 transition-transform duration-200">
                  <div className="text-5xl font-bold bg-gradient-to-r from-accent to-accent/80 bg-clip-text text-transparent">
                    {data.total_interviews}
                  </div>
                  <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Interviews
                  </div>
                  <div className="h-1 w-full bg-gradient-to-r from-accent/20 to-accent rounded-full group-hover:from-accent/40 group-hover:to-accent/80 transition-all duration-200"></div>
                </div>
                <div className="text-center space-y-3 group hover:scale-105 transition-transform duration-200">
                  <div className="text-5xl font-bold bg-gradient-to-r from-accent to-accent/80 bg-clip-text text-transparent">
                    {data.total_onboardings}
                  </div>
                  <div className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Onboardings
                  </div>
                  <div className="h-1 w-full bg-gradient-to-r from-accent/20 to-accent rounded-full group-hover:from-accent/40 group-hover:to-accent/80 transition-all duration-200"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
