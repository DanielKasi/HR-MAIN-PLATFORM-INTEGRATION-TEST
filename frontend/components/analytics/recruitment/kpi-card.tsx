"use client"

import type React from "react"

import { Card, CardContent } from "@/components/ui/card"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface EnhancedKPICardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: string
  trendUp?: boolean | null
  description?: string
  className?: string
}

export function EnhancedKPICard({ title, value, icon, trend, trendUp, description, className }: EnhancedKPICardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-200 hover:shadow-lg border-0 bg-gradient-to-br from-card to-card/80",
        className,
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline space-x-2">
              <p className="text-3xl font-bold text-foreground">{value}</p>
              {trend && (
                <div
                  className={cn(
                    "flex items-center space-x-1 text-sm font-medium",
                    trendUp === true && "text-emerald-600",
                    trendUp === false && "text-red-500",
                    trendUp === null && "text-muted-foreground",
                  )}
                >
                  {trendUp === true && <TrendingUp className="h-3 w-3" />}
                  {trendUp === false && <TrendingDown className="h-3 w-3" />}
                  <span>{trend}</span>
                </div>
              )}
            </div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10 text-accent">{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}
