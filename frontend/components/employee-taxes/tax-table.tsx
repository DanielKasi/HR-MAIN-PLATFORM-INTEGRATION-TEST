"use client";

import { useState } from "react";
import { MoreVertical, Edit, Trash2, Calendar, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { IEmployeeTax } from "@/types/types.utils";

interface TaxTableProps {
	taxes: IEmployeeTax[];
	totalTaxes: number;
	onEdit: (tax: IEmployeeTax) => void;
	onDelete: (id: number) => void;
	onClearFilters: () => void;
}

const getStatusColor = (tax: IEmployeeTax) => {
	const now = new Date();
	const effectiveFrom = new Date(tax.effective_from);
	const effectiveTo = tax.effective_to ? new Date(tax.effective_to) : null;

	if (effectiveFrom > now) {
		return "bg-blue-100 text-blue-800 border-blue-200";
	}

	if (effectiveTo && effectiveTo < now) {
		return "bg-gray-100 text-gray-800 border-gray-200";
	}

	return "bg-green-100 text-green-800 border-green-200";
};

const getStatusText = (tax: IEmployeeTax) => {
	const now = new Date();
	const effectiveFrom = new Date(tax.effective_from);
	const effectiveTo = tax.effective_to ? new Date(tax.effective_to) : null;

	if (effectiveFrom > now) {
		return "Upcoming";
	}

	if (effectiveTo && effectiveTo < now) {
		return "Expired";
	}

	return "Active";
};

const formatDate = (dateString: string) => {
	return new Date(dateString).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};

export function TaxTable({ taxes, totalTaxes, onEdit, onDelete, onClearFilters }: TaxTableProps) {
	const [deletingId, setDeletingId] = useState<number | null>(null);

	const handleDelete = async (id: number) => {
		setDeletingId(id);
		try {
			await onDelete(id);
		} finally {
			setDeletingId(null);
		}
	};

	if (taxes.length === 0) {
		return (
			<div className="bg-white rounded-lg ">
				<div className="p-8 text-center">
					<div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
						<Calendar className="h-8 w-8 text-gray-400" />
					</div>
					<h3 className="text-lg font-medium text-gray-900 mb-2">No tax configurations found</h3>
					<p className="text-gray-600 mb-4">
						{totalTaxes === 0
							? "Get started by creating your first tax configuration."
							: "No tax configurations match your current filters."}
					</p>
					{totalTaxes > 0 && (
						<Button variant="outline" onClick={onClearFilters}>
							Clear Filters
						</Button>
					)}
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white rounded-lg border ">
			<div className="overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-12">
								<input type="checkbox" className="rounded border-gray-300" />
							</TableHead>
							<TableHead>Employee</TableHead>
							<TableHead>Tax Type</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Effective From</TableHead>
							<TableHead>Effective To</TableHead>
							<TableHead>Created</TableHead>
							<TableHead className="w-12">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{taxes.map((tax) => (
							<TableRow key={tax.id}>
								<TableCell>
									<input type="checkbox" className="rounded border-gray-300" />
								</TableCell>
								<TableCell>
									<div className="flex items-center">
										<div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
											<User className="h-4 w-4 text-myOrange" />
										</div>
										<div>
											<p className="font-medium text-gray-900">
												{tax.employee?.name || "Unknown Employee"}
											</p>
											<p className="text-sm text-gray-500">{tax.employee.email}</p>
										</div>
									</div>
								</TableCell>
								<TableCell>
									<div>
										<p className="font-medium text-gray-900">{tax.institution_tax.tax_name}</p>
									</div>
								</TableCell>
								<TableCell>
									<Badge className={getStatusColor(tax)}>{getStatusText(tax)}</Badge>
								</TableCell>
								<TableCell>
									<div className="text-sm text-gray-900">{formatDate(tax.effective_from)}</div>
								</TableCell>
								<TableCell>
									<div className="text-sm text-gray-900">
										{tax.effective_to ? formatDate(tax.effective_to) : "No end date"}
									</div>
								</TableCell>
								<TableCell>
									<div className="text-sm text-gray-900">{formatDate(tax.created_at)}</div>
								</TableCell>
								<TableCell>
									<DropdownMenu>
										<DropdownMenuTrigger asChild>
											<Button variant="ghost" size="sm">
												<MoreVertical className="h-4 w-4" />
											</Button>
										</DropdownMenuTrigger>
										<DropdownMenuContent align="end">
											<DropdownMenuItem onClick={() => onEdit(tax)}>
												<Edit className="h-4 w-4 mr-2" />
												Edit
											</DropdownMenuItem>
											<DropdownMenuItem
												onClick={() => handleDelete(tax.id)}
												disabled={deletingId === tax.id}
												className="text-red-600"
											>
												<Trash2 className="h-4 w-4 mr-2" />
												{deletingId === tax.id ? "Deleting..." : "Delete"}
											</DropdownMenuItem>
										</DropdownMenuContent>
									</DropdownMenu>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
