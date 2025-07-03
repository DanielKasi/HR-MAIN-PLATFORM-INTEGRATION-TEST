"use client";
import type {Role} from "@/app/types";

import {Search, Plus, Pen, Eye, Trash2} from "lucide-react";
import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {capitalizeEachWord, getDefaultInstitutionId} from "@/lib/helpers";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import apiRequest, {apiDelete} from "@/lib/apiRequest";
import {PaginationControls} from "@/components/ui/pagination-controls";
import {PageSizeSelector} from "@/components/ui/page-size-selector";
import ProtectedPage from "@/components/ProtectedPage";
import {PERMISSION_CODES} from "@/app/types/types.utils";
import {handleApiError} from "@/lib/apiErrorHandler";

export default function RolesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [pageSize, setPageSize] = useState(10);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    next: null,
    previous: null,
    count: 0,
  });
  const router = useRouter();

  const fetchRoles = async (url: string | null = null) => {
    setLoading(true);
    try {
      const response = await apiRequest.get(
        `user/role/?Institution_id=${getDefaultInstitutionId()}&page_size=${pageSize}`,
      );

      const data = response.data;

      // Check if the response is paginated
      if (data.results && data.count !== undefined) {
        setRoles(data.results);
        setPagination({
          next: data.next,
          previous: data.previous,
          count: data.count,
        });
      } else {
        // Handle non-paginated response
        setRoles(data);
        setPagination({
          next: null,
          previous: null,
          count: data.length,
        });
      }
      setLoading(false);
    } catch (error: any) {
      setErrorMessage(error.message);
      handleApiError(error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, [pageSize]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
  };

  const handlePageChange = (url: string | null) => {
    if (url) {
      fetchRoles(url);
    }
  };

  const filteredRoles = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleDeleteClick = (role: Role) => {
    setRoleToDelete(role);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;

    setIsDeleting(true);
    try {
      await apiDelete(`user/role/${roleToDelete.id}/`);
      setRoles(roles.filter((role) => role.id !== roleToDelete.id));
      setDeleteDialogOpen(false);
      setRoleToDelete(null);
    } catch (error: any) {
      setErrorMessage(`Failed to delete role: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ProtectedPage permissionCode={PERMISSION_CODES.CAN_VIEW_STAFF_ROLES}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => router.push("/admin")}>
              Back to Admin
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Staff Roles</h1>
          </div>
          <Button onClick={() => router.push("/users/roles/add")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Role
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Staff Roles</CardTitle>
            <CardDescription className="py-3">
              Manage your account's roles and permissions
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-1 items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="w-full pl-8"
                    placeholder="Search roles..."
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                {errorMessage && <p className="text-red-500 text-sm">{errorMessage}</p>}
              </div>
              <PageSizeSelector
                disabled={loading}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Role Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell className="h-24 text-center" colSpan={3}>
                        Loading roles...
                      </TableCell>
                    </TableRow>
                  ) : filteredRoles.length > 0 ? (
                    filteredRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">
                          {capitalizeEachWord(role.name)}
                        </TableCell>
                        <TableCell className="max-w-md truncate">{role.description}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => router.push(`/users/roles/${role.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => router.push(`/users/roles/edit/${role.id}`)}
                            >
                              <Pen className="h-4 w-4" />
                            </Button>
                            <Button
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleDeleteClick(role)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell className="h-24 text-center" colSpan={3}>
                        No Roles found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4">
              <PaginationControls
                currentItems={filteredRoles.length}
                isLoading={loading}
                pagination={pagination}
                onPageChange={handlePageChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the role "{roleToDelete?.name}". This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-500 hover:bg-red-600"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedPage>
  );
}
