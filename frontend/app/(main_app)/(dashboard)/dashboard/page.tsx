"use client";

import { useState, useCallback, useEffect } from "react";
import { Icon } from "@iconify/react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSelector } from "react-redux";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCards } from "@/components/dashboard-new/metric-cards";
import { PayrollChart } from "@/components/dashboard-new/payroll-chart";
import { DepartmentTreemap } from "@/components/dashboard-new/department-treemap";
import { PayrollByDepartment } from "@/components/dashboard-new/payroll-by-department";
import { EmployeeCountChart } from "@/components/dashboard-new/employee-count-chart";
import { GenderDistribution } from "@/components/dashboard-new/gender-distribution";
import { MinimalCalendar } from "@/components/calendar-widget";
import { EventsAndHolidaysWidget } from "@/components/dashboard-new/events-and-holidays";
import { institutionAPI, showErrorToast } from "@/lib/utils";
import { selectSelectedInstitution, selectUser } from "@/store/auth/selectors";
import { IInstitutionAnalytics } from "@/types/types.utils";
import EmployeeAttendance from "@/components/attendance/employee-attendance";
import { USER_GENDER } from "@/types/user.types";
import { TasksCards } from "@/components/dashboard_components/tasks-cards";
import AnnouncementCarousel from "@/components/dashboard_components/announcements-carousel";

export default function Dashboard() {
	const [data, setData] = useState<IInstitutionAnalytics | null>(null);
	const [loading, setLoading] = useState(false);
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [currentPayroll, setCurrentPayroll] = useState(0);
	const [totalCurrentYear, setTotalCurrentYear] = useState(0);
	const [pastYearTotal, setPastYearTotal] = useState(0);
	const [growthPercentage, setGrowthPercentage] = useState(0);
	const currentUser = useSelector(selectUser);

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
			showErrorToast({ error, defaultMessage: "Failed to fetch data !" });
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
		<div className="min-h-screen bg-transparent p-6">
			<div className="space-y-6">
				{/* Header */}

				<div className="flex items-center justify-between">
					<h1 className="text-xl md:text-2xl lg:text-3xl font-semibold text-gray-900">
						{greeting},{" "}
						<span className="inline-block">
							{currentUser?.gender === USER_GENDER.MALE
								? "Mr"
								: currentUser?.gender === USER_GENDER.FEMALE
									? "Ms"
									: ""}
							. {capitalizeFirstLetter(currentUser?.fullname.split(" ")[0] || "")}{" "}
							{capitalizeFirstLetter(currentUser?.fullname.split(" ")[1] || "")}
						</span>
					</h1>

					<div className="flex items-center gap-3">
						<Button variant="outline" size="sm" className="rounded-xl flex items-center">
							<Link
								href={"/employees/add-employee"}
								className="flex items-center justify-start gap-3"
							>
								<Icon icon="hugeicons:user-add-02" className="!w-6 !h-6" />
								<span className="hidden lg:inline">Add Employee</span>
							</Link>
						</Button>
						<Button variant="outline" size="sm" className="rounded-xl flex items-center">
							<Link href={"/job-adverts/create"} className="flex items-center justify-start gap-3">
								<Icon icon="hugeicons:advertisiment" className="!w-6 !h-6" />
								<span className="hidden lg:inline">Post Job Opening</span>
							</Link>
						</Button>
						<Button variant="outline" size="sm" className="rounded-xl flex items-center">
							<Link
								href={"/events-holidays/events/add"}
								className="flex items-center justify-start gap-3"
							>
								<Icon icon="hugeicons:calendar-add-01" className="!w-6 !h-6" />
								<span className="hidden lg:inline">Add event</span>
							</Link>
						</Button>
					</div>
				</div>

				<TasksCards branchId={null} />

				<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
					{/* Main Content */}
					<div className="lg:col-span-3 flex flex-col gap-6">
						{/* Metrics and Calendar Row */}
						<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
							<div className="md:col-span-4">
								<MetricCards data={data?.basic_counts} onRefresh={refreshData} loading={loading} />
							</div>
						</div>

						{/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
						</div> */}

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
					</div>

					{/* Sidebar */}
					<div className="flex flex-col gap-4 lg:col-span-1">
						<div className="min-h-[14rem]">
							<AnnouncementCarousel />
						</div>
						<div className="">
							<MinimalCalendar />
						</div>
						<EventsAndHolidaysWidget className="!max-h-[500px] !h-full overflow-y-auto" />
					</div>
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
				<Card className="rounded-xl !border-none shadow-sm">
					<EmployeeAttendance showingOnDashboard={true} scope={{ type: "default" }} />
				</Card>
			</div>
		</div>
	);
}
