import { DialogSkeleton } from "@/components/dialogs/dialog-skeleton";
import EmployeeSearchableSelect from "@/components/selects/employee-searchable-select";
import { Label } from "@/components/ui/label";
import { DEVICES_API } from "@/lib/api/devices.utils";
import { showErrorToast } from "@/lib/utils";
import { IDevice } from "@/types/devices.types";
import { useState } from "react";

interface DeviceEmployeeCopyDialogProps {
	device: IDevice;
	isOpen: boolean;
	onClose: () => void;
}

export default function DeviceEmployeeCopyDialog({
	device,
	isOpen,
	onClose,
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

	return (
		<DialogSkeleton
			isOpen={isOpen}
			onClose={onClose}
			confirmDisabled={submitting}
			title={`Add employee ${device?.name ? `to device ${device.name}` : `to this device`} `}
			onConfirm={handleCopyEmployee}
		>
			<div className="min-h-[20svh]">
				<p>
					Device Serial Number :{" "}
					<span className="text-base font-semibold">{device?.serial_number}</span>{" "}
				</p>
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
		</DialogSkeleton>
	);
}
