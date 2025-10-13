"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Fingerprint } from "lucide-react";
import { DEVICES_API } from "@/lib/api/devices.utils";
import { IDevice } from "@/types/devices.types";
import { PaginatedTable, ColumnDef } from "@/components/PaginatedTable";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import { DeviceEmployeeAttachmentFormDialog } from "../../devices/_components/device-employee-attachment-form-dialog";
import { IEmployee } from "@/types/types.utils";
import { getPaginatedFromUrl } from "@/lib/api/_api.utils";
import { Icon } from "@iconify/react";

interface EmployeeDevicesProps {
	employee: IEmployee;
}

export default function EmployeeDevices({ employee }: EmployeeDevicesProps) {
	const [showAttachmentDialog, setShowAttachmentDialog] = useState(false);
	const [loadingFingerprint, setLoadingFingerprint] = useState<number | null>(null);
	const [showConfirmDialog, setShowConfirmDialog] = useState<number | null>(null);
	const refreshFunctionRef = useRef<(() => void) | null>(null);

	const handleAttachmentSuccess = () => {
		toast.success("Attachment created successfully");
		setShowAttachmentDialog(false);
		refreshFunctionRef.current?.();
	};

	const initiateFingerprintCapture = async (deviceId: number) => {
		setLoadingFingerprint(deviceId);
		try {
			const response = await DEVICES_API.captureFingerprint({
				deviceId,
				employeeId: employee.employee_id,
			});
			toast.success(response.detail);
		} catch (error: any) {
			const errorMessage = error.response?.data?.detail || "Failed to initiate fingerprint capture";
			toast.error(errorMessage);
		} finally {
			setLoadingFingerprint(null);
			setShowConfirmDialog(null);
		}
	};

	const columns: ColumnDef<IDevice>[] = [
		{
			key: "serial_number",
			header: "Serial Number",
			cell: (device) => device.serial_number,
		},
		{
			key: "device_name",
			header: "Device Name",
			cell: (device) => device.name || "",
		},
		{
			key: "description",
			header: "Description",
			cell: (device) => <p className="line-clamp-3">{device.description || ""}</p>,
		},
		{
			key: "status",
			header: "Status",
			cell: (device) => device.status,
		},
		{
			key: "branch",
			header: "Branch",
			cell: (device) => device.branch?.name || "",
		},
		// {
		//     key: "is_synced",
		//     header: "Sync Status",
		//     cell: (device) => (
		//         <span className={device.is_synced ? "text-green-600" : "text-red-600"}>
		//             {device.is_synced ? "Synced" : "Not Synced"}
		//         </span>
		//     ),
		// },
		{
			key: "actions",
			header: "Actions",
			cell: (device) => (
				<Button
					variant="outline"
					size="sm"
					onClick={() => setShowConfirmDialog(device.id)}
					disabled={loadingFingerprint === device.id}
					className="flex items-center gap-2"
				>
					{loadingFingerprint === device.id ? (
						<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
					) : (
						<Fingerprint className="h-4 w-4" />
					)}
					Capture Fingerprint
				</Button>
			),
		},
	];

	return (
		<div>
			<div className="flex justify-end mb-4">
				<Button onClick={() => setShowAttachmentDialog(true)} className="rounded-2xl">
					<Plus className="h-4 w-4 mr-2" />
					Attach to Device
				</Button>
			</div>
			<PaginatedTable<IDevice>
				fetchFirstPage={async () =>
					await DEVICES_API.getPaginated({
						page: 1,
						employee_id: employee.id,
					})
				}
				fetchFromUrl={(url) => getPaginatedFromUrl<IDevice>(url)}
				deps={[employee.id]}
				refreshRef={refreshFunctionRef}
				columns={columns}
				skeletonRows={5}
				emptyState={
					<div className="text-center py-12">
						<Icon
							icon="hugeicons:biometric-device"
							className="!w-12 !h-12 text-muted-foreground mb-4"
						/>
						<p className="text-muted-foreground mb-4">No devices attached</p>
					</div>
				}
			/>
			<DeviceEmployeeAttachmentFormDialog
				isOpen={showAttachmentDialog}
				onOpenChange={setShowAttachmentDialog}
				fixedEmployee={employee.id}
				onSuccess={handleAttachmentSuccess}
			/>
			<Dialog open={!!showConfirmDialog} onOpenChange={() => setShowConfirmDialog(null)}>
				<DialogContent className="sm:max-w-[400px] rounded-2xl border-0 shadow-2xl">
					<DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
						<DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
							<Fingerprint className="w-6 h-6 text-gray-600" />
							Confirm Fingerprint Capture
						</DialogTitle>
						<DialogDescription className="text-gray-600 text-base">
							Are you sure you want to initiate fingerprint capture for {employee.name} on this
							device?
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="flex gap-3 pt-6">
						<Button
							variant="outline"
							onClick={() => setShowConfirmDialog(null)}
							className="flex-1 rounded-full"
						>
							Cancel
						</Button>
						<Button
							onClick={() => showConfirmDialog && initiateFingerprintCapture(showConfirmDialog)}
							disabled={loadingFingerprint !== null}
							className="flex-1 rounded-full bg-primary text-white"
						>
							{loadingFingerprint !== null ? (
								<>
									<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
									Initiating...
								</>
							) : (
								"Confirm"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
