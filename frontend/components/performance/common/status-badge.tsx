"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface StatusBadgeProps {
    status: string
    variant?: "default" | "secondary" | "destructive" | "outline"
    className?: string
}

const statusConfig: Record<
    string,
    { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
    // Period statuses
    open: { variant: "default", className: "bg-green-100 text-green-800 hover:bg-green-100" },
    closed: { variant: "secondary", className: "bg-slate-100 text-slate-800 hover:bg-slate-100" },

    // Objective statuses
    not_started: { variant: "outline", className: "border-slate-300 text-slate-600" },
    on_track: { variant: "default", className: "bg-green-100 text-green-800 hover:bg-green-100" },
    at_risk: { variant: "destructive", className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
    behind: { variant: "destructive", className: "bg-red-100 text-red-800 hover:bg-red-100" },

    // Meeting modes
    physical: { variant: "default", className: "bg-blue-100 text-blue-800 hover:bg-blue-100" },
    online: { variant: "default", className: "bg-purple-100 text-purple-800 hover:bg-purple-100" },
    hybrid: { variant: "default", className: "bg-indigo-100 text-indigo-800 hover:bg-indigo-100" },

    // Progress types
    percentage: { variant: "outline", className: "border-blue-300 text-blue-600" },
    number: { variant: "outline", className: "border-green-300 text-green-600" },

    // Boolean values
    true: { variant: "default", className: "bg-green-100 text-green-800 hover:bg-green-100" },
    false: { variant: "secondary", className: "bg-slate-100 text-slate-800 hover:bg-slate-100" },
    yes: { variant: "default", className: "bg-green-100 text-green-800 hover:bg-green-100" },
    no: { variant: "secondary", className: "bg-slate-100 text-slate-800 hover:bg-slate-100" },

    // Generic statuses
    active: { variant: "default", className: "bg-green-100 text-green-800 hover:bg-green-100" },
    inactive: { variant: "secondary", className: "bg-slate-100 text-slate-800 hover:bg-slate-100" },
    pending: { variant: "outline", className: "border-yellow-300 text-yellow-600" },
    completed: { variant: "default", className: "bg-green-100 text-green-800 hover:bg-green-100" },
    cancelled: { variant: "destructive", className: "bg-red-100 text-red-800 hover:bg-red-100" },
}

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, "_")
    const config = statusConfig[normalizedStatus] || { variant: "outline" }

    const displayText = status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())

    return (
        <Badge variant={variant || config.variant} className={cn(config.className, className)}>
            {displayText}
        </Badge>
    )
}
