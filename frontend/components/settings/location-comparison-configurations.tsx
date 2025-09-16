"use client";

import type {
	IBranchLocationComparisonConfig,
	IBranchLocationComparisonConfigFormData,
} from "@/types/types.utils";

import { useState, useRef } from "react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useSelector } from "react-redux";

import { ConfirmationDialog } from "../confirmation-dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { branchLocationComparisonConfigAPI, showErrorToast } from "@/lib/utils";
import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors";

export const LocationComparisonConfigurations = () => {
	const institution = useSelector(selectSelectedInstitution);
	const selectedBranch = useSelector(selectSelectedBranch);

	const [isLoading, setIsLoading] = useState(false);
	const [isLocationComparisonFormOpen, setIsLocationComparisonFormOpen] = useState(false);
	const [editingLocationComparisonConfig, setEditingLocationComparisonConfig] =
		useState<IBranchLocationComparisonConfig | null>(null);
	const [locationComparisonConfigurationToDelete, setLocationComparisonConfigurationToDelete] =
		useState<IBranchLocationComparisonConfig | null>(null);
	const [locationComparisonSearchTerm, setLocationComparisonSearchTerm] = useState("");
	const [locationComparisonFormData, setLocationComparisonFormData] =
		useState<IBranchLocationComparisonConfigFormData>({
			branch: selectedBranch?.id || 0,
			radius_in_meters: 0,
		});

	const locationComparisonRefreshRef = useRef<(() => void) | null>(null);

	// Location Comparison Configuration helper functions
	const handleLocationComparisonInputChange = (
		field: keyof IBranchLocationComparisonConfigFormData,
		value: number,
	) => {
		setLocationComparisonFormData((prev) => ({ ...prev, [field]: value }));
	};

	const resetLocationComparisonForm = () => {
		setLocationComparisonFormData({
			branch: selectedBranch?.id || 0,
			radius_in_meters: 0,
		});
		setEditingLocationComparisonConfig(null);
		setIsLocationComparisonFormOpen(false);
	};

	const handleCreateLocationComparisonConfig = () => {
		if (!selectedBranch?.id) {
			toast.error("Please select a branch first");

			return;
		}
		resetLocationComparisonForm();
		setIsLocationComparisonFormOpen(true);
	};

	const handleEditLocationComparisonConfig = (config: IBranchLocationComparisonConfig) => {
		setLocationComparisonFormData({
			branch: config.branch,
			radius_in_meters: config.radius_in_meters,
		});
		setEditingLocationComparisonConfig(config);
		setIsLocationComparisonFormOpen(true);
	};

	const handleSaveLocationComparisonConfig = async () => {
		if (!selectedBranch?.id) return;

		setIsLoading(true);
		try {
			if (editingLocationComparisonConfig) {
				await branchLocationComparisonConfigAPI.updateBranchLocationComparisonConfig(
					editingLocationComparisonConfig.id,
					locationComparisonFormData,
				);
				toast.success("Location comparison configuration updated successfully");
			} else {
				await branchLocationComparisonConfigAPI.createBranchLocationComparisonConfig(
					locationComparisonFormData,
				);
				toast.success("Location comparison configuration created successfully");
			}
			resetLocationComparisonForm();
			// Trigger table refresh
			locationComparisonRefreshRef.current?.();
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to save location comparison configuration" });
		} finally {
			setIsLoading(false);
		}
	};

	const handleDeleteLocationComparisonConfig = async (config: IBranchLocationComparisonConfig) => {
		if (locationComparisonConfigurationToDelete) {
			try {
				await branchLocationComparisonConfigAPI.deleteBranchLocationComparisonConfig(config.id);
				toast.success("Location comparison configuration deleted successfully");
				// Trigger table refresh
				locationComparisonRefreshRef.current?.();
			} catch (error) {
				showErrorToast({
					error,
					defaultMessage: "Failed to delete location comparison configuration",
				});
			}
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between border-b pb-4">
				<h2 className="text-2xl font-bold text-gray-900">Location Comparison Configurations</h2>
				<Button
					onClick={handleCreateLocationComparisonConfig}
					className="bg-primary hover:bg-primary text-white rounded-lg px-4 py-2 flex items-center space-x-2"
					disabled={!selectedBranch?.id}
				>
					<Plus className="w-4 h-4" />
					<span>Add Location Configuration</span>
				</Button>
			</div>

			{/* Branch Info */}
			{selectedBranch && (
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
					<div className="flex items-center space-x-3">
						<Icon icon="hugeicons:info-circle" className="w-5 h-5 text-blue-600" />
						<div>
							<h3 className="font-medium text-blue-900">Selected Branch</h3>
							<p className="text-sm text-blue-700">
								Managing location comparison configuration for:{" "}
								<strong>{selectedBranch.branch_name}</strong>
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Search */}
			{selectedBranch?.id && (
				<div className="flex items-center space-x-4">
					<div className="relative flex-1 max-w-sm">
						<Icon
							icon="hugeicons:search-01"
							className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 !h-5 !w-5"
						/>
						<Input
							placeholder="Search branches..."
							value={locationComparisonSearchTerm}
							onChange={(e) => setLocationComparisonSearchTerm(e.target.value)}
							className="pl-10"
						/>
					</div>
				</div>
			)}

			{/* Location Comparison Configurations Table */}
			{selectedBranch?.id && (
				<div className="">
					<PaginatedTableWrapper<IBranchLocationComparisonConfig>
						fetchFirstPage={async () => {
							if (!selectedBranch?.id) throw new Error("No branch selected");

							return await branchLocationComparisonConfigAPI.getBranchLocationComparisonConfigs({
								branchId: selectedBranch.id,
								page: 1,
								search: locationComparisonSearchTerm || undefined,
							});
						}}
						fetchFromUrl={
							branchLocationComparisonConfigAPI.getBranchLocationComparisonConfigsFromUrl
						}
						deps={[selectedBranch?.id, locationComparisonSearchTerm]}
						className="space-y-4"
						footerClassName="pt-4"
					>
						{({ data, loading, refresh }) => {
							if (refresh && locationComparisonRefreshRef.current !== refresh) {
								locationComparisonRefreshRef.current = refresh;
							}

							if (loading) {
								return <TableSkeleton rows={5} columns={3} />;
							}

							if (!data || data.results.length === 0) {
								return (
									<div className="text-center py-8 text-gray-500">
										{locationComparisonSearchTerm
											? "No location comparison configurations found matching your search criteria"
											: "No location comparison configurations found"}
									</div>
								);
							}

							return (
								<div className="overflow-x-auto -mx-4 sm:mx-0">
									<div className="min-w-full inline-block align-middle">
										<div className="overflow-hidden border border-gray-200 sm:rounded-lg">
											<Table>
												<TableHeader>
													<TableRow>
														<TableHead className="px-2 py-2 sm:px-3 sm:py-2 md:px-6 md:py-3 text-xs sm:text-sm font-medium">
															Branch Name
														</TableHead>
														<TableHead className="px-2 py-2 sm:px-3 sm:py-2 md:px-6 md:py-3 text-xs sm:text-sm font-medium">
															Radius (meters)
														</TableHead>
														<TableHead className="w-12 sm:w-16 md:w-24 px-2 py-2 sm:px-3 sm:py-2 md:px-6 md:py-3 text-xs sm:text-sm font-medium">
															Actions
														</TableHead>
													</TableRow>
												</TableHeader>
												<TableBody>
													{data.results.map((config) => (
														<TableRow key={config.id} className="hover:bg-gray-50">
															<TableCell className="font-medium px-2 py-2 sm:px-3 sm:py-2 md:px-6 md:py-4 text-xs sm:text-sm">
																{config.branch_name || `Branch ${config.branch}`}
															</TableCell>
															<TableCell className="px-2 py-2 sm:px-3 sm:py-2 md:px-6 md:py-4 text-xs sm:text-sm">
																<Badge variant="outline" className="text-xs">
																	{config.radius_in_meters}m
																</Badge>
															</TableCell>
															<TableCell className="px-2 py-2 sm:px-3 sm:py-2 md:px-6 md:py-4">
																<DropdownMenu>
																	<DropdownMenuTrigger asChild>
																		<Button variant="ghost" size="sm">
																			<Icon
																				icon="hugeicons:more-horizontal-square-01"
																				className="!h-4 !w-4 text-dark"
																			/>
																		</Button>
																	</DropdownMenuTrigger>
																	<DropdownMenuContent align="end">
																		<DropdownMenuItem
																			onClick={() => handleEditLocationComparisonConfig(config)}
																		>
																			<Edit className="h-4 w-4 mr-2" />
																			Edit
																		</DropdownMenuItem>
																		<DropdownMenuItem
																			onClick={() => handleDeleteLocationComparisonConfig(config)}
																			className="text-red-600"
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
									</div>
								</div>
							);
						}}
					</PaginatedTableWrapper>
				</div>
			)}

			{/* Location Comparison Configuration Form Modal */}
			{isLocationComparisonFormOpen && selectedBranch?.id && (
				<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 w-full max-w-md relative">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold">
								{editingLocationComparisonConfig
									? "Edit Location Comparison Configuration"
									: "Add Location Comparison Configuration"}
							</h3>
							<Button
								variant="ghost"
								size="sm"
								onClick={resetLocationComparisonForm}
								className="h-8 w-8 p-0 hover:bg-gray-100"
							>
								<Icon icon="hugeicons:close-01" className="h-4 w-4" />
							</Button>
						</div>

						<div className="space-y-4">
							<div>
								<Label htmlFor="radius_in_meters">Radius (meters)</Label>
								<Input
									id="radius_in_meters"
									type="number"
									min="0"
									value={locationComparisonFormData.radius_in_meters}
									onChange={(e) =>
										handleLocationComparisonInputChange(
											"radius_in_meters",
											Number.parseInt(e.target.value) || 0,
										)
									}
									placeholder="Enter radius in meters"
								/>
							</div>
						</div>

						<div className="flex justify-end space-x-3 mt-6">
							<Button
								variant="outline"
								onClick={resetLocationComparisonForm}
								disabled={isLoading}
								className="flex-1 rounded-full bg-transparent"
							>
								Cancel
							</Button>
							<Button
								onClick={handleSaveLocationComparisonConfig}
								disabled={isLoading}
								className="bg-primary hover:bg-primary text-white flex-1 rounded-full"
							>
								{isLoading ? "Saving..." : editingLocationComparisonConfig ? "Update" : "Create"}
							</Button>
						</div>
					</div>
				</div>
			)}

			{locationComparisonConfigurationToDelete && (
				<ConfirmationDialog
					description="Are you sure you want to delete this branch's location comparison configuration ? This action cannot be undone."
					isOpen={!!locationComparisonConfigurationToDelete}
					title={`Delete location comparison configuration for branch ${locationComparisonConfigurationToDelete.branch_name}?`}
					onConfirm={() =>
						handleDeleteLocationComparisonConfig(locationComparisonConfigurationToDelete)
					}
					onClose={() => {
						setLocationComparisonConfigurationToDelete(null);
					}}
				/>
			)}
		</div>
	);
};
