"use client";

import { RefObject, useRef, useState } from "react";
import { ChevronDown, Edit, Eye, MoreVertical, Plus, Search, Trash2, Upload, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { type IEmployee, PERMISSION_CODES } from "@/types/types.utils";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import { deleteEmployee, getPaginatedEmployees, getPaginatedEmployeesFromUrl, showErrorToast } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ProtectedComponent from "@/components/ProtectedComponent";
import {
  AlertDialogHeader, AlertDialogFooter, AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import Link from "next/link";

import { toast } from "sonner";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { useRouter } from "next/navigation";

interface EmployeesTableProps {
  refreshFunctionRef?:RefObject<(()=>void)|null>,
  searchTerm?:string
}

export function EmployeesTable({
  refreshFunctionRef,
  searchTerm
}: EmployeesTableProps) {
  const currentInstitution = useSelector(selectSelectedInstitution)
    const tableRefreshRef = refreshFunctionRef || useRef<(() => void) | null>(null);
    const [employeeToDelete, setEmployeeToDelete] = useState<IEmployee | null>(null);

    const router = useRouter();


    const handleDelete = async () => {
    if (!currentInstitution ) {
      return;
    }
    if(!employeeToDelete){toast.error("No employee to delete !"); return}
    try {
      await deleteEmployee({employeeId:employeeToDelete.id, institutionId: currentInstitution.id});
      tableRefreshRef.current?.();
    } catch (error:unknown) {
      showErrorToast({error, defaultMessage: "Failed to delete employee"});
    }
  };



  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Active</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">Inactive</Badge>
    );
  };

  return (



        <PaginatedTableWrapper<IEmployee>
          fetchFirstPage={async () => {
            if (!currentInstitution) throw new Error("No institution selected");
            return await getPaginatedEmployees({
              institutionId: currentInstitution.id,
              page: 1,
              search: searchTerm || undefined,
            });
          }}
          fetchFromUrl={getPaginatedEmployeesFromUrl}
          deps={[currentInstitution?.id, searchTerm]}
          className="space-y-4"
          footerClassName="pt-4"
        >
          {({ data, loading, refresh }) => {

            tableRefreshRef.current = refresh


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
                      {data?.results.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <p className="text-muted-foreground mb-4">No employees found</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        data?.results.map((employee) => (
                          <TableRow key={employee.id}>
                            <TableCell>{employee.user?.fullname}</TableCell>
                            <TableCell>{employee.email}</TableCell>
                            <TableCell>{employee.department.name}</TableCell>
                            <TableCell>{employee.position.name}</TableCell>
                            <TableCell>{getStatusBadge(employee.is_active)}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  <DropdownMenuItem  className="p-0">
                                    <Link
                                      className="text-xs flex items-center justify-start w-full h-full px-2 py-1.5"
                                      href={`/employees/profile/${employee.id}`}
                                    >
                                      <Eye className="h-4 w-4 mr-2" /> View Details
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="p-0">
                                    <ProtectedComponent
                                      permissionCode={PERMISSION_CODES.CAN_EDIT_EMPLOYEES}
                                    >
                                      <Link
                                        className="text-xs flex items-center justify-start w-full h-full px-2 py-1.5"
                                        href={`/employees/update-employee/${employee.id}`}
                                      >
                                        <Edit className="h-4 w-4 mr-2" /> Edit
                                      </Link>
                                    </ProtectedComponent>
                                  </DropdownMenuItem>

                                  <DropdownMenuItem
                                    onClick={() => setEmployeeToDelete(employee)}
                                    className="text-red-600 p-0"
                                  >
                                    <span className="text-red-600 hover:text-red-700 text-xs w-full h-full px-2 py-1.5 flex items-center">
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
                          Are you sure you want to delete {employeeToDelete.user?.fullname ? <b>{employeeToDelete.user?.fullname}</b> : "this employee" }  ? This action cannot
                          be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setEmployeeToDelete(null)}>
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDelete}
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


  );
}
