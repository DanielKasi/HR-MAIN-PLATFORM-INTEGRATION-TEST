"use client";

import { RefObject, useRef, useState } from "react";
import { Eye, Edit, MoreVertical } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { Icon } from "@iconify/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IAssetHistory } from "@/types/assets.types";
import { PERMISSION_CODES } from "@/constants";
import { assetHistoriesAPI, showErrorToast, getPaginatedAssetHistoriesFromUrl } from "@/lib/utils";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { ColumnDef, PaginatedTable } from "@/components/PaginatedTable";
import ProtectedComponent from "@/components/ProtectedComponent";

interface AssetHistoriesTableProps {
	refreshFunctionRef?: RefObject<(() => void) | null>;
	searchTerm?: string;
	eventTypeFilter?: string;
}

export function AssetHistoriesTable({
	refreshFunctionRef,
	searchTerm,
	eventTypeFilter,
}: AssetHistoriesTableProps) {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const tableRefreshRef = refreshFunctionRef || useRef<(() => void) | null>(null);
	const [ordering, setOrdering] = useState("");

	const getEventTypeBadge = (eventType: IAssetHistory["event_type"]) => {
		const badgeStyles: Record<IAssetHistory["event_type"], string> = {
			allocated: "bg-green-100 text-green-800 hover:bg-green-100",
			returned: "bg-blue-100 text-blue-800 hover:bg-blue-100",
			maintenance: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100",
			decommissioned: "bg-red-100 text-red-800 hover:bg-red-100",
			created: "bg-purple-100 text-purple-800 hover:bg-purple-100",
			reassigned: "bg-orange-100 text-orange-800 hover:bg-orange-100",
		};
		return (
			<Badge className={badgeStyles[eventType]}>
				{eventType.charAt(0).toUpperCase() + eventType.slice(1)}
			</Badge>
		);
	};

	const columns: ColumnDef<IAssetHistory>[] = [
		{
			key: "asset_name",
			header: (
				<div className="flex items-center justify-start gap-4">
					<span>Asset</span>
					<Button
						onClick={() =>
							setOrdering((prev) => (prev === "asset__asset_name" ? "" : "asset__asset_name"))
						}
						size="sm"
						variant={ordering === "asset__asset_name" ? "default" : "outline"}
						type="button"
					>
						<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
					</Button>
				</div>
			),
			cell: (history) => history.asset?.asset_name || "N/A",
		},
		{
			key: "event_type",
			header: "Event Type",
			cell: (history) => getEventTypeBadge(history.event_type),
		},
		{
			key: "performed_by",
			header: (
				<div className="flex items-center justify-start gap-4">
					<span>Performed By</span>
					<Button
						onClick={() =>
							setOrdering((prev) =>
								prev === "performed_by.fullname" ? "" : "performed_by.fullname",
							)
						}
						size="sm"
						variant={ordering === "performed_by.fullname" ? "default" : "outline"}
						type="button"
					>
						<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
					</Button>
				</div>
			),
			cell: (history) => history.performed_by?.fullname || "N/A",
		},
		{
			key: "affected_user",
			header: (
				<div className="flex items-center justify-start gap-4">
					<span>Affected User</span>
					<Button
						onClick={() =>
							setOrdering((prev) =>
								prev === "affected_user__fullname" ? "" : "affected_user__fullname",
							)
						}
						size="sm"
						variant={ordering === "affected_user__fullname" ? "default" : "outline"}
						type="button"
					>
						<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
					</Button>
				</div>
			),
			cell: (history) => history.affected_user?.fullname || "N/A",
		},
		{
			key: "created_at",
			header: (
				<div className="flex items-center justify-start gap-4">
					<span>Date</span>
					<Button
						onClick={() => setOrdering((prev) => (prev === "created_at" ? "" : "created_at"))}
						size="sm"
						variant={ordering === "created_at" ? "default" : "outline"}
						type="button"
					>
						<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
					</Button>
				</div>
			),
			cell: (history) => new Date(history.created_at).toLocaleDateString(),
		},
		{
			key: "notes",
			header: "Notes",
			cell: (history) => history.notes || "N/A",
		},
		{
			key: "actions",
			header: "Actions",
			cell: (history) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start">
						<DropdownMenuItem className="p-0">
							<Link
								className="text-xs flex items-center justify-start w-full h-full px-2 py-1.5"
								href={`asset-histories/${history.id}`}
							>
								<Eye className="h-4 w-4 mr-2" /> View Details
							</Link>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			),
		},
	];

	return (
		<PaginatedTable<IAssetHistory>
			fetchFirstPage={async () => {
				if (!currentInstitution) throw new Error("No institution selected");
				return await assetHistoriesAPI.getPaginated({
					page: 1,
					search: searchTerm || undefined,
					eventType: eventTypeFilter !== "all" ? eventTypeFilter : undefined,
					ordering,
				});
			}}
			fetchFromUrl={getPaginatedAssetHistoriesFromUrl}
			deps={[currentInstitution?.id, searchTerm, eventTypeFilter, ordering]}
			query={searchTerm}
			onError={(err) =>
				showErrorToast({ error: err, defaultMessage: "Failed to fetch asset histories" })
			}
			className="space-y-4"
			tableClassName="min-w-[800px]"
			footerClassName="pt-4"
			columns={columns}
			skeletonRows={10}
			refreshRef={tableRefreshRef}
			emptyState={
				<div className="text-center py-12">
					<p className="text-muted-foreground mb-4">No asset histories found</p>
				</div>
			}
		/>
	);
}
