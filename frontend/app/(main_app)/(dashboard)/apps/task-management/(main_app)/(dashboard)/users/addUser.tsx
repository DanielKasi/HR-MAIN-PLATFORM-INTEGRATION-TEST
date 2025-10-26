"use client";

import type React from "react";
import { Role } from "@/types/user.types";
import { Branch } from "@/types/branch.types";
import { USER_GENDER } from "@/types/user.types";
import { useEffect, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { useModuleNavigation } from "@/hooks/use-module-navigation";
import { toast } from "sonner";

import apiRequest, { apiPost } from "@/lib/apiRequest";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/platform/v1/components";
import { Button } from "@/platform/v1/components";
import { Input } from "@/platform/v1/components";
import { Textarea } from "@/platform/v1/components";
import { Label } from "@/platform/v1/components";
import { RadioGroup, RadioGroupItem } from "@/platform/v1/components";
import { fetchInstitutionBranchesFromAPI, getDefaultInstitutionId } from "@/lib/helpers";
import { Checkbox } from "@/platform/v1/components";
import { showErrorToast } from "@/lib/utils";
import { PERMISSION_CODES } from "@/constants";

interface AddUserFormProps {
	onAddSuccess?: () => void;
}

export function AddUserForm({ onAddSuccess }: AddUserFormProps) {
	const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
	const [roles, setRoles] = useState<Role[]>([]);
	const [branches, setBranches] = useState<Branch[]>([]);
	const [selectedBranches, setSelectedBranches] = useState<number[]>([]);
	const [defaultBranchId, setDefaultBranchId] = useState<number | null>(null);
	const [gender, setGender] = useState<USER_GENDER | null>(null);
	const [errorMessage, setErrorMessage] = useState("");
	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [bio, setBio] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const router = useModuleNavigation("/apps/task-management");

	const fetchRoles = async () => {
		try {
			const response = await apiRequest.get(
				`user/role/?Institution_id=${getDefaultInstitutionId()}`,
			);
			setRoles(response.data.results);
		} catch (error) {
			toast.error("Failed to load roles");
		}
	};

	const fetchBranches = async () => {
		try {
			const response = await fetchInstitutionBranchesFromAPI();
			setBranches(response.data.results as Branch[]);
		} catch (error) {
			toast.error("Failed to load branches");
		}
	};

	useEffect(() => {
		if (isOpen) {
			fetchRoles();
			fetchBranches();
		}
	}, [isOpen]);

	const handleBranchChange = (branchId: number, checked: boolean) => {
		if (checked) {
			setSelectedBranches((prev) => [...prev, branchId]);
		} else {
			setSelectedBranches((prev) => prev.filter((id) => id !== branchId));
			if (defaultBranchId === branchId) {
				setDefaultBranchId(null);
			}
		}
	};

	const handleDefaultBranchChange = (branchId: number) => {
		if (!selectedBranches.includes(branchId)) {
			setSelectedBranches((prev) => [...prev, branchId]);
		}
		setDefaultBranchId(branchId);
	};

	const attachBranchesToUser = async (userId: number) => {
		try {
			const branchPromises = selectedBranches.map((branchId) => {
				return apiPost("institution/branch/user/", {
					user: userId,
					branch: branchId,
					is_default: branchId === defaultBranchId,
				});
			});
			await Promise.all(branchPromises);
		} catch (error: any) {
			throw new Error("Failed to attach branches to user");
		}
	};

	const handleSubmit = async () => {
		if (!fullName.trim()) {
			toast.error("Please enter a full name");
			return;
		}
		if (!email.trim()) {
			toast.error("Please enter an email address");
			return;
		}
		if (!selectedRoleId) {
			toast.error("Please select a role for the user");
			return;
		}

		setIsSubmitting(true);
		setErrorMessage("");

		const userProfile = {
			user: {
				fullname: fullName,
				gender: gender,
				email: email,
				roles_ids: [selectedRoleId],
			},
			institution: getDefaultInstitutionId(),
			bio: bio,
		};

		try {
			const response = await apiPost("institution/profile/", userProfile);
			if (response.status === 201) {
				const userId = response.data.user.id;
				if (selectedBranches.length > 0) {
					await attachBranchesToUser(userId);
				}
				toast.success("User created successfully");
				resetFormData();
				setIsOpen(false);
				if (onAddSuccess) onAddSuccess();
			}
		} catch (error: any) {
			showErrorToast({
				error,
				defaultMessage: "An error occurred while creating the user",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const resetFormData = () => {
		setFullName("");
		setGender(null);
		setEmail("");
		setBio("");
		setSelectedRoleId(null);
		setSelectedBranches([]);
		setDefaultBranchId(null);
		setErrorMessage("");
	};

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
		if (!open) {
			resetFormData();
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button variant="default" className="flex items-center gap-2 rounded-lg w-full sm:w-auto">
					<Plus className="h-4 w-4" />
					<span className="hidden sm:inline">Add Staff</span>
					<span className="sm:hidden">Add</span>
				</Button>
			</DialogTrigger>
			<DialogContent className="w-[95vw] max-w-[550px] max-h-[90vh] sm:max-h-[80vh] overflow-y-auto rounded-2xl border-0 shadow-2xl p-4 sm:p-6">
				<DialogHeader className="space-y-3 pb-4 border-b border-gray-100">
					<DialogTitle className="text-lg sm:text-xl font-bold text-gray-900">
						Add New User
					</DialogTitle>
					<DialogDescription className="text-xs sm:text-sm text-gray-600">
						Create a new staff account.
					</DialogDescription>
				</DialogHeader>
				<div className="grid grid-cols-1 gap-4 py-4 overflow-x-hidden">
					{errorMessage && (
						<div className="p-3 text-xs sm:text-sm font-medium text-white bg-red-500 rounded-lg break-words">
							{errorMessage}
						</div>
					)}

					<div className="space-y-2 sm:space-y-3">
						<Label htmlFor="fullName" className="text-xs sm:text-sm text-gray-800">
							Full Name *
						</Label>
						<Input
							required
							id="fullName"
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
							placeholder="e.g., John Doe"
							disabled={isSubmitting}
							className="rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm h-9 sm:h-10"
						/>
					</div>

					<div className="space-y-2 sm:space-y-3">
						<Label className="text-xs sm:text-sm text-gray-800">Gender</Label>
						<RadioGroup
							value={gender || ""}
							onValueChange={(value) => setGender(value as USER_GENDER)}
							disabled={isSubmitting}
						>
							<div className="flex items-center space-x-2 sm:space-x-3">
								<RadioGroupItem id="male" value={USER_GENDER.MALE} />
								<Label htmlFor="male" className="text-sm">
									Male
								</Label>
							</div>
							<div className="flex items-center space-x-2 sm:space-x-3">
								<RadioGroupItem id="female" value={USER_GENDER.FEMALE} />
								<Label htmlFor="female" className="text-sm">
									Female
								</Label>
							</div>
							<div className="flex items-center space-x-2 sm:space-x-3">
								<RadioGroupItem id="other" value={USER_GENDER.OTHER} />
								<Label htmlFor="other" className="text-sm">
									Other
								</Label>
							</div>
						</RadioGroup>
					</div>

					<div className="space-y-2 sm:space-y-3">
						<Label htmlFor="email" className="text-xs sm:text-sm text-gray-800">
							Email *
						</Label>
						<Input
							required
							type="email"
							id="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							placeholder="e.g., john.doe@company.com"
							disabled={isSubmitting}
							className="rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm h-9 sm:h-10"
						/>
					</div>

					<div className="space-y-2 sm:space-y-3">
						<Label className="text-xs sm:text-sm text-gray-800">Role *</Label>
						<div className="border rounded-lg p-3 sm:p-4 bg-gray-50 max-h-36 sm:max-h-40 overflow-y-auto overflow-x-hidden">
							<RadioGroup
								value={selectedRoleId?.toString()}
								onValueChange={(value) => setSelectedRoleId(Number.parseInt(value))}
								disabled={isSubmitting}
							>
								{roles.map((role) => (
									<div
										key={role.id}
										className="flex items-start space-x-2 sm:space-x-3 mb-2 sm:mb-3"
									>
										<RadioGroupItem
											id={`role-${role.id}`}
											value={role.id.toString()}
											className="mt-0.5"
										/>
										<Label
											className="text-xs sm:text-sm font-normal cursor-pointer break-words flex-1 min-w-0"
											htmlFor={`role-${role.id}`}
										>
											<div className="font-medium break-words">{role.name}</div>
											{role.description && (
												<div className="text-xs text-gray-500 break-words">{role.description}</div>
											)}
										</Label>
									</div>
								))}
							</RadioGroup>
						</div>
					</div>

					<div className="space-y-2 sm:space-y-3">
						<Label className="text-xs sm:text-sm text-gray-800">Branches</Label>
						<div className="border rounded-lg p-3 sm:p-4 bg-gray-50 max-h-36 sm:max-h-40 overflow-y-auto overflow-x-hidden">
							{branches.length === 0 ? (
								<div className="text-xs sm:text-sm text-gray-500">No branches available</div>
							) : (
								<div className="space-y-2 sm:space-y-3">
									{branches.map((branch) => (
										<div key={branch.id} className="flex items-center space-x-2 sm:space-x-3">
											<Checkbox
												checked={selectedBranches.includes(branch.id ?? 0)}
												id={`branch-${branch.id}`}
												onCheckedChange={(checked) => handleBranchChange(branch.id ?? 0, !!checked)}
												disabled={isSubmitting}
											/>
											<Label
												className="text-xs sm:text-sm font-medium cursor-pointer break-words flex-1 min-w-0"
												htmlFor={`branch-${branch.id}`}
											>
												{branch.branch_name}
											</Label>
										</div>
									))}
								</div>
							)}
						</div>
					</div>

					<div className="space-y-2 sm:space-y-3">
						<Label htmlFor="bio" className="text-xs sm:text-sm text-gray-800">
							Bio
						</Label>
						<Textarea
							id="bio"
							rows={3}
							value={bio}
							onChange={(e) => setBio(e.target.value)}
							placeholder="Brief description about the user"
							disabled={isSubmitting}
							className="rounded-lg border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-sm min-h-[80px] resize-none"
						/>
					</div>
				</div>
				<DialogFooter>
					<Button
						onClick={handleSubmit}
						disabled={isSubmitting}
						className="bg-primary rounded-full w-full h-9 sm:h-10 text-xs sm:text-sm"
					>
						{isSubmitting ? (
							<>
								<Loader2 className="mr-2 h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
								Creating...
							</>
						) : (
							"Create User"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
