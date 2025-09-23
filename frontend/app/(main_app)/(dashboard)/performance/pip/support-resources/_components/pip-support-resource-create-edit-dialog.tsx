"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	PIP_SUPPORT_RESOURCE_TYPE_API,
	PIP_SUPPORT_RESOURCE_API,
} from "@/lib/api/performance.utils";
import type {
	IPIPSupportResource,
	IPIPSupportResourceFormData,
	IPIPSupportResourceType,
} from "@/types/performance.types";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import PIPSupportResourceTypeSearchableSelect from "../../support-resource-types/_components/pip-support-resource-type-searchable-select";

interface PIPSupportResourceCreateEditDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	selectedResource: IPIPSupportResource | null;
	onSuccess: () => void;
}

export function PIPSupportResourceCreateEditDialog({
	open,
	onOpenChange,
	selectedResource,
	onSuccess,
}: PIPSupportResourceCreateEditDialogProps) {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [formData, setFormData] = useState<IPIPSupportResourceFormData>({
		name: "",
		description: "",
		type: 0,
	});
	const [saving, setSaving] = useState(false);
	const [loadingResourceTypes, setLoadingResourceTypes] = useState(false);
	const [resourceTypes, setResourceTypes] = useState<IPIPSupportResourceType[]>([]);

	useEffect(() => {
		if (!currentInstitution) return;
		const fetchResourceTypes = async () => {
			try {
				setLoadingResourceTypes(true);
				const response = await PIP_SUPPORT_RESOURCE_TYPE_API.getPaginated({
					institutionId: currentInstitution.id,
				});
				setResourceTypes(response.results || []);
			} catch (err) {
				showErrorToast({ error: err, defaultMessage: "Failed to fetch resource types" });
			} finally {
				setLoadingResourceTypes(false);
			}
		};
		fetchResourceTypes();
	}, [currentInstitution]);

	useEffect(() => {
		console.log("\n\n Selected resource changed to : ", selectedResource);
		if (selectedResource) {
			setFormData({
				name: selectedResource.name,
				description: selectedResource.description || "",
				type: selectedResource.type?.id || 0,
			});
		} else {
			resetForm();
		}
	}, [selectedResource]);

	const resetForm = () => {
		setFormData({ name: "", description: "", type: 0 });
	};

	const handleSubmit = async () => {
		if (!currentInstitution) {
			showErrorToast({ error: null, defaultMessage: "No institution selected" });
			return;
		}
		if (!formData.name.trim()) {
			showErrorToast({ error: null, defaultMessage: "Name is required" });
			return;
		}
		if (!formData.type) {
			showErrorToast({ error: null, defaultMessage: "Resource type is required" });
			return;
		}
		try {
			setSaving(true);
			if (selectedResource) {
				await PIP_SUPPORT_RESOURCE_API.update({
					resourceId: selectedResource.id,
					data: formData,
				});
				showSuccessToast("Support resource updated successfully!");
			} else {
				await PIP_SUPPORT_RESOURCE_API.create({ data: formData });
				showSuccessToast("Support resource created successfully!");
			}
			onSuccess();
			resetForm();
			onOpenChange(false);
		} catch (err) {
			showErrorToast({
				error: err,
				defaultMessage: selectedResource
					? "Failed to update support resource"
					: "Failed to create support resource",
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>
						{selectedResource ? "Edit Support Resource" : "Create Support Resource"}
					</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<div className="space-y-2">
						<Label>Name *</Label>
						<Input
							placeholder="e.g., Performance Training Guide"
							value={formData.name}
							onChange={(e) => setFormData({ ...formData, name: e.target.value })}
							className="h-10 rounded-2xl text-sm"
						/>
					</div>
					<div className="space-y-2">
						<Label>Resource Type *</Label>
						<PIPSupportResourceTypeSearchableSelect
							value={formData.type ? [formData.type] : []}
							onValueChange={(values) =>
								setFormData({ ...formData, type: values[0] ? Number(values[0]) : 0 })
							}
							placeholder="Select resource type..."
							disabled={loadingResourceTypes}
							triggerClassName="h-10 rounded-2xl text-sm"
						/>
					</div>
					<div className="space-y-2">
						<Label>Description</Label>
						<Textarea
							placeholder="Describe the resource..."
							value={formData.description}
							onChange={(e) => setFormData({ ...formData, description: e.target.value })}
							className="rounded-2xl"
							rows={4}
						/>
					</div>
					<div className="flex justify-end gap-2">
						<Button
							variant="outline"
							className="rounded-full"
							onClick={() => onOpenChange(false)}
							disabled={saving}
						>
							Cancel
						</Button>
						<Button className="rounded-full" onClick={handleSubmit} disabled={saving}>
							{saving
								? selectedResource
									? "Updating..."
									: "Creating..."
								: selectedResource
									? "Update"
									: "Create"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
