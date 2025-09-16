"use client";

import { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, X, Loader2 } from "lucide-react";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Branch } from "@/types";

interface MultiSelectBranchesProps {
	branches: Branch[];
	selectedBranches: number[];
	onSelectionChange: (selectedIds: number[]) => void;
	loading?: boolean;
	error?: string | null;
	placeholder?: string;
	label?: string;
	required?: boolean;
	className?: string;
}

export function MultiSelectBranches({
	branches,
	selectedBranches,
	onSelectionChange,
	loading = false,
	error = null,
	placeholder = "Select branches",
	label = "Branches",
	required = false,
	className = "",
}: MultiSelectBranchesProps) {
	const [isOpen, setIsOpen] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, [isOpen]);

	const handleToggleBranch = (branchId: number) => {
		const newSelection = selectedBranches.includes(branchId)
			? selectedBranches.filter((id) => id !== branchId)
			: [...selectedBranches, branchId];

		onSelectionChange(newSelection);
	};

	const handleRemoveBranch = (branchId: number) => {
		onSelectionChange(selectedBranches.filter((id) => id !== branchId));
	};

	const selectedBranchNames = branches
		.filter((branch) => selectedBranches.includes(branch.id))
		.map((branch) => branch.branch_name);

	return (
		<div className={`space-y-2`}>
			<Label htmlFor="branch-select">
				{label} {required && <span className="text-red-500">*</span>}
			</Label>

			<div className="relative rounded-2xl" ref={dropdownRef}>
				<Button
					type="button"
					variant="outline"
					className={`w-full justify-between h-auto min-h-[40px] px-3 py-2 bg-transparent ${className}`}
					onClick={() => setIsOpen(!isOpen)}
					disabled={loading}
				>
					<div className="flex flex-wrap gap-1 flex-1 text-left">
						{loading ? (
							<div className="flex items-center gap-2">
								<Loader2 className="h-4 w-4 animate-spin" />
								<span className="text-muted-foreground">Loading branches...</span>
							</div>
						) : selectedBranches.length === 0 ? (
							<span className="text-muted-foreground">{placeholder}</span>
						) : (
							selectedBranchNames.map((name, index) => (
								<Badge
									key={index}
									variant="secondary"
									className="text-xs"
									onClick={(e) => {
										e.stopPropagation();
										const branch = branches.find((b) => b.branch_name === name);

										if (branch) handleRemoveBranch(branch.id);
									}}
								>
									{name}
									<X className="h-3 w-3 ml-1 hover:bg-muted-foreground/20 rounded-full" />
								</Badge>
							))
						)}
					</div>
					<ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
				</Button>

				{isOpen && (
					<div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
						{error ? (
							<div className="px-3 py-2 text-sm text-red-500">{error}</div>
						) : branches.length === 0 ? (
							<div className="px-3 py-2 text-sm text-muted-foreground">No branches available</div>
						) : (
							branches.map((branch) => (
								<div
									key={branch.id}
									className="flex items-center px-3 py-2 cursor-pointer hover:bg-muted"
									onClick={() => handleToggleBranch(branch.id)}
								>
									<div className="flex items-center justify-center w-4 h-4 mr-2 border rounded">
										{selectedBranches.includes(branch.id) && (
											<Check className="h-3 w-3 text-primary" />
										)}
									</div>
									<span className="flex-1">{branch.branch_name}</span>
									{branch.branch_location && (
										<span className="text-xs text-muted-foreground ml-2">
											{branch.branch_location}
										</span>
									)}
								</div>
							))
						)}
					</div>
				)}
			</div>

			{selectedBranches.length > 0 && (
				<div className="text-xs text-muted-foreground">
					{selectedBranches.length} branch{selectedBranches.length !== 1 ? "es" : ""} selected
				</div>
			)}
		</div>
	);
}
