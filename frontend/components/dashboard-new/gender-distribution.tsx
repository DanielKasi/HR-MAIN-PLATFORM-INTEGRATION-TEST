"use client";

import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {PieChart, Pie, Cell, ResponsiveContainer} from "recharts";
import {Button} from "@/components/ui/button";
import {RefreshCw} from "lucide-react";
import {useMobile} from "@/hooks/use-mobile";

interface GenderDistributionProps {
  data?: {
    employees_count: number;
    male: number;
    female: number;
    other: number;
  };
  onRefresh: (year?: number) => void;
  loading: boolean;
}

export function GenderDistribution({data, onRefresh, loading}: GenderDistributionProps) {
  const isMobile = useMobile();
  const chartData = [
    {name: "Female", value: data?.female || 0, color: "#1E40AF"},
    {name: "Male", value: data?.male || 0, color: "#EF4444"},
  ];

  const femalePercentage = data ? Math.round((data.female / data.employees_count) * 100) : 0;
  const malePercentage = data ? Math.round((data.male / data.employees_count) * 100) : 0;

  return (
    <Card className="shadow-sm border-none rounded-3xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium">Gender Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="relative w-32 md:w-48 lg:w-64 aspect-square">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={isMobile ? 40 : 60}
                  outerRadius={isMobile ? 60 : 90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{data?.employees_count || 0}</span>
              <span className="text-xs text-gray-500">Total Employees</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col">
              <div className="flex items-center gap-1 md:gap-3">
                <div className="w-2 md:w-3 md:h-3 !aspect-square !inline-block bg-red-500 rounded-full"></div>
                <p className="text-xs md:text-sm text-gray-600 inline-block"><span> Male </span><span className="!text-xs">({data?.male || 0})</span> </p>
              </div>
              <p className="text-base font-semibold">{malePercentage || 0}%</p>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1 md:gap-3">
                <div className="w-2 md:w-3 md:h-3 !aspect-square !inline-block bg-blue-600 rounded-full"></div>
                <p className="text-xs md:text-sm text-gray-600 inline-block">
                 <span>Female</span>  <span className="text-xs">({data?.female || 0})</span> 
                </p>
              </div>
              <p className="text-base font-semibold">{femalePercentage || 0}%</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
