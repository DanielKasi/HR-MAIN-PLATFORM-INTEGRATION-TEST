import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface KPICardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: string
  trendUp?: boolean | null
}

export function KPICard({ title, value, icon, trend, trendUp }: KPICardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">{icon}</div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          </div>
          {trend && (
            <Badge
              variant={trendUp === null ? "secondary" : trendUp ? "default" : "destructive"}
              className={cn(
                "flex items-center gap-1",
                trendUp === true && "bg-primary/10 text-primary hover:bg-primary/20",
                trendUp === false && "bg-destructive/10 text-destructive hover:bg-destructive/20",
              )}
            >
              {trendUp === true && <TrendingUp className="h-3 w-3" />}
              {trendUp === false && <TrendingDown className="h-3 w-3" />}
              {trend}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
