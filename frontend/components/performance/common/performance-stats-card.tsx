"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface PerformanceStatsCardProps {
    title: string
    value: string | number
    description?: string
    icon?: React.ReactNode
    trend?: {
        value: number
        isPositive: boolean
    }
    className?: string
}

export function PerformanceStatsCard({ title, value, description, icon, trend, className }: PerformanceStatsCardProps) {
    return (
        <Card className={cn("", className)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
                {icon && <div className="text-slate-400">{icon}</div>}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-slate-900 mb-1">{value}</div>

                <div className="flex items-center gap-2 text-xs">
                    {trend && (
                        <span
                            className={cn(
                                "flex items-center gap-1 font-medium",
                                trend.isPositive ? "text-green-600" : "text-red-600",
                            )}
                        >
                            {trend.isPositive ? "↗" : "↘"}
                            {Math.abs(trend.value)}%
                        </span>
                    )}

                    {description && <span className="text-slate-500">{description}</span>}
                </div>
            </CardContent>
        </Card>
    )
}
