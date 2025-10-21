import { ColumnDef, PaginatedTable } from "@/components/PaginatedTable";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { IPaginatedResponse } from "@/types/types.utils";
// import { getPayrollTableData } from "@/lib/utils";

interface Props {
	className?: string;
}

interface Payroll {
	pay_period: string;
	total_paid: string;
	total_employees: number;
	status: string;
	pay_date: string;
}

export default function PayrollTable({ className = "" }: Props) {
	const columns: ColumnDef<Payroll>[] = [
		{
			key: "pay_period",
			header: <span>Pay Period</span>,
			cell: (props) => <span>{props.pay_period}</span>,
		},
		{
			key: "total_paid",
			header: <span>Total Paid</span>,
			cell: (props) => <span>{props.total_paid}</span>,
		},
		{
			key: "total_employees",
			header: <span>No Employees</span>,
			cell: (props) => <span>{props.total_employees}</span>,
		},
		{
			key: "status",
			header: <span>Status</span>,
			cell: (props) => (
				<span className="bg-green-100 text-green-500 rounded-xl px-2.5 py-1">{props.status}</span>
			),
		},
		{
			key: "Pay Date",
			header: <span>Pay Date</span>,
			cell: (props) => <span>{props.pay_date}</span>,
		},
	];
	return (
		<Card className={`shadow-none border ${className}`}>
			<CardTitle className="text-xl flex-grow p-4">Payroll Employees</CardTitle>
			<CardContent>
				<PaginatedTable
					showFooter={false}
					skeletonRows={5}
					columns={columns}
					emptyState={[]}
					fetchFirstPage={function (query?: unknown): Promise<IPaginatedResponse<Payroll>> {
						return Promise.resolve({
							count: 20,
							next: "21",
							previous: "0",
							results: new Array(5).fill(null).map(() => ({
								pay_period: "Jul - Aug 2025",
								total_paid: "19,000,000",
								total_employees: 23,
								status: "Processed",
								pay_date: "Aug 24, 2025",
							})),
						});
					}}
				></PaginatedTable>
			</CardContent>
		</Card>
	);
}
