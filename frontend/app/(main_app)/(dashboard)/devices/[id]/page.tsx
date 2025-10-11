"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { MoreVertical, Trash2, Edit, Clock, Plus } from "lucide-react";
import { DEVICES_API, DEVICE_EMPLOYEE_ATTACHMENTS_API } from "@/lib/api/devices.utils";
import { IDevice, IDeviceEmployeeAttachment } from "@/types/devices.types";
import { PaginatedTable, ColumnDef } from "@/components/PaginatedTable";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeviceEmployeeAttachmentFormDialog } from "../_components/device-employee-attachment-form-dialog";

export default function DeviceDetailsPage() {
	const params = useParams();
	const deviceId = parseInt(params.id as string, 10);
	const [device, setDevice] = useState<IDevice | null>(null);
	const [loading, setLoading] = useState(true);
	const [attachmentToDelete, setAttachmentToDelete] = useState<IDeviceEmployeeAttachment | null>(
		null,
	);
	const [submitting, setSubmitting] = useState(false);
	const [showAttachmentDialog, setShowAttachmentDialog] = useState(false);
	const [editingAttachment, setEditingAttachment] = useState<IDeviceEmployeeAttachment | null>(
		null,
	);

	useEffect(() => {
		const fetchDevice = async () => {
			try {
				const fetchedDevice = await DEVICES_API.getById({ deviceId });
				setDevice(fetchedDevice);
			} catch (error) {
				toast.error("Failed to load device details");
			} finally {
				setLoading(false);
			}
		};
		fetchDevice();
	}, [deviceId]);

	const handleDeleteAttachment = async (attachment: IDeviceEmployeeAttachment) => {
		setSubmitting(true);
		try {
			await DEVICE_EMPLOYEE_ATTACHMENTS_API.delete({ attachmentId: attachment.id });
			toast.success("Attachment marked for deletion successfully");
		} catch (error: any) {
			toast.error(error.message || "Failed to delete attachment");
		} finally {
			setSubmitting(false);
			setAttachmentToDelete(null);
		}
	};

	const handleEditAttachment = (attachment: IDeviceEmployeeAttachment) => {
		setEditingAttachment(attachment);
		setShowAttachmentDialog(true);
	};

	const handleAttachmentSuccess = (attachment: IDeviceEmployeeAttachment) => {
		toast.success(`Attachment ${editingAttachment ? "updated" : "created"} successfully`);
		setShowAttachmentDialog(false);
		setEditingAttachment(null);
	};

	const attachmentColumns: ColumnDef<IDeviceEmployeeAttachment>[] = [
		{
			key: "employee",
			header: "Employee",
			cell: (attachment) => attachment.employee.name,
		},
		{
			key: "actions",
			header: "Actions",
			cell: (attachment) => (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="h-8 w-8 p-0">
							<MoreVertical className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{/* <DropdownMenuItem onClick={() => handleEditAttachment(attachment)}>
							<Edit className="h-4 w-4 mr-2" />
							Edit
						</DropdownMenuItem> */}
						<DropdownMenuItem
							onClick={() => setAttachmentToDelete(attachment)}
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

	if (loading) return <div>Loading...</div>;
	if (!device) return <div>Device not found</div>;

	return (
		<div className="min-h-screen p-6 bg-white">
			<div className="mx-auto">
				<div className="mb-8">
					<h1 className="text-xl md:text-2xl font-bold">Device Details</h1>
					<p className="text-slate-600">Manage device and attached employees</p>
				</div>
				<Card className="mb-8">
					<CardHeader>
						<CardTitle>Device Information</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col md:flex-row items-start justify-start md:items-center md:justify-between gap-4 md:gap-8 p-2">
							<div className=" flex flex-col gap-4">
								<p>
									<b>Serial Number:</b> {device.serial_number || ""}
								</p>
								<p>
									<b>Device name:</b> {device.serial_number || ""}
								</p>
								<p>
									<b>Description:</b> {device.description || ""}
								</p>
							</div>
							<div className="flex flex-col gap-4">
								<p>
									<b>Branch:</b> {device.branch?.name || "Unknown"}
								</p>
								<div className="flex items-center gap-8">
									<b>Status:</b> <Badge>{device.status}</Badge>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
				<div className="flex justify-between items-center mb-4">
					<h2 className="text-2xl font-semibold">Attached Employees</h2>
					<Button
						onClick={() => {
							setEditingAttachment(null);
							setShowAttachmentDialog(true);
						}}
						className="rounded-2xl"
					>
						<Plus className="h-4 w-4 mr-2" />
						Attach Employee
					</Button>
				</div>
				<PaginatedTable<IDeviceEmployeeAttachment>
					fetchFirstPage={async () =>
						await DEVICE_EMPLOYEE_ATTACHMENTS_API.getPaginated({
							page: 1,
							device_id: deviceId,
						})
					}
					fetchFromUrl={DEVICE_EMPLOYEE_ATTACHMENTS_API.getPaginatedFromUrl}
					deps={[deviceId]}
					columns={attachmentColumns}
					skeletonRows={5}
					emptyState={
						<div className="text-center py-12">
							<Clock className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
							<p className="text-muted-foreground mb-4">No attachments found</p>
						</div>
					}
				/>
				{attachmentToDelete && (
					<ConfirmationDialog
						isOpen={!!attachmentToDelete}
						onClose={() => setAttachmentToDelete(null)}
						onConfirm={() => handleDeleteAttachment(attachmentToDelete)}
						title="Delete Attachment"
						description={`Are you sure you want to delete the attachment for "${attachmentToDelete.employee.name}"?`}
						confirmText="Delete"
						cancelText="Cancel"
						disabled={submitting}
					/>
				)}
				<DeviceEmployeeAttachmentFormDialog
					isOpen={showAttachmentDialog}
					onOpenChange={setShowAttachmentDialog}
					editingAttachment={editingAttachment}
					fixedDevice={deviceId}
					onSuccess={handleAttachmentSuccess}
				/>
			</div>
		</div>
	);
}
