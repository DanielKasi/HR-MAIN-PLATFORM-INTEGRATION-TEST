"use client";

import {useState, useCallback, useEffect} from "react";
import {Button} from "@/components/ui/button";
import {Icon} from "@iconify/react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Plus, Calendar, Users, Building2, ChevronRight} from "lucide-react";
import {MetricCards} from "@/components/dashboard-new/metric-cards";
import {PayrollChart} from "@/components/dashboard-new/payroll-chart";
import {DepartmentTreemap} from "@/components/dashboard-new/department-treemap";
import {PayrollByDepartment} from "@/components/dashboard-new/payroll-by-department";
import {EmployeeCountChart} from "@/components/dashboard-new/employee-count-chart";
import {GenderDistribution} from "@/components/dashboard-new/gender-distribution";
import {ProjectCards} from "@/components/dashboard-new/project-cards";
import Link from "next/link";
import { SimpleCalendarWidget } from "@/components/calendar-widget";
import { EventsAndHolidaysWidget } from "@/components/dashboard-new/events-and-holidays";
import { institutionAPI, showErrorToast } from "@/lib/utils";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { IInstitutionAnalytics } from "@/types/types.utils";


export default function Dashboard() {
  const [data, setData] = useState<IInstitutionAnalytics|null>(null);
  const [loading, setLoading] = useState(false);
  const currentInstitution = useSelector(selectSelectedInstitution);
  const [currentPayroll, setCurrentPayroll] = useState(0);
  const [totalCurrentYear, setTotalCurrentYear] = useState(0);
  const [pastYearTotal, setPastYearTotal]  = useState(0);
  const [growthPercentage, setGrowthPercentage] = useState(0);

  useEffect(()=>{
    const percentage =
    pastYearTotal > 0 ? ((totalCurrentYear - pastYearTotal) / pastYearTotal) * 100 : 0;
    setGrowthPercentage(percentage);
  }, [pastYearTotal, totalCurrentYear])

  useEffect(()=>{
     setCurrentPayroll(data?.payroll_summary?.current?.find((item: any) => item.month === "Sep")?.payroll || 0);
    setTotalCurrentYear(data?.payroll_summary?.current?.reduce((sum: number, item: any) => sum + item.payroll, 0) || 0);
      setPastYearTotal(data?.payroll_summary?.past?.total || 0);
  }, [data])

  useEffect(()=>{
    refreshData()
  }, [])

  const refreshData = useCallback(async () => {

    if (!currentInstitution){return};

    setLoading(true);
    try {
      const newData =  await institutionAPI.getDasboardAnalytics({institutionId:currentInstitution?.id});
      setData(newData);
    } catch (error) {
      showErrorToast({error, defaultMessage:"Failed to fetch data !"})
    } finally {
      setLoading(false);
    }
  }, []);







  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Good Morning, Mr. Roy Didanie</h1>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="rounded-xl flex items-center">
              <Link href={"/employees/employee-list"} className="flex items-center justify-start gap-3">
                <Icon icon="hugeicons:user-add-02" className="!w-6 !h-6" />
                Add Employee
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl flex items-center">
              <Link href={"/job-adverts/create"} className="flex items-center justify-start gap-3">
                <Icon icon="hugeicons:advertisiment" className="!w-6 !h-6" />
                Post Job Opening
              </Link>
            </Button>
            <Button variant="outline" size="sm" className="rounded-xl flex items-center">
              <Link href={"/events-holidays/events/add"} className="flex items-center justify-start gap-3">
                <Icon icon="hugeicons:calendar-add-01" className="!w-6 !h-6" />
                Add event
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Metrics and Calendar Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-4">
                <MetricCards data={data?.basic_counts} onRefresh={refreshData} loading={loading} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-primary/10 shadow-sm border-none">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 text-primary/80 rounded-lg flex items-center justify-center">
                      <Icon icon="hugeicons:payment-success-02" className="!w-7 !h-7" />
                    </div>
                    <span className="text-xs md:text-sm text-gray-600">Payroll this Month</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {currentPayroll.toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card className="md:col-span-2 shadow-sm border-none bg-white">
                <CardHeader className="flex flex-row items-center justify-between py-2">
                  <CardTitle className="text-lg md:text-xl font-medium">Announcements</CardTitle>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </CardHeader>
              </Card>
            </div>

            {/* Payroll Chart */}
            <PayrollChart
              data={data?.payroll_summary}
              totalCurrentYear={totalCurrentYear}
              growthPercentage={growthPercentage}
              onRefresh={refreshData}
              loading={loading}
            />

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DepartmentTreemap
                data={data?.employees_per_department}
                onRefresh={refreshData}
                loading={loading}
              />
              <PayrollByDepartment
                data={data?.payroll_by_department}
                onRefresh={refreshData}
                loading={loading}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <EmployeeCountChart
                data={data?.employees_per_department}
                onRefresh={refreshData}
                loading={loading}
              />
              <GenderDistribution
                data={data?.gender_distribution}
                onRefresh={refreshData}
                loading={loading}
              />
            </div>

            {/* Projects */}
            <ProjectCards />
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-4 lg:col-span-1">
             <SimpleCalendarWidget />
            <EventsAndHolidaysWidget />
          </div>
        </div>
      </div>
    </div>
  );
}
