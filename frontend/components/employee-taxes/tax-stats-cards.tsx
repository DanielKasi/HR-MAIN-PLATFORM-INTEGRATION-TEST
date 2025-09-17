"use client";

import { Users, Calendar, TrendingUp, FileText } from "lucide-react";

import { IEmployeeTax } from "@/types/types.utils";

interface TaxStatsCardsProps {
	taxes: IEmployeeTax[];
}

export function TaxStatsCards({ taxes }: TaxStatsCardsProps) {
	const activeTaxes = taxes.filter((t) => {
		const now = new Date();
		const effectiveFrom = new Date(t.effective_from);
		const effectiveTo = t.effective_to ? new Date(t.effective_to) : null;

		return effectiveFrom <= now && (!effectiveTo || effectiveTo >= now);
	});

	const expiredTaxes = taxes.filter((t) => {
		if (!t.effective_to) return false;
		const now = new Date();
		const effectiveTo = new Date(t.effective_to);

		return effectiveTo < now;
	});

	const upcomingTaxes = taxes.filter((t) => {
		const now = new Date();
		const effectiveFrom = new Date(t.effective_from);

		return effectiveFrom > now;
	});

	return (
		<div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 px-2">
			<div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
				<div className="flex items-center">
					<div className="p-2 bg-orange-100 rounded-lg">
						<Users className="h-5 w-5 text-myOrange" />
					</div>
					<div className="ml-3">
						<p className="text-sm font-medium text-gray-600">Total Tax Configurations</p>
						<p className="text-2xl font-bold text-gray-900">{taxes.length}</p>
					</div>
				</div>
			</div>
			<div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
				<div className="flex items-center">
					<div className="p-2 bg-green-100 rounded-lg">
						<TrendingUp className="h-5 w-5 text-green-600" />
					</div>
					<div className="ml-3">
						<p className="text-sm font-medium text-gray-600">Active Tax Configurations</p>
						<p className="text-2xl font-bold text-green-600">{activeTaxes.length}</p>
					</div>
				</div>
			</div>
			<div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
				<div className="flex items-center">
					<div className="p-2 bg-blue-100 rounded-lg">
						<Calendar className="h-5 w-5 text-blue-600" />
					</div>
					<div className="ml-3">
						<p className="text-sm font-medium text-gray-600">Upcoming Tax Configurations</p>
						<p className="text-2xl font-bold text-blue-600">{upcomingTaxes.length}</p>
					</div>
				</div>
			</div>
			<div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
				<div className="flex items-center">
					<div className="p-2 bg-gray-100 rounded-lg">
						<FileText className="h-5 w-5 text-gray-600" />
					</div>
					<div className="ml-3">
						<p className="text-sm font-medium text-gray-600">Expired Tax Configurations</p>
						<p className="text-2xl font-bold text-gray-600">{expiredTaxes.length}</p>
					</div>
				</div>
			</div>
		</div>
	);
}
