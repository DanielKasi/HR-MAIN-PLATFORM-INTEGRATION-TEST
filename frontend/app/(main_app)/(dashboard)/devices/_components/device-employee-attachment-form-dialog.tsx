"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { DEVICE_EMPLOYEE_ATTACHMENTS_API } from "@/lib/api/devices.utils";
import { DeviceSearchableSelect } from "./device-searchable-select";
import EmployeeSearchableSelect from "@/components/selects/employee-searchable-select";

import {
	IDeviceEmployeeAttachment,
	IDeviceEmployeeAttachmentFormData,
} from "@/types/devices.types";

interface DeviceEmployeeAttachmentFormDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	editingAttachment?: IDeviceEmployeeAttachment | null;
	fixedDevice?: number;
	fixedEmployee?: number;
	onSuccess: (attachment: IDeviceEmployeeAttachment) => void;
}

export const DeviceEmployeeAttachmentFormDialog = ({
	isOpen,
	onOpenChange,
	editingAttachment,
	fixedDevice,
	fixedEmployee,
	onSuccess,
}: DeviceEmployeeAttachmentFormDialogProps) => {
	const [isSubmitting, setIsSubmitting] = useState(false);

	const [formData, setFormData] = useState<IDeviceEmployeeAttachmentFormData>({
		enroll_id: "",
		is_admin: false,
	});

	const isEditMode = !!editingAttachment;

	useEffect(() => {
		if (isOpen) {
			if (editingAttachment) {
				setFormData({
					device: editingAttachment.device.id,
					employee_id: editingAttachment.employee.id,
					enroll_id: editingAttachment.enroll_id,
					is_admin: editingAttachment.is_admin,
				});
			} else {
				setFormData({
					device: fixedDevice,
					employee_id: fixedEmployee,
					enroll_id: "",
					is_admin: false,
				});
			}
		}
	}, [isOpen, editingAttachment, fixedDevice, fixedEmployee]);

	const handleSubmit = async () => {
		if (!formData.enroll_id || !formData.device || !formData.employee_id) {
			toast.error("Please fill in all required fields");
			return;
		}

		setIsSubmitting(true);
		try {
			let result: IDeviceEmployeeAttachment | null = null;
			if (isEditMode && editingAttachment) {
				result = await DEVICE_EMPLOYEE_ATTACHMENTS_API.update({
					attachmentId: editingAttachment.id,
					data: formData,
				});
			} else {
				result = await DEVICE_EMPLOYEE_ATTACHMENTS_API.create({
					data: formData as Required<IDeviceEmployeeAttachmentFormData>,
				});
			}

			if (result) {
				onSuccess(result);
			}
		} catch (error: any) {
			toast.error(error.message || "Failed to save attachment");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px] rounded-2xl">
				<DialogHeader>
					<DialogTitle className="text-xl font-semibold">
						{isEditMode ? "Edit Attachment" : "Attach Employee to Device"}
					</DialogTitle>

					<DialogDescription>
						{isEditMode
							? "Update the attachment details."
							: "Add a new employee attachment to the device."}
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					{!fixedDevice && (
						<div className="space-y-2">
							<Label className="text-sm font-medium text-gray-700">Device *</Label>
							<DeviceSearchableSelect
								value={formData.device ? [formData.device] : []}
								onValueChange={(values) =>
									setFormData({ ...formData, device: values[0] as number })
								}
								placeholder="Select Device"
							/>
						</div>
					)}
					{!fixedEmployee && (
						<div className="space-y-2">
							<Label className="text-sm font-medium text-gray-700">Employee *</Label>
							<EmployeeSearchableSelect
								value={formData.employee_id ? [formData.employee_id] : []}
								onValueChange={(values) =>
									setFormData({ ...formData, employee_id: values[0] as number })
								}
								placeholder="Select Employee"
							/>
						</div>
					)}
					<div className="space-y-2">
						<Label htmlFor="enroll_id" className="text-sm font-medium text-gray-700">
							Enrollment ID *
						</Label>
						<Input
							id="enroll_id"
							value={formData.enroll_id}
							onChange={(e) => setFormData({ ...formData, enroll_id: e.target.value })}
							placeholder="Enter enroll ID (e.g., biometric ID)"
							disabled={isSubmitting}
							className="h-10 rounded-xl"
						/>
					</div>
				</div>
				<DialogFooter>
					<Button onClick={handleSubmit} disabled={isSubmitting} className="w-full rounded-full">
						{isSubmitting ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								{isEditMode ? "Updating..." : "Creating..."}
							</>
						) : (
							`${isEditMode ? "Update" : "Create"} Attachment`
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
