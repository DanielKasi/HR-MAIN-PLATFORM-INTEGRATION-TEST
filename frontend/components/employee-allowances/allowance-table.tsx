"use client";

import { format } from "date-fns";
import { Edit, Trash2, MoreVertical, Users } from "lucide-react";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IEmployeeAllowance } from "@/types/types.utils";
import { formatCurrency } from "@/lib/helpers";

interface AllowanceTableProps {
	allowances: IEmployeeAllowance[];
	totalAllowances: number;
	getCalculatedAmount: (allowance: IEmployeeAllowance) => number;
	onEdit: (allowance: IEmployeeAllowance) => void;
	onDelete: (id: number) => void;
	onClearFilters: () => void;
}

export function AllowanceTable({
	allowances,
	totalAllowances,
	getCalculatedAmount,
	onEdit,
	onDelete,
	onClearFilters,
}: AllowanceTableProps) {
	const getCategoryColor = () => {
		return "bg-blue-50 text-blue-700 border-blue-200";
	};

	if (allowances.length === 0) {
		return (
			<div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mx-2">
				<div className="p-4 border-b border-gray-200">
					<h3 className="text-lg font-semibold text-gray-900">
						Current Allowances
						<span className="text-sm font-normal text-gray-500 ml-2">
							(0 of {totalAllowances} records)
						</span>
					</h3>
					<p className="text-sm text-gray-600 mt-1">
						Overview of all employee allowances and their calculated amounts
					</p>
				</div>
				<div className="text-center py-12">
					<Users className="mx-auto h-12 w-12 text-gray-400" />
					<h3 className="mt-2 text-sm font-medium text-gray-900">No allowances found</h3>
					<p className="mt-1 text-sm text-gray-500">
						{totalAllowances === 0
							? "No allowances have been created yet."
							: "No allowances match your current filters."}
					</p>
					{totalAllowances > 0 && (
						<Button onClick={onClearFilters} variant="outline" className="mt-4 bg-transparent">
							Clear Filters
						</Button>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mx-2">
			<div className="p-4 border-b border-gray-200">
				<h3 className="text-lg font-semibold text-gray-900">
					Current Allowances
					<span className="text-sm font-normal text-gray-500 ml-2">
						({allowances.length} of {totalAllowances} records)
					</span>
				</h3>
				<p className="text-sm text-gray-600 mt-1">
					Overview of all employee allowances and their calculated amounts
				</p>
			</div>

			<Table>
				<TableHeader>
					<TableRow className="bg-gray-50">
						<TableHead className="font-semibold text-gray-900">Employee</TableHead>
						<TableHead className="font-semibold text-gray-900">Allowance Type</TableHead>
						<TableHead className="font-semibold text-gray-900">Method</TableHead>
						<TableHead className="font-semibold text-gray-900">Calculated Amount</TableHead>
						<TableHead className="font-semibold text-gray-900">Status</TableHead>
						<TableHead className="font-semibold text-gray-900">Effective Period</TableHead>
						<TableHead className="font-semibold text-gray-900">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{allowances.map((allowance) => (
						<TableRow key={allowance.id} className="hover:bg-gray-50 transition-colors">
							<TableCell>
								<div>
									<div className="font-medium text-gray-900">
										{allowance.employee.user?.fullname}
									</div>
									<div className="text-sm text-gray-500">{allowance.employee.email}</div>
								</div>
							</TableCell>
							<TableCell>
								<Badge className={`${getCategoryColor()} border font-medium`}>
									{allowance.allowance_type.name}
								</Badge>
							</TableCell>
							<TableCell>
								<Badge variant="outline" className="flex items-center gap-1 w-fit">
									{allowance.calculation_method === "fixed" ? "Fixed" : "Percentage"}
								</Badge>
							</TableCell>
							<TableCell>
								<span className="text-lg font-semibold text-myOrange">
									{formatCurrency(getCalculatedAmount(allowance))}
								</span>
							</TableCell>
							<TableCell>
								<Badge
									variant={allowance.is_active ? "default" : "secondary"}
									className={
										allowance.is_active
											? "bg-green-600 hover:bg-green-700 text-white"
											: "bg-gray-200 text-gray-700"
									}
								>
									{allowance.is_active ? "Active" : "Inactive"}
								</Badge>
							</TableCell>
							<TableCell>
								<div className="text-sm">
									<div className="font-medium">
										From: {format(new Date(allowance.effective_from), "MMM dd, yyyy")}
									</div>
									{allowance.effective_to && (
										<div className="text-gray-500">
											To: {format(new Date(allowance.effective_to), "MMM dd, yyyy")}
										</div>
									)}
								</div>
							</TableCell>
							<TableCell>
								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
											<MoreVertical className="h-4 w-4 text-gray-600" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end" className="w-48">
										<DropdownMenuItem
											onClick={() => onEdit(allowance)}
											className="cursor-pointer hover:bg-orange-50 focus:bg-orange-50"
										>
											<Edit className="h-4 w-4 mr-2 text-myOrange" />
											Edit
										</DropdownMenuItem>
										<DropdownMenuItem
											onClick={() => onDelete(allowance.id)}
											className="cursor-pointer hover:bg-red-50 focus:bg-red-50 text-red-600"
										>
											<Trash2 className="h-4 w-4 mr-2" />
											Delete
										</DropdownMenuItem>
									</DropdownMenuContent>
								</DropdownMenu>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
