"use client";

import type React from "react";
import type { Role, Branch } from "@/types";

import { useEffect, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { fetchInstitutionBranchesFromAPI, getDefaultInstitutionId } from "@/lib/helpers";
import { Checkbox } from "@/components/ui/checkbox";

interface AddUserFormProps {
	onAddSuccess?: () => void;
}

export function AddUserForm({ onAddSuccess }: AddUserFormProps) {
	const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
	const [roles, setRoles] = useState<Role[]>([]);
	const [branches, setBranches] = useState<Branch[]>([]);
	const [selectedBranches, setSelectedBranches] = useState<number[]>([]);
	const [defaultBranchId, setDefaultBranchId] = useState<number | null>(null);

	const [errorMessage, setErrorMessage] = useState("");
	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [bio, setBio] = useState("");
	const [isOpen, setIsOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const router = useRouter();

	const fetchRoles = async () => {
		try {
			const response = await apiRequest.get(
				`user/role/?Institution_id=${getDefaultInstitutionId()}`,
			);

			setRoles(response.data.results);
		} catch (error) {
			console.error("Error fetching roles:", error);
			toast.error("Failed to load roles");
		}
	};

	const fetchBranches = async () => {
		try {
			const response = await fetchInstitutionBranchesFromAPI();

			setBranches(response.data.results as Branch[]);
		} catch (error) {
			console.error("Error fetching branches:", error);
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
			console.error("Error attaching branches:", error);
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
				email: email,
				roles_ids: [selectedRoleId], // Backend expects an array, so we wrap the single role in an array
			},
			institution: getDefaultInstitutionId(),
			bio: bio,
		};

		try {
			const response = await apiPost("institution/profile/", userProfile);

			if (response.status === 201) {
				// Get the user ID from the response
				const userId = response.data.user.id;

				// If branches are selected, attach them to the user
				if (selectedBranches.length > 0) {
					await attachBranchesToUser(userId);
				}

				toast.success("User created successfully");
				resetFormData();
				setIsOpen(false);
				if (onAddSuccess) onAddSuccess();
			}
		} catch (error: any) {
			console.error("Error creating user:", error);
			toast.error(error.message || "An error occurred while creating the user");
		} finally {
			setIsSubmitting(false);
		}
	};

	const resetFormData = () => {
		setFullName("");
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
				<Button variant="default" className="flex items-center gap-2 rounded-lg">
					<Plus className="h-4 w-4" />
					Add Staff
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[600px] rounded-2xl border-0 shadow-2xl">
				<DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
					<DialogTitle className="text-2xl font-bold text-gray-900">Add New User</DialogTitle>
					<DialogDescription className="text-gray-600 text-base">
						Create a new user account for your staff.
					</DialogDescription>
				</DialogHeader>
				<div className="grid grid-cols-1 gap-6 py-6">
					{errorMessage && (
						<div className="p-3 text-sm font-medium text-white bg-red-500 rounded-lg">
							{errorMessage}
						</div>
					)}

					<div className="space-y-3">
						<Label htmlFor="fullName" className="text-sm text-gray-800">
							Full Name *
						</Label>
						<Input
							required
							id="fullName"
							value={fullName}
							onChange={(e) => setFullName(e.target.value)}
							placeholder="e.g., John Doe"
							disabled={isSubmitting}
							className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
						/>
					</div>

					<div className="space-y-3">
						<Label htmlFor="email" className="text-sm text-gray-800">
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
							className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
						/>
					</div>
					<div className="space-y-3">
						<Label className="text-sm text-gray-800">Role *</Label>
						<div className="border rounded-xl p-4 bg-gray-50">
							<div className="mb-3 text-sm text-gray-600">Select a role for this user</div>
							<RadioGroup
								value={selectedRoleId?.toString()}
								onValueChange={(value) => setSelectedRoleId(Number.parseInt(value))}
								disabled={isSubmitting}
							>
								{roles.map((role) => (
									<div key={role.id} className="flex items-start space-x-3 mb-3">
										<RadioGroupItem id={`role-${role.id}`} value={role.id.toString()} />
										<Label
											className="text-sm font-normal cursor-pointer"
											htmlFor={`role-${role.id}`}
										>
											<div className="font-medium">{role.name}</div>
											{role.description && (
												<div className="text-xs text-gray-500 mt-1">{role.description}</div>
											)}
										</Label>
									</div>
								))}
							</RadioGroup>
						</div>
					</div>

					<div className="space-y-3">
						<Label className="text-sm text-gray-800">Branches</Label>
						<div className="border rounded-xl p-4 bg-gray-50">
							<div className="mb-3 text-sm text-gray-600">Select branches for this user</div>
							{branches.length === 0 ? (
								<div className="text-sm text-gray-500">No branches available</div>
							) : (
								<div className="space-y-3">
									{branches.map((branch) => (
										<div key={branch.id} className="flex items-center space-x-3">
											<Checkbox
												checked={selectedBranches.includes(branch.id ?? 0)}
												id={`branch-${branch.id}`}
												onCheckedChange={(checked) => handleBranchChange(branch.id ?? 0, !!checked)}
												disabled={isSubmitting}
											/>
											<Label
												className="text-sm font-medium cursor-pointer"
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

					<div className="space-y-3">
						<Label htmlFor="bio" className="text-sm text-gray-800">
							Bio
						</Label>
						<Textarea
							id="bio"
							rows={3}
							value={bio}
							onChange={(e) => setBio(e.target.value)}
							placeholder="e.g., Brief description about the user"
							disabled={isSubmitting}
							className="rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base min-h-[100px]"
						/>
					</div>
				</div>
				<DialogFooter>
					<Button
						onClick={handleSubmit}
						disabled={isSubmitting}
						className="bg-primary rounded-full w-full"
					>
						{isSubmitting ? (
							<>
								<Loader2 className="mr-2 h-5 w-5 animate-spin" />
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
