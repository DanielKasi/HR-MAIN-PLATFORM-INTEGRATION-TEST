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
import { EmployeeCountChart } from "@/components/dashboard-new/employee-count-chart";
import { SimpleCalendarWidget } from "@/components/calendar-widget";
import { EventsAndHolidaysWidget } from "@/components/dashboard-new/events-and-holidays";
import { institutionAPI, showErrorToast } from "@/lib/utils";
import { selectSelectedInstitution, selectUser } from "@/store/auth/selectors";
import { IInstitutionAnalytics } from "@/types/types.utils";
import { USER_GENDER } from "@/types/user.types";
import { TasksCards } from "@/components/dashboard_components/tasks-cards";
import AnnouncementCarousel from "@/components/dashboard_components/announcements-carousel";
import BarHChart from "../analytics/_components/barh.chart";
import colors from "../analytics/_components/colors";
import DonutChart from "@/app/(main_app)/(dashboard)/analytics/_components/pie.chart";
import DepartmentTreeMap from "@/app/(main_app)/(dashboard)/analytics/employees/department.treemap";
import ProtectedComponent from "@/components/ProtectedComponent";
import { PERMISSION_CODES } from "@/constants";
import { AttendanceSummary } from "@/components/dashboard_components/attendance-summary";
import EmployeeAttendance from "@/components/attendance/employee-attendance";

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
		<div className="min-h-screen bg-transparent p-4">
			<div className="space-y-4">
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

					<div className="flex items-center gap-4">
						<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_SEND_SPOTCHECK}>
							<Button variant="outline" size="sm" className="rounded-xl flex items-center">
								<Link href="" className="flex items-center justify-start gap-4">
									<Icon icon="hugeicons:location-user-02" className="!w-6 !h-6" />
									<span className="hidden lg:inline">Send Spotcheck</span>
								</Link>
							</Button>
						</ProtectedComponent>
						<Button variant="outline" size="sm" className="rounded-xl flex items-center">
							<Link
								href={"/events-holidays/events/add"}
								className="flex items-center justify-start gap-4"
							>
								<Icon icon="hugeicons:calendar-add-01" className="!w-6 !h-6" />
								<span className="hidden lg:inline">Add event</span>
							</Link>
						</Button>
						<Button variant="outline" size="sm" className="rounded-xl flex items-center">
							<Link
								href={"/employees/add-employee"}
								className="flex items-center justify-start gap-4"
							>
								<Icon icon="hugeicons:user-add-02" className="!w-6 !h-6" />
								<span className="hidden lg:inline">Add Employee</span>
							</Link>
						</Button>
					</div>
				</div>

				<TasksCards branchId={null} />

				{/* Main Content */}
				<div className="flex flex-col gap-10 max-md:h-max">
					<div className="grid grid-cols-1 lg:grid-cols-3 !max-h-full gap-y-4 lg:gap-x-4 h-[38rem] max-lg:h-max max-lg:!w-full">
						<div className="col-span-2 flex flex-col justify-between gap-4 h-full">
							<MetricCards data={data?.basic_counts} onRefresh={refreshData} loading={loading} />

							{/* Payroll Chart */}
							<PayrollChart
								data={data?.payroll_summary}
								totalCurrentYear={totalCurrentYear}
								growthPercentage={growthPercentage}
								onRefresh={refreshData}
								loading={loading}
							/>
						</div>
						<div className="h-full col-span-1 flex flex-col justify-between gap-4 !w-full">
							<div className="max-h-[60%] h-full">
								<AnnouncementCarousel />
							</div>
							<div className="max-h-[40%] h-full">
								<SimpleCalendarWidget className="max-h-full !w-full !h-full" />
							</div>
						</div>
					</div>

					{/* Charts Grid */}
					<div className="md:mt-6 lg:mt-7 xl:mt-2 flex flex-col lg:flex-row lg:!h-[22rem]">
						<div className="grid grid-cols-1 !w-full lg:grid-cols-3 gap-4 !h-full">
							<EmployeeCountChart
								className="lg:!h-full"
								data={data?.employees_per_department}
								onRefresh={refreshData}
								loading={loading}
							/>
							{data && (
								<DonutChart
									className="lg:!h-full"
									title="Gender Distribution"
									totalStr="Total Employees"
									data={[
										{ gender: "Male", count: data.gender_distribution.male },
										{ gender: "Female", count: data.gender_distribution.female },
										{ gender: "Other", count: data.gender_distribution.other },
									]}
									colors={["#415180", "#0CA0F5", "#10B981"]}
									label={"Gender"}
									dataKey={"count"}
									nameKey={"gender"}
									labelList
									donut
								/>
							)}

							<EventsAndHolidaysWidget
								contentClassName="overflow-y-auto !h-full pb-24 pt-4"
								className="h-[24rem] lg:!h-full overflow-hidden"
							/>
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					{data?.employees_per_department && (
						<DepartmentTreeMap
							data={data.employees_per_department.map((item) => ({
								department: item.dept_name,
								count: item.count,
								year: item.year,
							}))}
							title={"Employees per Department"}
						/>
					)}
					<BarHChart
						title={"Salary By Department"}
						data={{
							"This Year": data?.payroll_by_department || [],
						}}
						dataKey={"payroll"}
						nameKey={"dept"}
						color={colors[3]}
						rounded
					/>
				</div>
				{/* <Card className="rounded-xl !border-none shadow-sm">
					<EmployeeAttendance showingOnDashboard={true} scope={{ type: "default" }} />
				</Card> */}
				<AttendanceSummary />
			</div>
		</div>
	);
}
