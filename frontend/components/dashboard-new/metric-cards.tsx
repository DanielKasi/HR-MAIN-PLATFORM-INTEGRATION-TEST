"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Users, Building2, UserX } from "lucide-react"
import { Icon } from "@iconify/react";
import Link from "next/link";
import { IBasicDasboardDataCounts } from "@/types/types.utils";

interface MetricCardsProps {
  data?: IBasicDasboardDataCounts,
  onRefresh: () => void
  loading: boolean
}

export function MetricCards({ data, onRefresh, loading }: MetricCardsProps) {
  const metrics = [
    {
      title: "Employees",
      value: data?.employee_count || 0,
      icon: "hugeicons:user-group-03",
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
      link: "/employees/employee-list/"
    },
    {
      title: "Departments",
      value: data?.department_count || 0,
      icon: "hugeicons:building-05",
      bgColor: "bg-blue-100",
      iconColor: "text-blue-600",
      link: "/admin/departments"
    },
    {
      title: "Employees on Leave",
      value: data?.on_leave_count || 0,
      icon: "hugeicons:beach",
      bgColor: "bg-orange-100",
      iconColor: "text-orange-600",
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white rounded-lg md:rounded-xl">
      {metrics.map((metric, index) => (
        <div key={index} className="flex w-full items-center justify-start gap-1">
          <Card className="bg-transparent w-full min-w-max shadow-none border-none">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${metric.bgColor} rounded-xl p-2 flex items-center justify-center`}>
                    <Icon icon={metric.icon} className={`!w-7 !h-7 ${metric.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">{metric.title}</p>
                    <p className="text-2xl font-bold">{metric.value}</p>
                  </div>
                </div>
                {metric.link && (
                  <Link href={metric.link} className="!rounded-full aspect-square hover:bg-gray-100 border border-black/20 p-2 transition-colors" >
                    <Icon icon="hugeicons:arrow-up-right-01" className="!w-6 !h-6" />
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
          {
            index <= metrics.length - 2 && (
              <div className="w-[2px] h-full bg-gray-200 rounded-full"></div>
            )
          }
        </div>
      ))}
    </div>
  )
}
