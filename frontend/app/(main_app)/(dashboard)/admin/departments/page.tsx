"use client";

import {useState, useEffect, useRef} from "react";
import {useRouter} from "next/navigation";
import {useSelector} from "react-redux";
import {
  Building2,
  Eye,
  Plus,
  Search,
  MoreVertical,
  Edit,
  Trash2,
  RefreshCw,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {Skeleton} from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {selectSelectedInstitution, selectSelectedBranch} from "@/store/auth/selectors";
import {
  deleteDepartment,
  getPaginatedDepartments,
  getPaginatedDepartmentsFromUrl,
  showErrorToast,
} from "@/lib/utils";
import {type IDepartment, PERMISSION_CODES} from "@/types/types.utils";
import {toast} from "sonner";
import ProtectedComponent from "@/components/ProtectedComponent";
import {useDocumentTitle} from "@/hooks/use-document-title";
import RichTextDisplay from "@/components/common/rich-text-display";
import {PaginatedTableWrapper} from "@/components/common/tables/paginated-table-wrapper";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [departmentToDelete, setDepartmentToDelete] = useState<IDepartment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [departmentsCount, setDepartmentsCount] = useState(0);
  const refreshFunctionRef = useRef<() => Promise<void> | null>(null);

  useDocumentTitle("DEPARTMENTS");

  const router = useRouter();
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const selectedBranch = useSelector(selectSelectedBranch);

  const handleCreateDepartment = () => {
    router.push("/admin/departments/create");
  };

  const handleEditDepartment = (departmentId: number) => {
    router.push(`/admin/departments/${departmentId}/edit`);
  };

  const handleViewDepartment = (departmentId: number) => {
    router.push(`/admin/departments/${departmentId}/view`);
  };

  const handleDeleteDepartment = (department: IDepartment) => {
    setDepartmentToDelete(department);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!departmentToDelete) return;

    setIsDeleting(true);
    try {
      await deleteDepartment({departmentId: departmentToDelete.id});
      toast.success("Department deleted successfully");
      setDeleteModalOpen(false);
      setDepartmentToDelete(null);
      refreshFunctionRef.current?.();
    } catch (error) {
      showErrorToast({error, defaultMessage: "Failed to delete department"});
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeleteModalOpen(false);
    setDepartmentToDelete(null);
  };

  return (
    <div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="rounded-full aspect-square"
              variant="outline"
              onClick={() => router.push("/admin")}
            >
              <ArrowLeft />
            </Button>
            <div className="ml-2 mt-3">
              <h1 className="text-2xl font-bold">Departments</h1>
              {selectedInstitution && selectedBranch && (
                <p className="text-muted-foreground">
                  Manage departments for {selectedBranch.branch_name} -{" "}
                  {selectedInstitution.institution_name}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4">
        <Card className="shadow-sm ">
          <CardContent className="p-4">
            <div className="flex items-end justify-start">
              <div className="flex flex-col justify-start items-start">
                <div className="text-xl md:text-2xl font-bold">{departmentsCount}</div>
                <p className="text-xs md:text-sm text-muted-foreground">Total Departments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-end justify-start">
              <div className="flex flex-col justify-start items-start">
                <div className="text-xl md:text-2xl font-bold">{departments.length}</div>
                <p className="text-xs md:text-sm text-muted-foreground">Results displayed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Create Department Button on Same Line */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center mb-6 mt-8">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Button onClick={handleCreateDepartment} className="flex items-center gap-2 flex-shrink-0">
          <Plus className="h-4 w-4" />
          Create Department
        </Button>
      </div>

      <div className="">
        <PaginatedTableWrapper<IDepartment>
          fetchFirstPage={async () => {
            if (!selectedInstitution) {
              throw Error("No organization found !");
            }
            return await getPaginatedDepartments({
              institutionId: selectedInstitution.id,
              search: searchTerm,
            });
          }}
          fetchFromUrl={async (args: {url: string}) =>
            getPaginatedDepartmentsFromUrl({url: args.url})
          }
          deps={[selectedInstitution?.id, searchTerm]}
          query={searchTerm}
          onError={(err) =>
            showErrorToast({error: err, defaultMessage: "Failed to fetch departments"})
          }
          className="space-y-4"
          footerClassName="pt-4"
        >
          {({data, loading, refresh}) => {
            refreshFunctionRef.current = refresh;

            useEffect(() => {
              if (data) {
                if (data.results !== departments && !hasLoaded) {
                  setHasLoaded(!true);
                }
                setDepartmentsCount(data.count || 0);
                setDepartments(data.results);
              }
            }, [data]);

            if (hasLoaded && departments.length === 0) {
              return (
                <div className="p-12 text-center">
                  <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No departments found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm
                      ? "No departments match your search criteria."
                      : "Get started by creating your first department."}
                  </p>
                  {!searchTerm && (
                    <Button onClick={handleCreateDepartment} className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Create First Department
                    </Button>
                  )}
                </div>
              );
            }

            if (loading) {
              return (
                <Table className="min-w-[800px]">
                  <TableHeader>
                    <TableRow className="border-b">
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...Array(5)].map((_, i) => (
                      <TableRow key={i} className="border-b">
                        <TableCell>
                          <Skeleton className="h-6 w-3/4" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-6 w-1/2" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              );
            }

            return (
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="border-b bg-muted/30">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Description</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.results.map((department, index) => (
                    <TableRow
                      key={department.id}
                      className="hover:bg-muted/50 transition-colors border-b"
                    >
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{department.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <RichTextDisplay
                          className={`text-sm ${!department.description ? "text-muted-foreground italic" : ""}`}
                          htmlContent={department.description || "No description"}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-muted/50"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <ProtectedComponent
                              permissionCode={PERMISSION_CODES.CAN_VIEW_DEPARTMENTS}
                            >
                              <DropdownMenuItem
                                onClick={() => handleViewDepartment(department.id)}
                                className="hover:bg-muted/50"
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                            </ProtectedComponent>
                            <ProtectedComponent
                              permissionCode={PERMISSION_CODES.CAN_EDIT_DEPARTMENTS}
                            >
                              <DropdownMenuItem
                                onClick={() => handleEditDepartment(department.id)}
                                className="hover:bg-muted/50"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Department
                              </DropdownMenuItem>
                            </ProtectedComponent>
                            <ProtectedComponent
                              permissionCode={PERMISSION_CODES.CAN_DELETE_DEPARTMENTS}
                            >
                              <DropdownMenuItem
                                onClick={() => handleDeleteDepartment(department)}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Department
                              </DropdownMenuItem>
                            </ProtectedComponent>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            );
          }}
        </PaginatedTableWrapper>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle>Delete Department</DialogTitle>
                <DialogDescription className="mt-1">
                  This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">{departmentToDelete?.name}</span>?
              This will permanently remove the department and all associated data.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={cancelDelete} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Department
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
