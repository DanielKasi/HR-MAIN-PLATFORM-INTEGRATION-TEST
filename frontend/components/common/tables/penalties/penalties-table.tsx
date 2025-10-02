"use client";

import type { IEmployeePenalty, IEmployee } from "@/types/types.utils";

import React, { useRef } from "react";
import { useSelector } from "react-redux";
import { Edit, MoreHorizontal, Trash } from "lucide-react";

import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/common/skeletons/table-skeleton";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { penaltiesAPI } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PENALTY_TYPES } from "@/constants";
import { formatCurrency } from "@/lib/helpers";

interface PenaltiesTableProps {
	searchTerm?: string;
	refreshTableRef?: React.RefObject<() => void>;
	scope:
		| { type: "employee"; employee: IEmployee }
		| { type: "branch"; branch: any }
		| { type: "default" };
	onEdit?: (penalty: IEmployeePenalty) => void;
	onDelete?: (id: number) => void;
}

export default function PenaltiesTable({
	searchTerm,
	refreshTableRef,
	scope,
	onEdit,
	onDelete,
}: PenaltiesTableProps) {
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const localRefreshRef = refreshTableRef || useRef<() => void>(() => {});

	return (
		<PaginatedTableWrapper<IEmployeePenalty>
			fetchFirstPage={async () => {
				if (!selectedInstitution) throw new Error("No institution selected");
				if (scope.type === "employee") {
					return await penaltiesAPI.EMPLOYEE.getPaginated({
						employee_id: scope.employee.id,
						page: 1,
						search: searchTerm || undefined,
					});
				}

				// default: fetch empty set
				return { results: [], count: 0 } as any;
			}}
			onError={(error) => console.error(error)}
			fetchFromUrl={async ({ url }) => penaltiesAPI.COMMON.getPaginatedFromUrl({ url })}
			deps={[selectedInstitution?.id, searchTerm]}
			className="space-y-4"
			footerClassName="pt-4"
		>
			{({ data, loading, refresh, goNext, goPrev }) => {
				// store refresh
				React.useEffect(() => {
					if (localRefreshRef) {
						(localRefreshRef as any).current = refresh;
					}
				}, [refresh]);

				if (loading) return <TableSkeleton rows={8} columns={5} />;

				if (!data || data.results.length === 0) {
					return <div className="text-center py-8 text-gray-500">No penalties found</div>;
				}

				return (
					<>
						<div className="rounded-md">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Type</TableHead>
										<TableHead>Amount</TableHead>
										<TableHead>Date</TableHead>
										<TableHead>Actions</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{data.results.map((r) => (
										<TableRow key={r.id}>
											<TableCell>
												{PENALTY_TYPES.find((p) => p.value === r.penalty_type)?.label || "-"}
											</TableCell>
											<TableCell>{formatCurrency(r.amount)}</TableCell>
											<TableCell>{r.date}</TableCell>
											<TableCell>
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button variant="ghost" size="sm" className="p-0">
															<MoreHorizontal className="h-4 w-4" />
															<span className="sr-only">Open menu</span>
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<DropdownMenuItem onClick={() => onEdit && onEdit(r)}>
															<Edit className="h-4 w-4 mr-2" /> Edit
														</DropdownMenuItem>
														<DropdownMenuItem
															className="text-destructive"
															onClick={() => onDelete && onDelete(r.id)}
														>
															<Trash className="h-4 w-4 mr-2" /> Delete
														</DropdownMenuItem>
													</DropdownMenuContent>
												</DropdownMenu>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					</>
				);
			}}
		</PaginatedTableWrapper>
	);
}
