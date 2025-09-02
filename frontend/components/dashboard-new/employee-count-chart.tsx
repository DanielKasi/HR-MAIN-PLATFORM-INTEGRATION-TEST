"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"

interface EmployeeCountChartProps {
  data?: Array<{ year: number; count: number }>
  onRefresh: () => void
  loading: boolean
}

export function EmployeeCountChart({ data, onRefresh, loading }: EmployeeCountChartProps) {
  const [filteredData, setFilteredData] = useState<Array<{ year: number; count: number }>>([]);

  useEffect(()=>{
    const filtered = data?.reduce((acc, curr) => {
      const currentYear = curr.year;
      let currentRecord  = acc.find(rec => rec.year === currentYear)
      if(currentRecord){
        currentRecord.count += curr.count
      }else{
        currentRecord = curr
      }
      const newArray = acc.filter(rec => rec.year !== currentRecord.year)
      newArray.push(currentRecord)
      return newArray
    }, [] as Array<{ year: number; count: number }>);
    if(filtered){
      setFilteredData(filtered)
    }
  }, [data])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 text-white p-2 rounded shadow-lg">
          <p className="text-sm">{`${label}: ${payload[0].value}`}</p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="shadow-sm border-none">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium">Employees Count Over Years</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer  width="100%" height="100%">
            <BarChart className="!bg-transparent" data={filteredData || []}>
              <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#6B7280" }} domain={[0, 100]} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count"  fill="#EF4444" className="hover:!bg-transparent cursor-pointer"  radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
