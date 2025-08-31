"use client";

import {useState, useCallback, useEffect} from "react";
import {Button} from "@/components/ui/button";
import {Icon} from "@iconify/react";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {ChevronRight} from "lucide-react";
import {MetricCards} from "@/components/dashboard-new/metric-cards";
import {PayrollChart} from "@/components/dashboard-new/payroll-chart";
import {DepartmentTreemap} from "@/components/dashboard-new/department-treemap";
import {PayrollByDepartment} from "@/components/dashboard-new/payroll-by-department";
import {EmployeeCountChart} from "@/components/dashboard-new/employee-count-chart";
import {GenderDistribution} from "@/components/dashboard-new/gender-distribution";
import {ProjectCards} from "@/components/dashboard-new/project-cards";
import Link from "next/link";
import {SimpleCalendarWidget} from "@/components/calendar-widget";
import {EventsAndHolidaysWidget} from "@/components/dashboard-new/events-and-holidays";
import {institutionAPI, showErrorToast} from "@/lib/utils";
import {useSelector} from "react-redux";
import {selectSelectedInstitution, selectUser} from "@/store/auth/selectors";
import {IInstitutionAnalytics} from "@/types/types.utils";
import EmployeeAttendance from "@/components/attendance/employee-attendance";
import {USER_GENDER} from "@/types";
import AttendanceChart from "./employee-attendance-chart";
import PieChart from "./employee-piechart";
import BarChart from "./employee-bar-chart";
import SalaryCharts from "./salary-charts";
import apiRequest from "@/lib/apiRequest";
import {toast} from "sonner";
import {select} from "redux-saga/effects";

// Employee

export default function Dashboard() {
  const [data, setData] = useState<IInstitutionAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const currentInstitution = useSelector(selectSelectedInstitution);
  const [currentPayroll, setCurrentPayroll] = useState(0);
  const [totalCurrentYear, setTotalCurrentYear] = useState(0);
  const [pastYearTotal, setPastYearTotal] = useState(0);
  const [growthPercentage, setGrowthPercentage] = useState(0);
  const currentUser = useSelector(selectUser);
  const [salaryData, setSalaryData] = useState<SalaryData>({
    average_salary_by_department: [],
    average_salary_by_position: [],
    salary_distribution: [],
    gender_pay_gap: {Male: 0, Female: 0, Other: 0},
  });

  const selectedInstitutionId = currentInstitution?.id;

  // Employee
  const mockData = {
    total_hours_worked: 67,
    total_late_minutes: 20,
    total_overtime_hours: 10,
    attendance_metrics: {
      additionalProp1: "string",
      additionalProp2: "string",
      additionalProp3: "string",
    },
  };

  const employeeCountAnalytics = {
    headcount: 0,
    headcount_by_department: [
      {label: "HR", value: 10},
      {label: "Engineering", value: 25},
      {label: "Sales", value: 15},
    ],
    headcount_by_position: [
      {label: "Manager", value: 5},
      {label: "Developer", value: 20},
      {label: "Intern", value: 10},
    ],
    headcount_by_gender: [
      {label: "Male", value: 30},
      {label: "Female", value: 15},
    ],
    headcount_by_employee_type: [
      {label: "Full-time", value: 35},
      {label: "Part-time", value: 10},
    ],
    headcount_by_work_type: [
      {label: "On-site", value: 25},
      {label: "Remote", value: 20},
    ],
    age_distribution: [
      {label: "20-29", value: 10},
      {label: "30-39", value: 20},
      {label: "40-49", value: 10},
      {label: "50+", value: 5},
    ],
  };

  const salaryAnalytics = {
    average_salary_by_department: [
      {label: "HR", value: 50000},
      {label: "Engineering", value: 80000},
      {label: "Sales", value: 60000},
    ],
    average_salary_by_position: [
      {label: "Manager", value: 90000},
      {label: "Developer", value: 75000},
      {label: "Intern", value: 30000},
    ],
    salary_distribution: [
      {label: "0-50k", value: 10},
      {label: "50k-100k", value: 20},
      {label: "100k+", value: 5},
    ],
    gender_pay_gap: {
      Male: 75000,
      Female: 65000,
      Other: 70000,
    },
  };
  interface SalaryData {
    average_salary_by_department: {label: string; value: number}[];
    average_salary_by_position: {label: string; value: number}[];
    salary_distribution: {label: string; value: number}[];
    gender_pay_gap: {
      Male: number;
      Female: number;
      Other: number;
    };
  }

  useEffect(() => {
    const fetchSalaryData = async () => {
      try {
        setLoading(true);
        const response = await apiRequest.get(
          `/employee/institutions/${selectedInstitutionId}/salary-analytics/`,
        );

        setSalaryData(response);
      } catch (err: any) {
        toast(err.message || "Failed to fetch salary data");
      } finally {
        setLoading(false);
      }
    };

    fetchSalaryData();
  }, []);

  console.log("Salary Data....", salaryData);

  useEffect(() => {
    const percentage =
      pastYearTotal > 0 ? ((totalCurrentYear - pastYearTotal) / pastYearTotal) * 100 : 0;
    setGrowthPercentage(percentage);
  }, [pastYearTotal, totalCurrentYear]);

  useEffect(() => {
    setCurrentPayroll(
      data?.payroll_summary?.current?.find((item: any) => item.month === "Sep")?.payroll || 0,
    );
    setTotalCurrentYear(
      data?.payroll_summary?.current?.reduce((sum: number, item: any) => sum + item.payroll, 0) ||
        0,
    );
    setPastYearTotal(data?.payroll_summary?.past?.total || 0);
  }, [data]);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = useCallback(async () => {
    if (!currentInstitution) {
      return;
    }

    setLoading(true);
    try {
      const newData = await institutionAPI.getDasboardAnalytics({
        institutionId: currentInstitution?.id,
      });
      setData(newData);
    } catch (error) {
      showErrorToast({error, defaultMessage: "Failed to fetch data !"});
    } finally {
      setLoading(false);
    }
  }, []);

  const now = new Date();
  const hour = now.getHours();

  const capitalizeFirstLetter = (str: string) => {
    if (!str) return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  let greeting = "Hello";
  if (hour >= 5 && hour < 12) {
    greeting = "Good morning";
  } else if (hour >= 12 && hour < 17) {
    greeting = "Good afternoon";
  } else if (hour >= 17 && hour < 22) {
    greeting = "Good evening";
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between"></div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Metrics and Calendar Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-4">
                <MetricCards data={data?.basic_counts} onRefresh={refreshData} loading={loading} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* <Card className="bg-primary/10 shadow-sm border-none">
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
              </Card> */}

              {/* <Card className="md:col-span-2 shadow-sm border-none bg-white">
                <CardHeader className="flex flex-row items-center justify-between py-2">
                  <CardTitle className="text-lg md:text-xl font-medium">Announcements</CardTitle>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </CardHeader>
              </Card> */}
            </div>
            {/* Payroll Chart */}
            {/* <PayrollChart
              data={data?.payroll_summary}
              totalCurrentYear={totalCurrentYear}
              growthPercentage={growthPercentage}
              onRefresh={refreshData}
              loading={loading}
            /> */}
            {/* Salary charts */}
            <SalaryCharts data={salaryData} />;{/* Attendance Chart */}
            <div className="p-6">
              <h1 className="text-2xl font-bold mb-4">Attendance Dashboard</h1>
              <AttendanceChart data={mockData} />
            </div>
            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PieChart
                title="Headcount by Work Type"
                data={employeeCountAnalytics.headcount_by_work_type}
              />
              <PieChart title="Age Distribution" data={employeeCountAnalytics.age_distribution} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BarChart
                title="Headcount by Position"
                data={employeeCountAnalytics.headcount_by_position}
              />
              <GenderDistribution
                data={data?.gender_distribution}
                onRefresh={refreshData}
                loading={loading}
              />
            </div>
            {/* Projects */}
            {/* <ProjectCards /> */}
            {/* <EmployeeAttendance showingOnDashboard={true} scope={{type: "default"}} /> */}
          </div>

          {/* Sidebar */}
          {/* <div className="flex flex-col gap-4 lg:col-span-1">
            <SimpleCalendarWidget />
            <EventsAndHolidaysWidget />
          </div> */}
        </div>
      </div>
    </div>
  );
}
