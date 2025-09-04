"use client";

import type React from "react";
import {useState, useEffect, useCallback} from "react";
import {useSelector} from "react-redux";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Badge} from "@/components/ui/badge";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Eye,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  ArrowLeft,
} from "lucide-react";
import {toast} from "sonner";
import {bankTypesAPI} from "@/lib/utils";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import type {IBankType, IBankTypeFormData} from "@/types/types.utils";
import {DeleteConfirmationDialog} from "@/components/delete-confirmation-dialog";
import {BankTypeModal} from "@/components/bank-types/create-bank-type-modal";
import {BankTypeDetailsModal} from "@/components/bank-types/bank-types-details-modal";
import {ConfirmationDialog} from "@/components/confirmation-dialog";
import {useRouter} from "next/navigation";

export default function BankTypeManagement() {
  const selectedInstitution = useSelector(selectSelectedInstitution);

  const [bankTypes, setBankTypes] = useState<IBankType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [bankTypeToDelete, setBankTypeToDelete] = useState<IBankType | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Server-side pagination states
  const [currentPageUrl, setCurrentPageUrl] = useState<string | null>(null);
  const [nextPageUrl, setNextPageUrl] = useState<string | null>(null);
  const [previousPageUrl, setPreviousPageUrl] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingType, setEditingType] = useState<IBankType | null>(null);
  const [viewingType, setViewingType] = useState<IBankType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    if (debouncedSearchTerm !== searchTerm) return;
    setCurrentPage(1);
    setCurrentPageUrl(null);
    fetchBankTypes();
  }, [debouncedSearchTerm]);

  useEffect(() => {
    if (selectedInstitution?.id) {
      fetchBankTypes();
    }
  }, [selectedInstitution?.id]);

  const fetchBankTypes = useCallback(
    async (pageUrl?: string | null) => {
      if (!selectedInstitution?.id) return;

      try {
        setLoading(true);

        let searchParams = "";
        if (pageUrl) {
          const url = new URL(pageUrl);
          searchParams = url.search;
        } else if (debouncedSearchTerm) {
          searchParams = `?search=${encodeURIComponent(debouncedSearchTerm)}`;
        }

        const response = await bankTypesAPI.getAll(searchParams);

        setBankTypes(response.results);
        setTotalCount(response.count);
        setNextPageUrl(response.next);
        setPreviousPageUrl(response.previous);
        setCurrentPageUrl(pageUrl || null);
      } catch (error) {
        toast.error("Failed to load attached banks ");
      } finally {
        setLoading(false);
      }
    },
    [selectedInstitution?.id, debouncedSearchTerm],
  );

  const handleSave = async (formData: IBankTypeFormData) => {
    if (!selectedInstitution?.id) return;

    setIsSubmitting(true);

    try {
      if (editingType) {
        await bankTypesAPI.update({
          bankTypeId: editingType.id.toString(),
          data: formData,
        });

        await fetchBankTypes(currentPageUrl);
        toast.success("Bank type updated successfully!");
      } else {
        await bankTypesAPI.create({
          bankType: formData,
        });

        setCurrentPage(1);
        setCurrentPageUrl(null);
        setSearchTerm("");
        setDebouncedSearchTerm("");
        await fetchBankTypes();
        toast.success("Bank type created successfully!");
      }
    } catch (error) {
      toast.error(`Failed to ${editingType ? "update" : "create"} bank type`);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreate = () => {
    setEditingType(null);
    setShowFormModal(true);
  };

  const handleEdit = (type: IBankType) => {
    setEditingType(type);
    setShowFormModal(true);
  };

  const handleView = (type: IBankType) => {
    setViewingType(type);
    setShowDetailsModal(true);
  };

  const handleDelete = async (bankType: IBankType) => {
    if (!selectedInstitution?.id) return;

    try {
      setIsDeleting(true);

      await bankTypesAPI.delete({
        bankTypeId: bankType.id.toString(),
      });

      // Refresh current page
      await fetchBankTypes(currentPageUrl);
      toast.success("Bank type deleted successfully!");
    } catch (error) {
      toast.error("Failed to delete bank type");
    } finally {
      setIsDeleting(false);
      handleCloseDeleteModal();
    }
  };

  const handleCloseDeleteModal = () => {
    setBankTypeToDelete(null);
    setIsDeleting(false);
  };

  const handleNextPage = () => {
    if (nextPageUrl) {
      setCurrentPage((prev) => prev + 1);
      fetchBankTypes(nextPageUrl);
    }
  };

  const handlePreviousPage = () => {
    if (previousPageUrl) {
      setCurrentPage((prev) => prev - 1);
      fetchBankTypes(previousPageUrl);
    }
  };

  const handleCloseFormModal = () => {
    setShowFormModal(false);
    setEditingType(null);
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setViewingType(null);
  };

  if (!selectedInstitution) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Please select an institution to manage attached banks .</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Bank Types List */}
      <Card className="w-full bg-white shadow-sm border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="rounded-full aspect-square"
                variant="outline"
                onClick={() => router.push("/admin")}
              >
                <ArrowLeft />
              </Button>{" "}
              <div>
                <CardTitle>Attached Banks</CardTitle>
                <CardDescription>
                  Manage different attached banks in your organization
                </CardDescription>
              </div>
            </div>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Bank Type
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search attached banks ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">
              {totalCount} type{totalCount !== 1 ? "s" : ""}
            </Badge>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-myOrange" />
                  <span className="text-gray-600">Loading attached banks ...</span>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="font-semibold text-gray-900 py-4 px-6">
                      Bank Name
                    </TableHead>
                    <TableHead className="font-semibold text-gray-900 py-4 px-6">
                      Bank Code
                    </TableHead>
                    <TableHead className="font-semibold text-gray-900 py-4 px-6">BR Code</TableHead>
                    <TableHead className="font-semibold text-gray-900 py-4 px-6 w-[100px] text-center">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bankTypes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-gray-500 bg-white">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                            <Search className="h-6 w-6 text-gray-400" />
                          </div>
                          {searchTerm
                            ? "No attached banks  found matching your search."
                            : "No attached banks  found."}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    bankTypes.map((type, index) => (
                      <TableRow
                        key={type.id}
                        className={`
                          bg-white hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100 last:border-b-0
                          ${index % 2 === 0 ? "bg-white" : "bg-gray-50/30"}
                        `}
                      >
                        <TableCell className="py-4 px-6">
                          <div className="font-medium text-gray-900">{type.bank_fullname}</div>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <Badge
                            variant="outline"
                            className="border-orange-200 bg-orange-50 text-orange-700"
                          >
                            {type.bank_code}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 px-6">
                          <Badge
                            variant="outline"
                            className="border-blue-200 bg-blue-50 text-blue-700"
                          >
                            {type.br_code}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4 px-6 text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                                disabled={bankTypeToDelete?.id === type.id}
                              >
                                {bankTypeToDelete?.id === type.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                                ) : (
                                  <MoreVertical className="h-4 w-4 text-gray-600" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="w-48 bg-white border border-gray-200 shadow-lg"
                            >
                              <DropdownMenuItem
                                onClick={() => handleView(type)}
                                className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer"
                              >
                                <Eye className="h-4 w-4 mr-3 text-gray-500" />
                                View details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEdit(type)}
                                className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer"
                              >
                                <Edit className="h-4 w-4 mr-3 text-gray-500" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setBankTypeToDelete(type)}
                                className="flex items-center px-3 py-2 text-red-600 hover:bg-red-50 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4 mr-3 text-red-500" />
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
            )}
          </div>

          {/* Server-side Pagination Controls */}
          {(nextPageUrl || previousPageUrl) && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>
                  Total: {totalCount} results • Page {currentPage}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={!previousPageUrl || loading}
                  className="flex items-center gap-1 bg-transparent"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={!nextPageUrl || loading}
                  className="flex items-center gap-1 bg-transparent"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Modal */}
      <BankTypeModal
        isOpen={showFormModal}
        onClose={handleCloseFormModal}
        editingType={editingType}
        onSave={handleSave}
        isSubmitting={isSubmitting}
        existingTypes={bankTypes}
      />

      {/* Details Modal */}
      <BankTypeDetailsModal
        isOpen={showDetailsModal}
        onClose={handleCloseDetailsModal}
        bankType={viewingType}
      />

      {bankTypeToDelete && (
        <ConfirmationDialog
          description="Are you sure you want to delete this bank type? This action cannot be undone."
          disabled={isDeleting}
          isOpen={!!bankTypeToDelete}
          title={`Delete ${bankTypeToDelete.bank_fullname}`}
          onConfirm={() => handleDelete(bankTypeToDelete)}
          onClose={handleCloseDeleteModal}
        />
      )}
    </div>
  );
}
