"use client";

import { IEmployeeAllowance } from "@/types/types.utils";
import {
	Users,
	CoinsIcon as Coins2,
	CalendarPlus2Icon as CalendarIcon2,
	Percent,
} from "lucide-react";
import { formatCurrency } from "@/lib/helpers";

interface AllowanceStatsCardsProps {
	allowances: IEmployeeAllowance[];
	getCalculatedAmount: (allowance: IEmployeeAllowance) => number;
}

export function AllowanceStatsCards({ allowances, getCalculatedAmount }: AllowanceStatsCardsProps) {
	const activeAllowances = allowances.filter((a) => a.is_active);
	const percentageBasedAllowances = allowances.filter((a) => a.calculation_method === "percentage");
	const totalMonthlyCost = activeAllowances.reduce((sum, a) => sum + getCalculatedAmount(a), 0);

	return (
		<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 px-2">
			<div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
				<div className="flex items-center">
					<div className="p-2 bg-orange-100 rounded-lg">
						<Users className="h-5 w-5 text-myOrange" />
					</div>
					<div className="ml-3">
						<p className="text-sm font-medium text-gray-600">Total Allowances</p>
						<p className="text-2xl font-bold text-gray-900">{allowances.length}</p>
					</div>
				</div>
			</div>
			<div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
				<div className="flex items-center">
					<div className="p-2 bg-green-100 rounded-lg">
						<Coins2 className="h-5 w-5 text-green-600" />
					</div>
					<div className="ml-3">
						<p className="text-sm font-medium text-gray-600">Active Allowances</p>
						<p className="text-2xl font-bold text-green-600">{activeAllowances.length}</p>
					</div>
				</div>
			</div>
			<div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
				<div className="flex items-center">
					<div className="p-2 bg-blue-100 rounded-lg">
						<CalendarIcon2 className="h-5 w-5 text-blue-600" />
					</div>
					<div className="ml-3">
						<p className="text-sm font-medium text-gray-600">Total Monthly Cost</p>
						<p className="text-2xl font-bold text-blue-600">{formatCurrency(totalMonthlyCost)}</p>
					</div>
				</div>
			</div>
			<div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
				<div className="flex items-center">
					<div className="p-2 bg-purple-100 rounded-lg">
						<Percent className="h-5 w-5 text-purple-600" />
					</div>
					<div className="ml-3">
						<p className="text-sm font-medium text-gray-600">Percentage Based</p>
						<p className="text-2xl font-bold text-purple-600">{percentageBasedAllowances.length}</p>
					</div>
				</div>
			</div>
		</div>
	);
}
