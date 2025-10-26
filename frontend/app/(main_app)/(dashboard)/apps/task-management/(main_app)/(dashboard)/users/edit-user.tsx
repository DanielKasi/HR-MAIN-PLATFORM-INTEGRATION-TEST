"use client";

import type { Role, UserProfile } from "@/types/user.types";

import { useState, useEffect } from "react";
import { Pencil } from "lucide-react";
import { useModuleNavigation } from "@/hooks/use-module-navigation";

import { Button } from "@/platform/v1/components";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from "@/platform/v1/components";
import { Label } from "@/platform/v1/components";
import { Alert, AlertDescription } from "@/platform/v1/components";
import { RadioGroup, RadioGroupItem } from "@/platform/v1/components";
import apiRequest, { apiPost } from "@/lib/apiRequest";
import { USER_GENDER } from "@/types/user.types";
import { Branch } from "@/types/branch.types";
import { Checkbox } from "@/platform/v1/components";
import { Input } from "@/platform/v1/components";
import { Textarea } from "@/platform/v1/components";
import { toast } from "sonner";
import { fetchInstitutionBranchesFromAPI } from "@/lib/helpers";
import { getDefaultInstitutionId } from "@/lib/helpers";

interface EditUserFormProps {
	user: UserProfile;
	onEditSuccess?: () => void;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

export function EditUserForm({ user, onEditSuccess, open, onOpenChange }: EditUserFormProps) {
	const [roles, setRoles] = useState<Role[]>([]);
	const [fullName, setFullName] = useState(user.user.fullname || "");
	const [gender, setGender] = useState<USER_GENDER | null>(user.user.gender || null);
	const [bio, setBio] = useState(user.bio || "");
	const [branches, setBranches] = useState<Branch[]>([]);
	const [selectedBranches, setSelectedBranches] = useState<number[]>(
		user.user.branches?.map((b) => b.id) || [],
	);

	const [selectedRole, setSelectedRole] = useState<number | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	const router = useModuleNavigation("/apps/task-management");

	const fetchBranches = async () => {
		try {
			const response = await fetchInstitutionBranchesFromAPI();
			setBranches(response.data.results as Branch[]);
		} catch (error) {
			toast.error("Failed to load branches");
		}
	};

	const updateBranches = async (userId: number) => {
		try {
			const existingResponse = await apiRequest.get(`institution/branch/user/?user=${userId}`);
			const userAssociations = (existingResponse.data || []).filter(
				(assoc: any) => assoc.user === userId,
			);

			const existingBranchIds = userAssociations.map((assoc: any) => assoc.branch);

			const branchesToAdd = selectedBranches.filter(
				(branchId) => !existingBranchIds.includes(branchId),
			);

			const associationsToDelete = userAssociations.filter(
				(assoc: any) => !selectedBranches.includes(assoc.branch),
			);

			if (associationsToDelete.length > 0) {
				await Promise.all(
					associationsToDelete.map((association: any) =>
						apiRequest.delete(`institution/branch/user/${association.id}/`),
					),
				);
			}
			if (branchesToAdd.length > 0) {
				const branchPromises = branchesToAdd.map((branchId) => {
					return apiPost("institution/branch/user/", {
						user: userId,
						branch: branchId,
						is_default: false,
					});
				});

				await Promise.all(branchPromises);
			}
		} catch (error: any) {
			throw new Error(
				typeof error.message === "object"
					? JSON.stringify(error.message)
					: error.message || "Failed to update branches",
			);
		}
	};

	const handleBranchChange = (branchId: number, checked: boolean) => {
		if (checked) {
			setSelectedBranches((prev) => [...prev, branchId]);
		} else {
			setSelectedBranches((prev) => prev.filter((id) => id !== branchId));
		}
	};

	const fetchRoles = async () => {
		try {
			const response = await apiRequest.get(
				`user/role/?Institution_id=${getDefaultInstitutionId()}`,
			);

			setRoles(response.data.results);
		} catch (error: any) {
			setError(error.message || "Failed to fetch roles");
		}
	};

	useEffect(() => {
		if (open) {
			fetchRoles();
			fetchBranches();
			setFullName(user.user.fullname || "");
			setGender(user.user.gender || null);
			setBio(user.bio || "");
			setSelectedBranches(user.user.branches?.map((b) => b.id) || []);
			if (user.user.roles && user.user.roles.length > 0) {
				setSelectedRole(user.user.roles[0].id || null);
			}
		}
	}, [open, user]);

	const handleSubmit = async () => {
		if (!fullName.trim()) {
			toast.error("Please enter a full name");
			return;
		}

		setIsLoading(true);
		setError("");

		try {
			await apiRequest.patch(`user/${user.user.id}/`, {
				fullname: fullName,
				gender: gender,
				roles_ids: selectedRole ? [selectedRole] : [],
				bio: bio,
			});

			await updateBranches(user.user.id);

			toast.success("User updated successfully");
			onOpenChange?.(false);
			if (onEditSuccess) onEditSuccess();
			router.refresh();
		} catch (error: any) {
			setError(error.message || "Failed to update user");
			toast.error(error.message || "Failed to update user");
		} finally {
			setIsLoading(false);
		}
	};
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="w-[95vw] max-w-[550px] max-h-[90vh] sm:max-h-[80vh] overflow-y-auto p-4 sm:p-6">
				<DialogHeader>
					<DialogTitle className="text-lg sm:text-xl break-words">
						Edit User: {user.user.fullname}
					</DialogTitle>
				</DialogHeader>

				{error && (
					<Alert className="mb-4" variant="destructive">
						<AlertDescription className="text-xs sm:text-sm break-words">{error}</AlertDescription>
					</Alert>
				)}

				<div className="grid gap-4 py-4 overflow-x-hidden">
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
							disabled={isLoading}
							className="rounded-lg h-9 sm:h-10 text-sm"
						/>
					</div>

					<div className="space-y-2 sm:space-y-3">
						<Label className="text-xs sm:text-sm text-gray-800">Gender</Label>
						<RadioGroup
							value={gender || ""}
							onValueChange={(value) => setGender(value as USER_GENDER)}
							disabled={isLoading}
						>
							<div className="flex items-center space-x-2 sm:space-x-3">
								<RadioGroupItem id="edit-male" value={USER_GENDER.MALE} />
								<Label htmlFor="edit-male" className="text-sm">
									Male
								</Label>
							</div>
							<div className="flex items-center space-x-2 sm:space-x-3">
								<RadioGroupItem id="edit-female" value={USER_GENDER.FEMALE} />
								<Label htmlFor="edit-female" className="text-sm">
									Female
								</Label>
							</div>
							<div className="flex items-center space-x-2 sm:space-x-3">
								<RadioGroupItem id="edit-other" value={USER_GENDER.OTHER} />
								<Label htmlFor="edit-other" className="text-sm">
									Other
								</Label>
							</div>
						</RadioGroup>
					</div>

					<div className="space-y-2 sm:space-y-4">
						<h3 className="text-base sm:text-lg font-medium">Assign Role</h3>
						<div className="border rounded-lg p-3 sm:p-4 bg-gray-50 max-h-36 sm:max-h-40 overflow-y-auto overflow-x-hidden">
							<RadioGroup
								value={selectedRole?.toString()}
								onValueChange={(value) => setSelectedRole(Number.parseInt(value))}
							>
								{roles.map((role) => (
									<div key={role.id} className="flex items-start space-x-2 sm:space-x-3 py-2">
										<RadioGroupItem
											id={`role-${role.id}`}
											value={role.id.toString()}
											className="mt-0.5"
										/>
										<div className="grid gap-0.5 flex-1 min-w-0">
											<Label
												className="font-medium text-xs sm:text-sm break-words"
												htmlFor={`role-${role.id}`}
											>
												{role.name}
											</Label>
										</div>
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
												id={`edit-branch-${branch.id}`}
												onCheckedChange={(checked) => handleBranchChange(branch.id ?? 0, !!checked)}
												disabled={isLoading}
											/>
											<Label
												className="text-xs sm:text-sm font-medium cursor-pointer break-words flex-1 min-w-0"
												htmlFor={`edit-branch-${branch.id}`}
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
							disabled={isLoading}
							className="rounded-lg text-sm resize-none"
						/>
					</div>
				</div>

				<DialogFooter className="flex-col sm:flex-row gap-2">
					<Button
						disabled={isLoading}
						variant="outline"
						onClick={() => onOpenChange?.(false)}
						className="w-full sm:w-auto"
					>
						Cancel
					</Button>
					<Button disabled={isLoading} onClick={handleSubmit} className="w-full sm:w-auto">
						{isLoading ? "Saving..." : "Save Changes"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
