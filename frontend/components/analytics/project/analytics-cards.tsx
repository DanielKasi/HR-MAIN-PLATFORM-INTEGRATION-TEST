import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { IProjectDashboard } from "@/types/types.utils"
import { BarChart3, CheckCircle, Clock, AlertTriangle } from "lucide-react"

interface AnalyticsCardsProps {
  data: IProjectDashboard
}

export function AnalyticsCards({ data }: AnalyticsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.projects.total}</div>
          <p className="text-xs text-muted-foreground">{data.active_projects} active projects</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.tasks.total}</div>
          <p className="text-xs text-muted-foreground">Across all projects</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.active_projects}</div>
          <p className="text-xs text-muted-foreground">Currently in progress</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{data.overdue_tasks}</div>
          <p className="text-xs text-muted-foreground">Need immediate attention</p>
        </CardContent>
      </Card>
    </div>
  )
}
