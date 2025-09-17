"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { Plus, Search, Filter, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors";
import { type IJobPosition } from "@/types/types.utils";
import { PERMISSION_CODES } from "@/constants";
import { formatCurrency } from "@/lib/helpers";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { JobPositionsTable } from "@/components/common/tables/job-positions/job-positions-table";
import ProtectedComponent from "@/components/ProtectedComponent";

export default function JobPositionsPage() {
	const [jobPositions, setJobPositions] = useState<IJobPosition[]>([]);
	const [jobPositionsCount, setJobPositionsCount] = useState(0);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedSalaryRange, setSelectedSalaryRange] = useState<string>("all");

	const router = useRouter();
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const selectedBranch = useSelector(selectSelectedBranch);

	useDocumentTitle("JOB POSITIONS / TITLES");

	const generateSalaryRanges = (positions: IJobPosition[]) => {
		if (!positions.length) return [];

		const allSalaries = positions
			.flatMap((pos) => [Number(pos.salary_min || 0), Number(pos.salary_max || 0)])
			.filter((salary) => salary > 0);

		if (allSalaries.length === 0) return [];

		const minSalary = Math.min(...allSalaries);
		const maxSalary = Math.max(...allSalaries);

		// Calculate range size to create 4 ranges
		const rangeSize = Math.ceil((maxSalary - minSalary) / 4);

		const ranges = [];
		let start = minSalary;

		while (start < maxSalary) {
			const end = Math.min(start + rangeSize, maxSalary);

			ranges.push({
				id: `${start}-${end}`,
				label: ` ${formatCurrency(start)} - ${formatCurrency(end)}`,
				min: start,
				max: end,
			});
			start = end + 1;
		}

		return ranges;
	};

	// Get salary ranges based on available positions
	const salaryRanges = generateSalaryRanges(jobPositions);

	return (
		<div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8 -mt-4">
			{/* Header */}
			<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Button
							size="sm"
							className="rounded-full aspect-square"
							variant="outline"
							onClick={() => router.push("/admin")}
						>
							<ArrowLeft />
						</Button>
						<div className="ml-2 mt-5">
							<h1 className="text-2xl font-bold">Job Positions / Titles</h1>
							{selectedBranch && selectedInstitution && (
								<p className="text-muted-foreground">
									Manage job positions / titles for {selectedBranch.branch_name} -{" "}
									{selectedInstitution.institution_name}
								</p>
							)}
						</div>
					</div>
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6 mt-10">
				<Card className="shadow-sm border">
					<CardContent className="p-4">
						<div className="text-2xl font-bold">{jobPositionsCount}</div>
						<p className="text-xs md:text-sm text-muted-foreground">Total Job Positions / Titles</p>
					</CardContent>
				</Card>
				<Card className="shadow-sm border">
					<CardContent className="p-4">
						<div className="text-2xl font-bold">{jobPositions.length}</div>
						<p className="text-xs md:text-sm text-muted-foreground">Results Displayed</p>
					</CardContent>
				</Card>
				<Card className="shadow-sm border">
					<CardContent className="p-4">
						<div className="text-2xl font-bold">
							{formatCurrency(
								jobPositions.reduce((sum, pos) => {
									const min = Number(pos.salary_min || 0);
									const max = Number(pos.salary_max || 0);

									return sum + (min + max) / 2; // Use average of min/max for budget calculation
								}, 0),
							)}
						</div>
						<p className="text-xs md:text-sm text-muted-foreground">Total Salary Budget</p>
					</CardContent>
				</Card>
				<Card className="shadow-sm border">
					<CardContent className="p-4">
						<div className="text-2xl font-bold">
							{formatCurrency(
								Math.round(
									jobPositions.reduce((sum, pos) => {
										const min = Number(pos.salary_min || 0);
										const max = Number(pos.salary_max || 0);

										return sum + (min + max) / 2;
									}, 0) / jobPositions.length,
								) || 0,
							)}
						</div>
						<p className="text-xs md:text-sm text-muted-foreground">Average Salary</p>
					</CardContent>
				</Card>
			</div>

			{/* Search and Filters */}
			<div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center mb-6 mt-8">
				<div className="flex flex-1 items-center gap-4">
					<div className="relative flex-1 max-w-lg">
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
						<Input
							placeholder="Search job position/titles ..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pl-10"
						/>
					</div>
					<Select value={selectedSalaryRange} onValueChange={setSelectedSalaryRange}>
						<SelectTrigger className="w-[280px]">
							<div className="flex items-center gap-2">
								<Filter className="h-4 w-4" />
								<SelectValue placeholder="Filter by salary" />
							</div>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Salary Ranges</SelectItem>
							{salaryRanges.map((range) => (
								<SelectItem className="!text-xs" key={range.id} value={range.id}>
									{range.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_JOB_POSITIONS}>
					<Button
						onClick={() => {
							router.push("/job-positions/create");
						}}
						className="flex items-center gap-2 flex-shrink-0"
					>
						<Plus className="h-4 w-4" />
						Create Job Position / Title
					</Button>
				</ProtectedComponent>
			</div>

			<JobPositionsTable
				setJobPositionsCount={setJobPositionsCount}
				searchTerm={searchTerm}
				setCurrentJobPostions={setJobPositions}
			/>
		</div>
	);
}
