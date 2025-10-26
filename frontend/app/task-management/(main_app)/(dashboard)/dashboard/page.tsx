"use client";

import { useState, useCallback, useEffect } from "react";
import { Icon } from "@iconify/react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useSelector } from "react-redux";
import Piechart from "../analytics/_components/pie.chart";

import { MetricCards } from "@/components/dashboard/metric-cards";
import { SimpleCalendarWidget } from "@/components/calendar-widget";
import { institutionAPI, showErrorToast } from "@/lib/utils";
import { selectSelectedInstitution, selectUser } from "@/store/auth/selectors-context-aware";
import { IInstitutionAnalytics } from "@/types/types.utils";
import { USER_GENDER } from "@/types/user.types";
import { TasksCards } from "@/components/dashboard/tasks-cards";
import BarVChart from "../analytics/_components/barv.chart";
import colors from "../analytics/_components/colors";
import BarSChart from "../analytics/_components/bars.chart";
import AnnouncementCarousel from "@/components/dashboard/announcements-carousel";

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
				</div>

				<TasksCards branchId={null} />

				<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
					{/* Main Content */}
					<div className="lg:col-span-4 space-y-4">
						{/* Metrics and Calendar Row */}
						<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
							<div className="md:col-span-4">
								<MetricCards
								// data={data?.basic_counts}
								// onRefresh={refreshData}
								// loading={loading}
								/>
							</div>
						</div>
						<div className="grid grid-cols-1 md:grid-cols-6 gap-4">
							<BarSChart
								className="md:col-span-4 "
								title={"Projects by Team Over Time"}
								label={""}
								data={{
									"2025": [
										{ month: "JAN", hired: 20, applications: 100 },
										{ month: "FEB", hired: 30, applications: 120 },
										{ month: "MAR", hired: 20, applications: 200 },
										{ month: "APR", hired: 50, applications: 300 },
										{ month: "JUN", hired: 50, applications: 400 },
										{ month: "JUL", hired: 50, applications: 100 },
										{ month: "AUG", hired: 50, applications: 200 },
										{ month: "SEP", hired: 50, applications: 300 },
										{ month: "OCT", hired: 40, applications: 200 },
										{ month: "NOV", hired: 10, applications: 100 },
										{ month: "DEC", hired: 50, applications: 200 },
									],
								}}
								dataKey1={"projects"}
								dataKey2={"team"}
								nameKey={"month"}
								colors={colors}
								rounded
							/>

							{/* Sidebar */}
							<div className="flex flex-col gap-4 md:col-span-2">
								<div className="min-h-[18rem]">
									<AnnouncementCarousel />
								</div>
								<SimpleCalendarWidget className="!min-h-[20rem] !max-h-[32rem] !h-full" />
							</div>
						</div>
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							{/* Source of Hire */}
							<Piechart
								colors={colors}
								data={{
									"2025": [
										{ source: "Clients", count: 12 },
										{ source: "Internal", count: 2 },
										{ source: "Partners", count: 20 },
										{ source: "Other", count: 20 },
									],
								}}
								title="Sources of Projects"
								totalStr={""}
								label={""}
								dataKey={"count"}
								nameKey={"source"}
								labelList
							/>
							<BarVChart
								title={"Projects Counts Over Time"}
								label={""}
								data={{
									"2021-2025": [
										{ year: "2021", count: 12 },
										{ year: "2022", count: 20 },
										{ year: "2023", count: 40 },
										{ year: "2024", count: 30 },
										{ year: "2025", count: 50 },
									],
								}}
								dataKey={"count"}
								nameKey={"year"}
								colors={colors}
								gap
								rounded
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
