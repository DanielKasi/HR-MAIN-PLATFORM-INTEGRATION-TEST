"use client";

import {useState, useEffect, useRef} from "react";
import {Edit, MoreVertical, Plus, Search, Settings, Trash, X} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Badge} from "@/components/ui/badge";
import {toast} from "sonner";
import {useSelector} from "react-redux";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {PaginatedTableWrapper} from "@/components/common/tables/paginated-table-wrapper";
import {taxAPI, getPaginatedEmployees, showErrorToast} from "@/lib/utils";
import {IEmployeeTax, IEmployee, ITax, PERMISSION_CODES} from "@/types/types.utils";
import ProtectedComponent from "@/components/ProtectedComponent";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import {EmployeeTaxFormDialog} from "@/components/employee-taxes/employee-tax-form-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import {DeleteConfirmationDialog} from "@/components/common/dialogs/delete-confirmation-dialog";
import {DropdownMenuLabel} from "@/components/ui/dropdown-menu";
import {CardHeader} from "@/components/ui/card";
import {TableSkeleton} from "@/components/common/table-skeleton";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

const getStatusColor = (status: string) => {
  switch (status) {
    case "Active":
      return "bg-green-100 text-green-800 border-green-200";
    case "Upcoming":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "Expired":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function EmployeeTaxesPage() {
  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [taxTypes, setTaxTypes] = useState<ITax[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<IEmployeeTax | null>(null);
  const [deletingTax, setDeletingTax] = useState<IEmployeeTax | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive" | "expired" | "upcoming"
  >("all");
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const [isDeleting, setIsDeleting] = useState(false);

  const refreshFunctionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const fetchTaxTypes = async () => {
      if (!selectedInstitution?.id) {
        return;
      }

      try {
        const types = await taxAPI.getAll();
        setTaxTypes(types || []);
      } catch (error) {
        setTaxTypes([]);
        toast.error("Failed to load tax types");
      }
    };

    fetchTaxTypes();
  }, [selectedInstitution?.id]);

  useEffect(() => {
    fetchEmployees();
  }, [selectedInstitution]);

  const fetchEmployees = async () => {
    if (!selectedInstitution?.id) {
      return;
    }

    setIsLoadingEmployees(true);
    try {
      const fetchedEmployees = await getPaginatedEmployees({institutionId: selectedInstitution.id});
      setEmployees(fetchedEmployees.results || []);
    } catch (error: any) {
      setEmployees([]);
      toast.error(error?.message || error?.detail || "Failed to load employees");
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const handleFormSuccess = (tax: IEmployeeTax, isEdit: boolean) => {
    setEditingTax(null);
    // The PaginatedTableWrapper will handle refreshing the data
    refreshFunctionRef.current?.();
  };

  const handleTaxTypeCreated = (newType: ITax) => {
    setTaxTypes((prev) => [...prev, newType]);
  };

  const handleEdit = (tax: IEmployeeTax) => {
    setEditingTax(tax);
    setIsDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingTax) {
      return;
    }
    setIsDeleting(true);
    try {
      await taxAPI.deleteEmployeeTax(deletingTax.id);
      toast.success("Employee tax deleted successfully");
      if (refreshFunctionRef.current) {
        refreshFunctionRef.current();
      }
    } catch (error: any) {
      showErrorToast({error, defaultMessage: "An error occurred while deleting the employee tax"});
    } finally {
      setIsDeleting(false);
    }
  };

  const openNewTaxDialog = () => {
    setEditingTax(null);
    setIsDialogOpen(true);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  if (!selectedInstitution || !selectedInstitution.id) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="ml-2">No institution selected...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="bg-white rounded-lg border shadow-sm min-h-screen">
        <div className="p-6 border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-gray-900">
                Employee Tax Configurations
              </h1>
            </div>
          </div>
        </div>
        <div className="p-6 border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4 justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search employee taxes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Select
                value={statusFilter}
                onValueChange={(value: string) =>
                  setStatusFilter(value as "all" | "active" | "inactive" | "expired" | "upcoming")
                }
              >
                <SelectTrigger className="w-full sm:w-[130px] border-none bg-transparent focus:outline-none focus:ring-0 shadow-none">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_EMPLOYEE_TAX}>
                <Button onClick={openNewTaxDialog} disabled={!selectedInstitution.id}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Tax Configuration
                </Button>
              </ProtectedComponent>
            </div>
          </div>
        </div>
        <div className="p-6">
          <PaginatedTableWrapper<IEmployeeTax>
            fetchFirstPage={async () => {
              if (!selectedInstitution) throw new Error("No institution selected");
              return await taxAPI.getPaginatedEmployeeTaxes({
                institutionId: selectedInstitution.id,
                page: 1,
                search: searchTerm || undefined,
              });
            }}
            fetchFromUrl={taxAPI.getPaginatedEmployeeTaxesFromUrl}
            deps={[selectedInstitution?.id, searchTerm]}
            className="space-y-4"
            footerClassName="pt-4"
          >
            {({data, loading, refresh}) => {
              useEffect(() => {
                refreshFunctionRef.current = refresh;
              }, [refresh]);

              if (loading) {
                return (
                  <div className="p-2 space-y-6 ">
                    <div className="h-[calc(100vh-2rem)]">
                      <CardHeader className="border-b">
                        <div className="flex justify-between gap-8 items-center">
                          <div className="flex items-center justify-start gap-4">
                            <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                            <div className="space-y-2">
                              <div className="h-6 bg-gray-200 rounded w-64 animate-pulse"></div>
                              <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
                            </div>
                          </div>
                          <div className="grid grid-cols-3">
                            <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
                            <div className="h-10 w-full bg-gray-200 rounded animate-pulse"></div>
                          </div>
                        </div>
                      </CardHeader>
                      <TableSkeleton rows={10} columns={8} />
                    </div>
                  </div>
                );
              }

              if (!data || data.results.length === 0) {
                return (
                  <div className="p-12 text-center">
                    <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No employee taxes found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm
                        ? "No employee taxes match your search criteria."
                        : "Get started by creating your first employee tax configuration."}
                    </p>
                  </div>
                );
              }

              // Apply client-side filters (status filter)
              const filteredResults = data.results.filter((tax) => {
                const now = new Date();
                const effectiveFrom = new Date(tax.effective_from);
                const effectiveTo = tax.effective_to ? new Date(tax.effective_to) : null;

                const matchesStatus =
                  statusFilter === "all" ||
                  (statusFilter === "active" &&
                    effectiveFrom <= now &&
                    (!effectiveTo || effectiveTo >= now)) ||
                  (statusFilter === "inactive" &&
                    (effectiveFrom > now || (effectiveTo && effectiveTo < now))) ||
                  (statusFilter === "expired" && effectiveTo && effectiveTo < now) ||
                  (statusFilter === "upcoming" && effectiveFrom > now);

                return matchesStatus;
              });

              if (filteredResults.length === 0) {
                return (
                  <div className="p-12 text-center">
                    <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No employee taxes found</h3>
                    <p className="text-muted-foreground mb-4">
                      No employee taxes match the selected status filter.
                    </p>
                  </div>
                );
              }

              return (
                <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_EMPLOYEE_TAX}>
                  <div className="overflow-x-auto">
                    <Table className="min-w-[800px] [&_th]:border-0 [&_td]:border-0">
                    <TableHeader className="bg-gray-50/50">
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Tax Name</TableHead>
                        <TableHead>Effective From</TableHead>
                        <TableHead>Effective To</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredResults.map((tax) => {
                        const now = new Date();
                        const effectiveFrom = new Date(tax.effective_from);
                        const effectiveTo = tax.effective_to ? new Date(tax.effective_to) : null;

                        let status = "Inactive";

                        if (effectiveFrom <= now && (!effectiveTo || effectiveTo >= now)) {
                          status = "Active";
                        } else if (effectiveFrom > now) {
                          status = "Upcoming";
                        } else if (effectiveTo && effectiveTo < now) {
                          status = "Expired";
                        }

                        return (
                          <TableRow key={tax.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-3">
                                <div className="font-medium text-gray-900">
                                  {tax.employee?.user?.fullname || "N/A"}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium text-gray-900">
                                {tax.institution_tax?.tax_name || "N/A"}
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(tax.effective_from)}</TableCell>
                            <TableCell>
                              {tax.effective_to ? formatDate(tax.effective_to) : "N/A"}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(status)}>{status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="z-[100] bg-white shadow-lg shadow-black/10 rounded-md w-[10rem] p-1"
                                >
                                  <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_EMPLOYEE_TAX}>
                                    <DropdownMenuItem
                                      className="flex items-center justify-start gap-4 hover:bg-gray-200 cursor-pointer w-full py-2"
                                      onClick={() => handleEdit(tax)}
                                    >
                                      <Edit className="h-4 w-4 mr-1" />
                                      Edit
                                    </DropdownMenuItem>
                                  </ProtectedComponent>
                                  <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_DELETE_EMPLOYEE_TAX}>
                                    <DropdownMenuItem
                                      className="flex items-center justify-start gap-4 text-red-600 hover:text-red-700 hover:bg-gray-200 cursor-pointer w-full py-2"
                                      onClick={() => setDeletingTax(tax)}
                                    >
                                      <Trash className="h-4 w-4 mr-1" />
                                      Delete
                                    </DropdownMenuItem>
                                  </ProtectedComponent>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  </div>
                </ProtectedComponent>
              );
            }}
          </PaginatedTableWrapper>
        </div>
      </div>

      {/* Form Dialog */}
      <EmployeeTaxFormDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingTax={editingTax}
        taxes={taxTypes}
        institutionId={selectedInstitution.id}
        onSuccess={handleFormSuccess}
        onTaxCreated={handleTaxTypeCreated}
      />
      {deletingTax && (
        <ConfirmationDialog
          isOpen={!!deletingTax}
          onClose={() => setDeletingTax(null)}
          title={`Are you sure you want to delete ${deletingTax.institution_tax.tax_name || ""}`}
          description="This action cannot be undone"
          disabled={isDeleting}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
