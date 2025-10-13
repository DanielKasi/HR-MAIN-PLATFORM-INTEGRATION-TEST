"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Fingerprint, MoreHorizontal } from "lucide-react";
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
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { showErrorToast } from "@/lib/utils";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface EmployeeDevicesProps {
	employee: IEmployee;
}

export default function EmployeeDevices({ employee }: EmployeeDevicesProps) {
	const [showAttachmentDialog, setShowAttachmentDialog] = useState(false);
	const [loadingFingerprint, setLoadingFingerprint] = useState<number | null>(null);
	const [loadingFace, setLoadingFace] = useState<number | null>(null);
	const [showFingerprintConfirmDialog, setShowFingerprintConfirmDialog] = useState(false);
	const [showFaceConfirmDialog, setShowFaceConfirmDialog] = useState(false);
	const [selectedDevice, setSelectedDevice] = useState<number | null>(null);
	const refreshFunctionRef = useRef<(() => void) | null>(null);

	const handleAttachmentSuccess = () => {
		toast.success("Attachment created successfully");
		setShowAttachmentDialog(false);
		refreshFunctionRef.current?.();
	};

	const initiateFingerprintCapture = async () => {
		if (!selectedDevice) {
			return;
		}
		setLoadingFingerprint(selectedDevice);
		try {
			const response = await DEVICES_API.captureFingerprint({
				deviceId: selectedDevice,
				employeeId: employee.employee_id,
			});
			toast.success(response.detail);
		} catch (error: any) {
			showErrorToast({ error, defaultMessage: "Failed to initiate fingerprint capture" });
		} finally {
			setLoadingFingerprint(null);
			setShowFingerprintConfirmDialog(false);
		}
	};

	const initiateFaceCapture = async () => {
		if (!selectedDevice) {
			return;
		}
		setLoadingFace(selectedDevice);
		try {
			const response = await DEVICES_API.captureFace({
				deviceId: selectedDevice,
				employeeId: employee.employee_id,
			});

			toast.success(response.detail);
		} catch (error: any) {
			showErrorToast({ error, defaultMessage: "Failed to initiate face capture" });
		} finally {
			setLoadingFace(null);
			setShowFaceConfirmDialog(false);
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
		{
			key: "actions",
			header: "Actions",
			cell: (device) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant={"ghost"} size={"icon"}>
							<MoreHorizontal />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent>
						<DropdownMenuItem
							onClick={() => {
								setSelectedDevice(device.id);
								setShowFingerprintConfirmDialog(true);
							}}
							disabled={loadingFingerprint === device.id}
							className="flex items-center gap-2"
						>
							{loadingFingerprint === device.id ? (
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
							) : (
								<Icon icon="hugeicons:biometric-device" className="h-4 w-4" />
							)}
							Capture Fingerprint
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={() => {
								setSelectedDevice(device.id);
								setShowFaceConfirmDialog(true);
							}}
							disabled={loadingFace === device.id}
							className="flex items-center gap-2"
						>
							{loadingFace === device.id ? (
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
							) : (
								<Icon icon="hugeicons:face-id" className="h-4 w-4" />
							)}
							Capture Face
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
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
			{/* <ConfirmationDialog/> */}

			<ConfirmationDialog
				description={`Are you sure you want to initiate fingerprint capture for ${employee.name} on this
							device.`}
				isOpen={!!showFingerprintConfirmDialog}
				disabled={!!loadingFingerprint}
				title={`Confirm Fingerprint Capture`}
				onConfirm={initiateFingerprintCapture}
				onClose={() => {
					setShowFingerprintConfirmDialog(false);
					setSelectedDevice(null);
				}}
			/>

			<ConfirmationDialog
				description={`Are you sure you want to initiate face capture for ${employee.name} on this
							device.`}
				isOpen={!!showFaceConfirmDialog}
				disabled={!!loadingFace}
				title={`Confirm Face Capture`}
				onConfirm={initiateFaceCapture}
				onClose={() => {
					setShowFaceConfirmDialog(false);
					setSelectedDevice(null);
				}}
			/>
		</div>
	);
}
