"use client";

import LoadingComponent from "@/components/LoadingComponent";
import StatsCard from "../_components/stats.card";
import Piechart from "../_components/pie.chart";
import colors from "../_components/colors";
import Linechart from "../_components/line.chart";
import BarHChart from "../_components/barh.chart";
import { IPayrollDashboard } from "@/types/payroll.types";
import { getPayrollDashboard } from "@/lib/utils";
import PayrollTable from "./payroll.table";

export default function PayrollDashboard() {
	const initialData: IPayrollDashboard = {
		total_payroll_amount: 0,
		total_gross_payroll: 0,
		payroll_by_department: [
			{
				department: "string",
				total_net: 0,
				total_gross: 0,
				employee_count: 0,
			},
		],
		average_net_salary: 0,
		average_gross_salary: 0,
		total_penalties_amount: 0,
		total_penalties_count: 0,
		penalty_breakdown: [
			{
				penalty_type: "string",
				count: 0,
				total_amount: 0,
			},
		],
		allowances_vs_deductions: {
			total_allowances: 0,
			total_deductions: 0,
			net_difference: 0,
		},
		payroll_over_time: [
			{
				month: "string",
				total_net: 0,
				total_gross: 0,
				payslips_count: 0,
			},
		],
		payroll_periods_summary: {
			total_periods: 0,
			processed_periods: 0,
			pending_periods: 0,
			latest_period: "string",
		},
	};

	const getGroupCards = (data: IPayrollDashboard) => [
		{
			title: "Total Payroll Cost",
			value: data.total_payroll_amount,
			color: "text-orange-600",
			bg: "bg-orange-100",
			icon: "hugeicons:payment-01",
			link: "#",
		},
		{
			title: "Avg Salary per Employee",
			color: "text-indigo-600",
			bg: "bg-indigo-100",
			value: data.average_gross_salary,
			icon: "hugeicons:calendar-01",
			link: "#",
		},
		{
			title: "Deductions",
			value: data.total_penalties_amount,
			color: "text-emerald-600",
			bg: "bg-emerald-100",
			icon: "hugeicons:money-not-found-04",
			link: "#",
		},
		{
			title: "Net Payroll",
			value: data.total_payroll_amount,
			color: "text-blue-600",
			bg: "bg-blue-100",
			icon: "hugeicons:payment-02",
		},
	];

	return (
		<LoadingComponent
			initialData={initialData}
			fetchData={getPayrollDashboard}
			content={(data) => (
				<div className="min-h-screen bg-gray-50 p-6">
					<div className="space-y-8">
						{/* Header */}
						<div className="gap-4 flex">
							<h1 className="flex-grow text-4xl font-bold text-slate-900 text-balance">
								Payroll Analytics
							</h1>
						</div>

						{/* Key Metrics */}
						<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
							{getGroupCards(data).map((card, i) => (
								<StatsCard key={i} index={i} {...card} />
							))}
						</div>

						{/* payroll over years */}
						<Linechart
							title={"Payroll Over Years"}
							label={""}
							data={{
								"2025": data.payroll_over_time,
							}}
							dataKey={["total_net", "total_gross", "payslips_count"]}
							nameKey={"month"}
							colors={["#3CB371", "#FF1B1C", "#0CA0F5"]}
						/>

						{/* Charts Section */}
						<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
							{/* payroll by department */}
							<BarHChart
								title={"Payroll by Department"}
								data={{
									"This week": [
										{ department: "Technology", count: 20_000_000 },
										{ department: "Sales", count: 16_000_000 },
										{ department: "Marketing", count: 12_000_000 },
										{ department: "Operations", count: 10_000_000 },
									],
								}}
								dataKey={"count"}
								nameKey={"department"}
								color={colors[3]}
								rounded
							/>

							<Piechart
								title={"Payroll Distribution"}
								label={""}
								data={{
									"This Month": [
										{ name: "salary", count: 23 },
										{ name: "Deductions", count: 12 },
										{ name: "Overtime", count: 42 },
										{ name: "Allowances", count: 35 },
									],
								}}
								dataKey={"count"}
								nameKey={"name"}
								colors={colors}
							/>
						</div>

						<PayrollTable />
					</div>
				</div>
			)}
		></LoadingComponent>
	);
}
