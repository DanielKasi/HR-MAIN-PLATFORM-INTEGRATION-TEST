"use client"

import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface AdvancedMetricsCardProps {
  title: string
  value: string
  subtitle: string
  trend?: string
  trendUp?: boolean
  icon: React.ReactNode
  className?: string
}

export function AdvancedMetricsCard({
  title,
  value,
  subtitle,
  trend,
  trendUp,
  icon,
  className,
}: AdvancedMetricsCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-xl border-0 bg-gradient-to-br from-card via-card to-accent/5 group hover:scale-105",
        className,
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 bg-accent/10 rounded-xl group-hover:bg-accent/20 transition-colors">
            <div className="text-accent">{icon}</div>
          </div>
          {trend && (
            <div
              className={cn(
                "flex items-center space-x-1 text-sm font-semibold px-2 py-1 rounded-full",
                trendUp ? "text-emerald-600 bg-emerald-50" : "text-red-500 bg-red-50",
              )}
            >
              {trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              <span>{trend}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
          <div className="text-3xl font-bold text-foreground group-hover:text-accent transition-colors">{value}</div>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-accent/20 via-accent/40 to-accent/20 group-hover:from-accent/40 group-hover:via-accent group-hover:to-accent/40 transition-all duration-300"></div>
      </CardContent>
    </Card>
  )
}
