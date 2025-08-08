"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { 
  ArrowLeft,
  Plus,
  Edit, 
  Trash2, 
  RefreshCw, 
  Search,
  MoreVertical,
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  AlertTriangle,
  Info
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { CreateTaxRuleDialog } from "@/components/tax-rules/create-tax-rule-dialog";
import { EditTaxRuleDialog } from "@/components/tax-rules/edit-tax-rule-dialog";
import { DeleteTaxRuleDialog } from "@/components/tax-rules/delete-tax-rule-dialog";
import { taxesAPI, taxRulesAPI } from "@/lib/utils";
import type { ITax, ITaxRule, ITaxRuleFormData } from "@/types/types.utils";
import { useMobile } from "@/hooks/use-mobile";

// Use backend types
export type { ITax, ITaxRule, ITaxRuleFormData } from "@/types/types.utils";

// Pagination constants
const PAGE_SIZES = [10, 25, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

const getStatusColor = (status: string) => {
  return status === "active"
    ? "bg-green-100 text-green-800 border-green-200"
    : "bg-gray-100 text-gray-800 border-gray-200";
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};




const TaxDetailComponent = () => {
  const params = useParams();
  const router = useRouter();
  const isMobile = useMobile();
  const taxId = params.id as string;
  
  const [tax, setTax] = useState<ITax | null>(null);
  const [taxRules, setTaxRules] = useState<ITaxRule[]>([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTaxRule, setEditingTaxRule] = useState<ITaxRule | null>(null);
  const [deletingTaxRule, setDeletingTaxRule] = useState<ITaxRule | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const selectedInstitution = useSelector(selectSelectedInstitution);

  // Fetch tax details and rules
  const fetchTaxData = useCallback(
    async (showRefreshLoader = false) => {
      if (!selectedInstitution?.id || !taxId) return;

      try {
        if (showRefreshLoader) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        
        // Use actual API calls
        const [taxData, taxRulesData] = await Promise.all([
          taxesAPI.getById(parseInt(taxId)),
          taxRulesAPI.getByTaxId(parseInt(taxId))
        ]);
        
        setTax(taxData);
        setTaxRules(taxRulesData);
      } catch (error) {
        console.error("Error fetching tax data:", error);
        toast.error("Failed to load tax data");
        setTax(null);
        setTaxRules([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [selectedInstitution?.id, taxId],
  );

  useEffect(() => {
    fetchTaxData();
  }, [fetchTaxData]);

  const handleCreateSuccess = (newTaxRule: ITaxRule) => {
    setTaxRules([newTaxRule, ...taxRules]);
    clearFilters();
    toast.success("Tax rule created successfully");
  };

  const handleUpdateSuccess = (updatedTaxRule: ITaxRule) => {
    setTaxRules(taxRules.map(rule => rule.id === updatedTaxRule.id ? updatedTaxRule : rule));
    setIsEditDialogOpen(false);
    setEditingTaxRule(null);
    toast.success("Tax rule updated successfully");
  };

  const handleDeleteSuccess = (deletedId: number) => {
    setTaxRules(taxRules.filter(rule => rule.id !== deletedId));
    setIsDeleteDialogOpen(false);
    setDeletingTaxRule(null);
    toast.success("Tax rule deleted successfully");
  };

  const handleEditTaxRule = (taxRule: ITaxRule) => {
    setEditingTaxRule(taxRule);
    setIsEditDialogOpen(true);
  };

  const handleDeleteTaxRule = (taxRule: ITaxRule) => {
    setDeletingTaxRule(taxRule);
    setIsDeleteDialogOpen(true);
  };

  const handleRefresh = () => {
    fetchTaxData(true);
  };

  const handleBack = () => {
    router.push("/admin/taxes");
  };

  // Filtered and paginated data
  const filteredTaxRules = useMemo(() => {
    let filtered = taxRules;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(rule =>
        rule.tax_rule_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (rule.salary_from?.toString() || '').includes(searchTerm) ||
        (rule.salary_to?.toString() || '').includes(searchTerm)
      );
    }

    // Apply status filter - backend doesn't have is_active, so we'll show all
    if (statusFilter !== "all") {
      // For now, show all rules since backend doesn't have is_active field
      filtered = filtered;
    }

    return filtered;
  }, [taxRules, searchTerm, statusFilter]);

  const paginatedTaxRules = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredTaxRules.slice(startIndex, endIndex);
  }, [filteredTaxRules, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredTaxRules.length / pageSize);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(Number(newPageSize));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setCurrentPage(1);
  };

  const hasFilters = searchTerm || statusFilter !== "all";

  if (!tax) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Taxes
          </Button>
        </div>
        <div className="text-center py-8">
          <Info className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Tax not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Taxes
        </Button>
      </div>

      {/* Tax Details */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{tax.tax_name}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={getStatusColor(tax.tax_status ? "active" : "inactive")}>
                  {tax.tax_status ? "Active" : "Inactive"}
                </Badge>
                <span className="text-sm text-gray-500">
                  Created: {formatDate(tax.created_at)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

            {/* Tax Rules Section */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Tax Rules</h2>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-1 justify-center">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search tax rules..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              {hasFilters && (
                <Button variant="outline" onClick={clearFilters} size="sm">
                  Clear Filters
                </Button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <CreateTaxRuleDialog
                taxId={parseInt(taxId)}
                onSuccess={handleCreateSuccess}
                disabled={!selectedInstitution?.id}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="p-6">
          {isLoading ? (
            <TableSkeleton />
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Calculation Type</TableHead>
                      <TableHead>Rate/Amount</TableHead>
                      <TableHead>Salary Range</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-12">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTaxRules.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                          {hasFilters ? "No tax rules found matching your filters" : "No tax rules found"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedTaxRules.map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell className="font-medium">
                            {rule.tax_rule_name}
                          </TableCell>
                          <TableCell>
                            {rule.tax_rule_percentage 
                              ? `${rule.tax_rule_percentage}%`
                              : formatCurrency(rule.tax_rule_fixed_amount || 0)
                            }
                          </TableCell>
                          <TableCell>
                            {formatCurrency(rule.salary_from || 0)} - {formatCurrency(rule.salary_to || 0)}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              Active
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(rule.created_at)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditTaxRule(rule)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteTaxRule(rule)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
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

              {/* Mobile Cards */}
              <div className="sm:hidden space-y-3">
                {paginatedTaxRules.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    {hasFilters ? "No tax rules found matching your filters" : "No tax rules found"}
                  </div>
                ) : (
                  paginatedTaxRules.map((rule) => (
                    <div key={rule.id} className="bg-gray-50 rounded-lg p-4 border">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">{rule.tax_rule_name}</h3>
                          <div className="space-y-1 mb-2">
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Rate/Amount:</span>{" "}
                              {rule.tax_rule_percentage 
                                ? `${rule.tax_rule_percentage}%`
                                : formatCurrency(rule.tax_rule_fixed_amount || 0)
                              }
                            </div>
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Salary Range:</span>{" "}
                              {formatCurrency(rule.salary_from || 0)} - {formatCurrency(rule.salary_to || 0)}
                            </div>
                            <div className="text-sm text-gray-600">
                              <span className="font-medium">Created:</span> {formatDate(rule.created_at)}
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            Active
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditTaxRule(rule)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteTaxRule(rule)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Pagination */}
              {filteredTaxRules.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6">
                  <div className="text-sm text-gray-700">
                    Showing {((currentPage - 1) * pageSize) + 1} to{" "}
                    {Math.min(currentPage * pageSize, filteredTaxRules.length)} of{" "}
                    {filteredTaxRules.length} tax rules
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700">Show:</span>
                      <Select value={pageSize.toString()} onValueChange={handlePageSizeChange}>
                        <SelectTrigger className="w-20">
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
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        );
                      })}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(totalPages)}
                        disabled={currentPage === totalPages}
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Dialogs */}
      {editingTaxRule && (
        <EditTaxRuleDialog
          taxRule={editingTaxRule}
          isOpen={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingTaxRule(null);
          }}
          onSuccess={handleUpdateSuccess}
        />
      )}

      {deletingTaxRule && (
        <DeleteTaxRuleDialog
          taxRule={deletingTaxRule}
          isOpen={isDeleteDialogOpen}
          onClose={() => {
            setIsDeleteDialogOpen(false);
            setDeletingTaxRule(null);
          }}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
};

export default TaxDetailComponent;
