"use client";

import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { User, Calendar, Edit, ArrowLeft, Trash2 } from "lucide-react";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import {
	getAllLeaveBalances,
	updateLeaveBalance,
	createLeaveBalance,
	deleteLeaveBalance,
} from "@/lib/utils";
import { getPaginatedEmployees, getLeaveTypes } from "@/lib/utils";
import { IEmployee, ILeaveBalance, ILeaveType } from "@/types/types.utils";
import { toast } from "sonner";

const years = [2023, 2024, 2025, 2026];

export default function EmployeeLeaveBalanceDetails() {
	const params = useParams();
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const router = useRouter();

	const employeeId = params?.employeeId as string;

	const [employeeLeaveBalances, setEmployeeLeaveBalances] = useState<ILeaveBalance[]>([]);
	const [employee, setEmployee] = useState<IEmployee | null>(null);
	const [employees, setEmployees] = useState<IEmployee[]>([]);
	const [leaveTypes, setLeaveTypes] = useState<ILeaveType[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<ILeaveBalance | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [dataFetched, setDataFetched] = useState(false);
	const [debugInfo, setDebugInfo] = useState<string>("");

	const [formData, setFormData] = useState({
		employee: "",
		leave_type: "",
		year: new Date().getFullYear(),
		allocated_days: "",
		used_days: "",
		pending_days: "",
		carried_forward_days: "",
	});

	const employeeIdNum = useMemo(() => {
		if (!employeeId) {
			setDebugInfo("No employeeId found in URL parameters");
			return null;
		}
		const id = parseInt(employeeId);
		if (isNaN(id)) {
			setDebugInfo(`Invalid employeeId: "${employeeId}" - not a number`);
			return null;
		}
		setDebugInfo(`Valid employeeId: ${id}`);
		return id;
	}, [employeeId]);

	useEffect(() => {
		const fetchAllData = async () => {
			if (!selectedInstitution?.id) {
				setDebugInfo("No institution selected");
				setIsLoading(false);
				return;
			}

			if (!employeeId) {
				setDebugInfo("No employeeId in URL");
				setIsLoading(false);
				return;
			}

			if (!employeeIdNum) {
				setDebugInfo(`Invalid employeeId: ${employeeId}`);
				setIsLoading(false);
				return;
			}

			if (dataFetched) {
				setDebugInfo("Data already fetched");
				return;
			}

			setDebugInfo("Starting data fetch...");
			setIsLoading(true);

			try {
				const [allBalances, allEmployees, allLeaveTypes] = await Promise.all([
					getAllLeaveBalances({ institutionId: selectedInstitution.id }),
					getPaginatedEmployees({ institutionId: selectedInstitution.id }),
					getLeaveTypes({ institutionId: selectedInstitution.id }),
				]);

				setEmployees(allEmployees.results || []);
				setLeaveTypes(allLeaveTypes || []);

				const foundEmployee = allEmployees.results?.find((emp) => emp.id === employeeIdNum);

				setEmployee(foundEmployee || null);

				const employeeBalances =
					allBalances?.filter((balance) => {
						const balanceEmployeeId =
							typeof balance.employee === "object" ? balance.employee.id : balance.employee;
						return balanceEmployeeId === employeeIdNum;
					}) || [];

				setEmployeeLeaveBalances(employeeBalances);

				if (!foundEmployee && employeeBalances.length > 0) {
					const firstBalance = employeeBalances[0];
					if (typeof firstBalance.employee === "object") {
						setEmployee(firstBalance.employee as any);
						setDebugInfo("Employee found from balance data");
					}
				}

				setDataFetched(true);
				setDebugInfo(
					`Data loaded successfully. Employee: ${foundEmployee?.user?.fullname || "Not found"}`,
				);

				toast.dismiss(`loading-${employeeIdNum}`);
			} catch (error) {
				setDebugInfo(
					`Error fetching data: ${error instanceof Error ? error.message : "Unknown error"}`,
				);
				toast.error("Failed to load employee data");
				toast.dismiss(`loading-${employeeIdNum}`);
			} finally {
				setIsLoading(false);
			}
		};

		fetchAllData();
	}, [selectedInstitution?.id, employeeId, employeeIdNum, dataFetched]);

	const getEmployeeName = (employee: any) => {
		if (typeof employee === "object" && employee?.user?.fullname) {
			return employee.user.fullname;
		}
		const emp = employees.find((emp) => emp.id === employee);
		return emp?.user?.fullname || "Unknown Employee";
	};

	const getEmployeeCode = (employee: any) => {
		if (typeof employee === "object" && employee?.employee_id !== undefined) {
			return employee.employee_id;
		}
		const emp = employees.find((emp) => emp.id === employee);
		//return emp?.employee_id || "N/A";
	};

	const getLeaveTypeName = (leaveType: any) => {
		if (typeof leaveType === "object" && leaveType?.name) {
			return leaveType.name;
		}
		const type = leaveTypes.find((type) => type.id === leaveType);
		return type ? type.name : "Unknown Leave Type";
	};

	const getStatusBadge = (available: string | number) => {
		const availableNum = typeof available === "string" ? parseFloat(available) : available;
		if (availableNum < 0) {
			return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Overused</Badge>;
		} else if (availableNum <= 3) {
			return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Low</Badge>;
		} else {
			return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Good</Badge>;
		}
	};

	const getStatusColor = (available: string | number) => {
		const availableNum = typeof available === "string" ? parseFloat(available) : available;
		if (availableNum < 0) return "text-red-600";
		if (availableNum <= 3) return "text-yellow-600";
		return "text-green-600";
	};

	const calculateAvailable = (item: typeof formData) => {
		const allocated = parseFloat(item.allocated_days) || 0;
		const used = parseFloat(item.used_days) || 0;
		const pending = parseFloat(item.pending_days) || 0;
		const carriedForward = parseFloat(item.carried_forward_days) || 0;
		return allocated + carriedForward - used - pending;
	};

	const totalAvailable = useMemo(() => {
		return employeeLeaveBalances.reduce((total, balance) => {
			const available =
				typeof balance.available_days === "string"
					? parseFloat(balance.available_days)
					: balance.available_days;
			return total + (isNaN(available) ? 0 : available);
		}, 0);
	}, [employeeLeaveBalances]);

	return (
		<div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
			<div className="flex items-center justify-between">
				<Button
					variant="outline"
					size="sm"
					onClick={() => router.push("../leave-balances")}
					className="rounded-full aspect-square"
				>
					<ArrowLeft className="w-4 h-4 mr-2" />
				</Button>
				<div className="flex items-center gap-2">
					<h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
						{employee?.user?.fullname || "Employee"} - Leave Balances
					</h1>
				</div>
			</div>

			<Card className="mt-6">
				<CardHeader>
					<CardTitle className="text-gray-900 flex items-center gap-2">
						<User className="w-5 h-5" />
						Employee Summary
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
						<div className="bg-gray-50 p-4 rounded-lg">
							<h3 className="font-semibold text-gray-900 mb-2">Employee Information</h3>
							<div className="space-y-1">
								<p className="text-sm text-gray-600">Name: {employee?.user?.fullname}</p>
							</div>
						</div>

						<div className="bg-blue-50 p-4 rounded-lg text-center">
							<p className="text-sm text-blue-600 font-medium">Leave Types</p>
							<p className="text-2xl font-bold text-blue-700">{employeeLeaveBalances.length}</p>
						</div>

						<div className="bg-green-50 p-4 rounded-lg text-center">
							<p className="text-sm text-green-600 font-medium">Total Available</p>
							<p className={`text-2xl font-bold ${getStatusColor(totalAvailable)}`}>
								{totalAvailable.toFixed(1)}
							</p>
						</div>

						<div className="bg-orange-50 p-4 rounded-lg text-center">
							<p className="text-sm text-myOrange font-medium">Overall Status</p>
							<div className="mt-2">{getStatusBadge(totalAvailable)}</div>
						</div>
					</div>
				</CardContent>
			</Card>

			<div className="mt-8">
				<CardHeader className="border-b">
					<CardTitle className="text-orange-900 flex items-center gap-2">
						<Calendar className="w-5 h-5" />
						Leave Balance Details
					</CardTitle>
				</CardHeader>
				<CardContent className="p-0">
					{employeeLeaveBalances.length > 0 ? (
						<Table>
							<TableHeader>
								<TableRow className="hover:bg-gray-50">
									<TableHead className="font-semibold text-gray-900">Leave Type</TableHead>
									<TableHead className="font-semibold text-gray-900 text-center">Year</TableHead>
									<TableHead className="font-semibold text-gray-900 text-center">
										Allocated
									</TableHead>
									<TableHead className="font-semibold text-gray-900 text-center">Used</TableHead>
									<TableHead className="font-semibold text-gray-900 text-center">Pending</TableHead>
									<TableHead className="font-semibold text-gray-900 text-center">Carried</TableHead>
									<TableHead className="font-semibold text-gray-900 text-center">
										Available
									</TableHead>
									<TableHead className="font-semibold text-gray-900 text-center">Status</TableHead>
									<TableHead className="font-semibold text-gray-900 text-center">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{employeeLeaveBalances.map((item) => (
									<TableRow key={item.id} className="hover:bg-orange-50">
										<TableCell>
											<div className="flex items-center gap-2">
												<Calendar className="w-4 h-4 text-orange-500" />
												<span className="font-medium">{getLeaveTypeName(item.leave_type)}</span>
											</div>
										</TableCell>
										<TableCell className="text-center font-medium">{item.year}</TableCell>
										<TableCell className="text-center font-medium text-blue-600">
											{item.allocated_days}
										</TableCell>
										<TableCell className="text-center font-medium text-green-600">
											{item.used_days}
										</TableCell>
										<TableCell className="text-center font-medium text-myOrange">
											{item.pending_days}
										</TableCell>
										<TableCell className="text-center font-medium text-purple-600">
											{item.carried_forward_days}
										</TableCell>
										<TableCell
											className={`text-center font-bold ${getStatusColor(item.available_days)}`}
										>
											{item.available_days}
										</TableCell>
										<TableCell className="text-center">
											{getStatusBadge(item.available_days)}
										</TableCell>
										<TableCell className="text-center">
											<div className="flex items-center justify-center gap-1">
												<Button
													variant="ghost"
													size="sm"
													className="h-8 w-8 p-0 hover:bg-orange-100"
													title="Edit Record"
												>
													<Edit className="w-4 h-4 text-gray-600" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													className="h-8 w-8 p-0 hover:bg-orange-100"
													title="Delete Record"
												>
													<Trash2 className="w-4 h-4 text-gray-600" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					) : (
						<div className="text-center py-12">
							<Calendar className="w-12 h-12 text-orange-300 mx-auto mb-4" />
							<h3 className="text-lg font-semibold text-gray-900 mb-2">No Leave Balances Found</h3>
							<p className="text-gray-600">
								This employee doesn't have any leave balance records yet.
							</p>
						</div>
					)}
				</CardContent>
			</div>
		</div>
	);
}
