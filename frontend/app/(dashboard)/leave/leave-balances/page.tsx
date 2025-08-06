"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Filter,
  User,
  Settings,
  Loader2,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  getAllLeaveBalances,
  createLeaveBalance,
  updateLeaveBalance,
  deleteLeaveBalance,
  getAllEmployees,
  getLeaveTypes,
} from "@/lib/utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { ILeaveBalance, IEmployee, ILeaveType } from "@/app/types/types.utils";
import ProtectedComponent from "@/components/ProtectedComponent";
import { PERMISSION_CODES } from "@/app/types/types.utils";
import { TableSkeleton } from "@/components/common/table-skeleton";

// Pagination constants
const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

// Define grouped employee interface
interface GroupedEmployee {
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  leaveBalances: ILeaveBalance[];
  totalAvailable: number;
  status: "good" | "low" | "overused";
}

// Color utilities
const getStatusColor = (status: "good" | "low" | "overused") => {
  switch (status) {
    case "overused":
      return "bg-red-100 text-red-800 border-red-200";
    case "low":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    default:
      return "bg-green-100 text-green-800 border-green-200";
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function LeaveBalanceComponent() {
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const router = useRouter();

  // State management
  const [data, setData] = useState<ILeaveBalance[]>([]);
  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<ILeaveType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterYear, setFilterYear] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ILeaveBalance | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<GroupedEmployee | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [formData, setFormData] = useState({
    employee: "",
    leave_type: "",
    year: new Date().getFullYear().toString(),
    allocated_days: "",
    used_days: "",
    pending_days: "",
    carried_forward_days: "",
  });

  // Calculate available days
  const calculateAvailable = (item: typeof formData) => {
    const allocated = parseFloat(item.allocated_days) || 0;
    const used = parseFloat(item.used_days) || 0;
    const pending = parseFloat(item.pending_days) || 0;
    const carriedForward = parseFloat(item.carried_forward_days) || 0;
    return allocated + carriedForward - used - pending;
  };

  // Optimized data fetching
  const fetchAllData = useCallback(
    async (showRefreshLoader = false) => {
      if (!selectedInstitution?.id) {
        setData([]);
        setEmployees([]);
        setLeaveTypes([]);
        return;
      }

      try {
        if (showRefreshLoader) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        const [balances, employeeData, types] = await Promise.all([
          getAllLeaveBalances({ institutionId: selectedInstitution.id }),
          getAllEmployees({ institutionId: selectedInstitution.id }),
          getLeaveTypes({ institutionId: selectedInstitution.id }),
        ]);

        setData(balances);
        setEmployees(employeeData);
        setLeaveTypes(types.filter((type) => type.is_active !== false));
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast.error(error.message || "Failed to load data");
        setData([]);
        setEmployees([]);
        setLeaveTypes([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedInstitution?.id]
  );

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Memoized helper functions
  const getEmployeeName = useCallback(
    (employee: any) => {
      if (typeof employee === "object" && employee?.user?.fullname) {
        return employee.user.fullname;
      }
      const emp = employees.find((emp) => emp.id === employee);
      return emp?.user?.fullname || "Unknown Employee";
    },
    [employees]
  );

 const getEmployeeCode = useCallback(
  (employee: any) => {
    if (typeof employee === "object" && employee?.employee_id !== undefined) {
      return employee.employee_id || "N/A";  // return here
    }
    const emp = employees.find((emp) => emp.id === employee);
    return emp?.employee_id || "N/A";        // and here
  },
  [employees]
);


  const getLeaveTypeName = useCallback(
    (leaveType: any) => {
      if (typeof leaveType === "object" && leaveType?.name) {
        return leaveType.name;
      }
      const type = leaveTypes.find((type) => type.id === leaveType);
      return type ? type.name : "Unknown Leave Type";
    },
    [leaveTypes]
  );

  const getEmployeeId = (employee: any) => {
    return typeof employee === "object" ? employee.id : employee;
  };

  const getLeaveTypeId = (leaveType: any) => {
    return typeof leaveType === "object" ? leaveType.id : leaveType;
  };

  // Group employees with their leave balances
  const groupedEmployees = useMemo((): GroupedEmployee[] => {
    const filtered = data.filter((item) => {
      const employeeName = getEmployeeName(item.employee);
      const employeeCode = getEmployeeCode(item.employee);
      const leaveTypeName = getLeaveTypeName(item.leave_type);

      const matchesSearch =
        !searchTerm.trim() ||
        employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
       ((employeeCode ?? '') as string).toLowerCase().includes(searchTerm.toLowerCase())
        leaveTypeName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === "all" || leaveTypeName === filterType;
      const matchesYear = filterYear === "all" || item.year.toString() === filterYear;
      return matchesSearch && matchesType && matchesYear;
    });

    const grouped = new Map<number, GroupedEmployee>();

    filtered.forEach((item) => {
      const employeeId = getEmployeeId(item.employee);
      const employeeName = getEmployeeName(item.employee);
      const employeeCode = getEmployeeCode(item.employee);

      if (!grouped.has(employeeId)) {
        grouped.set(employeeId, {
          employeeId,
          employeeName,
          employeeCode,
          leaveBalances: [],
          totalAvailable: 0,
          status: "good",
        });
      }

      const group = grouped.get(employeeId)!;
      group.leaveBalances.push(item);
    });

    return Array.from(grouped.values()).map((group) => {
      const totalAvailable = group.leaveBalances.reduce((sum, balance) => {
        const available = typeof balance.available_days === "string"
          ? parseFloat(balance.available_days)
          : balance.available_days || 0;
        return sum + available;
      }, 0);

      let status: "good" | "low" | "overused" = "good";
      if (totalAvailable < 0) {
        status = "overused";
      } else if (totalAvailable <= 5) {
        status = "low";
      }

      return {
        ...group,
        totalAvailable,
        status,
      };
    });
  }, [data, searchTerm, filterType, filterYear, getEmployeeName, getEmployeeCode, getLeaveTypeName]);

  // Stats calculations
  const totalEmployees = useMemo(() => groupedEmployees.length, [groupedEmployees]);
  const lowBalanceEmployees = useMemo(
    () => groupedEmployees.filter((g) => g.status === "low").length,
    [groupedEmployees]
  );
  const overusedBalanceEmployees = useMemo(
    () => groupedEmployees.filter((g) => g.status === "overused").length,
    [groupedEmployees]
  );
  const totalLeaveTypes = useMemo(
    () => new Set(groupedEmployees.flatMap((g) => g.leaveBalances.map((b) => getLeaveTypeId(b.leave_type)))).size,
    [groupedEmployees, getLeaveTypeId]
  );

  // Pagination
  const totalPages = Math.ceil(groupedEmployees.length / pageSize);
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    return groupedEmployees.slice(start, end);
  }, [groupedEmployees, currentPage, pageSize]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(parseInt(newPageSize));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterType("all");
    setFilterYear("all");
    setCurrentPage(1);
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInstitution?.id) {
      toast.error("Institution not selected");
      return;
    }

    if (!formData.employee || !formData.leave_type || !formData.year) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
     const leaveBalanceData: Partial<ILeaveBalance> = {
      employee: parseInt(formData.employee),
      leave_type: parseInt(formData.leave_type),
      year: parseInt(formData.year),
      institution: selectedInstitution.id,
      allocated_days: (parseFloat(formData.allocated_days) || 0).toString(),
      used_days: (parseFloat(formData.used_days) || 0).toString(),
      pending_days: (parseFloat(formData.pending_days) || 0).toString(),
      carried_forward_days: (parseFloat(formData.carried_forward_days) || 0).toString(),
    };

      if (editingItem) {
        const updatedBalance = await updateLeaveBalance({
          id: editingItem.id,
          leaveBalanceData,
        });
        if (updatedBalance) {
          setData((prev) =>
            prev.map((item) =>
              item.id === editingItem.id ? { ...item, ...updatedBalance } : item
            )
          );
          toast.success("Leave balance updated successfully");
        } else {
          toast.error("Failed to update leave balance");
        }
      } else {
        const newBalance = await createLeaveBalance({
          institutionId: selectedInstitution.id,
          leaveBalanceData,
        });
        if (newBalance) {
          setData((prev) => [...prev, newBalance]);
          toast.success("Leave balance created successfully");
        } else {
          toast.error("Failed to create leave balance");
        }
      }

      setFormData({
        employee: "",
        leave_type: "",
        year: new Date().getFullYear().toString(),
        allocated_days: "",
        used_days: "",
        pending_days: "",
        carried_forward_days: "",
      });
      setEditingItem(null);
      setIsAddDialogOpen(false);
      setIsEditDialogOpen(false);
    } catch (error: any) {
      console.error("Error saving leave balance:", error);
      toast.error(error.message || "Failed to save leave balance");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle view
  const handleView = (employeeId: number) => {
    toast.loading("Loading employee details...", { id: `loading-${employeeId}` });
    router.push(`/leave/leave-balances/${employeeId}`);
  };

  // Handle edit
  const handleEdit = (group: GroupedEmployee) => {
    const firstBalance = group.leaveBalances[0];
    if (firstBalance) {
      setEditingItem(firstBalance);
      setFormData({
        employee: getEmployeeId(firstBalance.employee).toString(),
        leave_type: getLeaveTypeId(firstBalance.leave_type).toString(),
        year: firstBalance.year.toString(),
        allocated_days: firstBalance.allocated_days.toString(),
        used_days: firstBalance.used_days.toString(),
        pending_days: firstBalance.pending_days.toString(),
        carried_forward_days: firstBalance.carried_forward_days.toString(),
      });
      setIsEditDialogOpen(true);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deletingEmployee) return;

    setIsSubmitting(true);
    try {
      await Promise.all(
        deletingEmployee.leaveBalances.map((balance) =>
          deleteLeaveBalance({ id: balance.id })
        )
      );
      setData((prev) =>
        prev.filter((item) => getEmployeeId(item.employee) !== deletingEmployee.employeeId)
      );
      toast.success("Leave balances deleted successfully");
      setIsDeleteDialogOpen(false);
      setDeletingEmployee(null);
    } catch (error: any) {
      console.error("Error deleting leave balances:", error);
      toast.error(error.message || "Failed to delete leave balances");
      await fetchAllData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = () => {
    fetchAllData(true);
    setCurrentPage(1);
  };

  // Get unique years and leave types
  const availableYears = useMemo(() => {
    const years = new Set<number>(data.map((item) => item.year));
    return Array.from(years).sort((a, b) => b - a);
  }, [data]);

  const uniqueLeaveTypes = useMemo(() => {
    const types = new Set<string>(
      data
        .map((item) => getLeaveTypeName(item.leave_type))
        .filter((type) => type !== "Unknown Leave Type")
    );
    return Array.from(types);
  }, [data, getLeaveTypeName]);

  // Set default filter year to the most recent year
  useEffect(() => {
    if (availableYears.length > 0 && filterYear === "all") {
      setFilterYear(availableYears[0].toString());
    }
  }, [availableYears, filterYear]);

  if (!selectedInstitution?.id) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4 text-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin"></div>
            <Settings className="w-6 h-6 text-orange-500 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-800">No Institution Selected</h3>
            <p className="text-gray-600">Please select an institution to manage leave balances.</p>
          </div>
        </div>
      </div>
    );
  }


    if (isLoading) {
      return (
        <div className="p-2 space-y-6">
          <Card className="h-[calc(100vh-2rem)] shadow-lg">
            <CardHeader className="border-b">
              <div className="flex justify-between gap-8 items-center">
                <div className="flex items-center justify-start gap-4">
                  <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-6 bg-gray-200 rounded w-64 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-10 w-36 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-10 w-28 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            </CardHeader>
            <TableSkeleton rows={10} columns={8} />
          </Card>
        </div>
      )
    }

  return (
    <div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Leave Balances</h1>
          <p className="text-muted-foreground">
            Manage employee leave balances for {selectedInstitution?.institution_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_LEAVE_BALANCES}>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                {/* <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Leave Balance
                </Button> */}
              </DialogTrigger>
              <DialogContent className="sm:max-w-[650px] rounded-2xl border-0 shadow-2xl">
                <DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
                  <DialogTitle className="text-2xl font-bold text-gray-900">
                    Add Leave Balance
                  </DialogTitle>
                  <DialogDescription className="text-gray-600 text-base">
                    Create a new leave balance record for an employee.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
                  <div className="space-y-3">
                    <Label htmlFor="employee" className="text-sm font-semibold text-gray-800">
                      Employee *
                    </Label>
                    <Select
                      value={formData.employee}
                      onValueChange={(value) => setFormData({ ...formData, employee: value })}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id.toString()}>
                            {employee.user?.fullname || "Unknown Employee"} ({employee.employee_id || "N/A"})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="leave_type" className="text-sm font-semibold text-gray-800">
                      Leave Type *
                    </Label>
                    <Select
                      value={formData.leave_type}
                      onValueChange={(value) => setFormData({ ...formData, leave_type: value })}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                      <SelectContent>
                        {leaveTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            {type.name} ({type.max_days_per_year} days/year)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="year" className="text-sm font-semibold text-gray-800">
                      Year *
                    </Label>
                    <Select
                      value={formData.year}
                      onValueChange={(value) => setFormData({ ...formData, year: value })}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className="h-12 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableYears.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="allocated_days" className="text-sm font-semibold text-gray-800">
                      Allocated Days
                    </Label>
                    <Input
                      id="allocated_days"
                      type="number"
                      step="0.01"
                      value={formData.allocated_days}
                      onChange={(e) => setFormData({ ...formData, allocated_days: e.target.value })}
                      placeholder="e.g., 21"
                      disabled={isSubmitting}
                      className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="used_days" className="text-sm font-semibold text-gray-800">
                      Used Days
                    </Label>
                    <Input
                      id="used_days"
                      type="number"
                      step="0.01"
                      value={formData.used_days}
                      onChange={(e) => setFormData({ ...formData, used_days: e.target.value })}
                      placeholder="e.g., 5"
                      disabled={isSubmitting}
                      className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="pending_days" className="text-sm font-semibold text-gray-800">
                      Pending Days
                    </Label>
                    <Input
                      id="pending_days"
                      type="number"
                      step="0.01"
                      value={formData.pending_days}
                      onChange={(e) => setFormData({ ...formData, pending_days: e.target.value })}
                      placeholder="e.g., 2"
                      disabled={isSubmitting}
                      className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="carried_forward_days" className="text-sm font-semibold text-gray-800">
                      Carried Forward Days
                    </Label>
                    <Input
                      id="carried_forward_days"
                      type="number"
                      step="0.01"
                      value={formData.carried_forward_days}
                      onChange={(e) => setFormData({ ...formData, carried_forward_days: e.target.value })}
                      placeholder="e.g., 3"
                      disabled={isSubmitting}
                      className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
                    />
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 md:col-span-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-800">Available Days:</span>
                      <span className="text-lg font-bold text-orange-600">{calculateAvailable(formData)}</span>
                    </div>
                  </div>
                </form>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Leave Balance"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </ProtectedComponent>
        </div>
      </div>

        {/* Stats Cards */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-8">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{totalEmployees}</div>
              <p className="text-xs text-muted-foreground">Total Employees</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{totalLeaveTypes}</div>
              <p className="text-xs text-muted-foreground">Leave Types</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-yellow-600">{lowBalanceEmployees}</div>
              <p className="text-xs text-muted-foreground">Low Balances</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{overusedBalanceEmployees}</div>
              <p className="text-xs text-muted-foreground">Overused Balances</p>
            </CardContent>
          </Card>
        </div>
      )}


      {/* Search and Filters */}
<div className="flex flex-wrap items-center justify-between gap-2 mt-12">
  {/* Search Bar */}
  <div className="relative w-full sm:w-[450px]">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
    <Input
      placeholder="Search by name, employee code, or leave type..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      className="pl-10 h-10 text-sm"
    />
  </div>

  {/* Filters + Rows per Page */}
  <div className="flex flex-wrap justify-center items-center gap-4 mx-auto">
    {/* Leave Type Filter */}
    <Select value={filterType} onValueChange={setFilterType}>
      <SelectTrigger className="w-[180px] h-10 text-sm px-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <SelectValue placeholder="Leave type" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Leave Types</SelectItem>
        {uniqueLeaveTypes.map((type) => (
          <SelectItem key={type} value={type}>
            {type}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    {/* Year Filter */}
    <Select value={filterYear} onValueChange={setFilterYear}>
      <SelectTrigger className="w-[140px] h-10 text-sm px-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <SelectValue placeholder="Year" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Years</SelectItem>
        {availableYears.map((year) => (
          <SelectItem key={year} value={year.toString()}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    {/* Rows per Page */}
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Rows per page:</span>
      <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
        <SelectTrigger className="w-[70px] h-8 text-sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAGE_SIZES.map((size) => (
            <SelectItem key={size} value={size.toString()}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  </div>
</div>
 
    
    
      {/* Leave Balances Table */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-full h-12 bg-muted/10 rounded-md animate-pulse" />
          ))}
        </div>
      ) : groupedEmployees.length === 0 ? (
        <div className="p-12 text-center">
          <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No leave balances found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || filterType !== "all" || filterYear !== "all"
              ? "No leave balances match your filter criteria."
              : "Get started by creating your first leave balance."}
          </p>
          {searchTerm || filterType !== "all" || filterYear !== "all" ? (
            <Button onClick={clearFilters} variant="outline" className="flex items-center gap-2">
              //Clear Filters
            </Button>
          ) : (
            <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_LEAVE_BALANCES}>
              <Button onClick={() => setIsAddDialogOpen(true)} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create First Leave Balance
              </Button>
            </ProtectedComponent>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto mt-10">
         <Table className="min-w-[800px] [&_th]:border-0 [&_td]:border-0">
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead className="text-center">Leave Types</TableHead>
                <TableHead className="text-center">Total Available</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedEmployees.map((group) => (
                <TableRow key={group.employeeId}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded-full ${
                          group.status === "good"
                            ? "bg-green-50"
                            : group.status === "low"
                            ? "bg-yellow-50"
                            : "bg-red-50"
                        } flex items-center justify-center`}
                      >
                        <User
                          className={`h-4 w-4 ${
                            group.status === "good"
                              ? "text-green-600"
                              : group.status === "low"
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        />
                      </div>
                      <div>
                        <div className="font-medium">{group.employeeName}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                      {group.leaveBalances.length} {group.leaveBalances.length === 1 ? "Type" : "Types"}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={`text-center font-bold text-lg ${
                      group.status === "overused"
                        ? "text-red-600"
                        : group.status === "low"
                        ? "text-yellow-600"
                        : "text-green-600"
                    }`}
                  >
                    {group.totalAvailable}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={getStatusColor(group.status)}>
                      {group.status.charAt(0).toUpperCase() + group.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {formatDate(
                      group.leaveBalances.reduce((latest, balance) =>
                        new Date(balance.updated_at) > new Date(latest.updated_at) ? balance : latest
                      ).updated_at
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleView(group.employeeId)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </DropdownMenuItem>
                        <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_LEAVE_BALANCES}>
                          {/* <DropdownMenuItem onClick={() => handleEdit(group)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem> */}
                          <DropdownMenuItem
                            onClick={() => {
                              setDeletingEmployee(group);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </ProtectedComponent>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}


      {/* Results Summary */}
      {!isLoading && (
        <div className="text-sm text-muted-foreground">
          Showing {groupedEmployees.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
          {Math.min(currentPage * pageSize, groupedEmployees.length)} of {groupedEmployees.length} employees
          {(searchTerm || filterType !== "all" || filterYear !== "all") &&
            ` (filtered from ${new Set(data.map((item) => getEmployeeId(item.employee))).size} total)`}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
            First
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Select
            value={currentPage.toString()}
            onValueChange={(value) => handlePageChange(parseInt(value))}
          >
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <SelectItem key={page} value={page.toString()}>
                  {page}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            Last
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_LEAVE_BALANCES}>
        <Dialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              setEditingItem(null);
              setFormData({
                employee: "",
                leave_type: "",
                year: new Date().getFullYear().toString(),
                allocated_days: "",
                used_days: "",
                pending_days: "",
                carried_forward_days: "",
              });
            }
          }}
        >
          <DialogContent className="sm:max-w-[650px] rounded-2xl border-0 shadow-2xl">
            <DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
              <DialogTitle className="text-2xl font-bold text-gray-900">
                Edit Leave Balance
              </DialogTitle>
              <DialogDescription className="text-gray-600 text-base">
                Update the leave balance record for the selected employee.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6">
              <div className="space-y-3">
                <Label htmlFor="edit-employee" className="text-sm font-semibold text-gray-800">
                  Employee *
                </Label>
                <Select
                  value={formData.employee}
                  onValueChange={(value) => setFormData({ ...formData, employee: value })}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id.toString()}>
                        {employee.user?.fullname || "Unknown Employee"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label htmlFor="edit-leave_type" className="text-sm font-semibold text-gray-800">
                  Leave Type *
                </Label>
                <Select
                  value={formData.leave_type}
                  onValueChange={(value) => setFormData({ ...formData, leave_type: value })}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id.toString()}>
                        {type.name} ({type.max_days_per_year} days/year)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label htmlFor="edit-year" className="text-sm font-semibold text-gray-800">
                  Year *
                </Label>
                <Select
                  value={formData.year}
                  onValueChange={(value) => setFormData({ ...formData, year: value })}
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label htmlFor="edit-allocated_days" className="text-sm font-semibold text-gray-800">
                  Allocated Days
                </Label>
                <Input
                  id="edit-allocated_days"
                  type="number"
                  step="0.01"
                  value={formData.allocated_days}
                  onChange={(e) => setFormData({ ...formData, allocated_days: e.target.value })}
                  placeholder="e.g., 21"
                  disabled={isSubmitting}
                  className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="edit-used_days" className="text-sm font-semibold text-gray-800">
                  Used Days
                </Label>
                <Input
                  id="edit-used_days"
                  type="number"
                  step="0.01"
                  value={formData.used_days}
                  onChange={(e) => setFormData({ ...formData, used_days: e.target.value })}
                  placeholder="e.g., 5"
                  disabled={isSubmitting}
                  className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="edit-pending_days" className="text-sm font-semibold text-gray-800">
                  Pending Days
                </Label>
                <Input
                  id="edit-pending_days"
                  type="number"
                  step="0.01"
                  value={formData.pending_days}
                  onChange={(e) => setFormData({ ...formData, pending_days: e.target.value })}
                  placeholder="e.g., 2"
                  disabled={isSubmitting}
                  className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="edit-carried_forward_days" className="text-sm font-semibold text-gray-800">
                  Carried Forward Days
                </Label>
                <Input
                  id="edit-carried_forward_days"
                  type="number"
                  step="0.01"
                  value={formData.carried_forward_days}
                  onChange={(e) => setFormData({ ...formData, carried_forward_days: e.target.value })}
                  placeholder="e.g., 3"
                  disabled={isSubmitting}
                  className="h-12 rounded-xl border-gray-200 focus:border-orange-500 focus:ring-orange-500/20 text-base"
                />
              </div>
              <div className="bg-gray-50 rounded-xl p-4 md:col-span-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold text-gray-800">Available Days:</span>
                  <span className="text-lg font-bold text-orange-600">{calculateAvailable(formData)}</span>
                </div>
              </div>
            </form>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Leave Balance"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ProtectedComponent>

      {/* Delete Confirmation Dialog */}
      <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_LEAVE_BALANCES}>
        <Dialog
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            setIsDeleteDialogOpen(open);
            if (!open) {
              setDeletingEmployee(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-[500px] rounded-2xl border-0 shadow-2xl">
            <DialogHeader className="space-y-4 pb-6">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>
              <DialogTitle className="text-2xl font-bold text-gray-900 text-center">
                Delete Leave Balances
              </DialogTitle>
              <DialogDescription className="text-gray-600 text-center text-base leading-relaxed">
                Are you sure you want to delete all leave balance records for{" "}
                <span className="font-semibold text-gray-900">"{deletingEmployee?.employeeName}"</span>? This action
                cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  "Delete Permanently"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </ProtectedComponent>
    </div>
  );
}
