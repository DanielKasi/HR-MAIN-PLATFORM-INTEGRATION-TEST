import EmployeeSearchableSelect from "@/components/selects/employee-searchable-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DEVICES_API } from "@/lib/api/devices.utils";
import { showErrorToast } from "@/lib/utils";
import { IDevice } from "@/types/devices.types";
import { useState } from "react";

interface DeviceEmployeeCopyDialogProps {
	device: IDevice;
	isOpen: boolean;
	onClose: () => void;
	className?: string;
}

export default function DeviceEmployeeCopyDialog({
	device,
	isOpen,
	onClose,
	className = "",
}: DeviceEmployeeCopyDialogProps) {
	const [employeeToCopy, setEmployeeToCopy] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const handleCopyEmployee = async () => {
		if (!device || !employeeToCopy) {
			return;
		}
		try {
			setSubmitting(true);
			await DEVICES_API.addEmployee({ device_id: device.id, employee_id: employeeToCopy });
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to copy employee to device" });
		} finally {
			setEmployeeToCopy(null);
			setSubmitting(false);
		}
	};

	// isOpen={isOpen}
	// 		onClose={onClose}
	// 		confirmDisabled={submitting}
	// 		title={``}
	// 		onConfirm={handleCopyEmployee}

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open) {
					onClose();
				}
			}}
		>
			<DialogContent className={`${className}`}>
				<DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
					<DialogTitle className="text-lg font-semibold w-full">{`Add employee ${device?.name ? `to device ${device.name}` : `to this device`} `}</DialogTitle>
				</DialogHeader>

				<div className="space-y-2 px-2">
					<div className="">
						<div className="space-y-2">
							<Label>Device name</Label>
							<p>{device?.name || "Unknown"}</p>
						</div>
						<div className="space-y-2">
							<Label>Device serial number</Label>
							<p>{device.serial_number || "Unknown"}</p>
						</div>
						<div className="space-y-4 py-4">
							<Label>Employee *</Label>
							<EmployeeSearchableSelect
								value={employeeToCopy ? [employeeToCopy] : []}
								getIdByCustomEmployeeId={true}
								onValueChange={(values) => {
									if (values.length) {
										setEmployeeToCopy(String(values[0]));
									}
								}}
								multiple={false}
							/>
						</div>
					</div>
				</div>

				<div className="flex items-center space-x-2 pt-2">
					<Button
						onClick={handleCopyEmployee}
						disabled={submitting}
						className="rounded-full w-full"
					>
						Confirm
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
