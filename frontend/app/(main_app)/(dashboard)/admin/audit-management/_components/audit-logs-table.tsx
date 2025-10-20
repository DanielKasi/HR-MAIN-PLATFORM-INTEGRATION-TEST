"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface AuditLog {
	id: string;
	branch: string;
	staff: {
		name: string;
		avatar: string;
	};
	category: string;
	action: "Edit" | "Create" | "Login" | "Delete";
	message: string;
	fullMessage?: string;
	date: string;
	ip: string;
}

const mockAuditLogs: AuditLog[] = [
	{
		id: "1",
		branch: "Yego Finance",
		staff: { name: "Kizito Ivan", avatar: "/placeholder.svg?height=32&width=32" },
		category: "Employee",
		action: "Edit",
		message: "Updated employee profile: Jo...",
		fullMessage: "Updated employee profile: John Doe - Changed department from Sales to Marketing",
		date: "Apr 12, 2025 - 8:31 AM",
		ip: "35.221.10.102",
	},
	{
		id: "2",
		branch: "Yego Finance",
		staff: { name: "Mwangi Peter", avatar: "/placeholder.svg?height=32&width=32" },
		category: "Authentication",
		action: "Login",
		message: "Failed login attempt: roy.dida...",
		fullMessage: "Failed login attempt: roy.didason@example.com - Invalid credentials",
		date: "Dec 03, 2024 - 11:03 AM",
		ip: "35.221.10.103",
	},
	{
		id: "3",
		branch: "Subik Microfinance",
		staff: { name: "Wamuyu Grace", avatar: "/placeholder.svg?height=32&width=32" },
		category: "Employee",
		action: "Edit",
		message: "Updated employee profile: Jo...",
		fullMessage: "Modified attendance record: Jane Namusoke for 2025-10-16",
		date: "Nov 18, 2024 - 2:18 PM",
		ip: "35.221.10.104",
	},
	{
		id: "4",
		branch: "Yego Finance",
		staff: { name: "Karanja David", avatar: "/placeholder.svg?height=32&width=32" },
		category: "Attendance",
		action: "Edit",
		message: "Modified attendance record: J...",
		fullMessage:
			"Modified attendance record: Jane Namusoke for 2025-10-16 - Changed status from Absent to Present",
		date: "Oct 26, 2024 - 9:52 AM",
		ip: "35.221.10.105",
	},
	{
		id: "5",
		branch: "Loro Credit",
		staff: { name: "Omar Ahmed", avatar: "/placeholder.svg?height=32&width=32" },
		category: "Payroll",
		action: "Create",
		message: "Generated payslip: PAY-2025...",
		fullMessage: "Generated payslip: PAY-2025-09-001 for September 2025",
		date: "Sept 01, 2024 - 6:27 PM",
		ip: "35.221.10.106",
	},
	{
		id: "6",
		branch: "Yego Finance",
		staff: { name: "Wangari Ruth", avatar: "/placeholder.svg?height=32&width=32" },
		category: "Employee",
		action: "Create",
		message: "Created new user account: H...",
		fullMessage: "Created new user account: Hannah Wanjiku - Role: HR Manager",
		date: "Aug 14, 2024 - 1:49 PM",
		ip: "35.221.10.107",
	},
	{
		id: "7",
		branch: "Yego Finance",
		staff: { name: "Mosi Lila", avatar: "/placeholder.svg?height=32&width=32" },
		category: "Roles",
		action: "Edit",
		message: "Changed role: Roy Didanie fr...",
		fullMessage: "Changed role: Roy Didanie from Employee to Team Lead",
		date: "Jul 22, 2024 - 4:05 AM",
		ip: "35.221.10.108",
	},
];

interface AuditLogsTableProps {
	searchQuery: string;
	actionFilter: string;
}

export function AuditLogsTable({ searchQuery, actionFilter }: AuditLogsTableProps) {
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 7;

	// Filter logs based on search and action filter
	const filteredLogs = mockAuditLogs.filter((log) => {
		const matchesSearch =
			log.branch.toLowerCase().includes(searchQuery.toLowerCase()) ||
			log.staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			log.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
			log.message.toLowerCase().includes(searchQuery.toLowerCase());

		const matchesAction = actionFilter === "all" || log.action.toLowerCase() === actionFilter;

		return matchesSearch && matchesAction;
	});

	const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentLogs = filteredLogs.slice(startIndex, endIndex);

	const getActionColor = (action: string) => {
		switch (action.toLowerCase()) {
			case "edit":
				return "text-cyan-500 hover:text-cyan-600";
			case "create":
				return "text-cyan-500 hover:text-cyan-600";
			case "login":
				return "text-cyan-500 hover:text-cyan-600";
			default:
				return "text-cyan-500 hover:text-cyan-600";
		}
	};

	return (
		<div className="space-y-4">
			<div className="overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow className="border-b border-border hover:bg-transparent">
							<TableHead className="font-medium text-foreground">Logged In Branch</TableHead>
							<TableHead className="font-medium text-foreground">Staff</TableHead>
							<TableHead className="font-medium text-foreground">Category</TableHead>
							<TableHead className="font-medium text-foreground">Action</TableHead>
							<TableHead className="font-medium text-foreground">Message</TableHead>
							<TableHead className="font-medium text-foreground">Date</TableHead>
							<TableHead className="font-medium text-foreground">IP</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{currentLogs.map((log) => (
							<TableRow key={log.id} className="border-b border-border hover:bg-muted/50">
								<TableCell className="font-normal text-foreground">{log.branch}</TableCell>
								<TableCell>
									<div className="flex items-center gap-2">
										<Avatar className="h-6 w-6">
											<AvatarImage src={"/images/profile-placeholder.jpg"} alt={log.staff.name} />
											<AvatarFallback className="text-xs bg-muted">
												{log.staff.name
													.split(" ")
													.map((n) => n[0])
													.join("")}
											</AvatarFallback>
										</Avatar>
										<span className="text-foreground">{log.staff.name}</span>
									</div>
								</TableCell>
								<TableCell className="text-foreground">{log.category}</TableCell>
								<TableCell>
									<button className={`font-medium ${getActionColor(log.action)}`}>
										{log.action}
									</button>
								</TableCell>
								<TableCell>
									{log.fullMessage ? (
										<TooltipProvider>
											<Tooltip>
												<TooltipTrigger asChild>
													<div className="text-foreground cursor-pointer max-w-xs truncate">
														{log.message}
													</div>
												</TooltipTrigger>
												<TooltipContent
													side="top"
													className="max-w-sm bg-popover text-popover-foreground border-border bg-gray-700 !text-white text-sm p-1 !px-2 rounded-lg"
												>
													<p className="text-sm">{log.fullMessage}</p>
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									) : (
										<div className="text-foreground max-w-xs truncate">{log.message}</div>
									)}
								</TableCell>
								<TableCell className="text-foreground whitespace-nowrap">{log.date}</TableCell>
								<TableCell className="text-muted-foreground font-mono text-sm">{log.ip}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					Showing {startIndex + 1}-{Math.min(endIndex, filteredLogs.length)} of{" "}
					{filteredLogs.length}
				</p>

				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
						disabled={currentPage === 1}
						className="h-8 px-3"
					>
						<ChevronLeft className="h-4 w-4 mr-1" />
						Previous
					</Button>

					<div className="flex items-center gap-1">
						{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
							let pageNum;
							if (totalPages <= 5) {
								pageNum = i + 1;
							} else if (currentPage <= 3) {
								pageNum = i + 1;
							} else if (currentPage >= totalPages - 2) {
								pageNum = totalPages - 4 + i;
							} else {
								pageNum = currentPage - 2 + i;
							}

							return (
								<Button
									key={pageNum}
									variant={currentPage === pageNum ? "default" : "outline"}
									size="sm"
									onClick={() => setCurrentPage(pageNum)}
									className="h-8 w-8 p-0"
								>
									{pageNum}
								</Button>
							);
						})}
						{totalPages > 5 && currentPage < totalPages - 2 && (
							<>
								<span className="px-2 text-muted-foreground">...</span>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setCurrentPage(totalPages)}
									className="h-8 w-8 p-0"
								>
									{totalPages}
								</Button>
							</>
						)}
					</div>

					<Button
						variant="outline"
						size="sm"
						onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
						disabled={currentPage === totalPages}
						className="h-8 px-3"
					>
						Next
						<ChevronRight className="h-4 w-4 ml-1" />
					</Button>
				</div>
			</div>
		</div>
	);
}
