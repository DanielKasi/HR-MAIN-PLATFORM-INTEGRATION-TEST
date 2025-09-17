"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface AllowanceFiltersProps {
	searchTerm: string;
	onSearchChange: (value: string) => void;
	statusFilter: "all" | "active" | "inactive";
	onStatusFilterChange: (value: "all" | "active" | "inactive") => void;
	methodFilter: "all" | "fixed" | "percentage";
	onMethodFilterChange: (value: "all" | "fixed" | "percentage") => void;
	onClearFilters: () => void;
	hasActiveFilters: boolean;
}

export function AllowanceFilters({
	searchTerm,
	onSearchChange,
	statusFilter,
	onStatusFilterChange,
	methodFilter,
	onMethodFilterChange,
	onClearFilters,
	hasActiveFilters,
}: AllowanceFiltersProps) {
	return (
		<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 mx-2">
			<div className="space-y-4">
				{/* Search Bar */}
				<div className="relative w-full max-w-xl">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search by employee name or allowance type..."
						value={searchTerm}
						onChange={(e) => onSearchChange(e.target.value)}
						className="pl-10 focus:ring-orange-500 focus:border-orange-500"
					/>
				</div>

				{/* Filter Row */}
				<div className="flex items-center justify-start gap-4">
					<Select value={statusFilter} onValueChange={onStatusFilterChange}>
						<SelectTrigger className="focus:ring-orange-500 focus:border-orange-500 w-24 lg:w-36">
							<SelectValue placeholder="Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Status</SelectItem>
							<SelectItem value="active">Active</SelectItem>
							<SelectItem value="inactive">Inactive</SelectItem>
						</SelectContent>
					</Select>

					<Select value={methodFilter} onValueChange={onMethodFilterChange}>
						<SelectTrigger className="focus:ring-orange-500 focus:border-orange-500 w-24 lg:w-36">
							<SelectValue placeholder="Method" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Methods</SelectItem>
							<SelectItem value="fixed">Fixed Amount</SelectItem>
							<SelectItem value="percentage">Percentage</SelectItem>
						</SelectContent>
					</Select>

					{hasActiveFilters && (
						<Button
							onClick={onClearFilters}
							variant="outline"
							className="border-orange-200 text-orange-700 hover:bg-orange-50 bg-transparent"
						>
							Clear Filters
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
