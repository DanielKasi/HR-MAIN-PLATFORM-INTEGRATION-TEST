"use client";

import type { IAssetAllocation } from "@/types/types.utils";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSelector } from "react-redux";
import { Clock, CheckCircle, XCircle, AlertCircle, Package } from "lucide-react";

import { PaginatedTableWrapper } from "../common/tables/paginated-table-wrapper";

import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { assetsAPI, showErrorToast } from "@/lib/utils";

interface EmployeeAssetAllocationsProps {
	employeeId: string;
	institutionId?: number;
	showHeader?: boolean;
	showStats?: boolean;
	compact?: boolean;
}

// Memoized utility functions to prevent recreation on every render
const getStatusColor = (status: string) => {
	switch (status) {
		case "pending":
			return "bg-yellow-100 text-yellow-800 border-yellow-200";
		case "allocated":
			return "bg-green-100 text-green-800 border-green-200";
		case "rejected":
			return "bg-red-100 text-red-800 border-red-200";
		case "cancelled":
			return "bg-gray-100 text-gray-800 border-gray-200";
		default:
			return "bg-gray-100 text-gray-800 border-gray-200";
	}
};

const getStatusDisplay = (status: string) => {
	switch (status) {
		case "pending":
			return "Pending";
		case "allocated":
			return "Allocated";
		case "rejected":
			return "Rejected";
		case "cancelled":
			return "Cancelled";
		default:
			return status;
	}
};

const getStatusIcon = (status: string) => {
	switch (status) {
		case "pending":
			return <Clock className="h-4 w-4 text-yellow-500" />;
		case "allocated":
			return <CheckCircle className="h-4 w-4 text-green-500" />;
		case "rejected":
			return <XCircle className="h-4 w-4 text-red-500" />;
		case "cancelled":
			return <AlertCircle className="h-4 w-4 text-gray-500" />;
		default:
			return <Clock className="h-4 w-4 text-gray-500" />;
	}
};

const formatDate = (dateString: string) => {
	return new Date(dateString).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};

const EmployeeAssetAllocations: React.FC<EmployeeAssetAllocationsProps> = ({
	employeeId,
	institutionId,
	showHeader = true,
	showStats = true,
	compact = false,
}) => {
	const [allocations, setAllocations] = useState<IAssetAllocation[]>([]);
	const [error, setError] = useState<string | null>(null);

	const selectedInstitution = useSelector(selectSelectedInstitution);

	const stats = useMemo(() => {
		if (!Array.isArray(allocations)) {
			return { total: 0, allocated: 0, pending: 0, rejected: 0 };
		}

		return {
			total: allocations.length,
			allocated: allocations.filter((a) => a?.allocation_status === "allocated").length,
			pending: allocations.filter((a) => a?.allocation_status === "pending").length,
			rejected: allocations.filter((a) => a?.allocation_status === "rejected").length,
		};
	}, [allocations]);

	// Memoized status badge component to prevent recreation
	const StatusBadge = useCallback(
		({ status }: { status: string }) => (
			<div className="flex items-center space-x-2">
				{getStatusIcon(status)}
				<Badge className={getStatusColor(status)}>{getStatusDisplay(status)}</Badge>
			</div>
		),
		[],
	);

	// const safeAllocations = Array.isArray(allocations) ? allocations : [];

	return (
		<div className="space-y-6">
			{showHeader && (
				<div className="flex items-center gap-2">
					<Package className="h-5 w-5 text-gray-800" />
					<h3 className="text-lg font-semibold text-gray-800">Asset Allocations</h3>
				</div>
			)}

			{showStats && allocations.length > 0 && (
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<Card className="bg-[#f0f0f6] border-[#e8e8f2]">
						<CardContent className={compact ? "p-3" : "p-4"}>
							<div className={`text-${compact ? "xs" : "sm"} text-[#848496] mb-1`}>Total</div>
							<div className={`text-${compact ? "lg" : "2xl"} font-bold text-gray-800`}>
								{stats.total}
							</div>
						</CardContent>
					</Card>

					<Card className="bg-[#f0f0f6] border-[#e8e8f2]">
						<CardContent className={compact ? "p-3" : "p-4"}>
							<div className={`text-${compact ? "xs" : "sm"} text-[#848496] mb-1`}>Allocated</div>
							<div className={`text-${compact ? "lg" : "2xl"} font-bold text-[#3cb371]`}>
								{stats.allocated}
							</div>
						</CardContent>
					</Card>

					<Card className="bg-[#f0f0f6] border-[#e8e8f2]">
						<CardContent className={compact ? "p-3" : "p-4"}>
							<div className={`text-${compact ? "xs" : "sm"} text-[#848496] mb-1`}>Pending</div>
							<div className={`text-${compact ? "lg" : "2xl"} font-bold text-[#f59e0b]`}>
								{stats.pending}
							</div>
						</CardContent>
					</Card>

					<Card className="bg-[#f0f0f6] border-[#e8e8f2]">
						<CardContent className={compact ? "p-3" : "p-4"}>
							<div className={`text-${compact ? "xs" : "sm"} text-[#848496] mb-1`}>Rejected</div>
							<div className={`text-${compact ? "lg" : "2xl"} font-bold text-[#e21732]`}>
								{stats.rejected}
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			<>
				<div className="hidden sm:block">
					<PaginatedTableWrapper<IAssetAllocation>
						fetchFirstPage={async () => {
							if (!selectedInstitution || !employeeId) {
								throw new Error("No employee or Institution Found");
							}

							return await assetsAPI.getPaginatedAssetAllocations({
								institutionId: selectedInstitution.id,
								page: 1,
								employeeId: employeeId,
							});
						}}
						fetchFromUrl={(args: { url: string }) =>
							assetsAPI.getPaginatedAssetAllocationsFromUrl({ url: args.url })
						}
						deps={[selectedInstitution, employeeId]}
						onError={(err) => {
							showErrorToast({ error: err, defaultMessage: "Failed to fetch asset allocations" });
							setError("Failed to fetch asset allocations");
						}}
						className="space-y-4"
						footerClassName="pt-4"
					>
						{({ data, loading, refresh }) => {
							useEffect(() => {
								if (data?.results) {
									setAllocations((prev) => [
										...prev.filter(
											(prevAlloc) => !data.results.some((alloc) => alloc.id === prevAlloc.id),
										),
										...data.results,
									]);
								}
							}, [data?.results]);

							if (loading) {
								return <TableSkeleton rows={10} columns={10} />;
							}

							return (
								<div className="bg-white rounded-lg overflow-hidden border border-[#e8e8f2]">
									<Table>
										<TableHeader>
											<TableRow className="bg-[#f7f7fb] hover:bg-[#f7f7fb]">
												<TableHead className="font-semibold text-gray-800">
													Allocation Code
												</TableHead>
												<TableHead className="font-semibold text-gray-800">Asset</TableHead>
												<TableHead className="font-semibold text-gray-800">Allocated By</TableHead>
												<TableHead className="font-semibold text-gray-800">Date</TableHead>
												<TableHead className="font-semibold text-gray-800">Status</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{!data || !data.results.length ? (
												<TableRow>
													<TableCell className="col-span-full">
														<div className="text-center py-8 text-[#848496]">
															<Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
															<p>No asset allocations found for this employee</p>
														</div>
													</TableCell>
												</TableRow>
											) : (
												data?.results.map((allocation) => (
													<TableRow key={allocation.id} className="hover:bg-[#f7f7fb]/50">
														<TableCell className="font-mono text-sm">
															{allocation.alloc_code || "Unknown"}
														</TableCell>
														<TableCell className="font-medium">
															{allocation.asset?.asset_name || "Unknown Asset"}
														</TableCell>
														<TableCell>
															{allocation.allocated_by?.user?.fullname || "Unknown User"}
														</TableCell>
														<TableCell className="text-[#848496]">
															{allocation.created_at
																? formatDate(allocation.created_at)
																: "Unknown"}
														</TableCell>
														<TableCell>
															<StatusBadge status={allocation.allocation_status || "unknown"} />
														</TableCell>
													</TableRow>
												))
											)}
										</TableBody>
									</Table>
								</div>
							);
						}}
					</PaginatedTableWrapper>
				</div>
			</>
		</div>
	);
};

export default EmployeeAssetAllocations;
