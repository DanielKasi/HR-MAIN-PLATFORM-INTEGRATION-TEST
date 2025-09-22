"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AssetHistoriesTable } from "./asset-histories-table"; 
import { CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Search, Loader } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { PERMISSION_CODES } from "@/constants";
import ProtectedComponent from "@/components/ProtectedComponent";
import ProtectedPage from "@/components/ProtectedPage";
import { useSelector } from "react-redux";
import { selectAccessToken, selectSelectedInstitution } from "@/store/auth/selectors";
import { showErrorToast } from "@/lib/utils";
import { Icon } from "@iconify/react";

export default function AssetHistoriesPage() {
	const [searchTerm, setSearchTerm] = useState("");
	const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
	const router = useRouter();
	const currentInstitution = useSelector(selectSelectedInstitution);
	const accessToken = useSelector(selectAccessToken);
	const refreshFunctionRef = useRef<(() => void) | null>(null);
	const [isExportingToExcel, setIsExportingToExcel] = useState(false);

	const clearFilters = () => {
		setSearchTerm("");
		setEventTypeFilter("all");
	};

	const handleExportAssetHistories = async () => {
		try {
			setIsExportingToExcel(true);
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL}/assets/asset-histories/export-excel/`, // Removed institutionId
				{
					method: "GET",
					headers: {
						Authorization: `Bearer ${accessToken}`,
					},
				},
			);

			if (!response.ok) {
				throw new Error("Failed to export asset histories.");
			}

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");

			link.href = url;
			link.download = "asset-histories.xlsx";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			window.URL.revokeObjectURL(url);
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Export failed. Please try again" });
		} finally {
			setIsExportingToExcel(false);
		}
	};

	return (
		<ProtectedPage permissionCode={PERMISSION_CODES.CAN_VIEW_ASSET_HISTORIES}>
			<div className="flex flex-col w-full h-full p-4 bg-white rounded-lg min-h-screen">
				<CardHeader className="space-y-4 mb-4">
					<CardTitle className="flex flex-row items-center justify-between">
						<h1 className="text-xl md:text-2xl font-bold">Asset Histories</h1>

						<div className="flex flex-row items-center gap-2">
							<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EXPORT_ASSET_HISTORIES}>
								<Button
									disabled={isExportingToExcel}
									className="rounded-xl"
									onClick={handleExportAssetHistories}
								>
									{isExportingToExcel ? (
										<Loader />
									) : (
										<Icon icon="hugeicons:file-export" className="!w-5 !h-5" />
									)}
									<span className="text">
										{isExportingToExcel ? "Exporting" : "Export to Excel"}
									</span>
								</Button>
							</ProtectedComponent>
						</div>
					</CardTitle>

					<div className="flex flex-col md:grid md:grid-cols-3 lg:flex lg:flex-row gap-4 items-start lg:items-end mt-12 overflow-visible">
						<div className="relative w-full md:max-w-lg lg:max-w-xl">
							<Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
							<Input
								placeholder="Search asset histories by asset name or notes..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="pl-10 text-sm"
							/>
						</div>
						<div className="w-full md:max-w-xs">
							<Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
								<SelectTrigger className="w-full">
									<SelectValue placeholder="Filter by event type" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">All Event Types</SelectItem>
									<SelectItem value="allocated">Allocated</SelectItem>
									<SelectItem value="returned">Returned</SelectItem>
									<SelectItem value="maintenance">Maintenance</SelectItem>
									<SelectItem value="decommissioned">Decommissioned</SelectItem>
									<SelectItem value="created">Created</SelectItem>
									<SelectItem value="reassigned">Reassigned</SelectItem>
								</SelectContent>
							</Select>
						</div>
						<div className="flex-shrink-0 lg:flex-[0.2]">
							<Button variant="outline" className="w-full rounded-xl" onClick={clearFilters}>
								Clear Filters
							</Button>
						</div>
					</div>
				</CardHeader>
				<AssetHistoriesTable
					searchTerm={searchTerm}
					refreshFunctionRef={refreshFunctionRef}
					eventTypeFilter={eventTypeFilter}
				/>
			</div>
		</ProtectedPage>
	);
}
