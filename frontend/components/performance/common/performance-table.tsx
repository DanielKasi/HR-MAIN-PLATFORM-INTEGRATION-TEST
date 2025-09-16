"use client";

import type React from "react";

import { useState } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Search, Plus } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface TableColumn<T> {
	key: keyof T | string;
	label: string;
	render?: (item: T) => React.ReactNode;
	sortable?: boolean;
	className?: string;
}

export interface TableAction<T> {
	label: string;
	icon?: React.ReactNode;
	onClick: (item: T) => void;
	variant?: "default" | "destructive";
	show?: (item: T) => boolean;
}

interface PerformanceTableProps<T> {
	data: T[];
	columns: TableColumn<T>[];
	actions?: TableAction<T>[];
	onAdd?: () => void;
	addLabel?: string;
	searchPlaceholder?: string;
	onSearch?: (query: string) => void;
	isLoading?: boolean;
	emptyMessage?: string;
	className?: string;
}

export function PerformanceTable<T extends { id: number | string }>({
	data,
	columns,
	actions = [],
	onAdd,
	addLabel = "Add New",
	searchPlaceholder = "Search...",
	onSearch,
	isLoading = false,
	emptyMessage = "No data found",
	className,
}: PerformanceTableProps<T>) {
	const [searchQuery, setSearchQuery] = useState("");

	const handleSearch = (query: string) => {
		setSearchQuery(query);
		onSearch?.(query);
	};

	const renderCellContent = (item: T, column: TableColumn<T>) => {
		if (column.render) {
			return column.render(item);
		}

		const value = item[column.key as keyof T];

		// Handle common data types
		if (typeof value === "boolean") {
			return <Badge variant={value ? "default" : "secondary"}>{value ? "Yes" : "No"}</Badge>;
		}

		if (value instanceof Date) {
			return value.toLocaleDateString();
		}

		if (typeof value === "string" && value.includes("T")) {
			// Likely an ISO date string
			try {
				return new Date(value).toLocaleDateString();
			} catch {
				return value;
			}
		}

		return String(value || "");
	};

	return (
		<div className={cn("space-y-4", className)}>
			{/* Header with search and add button */}
			<div className="flex items-center justify-between gap-4">
				<div className="relative flex-1 max-w-sm">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
					<Input
						placeholder={searchPlaceholder}
						value={searchQuery}
						onChange={(e) => handleSearch(e.target.value)}
						className="pl-10"
					/>
				</div>

				{onAdd && (
					<Button onClick={onAdd} className="flex items-center gap-2 rounded-xl">
						<Plus className="h-4 w-4" />
						{addLabel}
					</Button>
				)}
			</div>

			{/* Table */}
			<div className=" rounded-lg overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="bg-slate-50">
							{columns.map((column) => (
								<TableHead
									key={String(column.key)}
									className={cn("font-semibold text-slate-700", column.className)}
								>
									{column.label}
								</TableHead>
							))}
							{actions.length > 0 && <TableHead className="w-12"></TableHead>}
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell
									colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
									className="text-center py-8"
								>
									<div className="flex items-center justify-center">
										<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
										<span className="ml-2 text-slate-600">Loading...</span>
									</div>
								</TableCell>
							</TableRow>
						) : data.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
									className="text-center py-8"
								>
									<div className="text-slate-500">
										<div className="text-lg font-medium mb-1">{emptyMessage}</div>
										<div className="text-sm">Try adjusting your search or add a new item.</div>
									</div>
								</TableCell>
							</TableRow>
						) : (
							data.map((item) => (
								<TableRow key={String(item.id)} className="hover:bg-slate-50">
									{columns.map((column) => (
										<TableCell key={String(column.key)} className={column.className}>
											{renderCellContent(item, column)}
										</TableCell>
									))}
									{actions.length > 0 && (
										<TableCell>
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" size="sm" className="h-8 w-8 p-0">
														<MoreHorizontal className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													{actions
														.filter((action) => !action.show || action.show(item))
														.map((action, index) => (
															<DropdownMenuItem
																key={index}
																onClick={() => action.onClick(item)}
																className={cn(
																	"flex items-center gap-2",
																	action.variant === "destructive" &&
																		"text-red-600 focus:text-red-600",
																)}
															>
																{action.icon}
																{action.label}
															</DropdownMenuItem>
														))}
												</DropdownMenuContent>
											</DropdownMenu>
										</TableCell>
									)}
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
