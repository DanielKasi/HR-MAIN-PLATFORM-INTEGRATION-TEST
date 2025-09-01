"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Calendar, CheckCircle } from "lucide-react"

export function RealtimeUpdates() {
  const [updates, setUpdates] = useState([
  ])

  const [showUpdates, setShowUpdates] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowUpdates(true), 1000)
    return () => clearTimeout(timer)
  }, [])

  if (!showUpdates) return null

  return (
    <div className="fixed top-20 right-6 z-40 w-80 space-y-2">
      {updates.map((update, index) => (
        <Card
          key={update.id}
          className="p-4 bg-card/95 backdrop-blur-xl border-accent/20 shadow-lg animate-in slide-in-from-right duration-500"
          style={{ animationDelay: `${index * 200}ms` }}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <update.icon className="h-4 w-4 text-accent" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium">{update.message}</p>
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="text-xs">
                  {update.type}
                </Badge>
                <span className="text-xs text-muted-foreground">{update.time}</span>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
