"use client";

import {useState, useMemo} from "react";
import {useSelector} from "react-redux";
import {MoreVertical, Edit, Trash2, Search, Settings, X, Plus} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Badge} from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {toast} from "sonner";
import type {IAllowanceType} from "@/types/types.utils";
import {getPaginatedAllowanceTypes, getPaginatedAllowanceTypesFromUrl} from "@/lib/utils";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import {TableSkeleton} from "@/components/common/table-skeleton";
import {CreateAllowanceTypeDialog} from "@/components/allowance-types/create-allowance-type-dialog";
import {EditAllowanceTypeDialog} from "@/components/allowance-types/edit-allowance-type-dialog";
import {DeleteAllowanceTypeDialog} from "@/components/allowance-types/delete-allowance-type-dialog";
import {PaginatedTableWrapper} from "@/components/common/tables/paginated-table-wrapper";

const getStatusColor = (status: boolean) => {
  return status
    ? "bg-green-100 text-green-800 border-green-200"
    : "bg-gray-100 text-gray-800 border-gray-200";
};

const getTaxableColor = (isTaxable: boolean) => {
  return isTaxable
    ? "bg-red-100 text-red-800 border-red-200"
    : "bg-blue-100 text-blue-800 border-blue-200";
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const AllowanceTypesComponent = () => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAllowanceType, setEditingAllowanceType] = useState<IAllowanceType | null>(null);
  const [deletingAllowanceType, setDeletingAllowanceType] = useState<IAllowanceType | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [refreshFunction, setRefreshFunction] = useState<(() => void) | null>(null);

  const selectedInstitution = useSelector(selectSelectedInstitution);

  const handleCreateSuccess = (newAllowanceType: IAllowanceType) => {
    if (refreshFunction) {
      refreshFunction();
    }
  };

  const handleUpdateSuccess = (updatedAllowanceType: IAllowanceType) => {
    setEditingAllowanceType(null);
    if (refreshFunction) {
      refreshFunction();
    }
  };

  const handleDeleteSuccess = (deletedId: number) => {
    setDeletingAllowanceType(null);
    if (refreshFunction) {
      refreshFunction();
    }
  };

  const handleEditAllowanceType = (allowanceType: IAllowanceType) => {
    setEditingAllowanceType(allowanceType);
    setIsEditDialogOpen(true);
  };

  const handleDeleteAllowanceType = (allowanceType: IAllowanceType) => {
    setDeletingAllowanceType(allowanceType);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-gray-200">

            <div className="flex items-center gap-4 justify-between">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Allowance Types</h1>
                            <Button
                onClick={() => setIsCreateDialogOpen(true)}
                disabled={!selectedInstitution?.id}
              >
                <Plus className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">
                Create Allowance Type
                </span>
              </Button>
            </div>

        </div>
        <div className="p-6 border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4 justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search allowance types..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[130px] border-none bg-transparent focus:outline-none focus:ring-0 shadow-none">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="p-6">
          <PaginatedTableWrapper<IAllowanceType>
            fetchFirstPage={async () => {
              if (!selectedInstitution) throw new Error("No institution selected");
              return await getPaginatedAllowanceTypes({
                institutionId: selectedInstitution.id,
                page: 1,
                search: searchTerm || undefined,
              });
            }}
            fetchFromUrl={getPaginatedAllowanceTypesFromUrl}
            deps={[selectedInstitution?.id, searchTerm]}
            className="space-y-4"
            footerClassName="pt-4"
          >
            {({data, loading, refresh}) => {
              // Store the refresh function for use in success handlers

              if (loading) {
                return (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="w-full h-12 bg-muted/10 rounded-md animate-pulse" />
                    ))}
                  </div>
                );
              }

              if (!data || data.results.length === 0) {
                return (
                  <div className="p-12 text-center">
                    <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No allowance types found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm
                        ? "No allowance types match your search criteria."
                        : "Get started by creating your first allowance type."}
                    </p>
                  </div>
                );
              }

              // Apply client-side filters (status filter)
              const filteredResults = data.results.filter((allowanceType) => {
                const matchesStatus =
                  statusFilter === "all" ||
                  (statusFilter === "active" && allowanceType.is_active) ||
                  (statusFilter === "inactive" && !allowanceType.is_active);
                return matchesStatus;
              });

              if (filteredResults.length === 0) {
                return (
                  <div className="p-12 text-center">
                    <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No allowance types found</h3>
                    <p className="text-muted-foreground mb-4">
                      No allowance types match the selected status filter.
                    </p>
                  </div>
                );
              }

              return (
                <>
                  <div className="overflow-x-auto">
                    <Table className="min-w-[800px] [&_th]:border-0 [&_td]:border-0">
                      <TableHeader className="bg-gray-50/50">
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Taxable</TableHead>
                          <TableHead>Recurrence</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Created Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredResults.map((allowanceType) => (
                          <TableRow key={allowanceType.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-3">
                                <span>{allowanceType.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(allowanceType.is_active)}>
                                {allowanceType.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getTaxableColor(allowanceType.is_taxable)}>
                                {allowanceType.is_taxable ? "Taxable" : "Non-taxable"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  allowanceType.is_recurring
                                    ? "bg-purple-100 text-purple-800 border-purple-200"
                                    : "bg-gray-100 text-gray-800 border-gray-200"
                                }
                              >
                                {allowanceType.is_recurring
                                  ? `Recurring${allowanceType.frequency ? ` (${allowanceType.frequency})` : ""}`
                                  : "One-time"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs truncate text-sm text-muted-foreground">
                                {allowanceType.description}
                              </div>
                            </TableCell>
                            <TableCell>{formatDate(allowanceType.created_at)}</TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => handleEditAllowanceType(allowanceType)}
                                  >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleDeleteAllowanceType(allowanceType)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Dialogs */}

                  <CreateAllowanceTypeDialog
                    onOpenChange={setIsCreateDialogOpen}
                    isOpen={isCreateDialogOpen}
                    onSuccess={(newAllowanceType) => {
                      handleCreateSuccess(newAllowanceType);
                      refresh();
                    }}
                    disabled={!selectedInstitution?.id}
                  />

                  {editingAllowanceType && (
                    <EditAllowanceTypeDialog
                      isOpen={isEditDialogOpen}
                      onOpenChange={setIsEditDialogOpen}
                      allowanceType={editingAllowanceType}
                      onSuccess={refresh}
                    />
                  )}

                  {deletingAllowanceType && (
                    <DeleteAllowanceTypeDialog
                      isOpen={isDeleteDialogOpen}
                      onOpenChange={setIsDeleteDialogOpen}
                      allowanceType={deletingAllowanceType}
                      onSuccess={refresh}
                    />
                  )}
                </>
              );
            }}
          </PaginatedTableWrapper>
        </div>
      </div>
    </div>
  );
};

export default AllowanceTypesComponent;
