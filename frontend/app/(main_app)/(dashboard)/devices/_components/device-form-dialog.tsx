"use client";

import type { IDevice, IDeviceFormData, IDeviceStatus } from "@/types/devices.types";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { DEVICES_API } from "@/lib/api/devices.utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { useSelector } from "react-redux";
import BranchSearchableSelect from "@/components/selects/branch-searchable-select";
import { showErrorToast } from "@/lib/utils";

const STATUS_CHOICES: Array<{ value: IDeviceStatus; label: string }> = [
	{ value: "active", label: "Active" },
	{ value: "inactive", label: "Inactive" },
	{ value: "maintenance", label: "Maintenance" },
	{ value: "faulty", label: "Faulty" },
];

interface DeviceFormDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	editingDevice?: IDevice | null;
	onSuccess: (device: IDevice) => void;
}

export const DeviceFormDialog = ({
	isOpen,
	onOpenChange,
	editingDevice,
	onSuccess,
}: DeviceFormDialogProps) => {
	const [isSubmitting, setIsSubmitting] = useState(false);
	const selectedInstitution = useSelector(selectSelectedInstitution);

	const [formData, setFormData] = useState<IDeviceFormData>({
		serial_number: "",
		description: "",
		status: "active",
		name: "",
	});

	const isEditMode = !!editingDevice;

	// Reset form data when dialog opens/closes or when editing device changes
	useEffect(() => {
		if (isOpen) {
			if (editingDevice) {
				setFormData({
					branch: editingDevice.branch?.id,
					serial_number: editingDevice.serial_number,
					description: editingDevice.description || "",
					status: editingDevice.status,
					name: editingDevice.name || "",
				});
			} else {
				// Reset form for create mode
				setFormData({
					branch: undefined,
					serial_number: "",
					description: "",
					status: "active",
					name: "",
				});
			}
		}
	}, [isOpen, editingDevice]);

	const handleSubmit = async () => {
		// Validation
		if (!formData.serial_number) {
			toast.error("Please fill in all required fields");
			return;
		}

		if (selectedInstitution?.id === undefined) {
			toast.error("Institution is not selected");
			return;
		}

		setIsSubmitting(true);
		try {
			let result: IDevice | null = null;

			if (isEditMode && editingDevice) {
				// Update existing device
				result = await DEVICES_API.update({
					deviceId: editingDevice.id,
					data: formData,
				});
			} else {
				// Create new device
				result = await DEVICES_API.create({
					data: formData,
				});
			}

			if (result) {
				onSuccess(result);
			}
		} catch (error: any) {
			showErrorToast({ error, defaultMessage: "Failed to save device" });
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px] rounded-2xl">
				<DialogHeader>
					<DialogTitle className="text-xl font-semibold">
						{isEditMode ? "Edit Device" : "Create Device"}
					</DialogTitle>
					<DialogDescription>
						{isEditMode ? "Update the device details below." : "Add a new device"}
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="branch" className="text-sm font-medium text-gray-700">
								Branch (Optional)
							</Label>
							<BranchSearchableSelect
								value={formData.branch ? [formData.branch] : []}
								onValueChange={(values) => {
									if (values.length) {
										setFormData((prev) => ({ ...prev, branch: Number(values[0]) }));
									}
								}}
								multiple={false}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="serial_number" className="text-sm font-medium text-gray-700">
								Serial Number *
							</Label>
							<Input
								id="serial_number"
								value={formData.serial_number}
								onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
								placeholder="Enter serial number"
								disabled={isSubmitting}
								className="h-10 rounded-xl"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="name" className="text-sm font-medium text-gray-700">
								Name
							</Label>
							<Input
								id="name"
								value={formData.name}
								onChange={(e) => setFormData({ ...formData, name: e.target.value })}
								placeholder="Enter a name"
								disabled={isSubmitting}
								className="h-10 rounded-xl"
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="description" className="text-sm font-medium text-gray-700">
								Description
							</Label>
							<Textarea
								id="description"
								value={formData.description}
								onChange={(e) => setFormData({ ...formData, description: e.target.value })}
								placeholder="Enter description (optional)"
								disabled={isSubmitting}
								className="h-20 rounded-xl"
							/>
						</div>
						{editingDevice && (
							<div className="space-y-2">
								<Label htmlFor="status" className="text-sm font-medium text-gray-700">
									Status
								</Label>
								<Select
									value={formData.status}
									onValueChange={(value: IDeviceStatus) =>
										setFormData({ ...formData, status: value })
									}
									disabled={isSubmitting}
								>
									<SelectTrigger className="h-10 rounded-xl">
										<SelectValue placeholder="Select status" />
									</SelectTrigger>
									<SelectContent>
										{STATUS_CHOICES.map((status) => (
											<SelectItem key={status.value} value={status.value}>
												{status.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
					</div>
				</div>
				<DialogFooter>
					<Button
						type="submit"
						onClick={handleSubmit}
						disabled={isSubmitting}
						className="w-full rounded-full"
					>
						{isSubmitting ? (
							<>
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
								{isEditMode ? "Updating..." : "Creating..."}
							</>
						) : (
							`${isEditMode ? "Update" : "Create"} Device`
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
