"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { DEVICES_API } from "@/lib/api/devices.utils";
import { IDevice } from "@/types/devices.types";
import { PaginatedTable, ColumnDef } from "@/components/PaginatedTable";
import { Button } from "@/components/ui/button";
import { DeviceEmployeeAttachmentFormDialog } from "../../devices/_components/device-employee-attachment-form-dialog";
import { IEmployee } from "@/types/types.utils";
import { getPaginatedFromUrl } from "@/lib/api/_api.utils";
import { Icon } from "@iconify/react";

interface EmployeeDevicesProps {
	employee: IEmployee;
}

export default function EmployeeDevices({ employee }: EmployeeDevicesProps) {
	const [showAttachmentDialog, setShowAttachmentDialog] = useState(false);
	const refreshFunctionRef = useRef<(() => void) | null>(null);

	const handleAttachmentSuccess = () => {
		toast.success("Attachment created successfully");
		setShowAttachmentDialog(false);
		refreshFunctionRef.current?.();
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
			cell: (device) => <p className=" line-clamp-3">{device.description || ""}</p>,
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
		</div>
	);
}
