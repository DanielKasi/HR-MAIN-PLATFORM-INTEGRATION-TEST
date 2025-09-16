"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumberByMagnitude } from "@/lib/helpers";

interface PayrollByDepartmentProps {
	data?: Array<{ dept: string; payroll: number }>;
	onRefresh: () => void;
	loading: boolean;
}

export function PayrollByDepartment({ data, onRefresh, loading }: PayrollByDepartmentProps) {
	return (
		<Card className="shadow-sm border-none rounded-3xl">
			<CardHeader className="flex flex-row items-center justify-between">
				<CardTitle className="text-base font-medium">Payroll by Department</CardTitle>
			</CardHeader>
			<CardContent>
				<div className="space-y-4">
					{data?.map((item, index) => (
						<div key={item.dept} className="flex items-center justify-between">
							<span className="text-sm font-medium text-gray-700">{item.dept}</span>
							<div className="flex items-center gap-3 flex-1 ml-4">
								<div className="flex-1 bg-gray-200 rounded-full h-2">
									<div
										className="bg-orange-500 h-2 rounded-full"
										style={{
											width: `${(item.payroll / Math.max(...(data?.map((d) => d.payroll) || [1]))) * 100}%`,
										}}
									/>
								</div>
								<span className="text-sm font-medium text-gray-900 min-w-[60px] text-right">
									{formatNumberByMagnitude(item.payroll)}
								</span>
							</div>
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}
