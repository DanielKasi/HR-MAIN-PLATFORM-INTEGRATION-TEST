"use client";

import {useEffect, useState, useMemo} from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import {TrendingUp} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {apiGet} from "@/lib/apiRequest";
import {Card} from "@/components/ui/card";
import {Skeleton} from "@/components/ui/skeleton";
import {getDefaultInstitutionId} from "@/lib/helpers";

interface ChartDataPoint {
  name: string | number | undefined;
  month: number;
  week: number;
  day: number;
  month_name?: string;
  week_name?: string;
  day_name?: string;
  amount: number;
  formatted_amount: string;
  count: number;
  highlighted?: boolean;
}

// Custom tooltip component for Recharts
const CustomTooltip = ({active, payload, label}: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 text-white p-1.5 rounded-md shadow-lg border border-gray-700 text-[10px] whitespace-nowrap">
        <div className="font-medium text-xs mb-0.5">{label}</div>
        <div className="flex items-center gap-1">
          <span className="text-gray-300">Sales:</span>
          <span>{payload[0].payload.count}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-300">Amount:</span>
          <span>UGX {payload[0].payload.formatted_amount}</span>
        </div>
      </div>
    );
  }

  return null;
};

// Custom dot component for highlighted points
const CustomDot = (props: any) => {
  const {cx, cy, payload} = props;

  if (payload.highlighted) {
    return (
      <g>
        <circle cx={cx} cy={cy} fill="#22c55e" r={6} />
        <circle cx={cx} cy={cy} fill="#ffffff" r={3} />
      </g>
    );
  }

  return null;
};

// Custom active dot component for hover state
const CustomActiveDot = (props: any) => {
  const {cx, cy} = props;

  return (
    <g>
      <circle cx={cx} cy={cy} fill="#22c55e" r={6} />
      <circle cx={cx} cy={cy} fill="#ffffff" r={3} />
    </g>
  );
};

// Sales Chart Component
export function SalesChart({branchId}: {branchId: string | null}) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [totalSales, setTotalSales] = useState("UGX 0");
  const [period, setPeriod] = useState("annually");
  const [isLoading, setIsLoading] = useState(true);
  const [previousPeriodChange, setPreviousPeriodChange] = useState<{
    percentage: number;
    isIncrease: boolean;
  } | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const InstitutionId = getDefaultInstitutionId();

  // Calculate the maximum value for scaling with improved logic
  const maxValue = useMemo(() => {
    if (chartData.length === 0) return 5000000;
    const dataMax = Math.max(...chartData.map((item) => item.amount)) || 5000000;
    // Round up to a nice number for better axis labels
    const magnitude = Math.pow(10, Math.floor(Math.log10(dataMax)));

    return Math.ceil(dataMax / magnitude) * magnitude;
  }, [chartData]);

  // Format y-axis tick values
  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
    }

    return value.toString();
  };

  // Format x-axis labels
  const formatXAxis = (value: string) => {
    return value;
  };

  const fetchChartData = async () => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams();

      params.append("type", "chart_stats");
      params.append("period", period);

      if (branchId) {
        params.append("branch_id", branchId);
      } else if (InstitutionId) {
        params.append("Institution_id", InstitutionId as any);
      }

      const response = await apiGet(`sale/analysis/?${params.toString()}`);

      const total = response.data.total_sales?.value || 0;

      setTotalSales(response.data?.total_sales?.formatted);

      let periodData: ChartDataPoint[] = [];
      let previousTotal = 0;

      const now = new Date();

      if (period === "annually" && response.data.monthly_data) {
        periodData = response.data.monthly_data;
        const currentMonth = now.getMonth() + 1;
        const currentMonthIndex = periodData.findIndex((month) => month.month === currentMonth);

        if (currentMonthIndex > 0) {
          previousTotal = periodData[currentMonthIndex - 1]?.amount || 0;
        }
      } else if (period === "monthly" && response.data.weekly_data) {
        periodData = response.data.weekly_data;
        const currentDay = now.getDate();
        let currentWeek;

        if (currentDay <= 7) currentWeek = 1;
        else if (currentDay <= 14) currentWeek = 2;
        else if (currentDay <= 21) currentWeek = 3;
        else currentWeek = 4;

        const currentWeekIndex = periodData.findIndex((week) => week.week === currentWeek);

        if (currentWeekIndex > 0) {
          previousTotal = periodData[currentWeekIndex - 1]?.amount || 0;
        }
      } else if (period === "weekly" && response.data.daily_data) {
        periodData = response.data.daily_data;
        const today = now.getDay();
        const backendToday = today === 0 ? 6 : today - 1;
        const yesterday = backendToday === 0 ? 6 : backendToday - 1;
        const yesterdayData = periodData.find((day) => day.day === yesterday);

        previousTotal = yesterdayData?.amount || 0;
      }

      // Transform data for Recharts
      const transformedData = periodData.map((item) => ({
        ...item,
        name: item.month_name || item.week_name || item.day_name || "",
      }));

      setChartData(transformedData);

      let changePercentage = 0;
      let isIncrease = false;
      if (previousTotal > 0 && total === 0) {
        changePercentage = 100;
        isIncrease = false;
      } else if (previousTotal > 0) {
        changePercentage = ((total - previousTotal) / previousTotal) * 100;
        isIncrease = total >= previousTotal;
      } else if (previousTotal === 0 && total > 0) {
        changePercentage = 100;
        isIncrease = true;
      }

      setPreviousPeriodChange({
        percentage: Math.abs(changePercentage),
        isIncrease,
      });
    } catch (error) {
      console.error("Error fetching chart data:", error);
      setChartData([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (branchId || InstitutionId) {
      fetchChartData();
    }
  }, [branchId, period, InstitutionId]);

  const handleMouseMove = (data: any) => {
    if (data && data.activeTooltipIndex !== undefined) {
      setActiveIndex(data.activeTooltipIndex);
    }
  };

  const handleMouseLeave = () => {
    setActiveIndex(null);
  };

  return (
    <Card className="p-6 pb-8 mb-6 shadow-sm border-gray-100">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
        <div>
          <div className="text-gray-600 text-sm font-medium mb-1">Total Sales</div>
          {isLoading ? (
            <Skeleton className="h-9 w-40" />
          ) : (
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold tracking-tight">{totalSales}</div>
            </div>
          )}
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px] border rounded-full h-9 px-4 text-sm">
            <SelectValue placeholder="Annually" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="annually">Annually</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="h-[280px] relative">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mb-2" />
            <div className="text-gray-500 text-sm">Loading chart data...</div>
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart
              data={chartData}
              margin={{top: 10, right: 30, left: 0, bottom: 0}}
              onMouseLeave={handleMouseLeave}
              onMouseMove={handleMouseMove}
            >
              <defs>
                <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgba(34, 197, 94, 0.2)" />
                  <stop offset="100%" stopColor="rgba(34, 197, 94, 0.02)" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="name"
                tick={{fontSize: 11, fill: "#94a3b8"}}
                tickFormatter={formatXAxis}
                tickLine={false}
                tickMargin={10}
              />
              <YAxis
                axisLine={false}
                tick={{fontSize: 11, fill: "#94a3b8"}}
                tickFormatter={formatYAxis}
                tickLine={false}
                tickMargin={10}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  stroke: "#22c55e",
                  strokeWidth: 1,
                  strokeDasharray: "3 3",
                  opacity: 0.6,
                }}
              />
              {activeIndex !== null && (
                <ReferenceLine
                  opacity={0.6}
                  stroke="#22c55e"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                  x={chartData[activeIndex]?.name}
                />
              )}
              <Area
                activeDot={<CustomActiveDot />}
                animationDuration={800}
                dataKey="amount"
                dot={<CustomDot />}
                fill="url(#areaGradient)"
                isAnimationActive={true}
                stroke="#22c55e"
                strokeWidth={2.5}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <TrendingUp className="h-12 w-12 text-gray-300 mb-2" />
            <p className="text-gray-600 font-medium">No sales data available</p>
            <p className="text-gray-400 text-sm">Try selecting a different time period</p>
          </div>
        )}
      </div>
    </Card>
  );
}

// "use client";

// import type React from "react";

// import { useEffect, useState, useMemo } from "react";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { apiGet } from "@/lib/apiRequest";
// import { Card } from "@/components/ui/card";
// import { Skeleton } from "@/components/ui/skeleton";
// import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
// import { getDefaultInstitutionId } from "@/lib/helpers";

// // Define types for chart data
// interface ChartDataPoint {
//   month: number;
//   week: number;
//   day: number;
//   month_name?: string;
//   week_name?: string;
//   day_name?: string;
//   amount: number;
//   formatted_amount: string;
//   count: number;
//   highlighted?: boolean;
// }

// // Interactive Sales Chart component
// function InteractiveSalesChart({
//   data,
//   maxValue,
// }: {
//   data: ChartDataPoint[];
//   maxValue: number;
// }) {
//   const [activePoint, setActivePoint] = useState<{
//     x: number;
//     y: number;
//     sales: number;
//     amount: string;
//     label: string;
//   } | null>(null);

//   // Calculate chart dimensions with improved responsive values
//   const chartWidth = 780;
//   const chartHeight = 220; // Increased height for better visualization
//   const paddingLeft = 40;
//   const paddingRight = 40;
//   const availableWidth = chartWidth - paddingLeft - paddingRight;
//   const pointSpacing =
//     data.length > 1 ? availableWidth / (data.length - 1) : availableWidth;

//   // Transform API data to chart data points with improved scaling
//   const dataPoints = useMemo(() => {
//     return data.map((item, index) => {
//       const x = paddingLeft + index * pointSpacing;
//       // Use maxValue for better scaling, with a 15% buffer at the top for more visual space
//       const scaleFactor = maxValue > 0 ? chartHeight / (maxValue * 1.15) : 0;
//       const y = chartHeight - item.amount * scaleFactor;
//       return {
//         x,
//         y: Math.max(15, Math.min(chartHeight - 15, y)), // Keep points within chart bounds with more padding
//         sales: item.count,
//         amount: item.formatted_amount,
//         label: item.month_name || item.week_name || item.day_name || "",
//         highlighted: item.highlighted,
//       };
//     });
//   }, [data, maxValue]);

//   const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
//     // Find the closest data point to the mouse position
//     const svgRect = e.currentTarget.getBoundingClientRect();
//     if (!svgRect) return;

//     const mouseX = e.clientX - svgRect.left;
//     const relativeX = (mouseX / svgRect.width) * chartWidth;

//     // Find the closest point
//     if (dataPoints.length === 0) return;

//     let closestPoint = dataPoints[0];
//     let minDistance = Math.abs(relativeX - closestPoint.x);

//     dataPoints.forEach((point) => {
//       const distance = Math.abs(relativeX - point.x);
//       if (distance < minDistance) {
//         minDistance = distance;
//         closestPoint = point;
//       }
//     });

//     setActivePoint({
//       x: closestPoint.x,
//       y: closestPoint.y,
//       sales: closestPoint.sales,
//       amount: closestPoint.amount,
//       label: closestPoint.label,
//     });
//   };

//   const handleMouseLeave = () => {
//     setActivePoint(null);
//   };

//   // Create the SVG path from data points with improved curve tension
//   const createPath = () => {
//     if (dataPoints.length === 0) return "";
//     if (dataPoints.length === 1) {
//       // If only one data point, draw a horizontal line
//       return `M${paddingLeft},${dataPoints[0].y} L${
//         chartWidth - paddingRight
//       },${dataPoints[0].y}`;
//     }

//     let path = `M${dataPoints[0].x},${dataPoints[0].y}`;

//     for (let i = 1; i < dataPoints.length; i++) {
//       // Create a smoother curve between points with better control points
//       const cp1x =
//         dataPoints[i - 1].x + (dataPoints[i].x - dataPoints[i - 1].x) / 3;
//       const cp1y = dataPoints[i - 1].y;
//       const cp2x =
//         dataPoints[i].x - (dataPoints[i].x - dataPoints[i - 1].x) / 3;
//       const cp2y = dataPoints[i].y;

//       path += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${dataPoints[i].x},${dataPoints[i].y}`;
//     }

//     return path;
//   };

//   // Create the area path with improved gradient effect
//   const createAreaPath = () => {
//     if (dataPoints.length === 0) return "";
//     if (dataPoints.length === 1) {
//       // If only one data point, create a rectangle
//       return `M${paddingLeft},${dataPoints[0].y} L${
//         chartWidth - paddingRight
//       },${dataPoints[0].y} L${
//         chartWidth - paddingRight
//       },${chartHeight} L${paddingLeft},${chartHeight} Z`;
//     }

//     const linePath = createPath();
//     return `${linePath} L${
//       dataPoints[dataPoints.length - 1].x
//     },${chartHeight} L${dataPoints[0].x},${chartHeight} Z`;
//   };

//   // Generate grid lines with improved styling
//   const generateGridLines = () => {
//     const lines = [];
//     const numLines = 5;
//     for (let i = 0; i <= numLines; i++) {
//       const y = (i / numLines) * chartHeight;
//       lines.push(
//         <line
//           key={i}
//           x1="0"
//           y1={y}
//           x2={chartWidth}
//           y2={y}
//           stroke="#f1f5f9"
//           strokeWidth="1"
//         />
//       );
//     }
//     return lines;
//   };

//   // Generate y-axis labels with improved formatting
//   const generateYAxisLabels = () => {
//     const labels = [];
//     const numLabels = 5;
//     for (let i = 0; i <= numLabels; i++) {
//       const y = (i / numLabels) * chartHeight;
//       const value = ((numLabels - i) / numLabels) * maxValue;

//       // Improved number formatting logic
//       let formattedValue = "";
//       if (value >= 1000000) {
//         formattedValue = `${(value / 1000000).toFixed(
//           value >= 10000000 ? 0 : 1
//         )}M`;
//       } else if (value >= 1000) {
//         formattedValue = `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
//       } else {
//         formattedValue = value.toFixed(0);
//       }

//       labels.push(
//         <text
//           key={i}
//           x={paddingLeft - 10}
//           y={y + 4}
//           fontSize="11"
//           fill="#94a3b8"
//           textAnchor="end"
//         >
//           {formattedValue}
//         </text>
//       );
//     }
//     return labels;
//   };

//   return (
//     <div className="w-full h-full relative">
//       <svg
//         width="100%"
//         height="100%"
//         viewBox={`0 0 ${chartWidth} ${chartHeight}`}
//         preserveAspectRatio="none"
//         onMouseMove={handleMouseMove}
//         onMouseLeave={handleMouseLeave}
//         className="overflow-visible"
//         style={{ cursor: "pointer" }}
//       >
//         {/* Gradient definition for area fill */}
//         <defs>
//           <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
//             <stop offset="0%" stopColor="rgba(34, 197, 94, 0.2)" />
//             <stop offset="100%" stopColor="rgba(34, 197, 94, 0.02)" />
//           </linearGradient>
//         </defs>

//         {/* Horizontal grid lines */}
//         {generateGridLines()}

//         {/* Y-axis labels */}
//         {generateYAxisLabels()}

//         {/* Background area with gradient */}
//         <path d={createAreaPath()} fill="url(#areaGradient)" />

//         {/* Line chart with improved styling */}
//         <path
//           d={createPath()}
//           fill="none"
//           stroke="#22c55e"
//           strokeWidth="2.5"
//           strokeLinecap="round"
//           strokeLinejoin="round"
//         />

//         {/* Data points with improved hover effect */}
//         {dataPoints.map((point, index) => (
//           <g key={index}>
//             <circle
//               cx={point.x}
//               cy={point.y}
//               r={point.highlighted ? 6 : 0}
//               fill={point.highlighted ? "#22c55e" : "transparent"}
//               className="transition-all duration-200"
//             />
//             <circle
//               cx={point.x}
//               cy={point.y}
//               r={point.highlighted ? 3 : 0}
//               fill="#ffffff"
//               className="transition-all duration-200"
//             />
//           </g>
//         ))}

//         {/* Active data point with improved tooltip */}
//         {activePoint && (
//           <g>
//             {/* Vertical guide line */}
//             <line
//               x1={activePoint.x}
//               y1="0"
//               x2={activePoint.x}
//               y2={chartHeight}
//               stroke="#22c55e"
//               strokeWidth="1"
//               strokeDasharray="3,3"
//               className="opacity-60"
//             />

//             {/* Highlight point */}
//             <circle
//               cx={activePoint.x}
//               cy={activePoint.y}
//               r="6"
//               fill="#22c55e"
//             />
//             <circle
//               cx={activePoint.x}
//               cy={activePoint.y}
//               r="3"
//               fill="#ffffff"
//             />

//             {/* Tooltip */}
//             <foreignObject
//               x={Math.max(10, Math.min(chartWidth - 120, activePoint.x - 60))}
//               y={Math.max(10, activePoint.y - 70)}
//               width="120"
//               height="70"
//               className="overflow-visible"
//             >
//               <div className="bg-gray-800 text-white p-1.5 rounded-md shadow-lg border border-gray-700 text-[10px] whitespace-nowrap">
//                 <div className="font-medium text-xs mb-0.5">
//                   {activePoint.label}
//                 </div>
//                 <div className="flex items-center gap-1">
//                   <span className="text-gray-300">Sales:</span>
//                   <span>{activePoint.sales}</span>
//                 </div>
//                 <div className="flex items-center gap-1">
//                   <span className="text-gray-300">Amount:</span>
//                   <span>UGX {activePoint.amount}</span>
//                 </div>
//               </div>
//             </foreignObject>
//           </g>
//         )}
//       </svg>
//     </div>
//   );
// }

// // Sales Chart Component
// export function SalesChart({ branchId }: { branchId: string | null }) {
//   const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
//   const [totalSales, setTotalSales] = useState("UGX 0");
//   const [period, setPeriod] = useState("annually");
//   const [isLoading, setIsLoading] = useState(true);
//   const [previousPeriodChange, setPreviousPeriodChange] = useState<{
//     percentage: number;
//     isIncrease: boolean;
//   } | null>(null);
//   const InstitutionId = getDefaultInstitutionId();

//   // Calculate the maximum value for scaling with improved logic
//   const maxValue = useMemo(() => {
//     if (chartData.length === 0) return 5000000;
//     const dataMax =
//       Math.max(...chartData.map((item) => item.amount)) || 5000000;
//     // Round up to a nice number for better axis labels
//     const magnitude = Math.pow(10, Math.floor(Math.log10(dataMax)));
//     return Math.ceil(dataMax / magnitude) * magnitude;
//   }, [chartData]);

//   const fetchChartData = async () => {
//     setIsLoading(true);

//     try {
//       const params = new URLSearchParams();
//       params.append("type", "chart_stats");
//       params.append("period", period);

//       if (branchId) {
//         params.append("branch_id", branchId);
//       } else if (InstitutionId) {
//         params.append("Institution_id", InstitutionId as any);
//       }

//       const response = await apiGet(`sale/analysis/?${params.toString()}`);

//       const total = response.data.total_sales?.value || 0;
//       setTotalSales(response.data?.total_sales?.formatted);

//       let periodData: ChartDataPoint[] = [];
//       let previousTotal = 0;

//       const now = new Date();

//       if (period === "annually" && response.data.monthly_data) {
//         periodData = response.data.monthly_data;
//         const currentMonth = now.getMonth() + 1;
//         const currentMonthIndex = periodData.findIndex(
//           (month) => month.month === currentMonth
//         );
//         if (currentMonthIndex > 0) {
//           previousTotal = periodData[currentMonthIndex - 1]?.amount || 0;
//         }
//       } else if (period === "monthly" && response.data.weekly_data) {
//         periodData = response.data.weekly_data;
//         const currentDay = now.getDate();
//         let currentWeek;
//         if (currentDay <= 7) currentWeek = 1;
//         else if (currentDay <= 14) currentWeek = 2;
//         else if (currentDay <= 21) currentWeek = 3;
//         else currentWeek = 4;

//         const currentWeekIndex = periodData.findIndex(
//           (week) => week.week === currentWeek
//         );
//         if (currentWeekIndex > 0) {
//           previousTotal = periodData[currentWeekIndex - 1]?.amount || 0;
//         }
//       } else if (period === "weekly" && response.data.daily_data) {
//         periodData = response.data.daily_data;
//         const today = now.getDay();
//         const backendToday = today === 0 ? 6 : today - 1;
//         const yesterday = backendToday === 0 ? 6 : backendToday - 1;
//         const yesterdayData = periodData.find((day) => day.day === yesterday);
//         previousTotal = yesterdayData?.amount || 0;
//       }

//       setChartData(periodData);

//       let changePercentage = 0;
//       let isIncrease = false;

//       if (previousTotal > 0) {
//         changePercentage = ((total - previousTotal) / previousTotal) * 100;
//         isIncrease = total >= previousTotal;
//       } else if (previousTotal === 0 && total > 0) {
//         changePercentage = 100;
//         isIncrease = true;
//       } else if (previousTotal > 0 && total === 0) {
//         changePercentage = 100;
//         isIncrease = false;
//       }

//       setPreviousPeriodChange({
//         percentage: Math.abs(changePercentage),
//         isIncrease,
//       });
//     } catch (error) {
//       console.error("Error fetching chart data:", error);
//       setChartData([]);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (branchId || InstitutionId) {
//       fetchChartData();
//     }
//   }, [branchId, period, InstitutionId]);

//   return (
//     <Card className="p-6 pb-8 mb-6 shadow-sm border-gray-100">
//       <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
//         <div>
//           <div className="text-gray-600 text-sm font-medium mb-1">
//             Total Sales
//           </div>
//           {isLoading ? (
//             <Skeleton className="h-9 w-40" />
//           ) : (
//             <div className="flex items-center gap-3">
//               <div className="text-3xl font-bold tracking-tight">
//                 {totalSales}
//               </div>
//             </div>
//           )}
//         </div>
//         <Select value={period} onValueChange={setPeriod}>
//           <SelectTrigger className="w-[180px] border rounded-full h-9 px-4 text-sm">
//             <SelectValue placeholder="Annually" />
//           </SelectTrigger>
//           <SelectContent className="rounded-xl">
//             <SelectItem value="annually">Annually</SelectItem>
//             <SelectItem value="monthly">Monthly</SelectItem>
//             <SelectItem value="weekly">Weekly</SelectItem>
//           </SelectContent>
//         </Select>
//       </div>

//       <div className="h-[280px] relative">
//         {" "}
//         {/* Increased height for better visualization */}
//         {isLoading ? (
//           <div className="flex flex-col items-center justify-center h-full">
//             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mb-2"></div>
//             <div className="text-gray-500 text-sm">Loading chart data...</div>
//           </div>
//         ) : chartData.length > 0 ? (
//           <InteractiveSalesChart data={chartData} maxValue={maxValue} />
//         ) : (
//           <div className="flex flex-col items-center justify-center h-full text-gray-500">
//             <TrendingUp className="h-12 w-12 text-gray-300 mb-2" />
//             <p className="text-gray-600 font-medium">No sales data available</p>
//             <p className="text-gray-400 text-sm">
//               Try selecting a different time period
//             </p>
//           </div>
//         )}
//       </div>

//       {!isLoading && chartData.length > 0 && (
//         <div className="flex justify-between text-gray-500 text-xs mt-4 px-10">
//           {chartData.map((item, index) => (
//             <div
//               key={index}
//               className={`flex-1 text-center truncate ${
//                 item.highlighted ? "font-medium text-gray-700" : ""
//               }`}
//             >
//               {item.month_name || item.week_name || item.day_name}
//             </div>
//           ))}
//         </div>
//       )}
//     </Card>
//   );
// }
