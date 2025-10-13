"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

import EmployeeDevicesLogs from "../_components/employee-device-logs";

export default function DevicesLogsPage() {
	const [searchQuery, setSearchQuery] = useState("");

	const handleSearch = (query: string) => {
		setSearchQuery(query);
	};

	return (
		<div className="min-h-screen p-6 bg-white">
			<div className="mx-auto">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center gap-4 mb-4">
						<div>
							<h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
								Logs
							</h1>
							<p className="text-slate-600 text-lg">
								Access logs on devices for employee access control
							</p>
						</div>
					</div>
				</div>
				<div className="flex justify-between items-center mb-4">
					<div className="flex items-center gap-4">
						<div className="relative w-full">
							<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
							<Input
								type="text"
								placeholder="Search by serial number or description..."
								value={searchQuery}
								onChange={(e) => handleSearch(e.target.value)}
								className="min-w-[18rem] md:min-w-[24rem] lg:min-w-[36rem] w-full rounded-xl pl-10"
							/>
						</div>
					</div>
				</div>

				<EmployeeDevicesLogs search={searchQuery} />
			</div>
		</div>
	);
}
