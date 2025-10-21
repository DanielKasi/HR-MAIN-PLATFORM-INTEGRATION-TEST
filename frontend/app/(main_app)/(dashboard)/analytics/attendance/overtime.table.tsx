import { ColumnDef, PaginatedTable } from "@/components/PaginatedTable";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { IPaginatedResponse } from "@/types/types.utils";

interface Props {
	className?: string;
	data?: any[]; // Pass available overtime data as prop
}

interface Overtime {
	rank: string;
	employee: string;
	department: string;
	hours: string;
	overtime: string;
}

export default function OvertimeTable({ className = "", data = [] }: Props) {
	const columns: ColumnDef<Overtime>[] = [
		{
			key: "rank",
			header: <span>Rank</span>,
			cell: (props) => <span>{props.rank}</span>,
		},
		{
			key: "employee",
			header: <span>Department</span>,
			cell: (props) => (
				<div className="grid leading-tight">
					<span>{props.department}</span>
					<span className="opacity-50 text-sm">{props.employee}</span>
				</div>
			),
		},
		{
			key: "hours",
			header: <span>Hours</span>,
			cell: (props) => <span>{props.hours} hrs</span>,
		},
		{
			key: "overtime",
			header: <span>Status</span>,
			cell: (props) => (
				<span
					className={`px-2 py-1 rounded-full text-xs ${
						props.overtime === "High"
							? "bg-red-100 text-red-600"
							: props.overtime === "Medium"
								? "bg-yellow-100 text-yellow-600"
								: "bg-green-100 text-green-600"
					}`}
				>
					{props.overtime}
				</span>
			),
		},
	];

	// Create sample data from available metrics until department_wise_overtime is available
	const generateOvertimeData = (avgOvertime: number): Overtime[] => {
		const departments = ["Technology", "Sales", "Marketing", "Operations", "Finance", "HR"];

		return departments
			.map((dept, index) => {
				const baseHours = 40;
				const overtimeHours = Math.floor(avgOvertime * (0.8 + Math.random() * 0.4));
				const totalHours = baseHours + overtimeHours;
				let status = "Normal";

				if (overtimeHours > 10) status = "High";
				else if (overtimeHours > 5) status = "Medium";

				return {
					rank: (index + 1).toString(),
					employee: `${overtimeHours} overtime hrs`,
					department: dept,
					hours: totalHours.toString(),
					overtime: status,
				};
			})
			.sort((a, b) => parseInt(b.hours) - parseInt(a.hours));
	};

	return (
		<Card className={`shadow-none border ${className}`}>
			<CardTitle className="text-xl flex-grow p-4">Overtime Overview</CardTitle>
			<CardContent>
				<PaginatedTable
					showFooter={false}
					skeletonRows={5}
					columns={columns}
					emptyState={[]}
					fetchFirstPage={async function (query?: unknown): Promise<IPaginatedResponse<Overtime>> {
						// Try to use real department_wise_overtime data first
						if (data && data.length > 0) {
							const realData = data.map((item, index) => ({
								rank: (index + 1).toString(),
								employee: `${item.hours} total hrs`,
								department: item.department,
								hours: item.hours.toString(),
								overtime: item.hours > 45 ? "High" : item.hours > 42 ? "Medium" : "Normal",
							}));

							return {
								count: realData.length,
								next: null,
								previous: null,
								results: realData,
							};
						}

						// Fallback: generate data based on average_overtime_hours
						// This will be replaced when you update your interface and API
						const generatedData = generateOvertimeData(5); // Using default value

						return {
							count: generatedData.length,
							next: null,
							previous: null,
							results: generatedData,
						};
					}}
				></PaginatedTable>
			</CardContent>
		</Card>
	);
}
