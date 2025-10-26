"use client";

import { Branch } from "@/types/branch.types";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";

import { Button } from "@/platform/v1/components";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
} from "@/platform/v1/components";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/platform/v1/components";
import { Label } from "@/platform/v1/components";
import { Checkbox } from "@/platform/v1/components";
import { Alert, AlertDescription } from "@/platform/v1/components";
import { apiPost } from "@/lib/apiRequest";
import { fetchInstitutionBranchesFromAPI, getDefaultInstitutionId } from "@/lib/helpers";

interface AddBranchFormProps {
	userId: number;
	onBranchAdded: () => void;
}

export function AddBranchForm({ userId, onBranchAdded }: AddBranchFormProps) {
	const [branches, setBranches] = useState<Branch[]>([]);
	const [selectedBranchId, setSelectedBranchId] = useState<string>("");
	const [isDefault, setIsDefault] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState("");

	const fetchBranches = async () => {
		try {
			const InstitutionId = getDefaultInstitutionId();
			const response = await fetchInstitutionBranchesFromAPI();

			setBranches(response.data);
		} catch (error: any) {
			setError(error.message || "Failed to fetch branches");
		}
	};

	useEffect(() => {
		if (isOpen) {
			fetchBranches();
		}
	}, [isOpen]);

	const handleSubmit = async () => {
		if (!selectedBranchId || selectedBranchId === "unknown") {
			setError("Please select a branch");

			return;
		}

		setIsLoading(true);
		setError("");

		try {
			await apiPost("institution/branch/user/", {
				user: userId,
				branch: Number.parseInt(selectedBranchId),
				is_default: isDefault,
			});

			setIsOpen(false);
			setSelectedBranchId("");
			setIsDefault(false);
			onBranchAdded();
		} catch (error: any) {
			setError(error.message || "Failed to add branch to user");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button className="bg-primary hover:bg-primary text-white" size="sm">
					<Plus className="h-4 w-4 mr-2" />
					Add Branch
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px] bg-white">
				<DialogHeader>
					<DialogTitle>Add User to Branch</DialogTitle>
				</DialogHeader>

				{error && (
					<Alert variant="destructive">
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				<div className="grid gap-4 py-4">
					<div className="grid gap-2">
						<Label htmlFor="branch">Select Branch</Label>
						<Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
							<SelectTrigger className="border-[#e5e7eb] bg-white">
								<SelectValue placeholder="Select a branch" />
							</SelectTrigger>
							<SelectContent>
								{branches.map((branch) => (
									<SelectItem
										key={branch.id ?? "unknown"}
										value={branch.id?.toString() ?? "unknown"}
									>
										{branch.branch_name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex items-center space-x-2">
						<Checkbox
							checked={isDefault}
							className="border-[#e5e7eb] data-[state=checked]:bg-[#10b981] data-[state=checked]:border-[#10b981]"
							id="is-default"
							onCheckedChange={(checked) => setIsDefault(!!checked)}
						/>
						<Label className="text-[#666]" htmlFor="is-default">
							Set as default branch
						</Label>
					</div>
				</div>

				<DialogFooter>
					<Button
						className="border-[#e5e7eb] bg-white text-[#666] hover:bg-[#f9f9f9]"
						disabled={isLoading}
						variant="outline"
						onClick={() => setIsOpen(false)}
					>
						Cancel
					</Button>
					<Button
						className="bg-[#10b981] hover:bg-[#0d9668]"
						disabled={isLoading}
						onClick={handleSubmit}
					>
						{isLoading ? "Adding..." : "Add Branch"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
