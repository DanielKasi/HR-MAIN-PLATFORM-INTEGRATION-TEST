"use client";

import { useRef, useState } from "react";
import { ChevronDown, Edit, Eye, MoreVertical, Plus, Search, Trash2, Upload, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type IEmployee, type IEmployeeFormData, PERMISSION_CODES } from "@/types/types.utils";
import { BulkUploadEmployeesDialog } from "@/components/dialogs/bulk-upload-employees-dialog";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import { getPaginatedEmployees, getPaginatedEmployeesFromUrl } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ProtectedComponent from "@/components/ProtectedComponent";
import {
  AlertDialogHeader, AlertDialogFooter, AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRouter } from "next/navigation";

const getFullName = (employee: IEmployee) => {
  return employee.user?.fullname || "Unknown Employee";
};

const getDepartmentName = (employee: IEmployee) => {
  if (employee.department && employee.department.name) {
    return employee.department.name;
  }
  return "Unknown Department";
};

const getPositionName = (employee: IEmployee) => {
  if (employee.position && employee.position.name) {
    return employee.position.name;
  }
  return "Unknown Position";
};

interface EmployeesTableProps {
  onDelete: (id: number, refreshCallback?: () => void) => void;
  isBulkUploadDialogOpen: boolean;
  setIsBulkUploadDialogOpen: (open: boolean) => void;
  selectedInstitution: { id: number } | null;
}

export function EmployeesTable({
  onDelete,
  isBulkUploadDialogOpen,
  setIsBulkUploadDialogOpen,
  selectedInstitution,
}: EmployeesTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [employeeToDelete, setEmployeeToDelete] = useState<IEmployee | null>(null);
  const refreshFunctionRef = useRef<(() => void) | null>(null);

  const clearFilters = () => {
    setSearchTerm("");
    setDepartmentFilter("all");
    setStatusFilter("all");
  };

  const router = useRouter();

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Active</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Inactive</Badge>
    );
  };

  return (
    <div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8 min-h-screen">
      <CardHeader className="space-y-4">
        <CardTitle className="flex flex-row items-center justify-between gap-4">
          <h1 className="text-xl md:text-2xl font-bold">Employees</h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="">
                <Plus className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Add Employee</span>
                <UserPlus className="md:hidden" />
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push("/employees/add-employee")}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Single Employee
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsBulkUploadDialogOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Bulk Upload Employees
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardTitle>

        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center mt-12">
          <div className="relative w-full md:max-w-lg lg:max-w-xl ">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search employees, departments, positions, or emails..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 flex-1 lg:flex-[0.4]">
            <div className="flex flex-col sm:flex-row gap-3 flex-1">

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[140px] lg:w-[160px] text-xs sm:text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(searchTerm || departmentFilter !== "all" || statusFilter !== "all") && (
              <Button
                variant="outline"
                onClick={clearFilters}
                className="flex items-center gap-2 w-full sm:w-auto text-xs sm:text-sm bg-transparent"
              >
                Clear Filters
              </Button>
            )}
          </div>

          {/* Add Employee Dropdown */}
          <div className="flex-shrink-0 lg:flex-[0.2]">

          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 sm:p-6">
        <PaginatedTableWrapper<IEmployee>
          fetchFirstPage={async () => {
            if (!selectedInstitution) throw new Error("No institution selected");
            return await getPaginatedEmployees({
              institutionId: selectedInstitution.id,
              page: 1,
              search: searchTerm || undefined,
            });
          }}
          fetchFromUrl={getPaginatedEmployeesFromUrl}
          deps={[selectedInstitution?.id, searchTerm]}
          className="space-y-4"
          footerClassName="pt-4"
        >
          {({ data, loading, refresh }) => {

            refreshFunctionRef.current = refresh

            const filtered =
              data?.results.filter((employee) => {
                const departmentName = getDepartmentName(employee);
                const matchesDepartment =
                  departmentFilter === "all" || departmentName === departmentFilter;
                const matchesStatus =
                  statusFilter === "all" ||
                  (statusFilter === "active" && employee.is_active) ||
                  (statusFilter === "inactive" && !employee.is_active);

                return matchesDepartment && matchesStatus;
              }) || [];

            if (loading) {
              return <TableSkeleton rows={data?.results.length || 10} columns={6} />;
            }

            return (
              <>
                <div className="w-full max-w-full overflow-x-auto bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <p className="text-muted-foreground mb-4">No employees found</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map((employee) => (
                          <TableRow key={employee.id}>
                            <TableCell>{getFullName(employee)}</TableCell>
                            <TableCell>{employee.email}</TableCell>
                            <TableCell>{getDepartmentName(employee)}</TableCell>
                            <TableCell>{getPositionName(employee)}</TableCell>
                            <TableCell>{getStatusBadge(employee.is_active)}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  <DropdownMenuItem>
                                    <Link
                                      className="text-xs flex items-center justify-start"
                                      href={`/employees/profile/${employee.id}`}
                                    >
                                      <Eye className="h-4 w-4 mr-2" /> View Details
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <ProtectedComponent
                                      permissionCode={PERMISSION_CODES.CAN_EDIT_EMPLOYEES}
                                    >
                                      <Link
                                        className="text-xs flex items-center justify-start"
                                        href={`/employees/update-employee/${employee.id}`}
                                      >
                                        <Edit className="h-4 w-4 mr-2" /> Edit
                                      </Link>
                                    </ProtectedComponent>
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => setEmployeeToDelete(employee)}
                                    className="text-red-600"
                                  >
                                    <span className="text-red-600 hover:text-red-700 text-xs w-full flex items-center">
                                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                                    </span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                {employeeToDelete && (
                  <AlertDialog
                    open={!!employeeToDelete}
                    onOpenChange={(open) => {
                      if (!open) setEmployeeToDelete(null);
                    }}
                  >
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Employee</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {getFullName(employeeToDelete)}? This action cannot
                          be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setEmployeeToDelete(null)}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => employeeToDelete.id && onDelete(employeeToDelete.id, refresh)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            );
          }}
        </PaginatedTableWrapper>
      </CardContent>

      <BulkUploadEmployeesDialog
        isOpen={isBulkUploadDialogOpen}
        onClose={() => setIsBulkUploadDialogOpen(false)}
        onUploadSuccess={() => {
          setIsBulkUploadDialogOpen(false);
          if (refreshFunctionRef.current) {
            refreshFunctionRef.current()
          }
        }}
      />

    </div>
  );
}
