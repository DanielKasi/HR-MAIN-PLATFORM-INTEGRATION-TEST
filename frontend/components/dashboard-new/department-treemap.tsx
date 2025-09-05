"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger } from "../ui/select"

interface DepartmentTreemapProps {
  data?: Array<{ dept_name: string; count: number; year: number }>
  onRefresh: (year?: number) => void
  loading: boolean
}

export function DepartmentTreemap({ data, onRefresh, loading }: DepartmentTreemapProps) {
  const maxCount = Math.max(...(data?.map((d) => d.count) || [1]));
  const [year, setYear] = useState<number>(new Date().getFullYear());

  return (
    <Card className="shadow-sm border-none">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium">Employees Per Department</CardTitle>
        <div className="flex items-center gap-2">
          <Select
            value={year.toString()}
            onValueChange={(e) => {
              const newTime = new Date();
              newTime.setFullYear(Number(e));
              setYear(newTime.getFullYear());
              onRefresh(newTime.getFullYear())
            }}
          >
            <SelectTrigger className="py-0 px-3 rounded-lg !ring-0">{year.toString()}</SelectTrigger>
            <SelectContent>
              <SelectItem value={new Date().getFullYear().toString()}>{new Date().getFullYear()}</SelectItem>
              <SelectItem value={(new Date().getFullYear() - 1).toString()}>{new Date().getFullYear() - 1}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-2 h-48">
          {data?.slice(0, 10).map((dept, index) => {
            const intensity = dept.count / maxCount
            const opacity = 0.3 + intensity * 0.7
            return (
              <div
                key={dept.dept_name}
                className="bg-orange-500 rounded flex items-center justify-center text-white text-xs font-medium p-2 text-center"
                style={{
                  opacity,
                  gridColumn: index < 2 ? "span 2" : "span 1",
                  gridRow: index === 0 ? "span 2" : "span 1",
                }}
              >
                {dept.dept_name}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
