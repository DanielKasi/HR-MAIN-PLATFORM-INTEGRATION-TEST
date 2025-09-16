import { useState } from "react";
import { SelectTrigger, SelectValue, SelectContent, SelectItem } from "@radix-ui/react-select";
import { Loader2 } from "lucide-react";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Select } from "../ui/select";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import ProtectedComponent from "../ProtectedComponent";

import { GENDER_CHOICES, LEAVE_CATEGORIES } from "@/constants";
import { PERMISSION_CODES } from "@/constants";

interface CreateLeaveTypeDialogProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	onCreateLeaveType: () => void;
}

export const CreateLeaveTypeDialog = ({
	isOpen,
	onOpenChange,
	onCreateLeaveType,
}: CreateLeaveTypeDialogProps) => {
	//   const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [formData, setFormData] = useState<{
		name: string;
		category: string;
		description: string;
		max_days_per_year: string;
		carry_forward_allowed: boolean;
		max_carry_forward_days: string;
		requires_document: boolean;
		gender_specific: string;
	}>({
		name: "",
		category: "annual",
		description: "",
		max_days_per_year: "",
		carry_forward_allowed: false,
		max_carry_forward_days: "",
		requires_document: false,
		gender_specific: "all",
	});

	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = () => {
		try {
			setIsSubmitting(true);
			onCreateLeaveType();
		} catch (error) {
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_MANAGE_LEAVE_TYPES}>
			<Dialog open={isOpen} onOpenChange={onOpenChange}>
				<DialogContent className="sm:max-w-[900px] w-full rounded-2xl border-0 shadow-2xl overflow-y-auto max-h-[80vh] md:max-h-[65svh] ">
					<DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
						<DialogTitle className="text-2xl font-bold text-gray-900">Add Leave Type</DialogTitle>
						<DialogDescription className="text-gray-600 text-base">
							Create a new leave type to manage employee leave requests efficiently.
						</DialogDescription>
					</DialogHeader>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
						<div className="space-y-3">
							<Label htmlFor="name" className="text-sm font-semibold text-gray-800">
								Name *
							</Label>
							<Input
								id="name"
								value={formData.name}
								onChange={(e) => setFormData({ ...formData, name: e.target.value })}
								placeholder="e.g., Annual Leave, Sick Leave"
								disabled={isSubmitting}
								className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
							/>
						</div>
						<div className="space-y-3">
							<Label htmlFor="category" className="text-sm font-semibold text-gray-800">
								Category *
							</Label>
							<Select
								value={formData.category}
								onValueChange={(value) => setFormData({ ...formData, category: value })}
								disabled={isSubmitting}
							>
								<SelectTrigger className="h-12 rounded-xl">
									<SelectValue placeholder="Select a category" />
								</SelectTrigger>
								<SelectContent>
									{LEAVE_CATEGORIES.map((category) => (
										<SelectItem key={category.value} value={category.value}>
											{category.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-3 md:col-span-2">
							<Label htmlFor="description" className="text-sm font-semibold text-gray-800">
								Description *
							</Label>
							<Textarea
								id="description"
								value={formData.description}
								onChange={(e) => setFormData({ ...formData, description: e.target.value })}
								rows={4}
								placeholder="Provide a detailed description of this leave type..."
								disabled={isSubmitting}
								className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base resize-none"
							/>
						</div>
						<div className="space-y-3">
							<Label htmlFor="max_days_per_year" className="text-sm font-semibold text-gray-800">
								Max Days Per Year *
							</Label>
							<Input
								id="max_days_per_year"
								type="number"
								value={formData.max_days_per_year}
								onChange={(e) => setFormData({ ...formData, max_days_per_year: e.target.value })}
								placeholder="e.g., 20"
								disabled={isSubmitting}
								className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
							/>
						</div>
						<div className="space-y-3">
							<Label
								htmlFor="max_carry_forward_days"
								className="text-sm font-semibold text-gray-800"
							>
								Max Carry Forward Days
							</Label>
							<Input
								id="max_carry_forward_days"
								type="number"
								value={formData.max_carry_forward_days}
								onChange={(e) =>
									setFormData({ ...formData, max_carry_forward_days: e.target.value })
								}
								placeholder="e.g., 5"
								disabled={isSubmitting}
								className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
							/>
						</div>
						<div className="space-y-3">
							<Label htmlFor="gender_specific" className="text-sm font-semibold text-gray-800">
								Gender Specific
							</Label>
							<Select
								value={formData.gender_specific}
								onValueChange={(value) => setFormData({ ...formData, gender_specific: value })}
								disabled={isSubmitting}
							>
								<SelectTrigger className="h-12 rounded-xl">
									<SelectValue placeholder="Select gender" />
								</SelectTrigger>
								<SelectContent>
									{GENDER_CHOICES.map((gender) => (
										<SelectItem key={gender.value} value={gender.value}>
											{gender.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="bg-gray-50 rounded-xl p-4 space-y-4 md:col-span-2">
							<h4 className="text-sm font-semibold text-gray-800 mb-3">Configuration Options</h4>
							<div className="flex flex-col sm:flex-row sm:items-center gap-6">
								<div className="flex items-center space-x-3">
									<input
										type="checkbox"
										id="carry_forward_allowed"
										checked={formData.carry_forward_allowed}
										onChange={(e) =>
											setFormData({
												...formData,
												carry_forward_allowed: e.target.checked,
											})
										}
										disabled={isSubmitting}
										className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500/20"
									/>
									<Label
										htmlFor="carry_forward_allowed"
										className="text-sm font-medium text-gray-700"
									>
										Carry Forward Allowed
									</Label>
								</div>
								<div className="flex items-center space-x-3">
									<input
										type="checkbox"
										id="requires_document"
										checked={formData.requires_document}
										onChange={(e) =>
											setFormData({
												...formData,
												requires_document: e.target.checked,
											})
										}
										disabled={isSubmitting}
										className="w-5 h-5 text-orange-500 border-gray-300 rounded focus:ring-orange-500/20"
									/>
									<Label htmlFor="requires_document" className="text-sm font-medium text-gray-700">
										Requires Document
									</Label>
								</div>
							</div>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
							Cancel
						</Button>
						<Button onClick={handleSubmit} disabled={isSubmitting}>
							{isSubmitting ? (
								<>
									<Loader2 className="mr-2 h-5 w-5 animate-spin" />
									Creating...
								</>
							) : (
								"Create Leave Type"
							)}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</ProtectedComponent>
	);
};
