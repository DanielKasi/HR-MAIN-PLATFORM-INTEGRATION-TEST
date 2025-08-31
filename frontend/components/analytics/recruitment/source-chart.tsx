"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"

interface SourceData {
  source: string
  count: number
}

interface SourceChartProps {
  data: SourceData[]
}

const sourceColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
]

export function SourceChart({ data }: SourceChartProps) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-[250px] text-muted-foreground">No data available</div>
  }

  return (
    <ChartContainer className="h-[250px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={80}
            paddingAngle={2}
            dataKey="count"
            nameKey="source"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={sourceColors[index % sourceColors.length]} />
            ))}
          </Pie>
          <ChartTooltip />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value, entry) => <span style={{ color: entry.color }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
