"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { CardHeader, CardTitle } from "@/components/ui/card";

import { Input } from "@/components/ui/input";

import ContractsTable from "@/components/contracts/contracts-table";

export default function ContractsPage() {
	const [searchTerm, setSearchTerm] = useState("");

	return (
		<div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8 min-h-screen">
			<CardHeader className="space-y-4 p-0">
				<CardTitle className="flex flex-col items-start justify-start gap-4">
					<span className="text-2xl font-bold">Contract Management</span>
					<p className="text-muted-foreground text-xs md:text-sm">
						Manage employee contracts, download documents, and upload signed contracts.
					</p>
				</CardTitle>
				<div className="relative w-full max-w-md md:max-w-lg lg:max-w-xl py-4">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search contracts by name/reference..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="pl-10"
					/>
				</div>
			</CardHeader>

			<ContractsTable searchTerm={searchTerm} scope={{ type: "default" }} />
		</div>
	);
}
