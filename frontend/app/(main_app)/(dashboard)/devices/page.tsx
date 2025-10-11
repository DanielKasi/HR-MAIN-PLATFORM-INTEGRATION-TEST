"use client";

import { IDevice } from "@/types/devices.types";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Eye, Edit, Trash2, MoreVertical, Search } from "lucide-react";
import { DEVICES_API } from "@/lib/api/devices.utils";
import { PaginatedTable, ColumnDef } from "@/components/PaginatedTable";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { DeviceFormDialog } from "./_components/device-form-dialog";
import { showErrorToast } from "@/lib/utils";
import { Icon } from "@iconify/react";
import { getPaginatedFromUrl } from "@/lib/api/_api.utils";

interface DevicesPageProps {}

export default function DevicesPage({}: DevicesPageProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [deviceToDelete, setDeviceToDelete] = useState<IDevice | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [editingDevice, setEditingDevice] = useState<IDevice | null>(null);
	const refreshTableRef = useRef<() => void | null>(null);

	const router = useRouter();
	const handleDelete = async (device: IDevice) => {
		setSubmitting(true);
		try {
			await DEVICES_API.delete({ deviceId: device.id });
			toast.success("Device marked for deletion successfully");
		} catch (error: any) {
			showErrorToast({ error, defaultMessage: "Failed to delete device" });
		} finally {
			setSubmitting(false);
			setDeviceToDelete(null);
		}
	};

	const openPath = (path: string) => {
		router.push(path);
	};

	const handleSearch = (query: string) => {
		setSearchQuery(query);
	};

	const handleCreate = () => {
		setEditingDevice(null);
		setShowCreateDialog(true);
	};

	const handleEdit = (device: IDevice) => {
		setEditingDevice(device);
		setShowCreateDialog(true);
	};

	const handleDialogSuccess = (device: IDevice) => {
		toast.success(`Device ${editingDevice ? "updated" : "created"} successfully`);
		setShowCreateDialog(false);
		setEditingDevice(null);
		refreshTableRef.current?.();
	};

	const columns: ColumnDef<IDevice>[] = [
		{
			key: "serial_number",
			header: "Serial Number",
			cell: (device) => device.serial_number,
		},
		{
			key: "description",
			header: "Description",
			cell: (device) => device.description || "No description",
		},
		{
			key: "status",
			header: "Status",
			cell: (device) => <span className="capitalize">{device.status.replace(/_/g, " ")}</span>,
		},
		{
			key: "branch",
			header: "Branch",
			cell: (device) => device.branch?.name || "Unknown",
		},
		{
			key: "institution",
			header: "Institution",
			cell: (device) => device.institution?.name || "Unknown",
		},
		{
			key: "actions",
			header: "Actions",
			cell: (device) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem
							onClick={() => openPath(`/devices/${device.id}`)} // Assuming view page exists
						>
							<Eye className="h-4 w-4 mr-2" />
							View
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => handleEdit(device)}>
							<Edit className="h-4 w-4 mr-2" />
							Edit
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => setDeviceToDelete(device)}
							className="text-red-600 focus:text-red-600"
						>
							<Trash2 className="h-4 w-4 mr-2" />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			),
		},
	];

	return (
		<div className="min-h-screen p-6 bg-white">
			<div className="mx-auto">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center gap-4 mb-4">
						<div>
							<h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
								Devices
							</h1>
							<p className="text-slate-600 text-lg">
								Manage clock-in devices for employee access control
							</p>
						</div>
					</div>
				</div>
				<div className="flex justify-between items-center mb-4">
					<div className="flex items-center gap-4">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
							<Input
								type="text"
								placeholder="Search by serial number or description..."
								value={searchQuery}
								onChange={(e) => handleSearch(e.target.value)}
								className="max-w-sm md:max-w-lg lg:max-w-xl rounded-xl pl-10"
							/>
						</div>
					</div>
					<Button onClick={handleCreate} className="rounded-2xl">
						<Plus className="h-4 w-4 lg:mr-2" />
						<span className="hidden lg:inline-block">Create Device</span>
					</Button>
				</div>

				<PaginatedTable<IDevice>
					fetchFirstPage={async () =>
						await DEVICES_API.getPaginated({
							page: 1,
							search: searchQuery || undefined,
						})
					}
					fetchFromUrl={(url) => getPaginatedFromUrl<IDevice>(url)}
					deps={[searchQuery]}
					refreshRef={refreshTableRef}
					className="space-y-4"
					tableClassName="min-w-full"
					footerClassName="pt-4"
					columns={columns}
					skeletonRows={5}
					emptyState={
						<div className="text-center flex flex-col items-center justify-center py-12">
							<Icon icon="hugeicons:biometric-device" className="!w-12 !h-12" />
							<p className="text-muted-foreground mb-4">No devices found</p>
						</div>
					}
				/>

				{/* Delete Confirmation */}
				{deviceToDelete && (
					<ConfirmationDialog
						isOpen={!!deviceToDelete}
						onClose={() => setDeviceToDelete(null)}
						onConfirm={() => handleDelete(deviceToDelete)}
						title="Delete Device"
						description={`Are you sure you want to mark "${deviceToDelete.serial_number}" for deletion? This action requires approval.`}
						confirmText="Mark for Deletion"
						cancelText="Cancel"
						disabled={submitting}
					/>
				)}

				{/* Create/Edit Dialog */}
				<DeviceFormDialog
					isOpen={showCreateDialog}
					onOpenChange={setShowCreateDialog}
					editingDevice={editingDevice}
					onSuccess={handleDialogSuccess}
				/>
			</div>
		</div>
	);
}
