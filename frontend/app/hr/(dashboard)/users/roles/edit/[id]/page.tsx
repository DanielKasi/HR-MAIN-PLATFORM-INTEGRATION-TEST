"use client";
import type React from "react";
import type {Permission, RoleDetail} from "@/app/types";

import {useState, useEffect} from "react";
import {useRouter, useParams} from "next/navigation";
import {ArrowLeft} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {Checkbox} from "@/components/ui/checkbox";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {apiGet, apiPatch} from "@/lib/apiRequest";
import {handleApiError} from "@/lib/apiErrorHandler";

interface PermissionsByCategory {
  [categoryId: number]: {
    categoryName: string;
    permissions: Permission[];
  };
}

type Role = RoleDetail;

export default function EditRolePage() {
  const router = useRouter();
  const params = useParams();
  const roleId = params.id;

  const [role, setRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [permissionsByCategory, setPermissionsByCategory] = useState<PermissionsByCategory>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        await Promise.all([fetchPermissions(), fetchRole()]);
      } catch (error: any) {
        console.error("Error fetching initial data:", error);
        handleApiError(error);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchData();
  }, [roleId]);

  const fetchRole = async () => {
    try {
      const response = await apiGet(`user/role/${roleId}/`);
      const roleData = response.data;

      setRole(roleData);

      // Set form values
      setRoleName(roleData.name);
      setRoleDescription(roleData.description || "");

      // Set selected permissions
      const permissionIds = roleData.permissions_details?.map((p: Permission) => p.id) || [];

      setSelectedPermissions(permissionIds);
    } catch (error: any) {
      setError("Failed to fetch role details");
      console.error("Error fetching role:", error);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await apiGet("user/permission/");

      setPermissions(response.data);

      // Organize permissions by category
      const byCategory: PermissionsByCategory = {};

      response.data.forEach((permission: Permission) => {
        const categoryId = permission.category.id;

        if (!byCategory[categoryId]) {
          byCategory[categoryId] = {
            categoryName: permission.category.permission_category_name,
            permissions: [],
          };
        }
        byCategory[categoryId].permissions.push(permission);
      });
      setPermissionsByCategory(byCategory);
    } catch (error: any) {
      setError("Failed to fetch permissions");
      // console.error("Error fetching permissions:", error);
      // toast.error("Error fetching permissions")
      handleApiError(error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (!roleName.trim()) {
      setError("Role name is required");
      setIsLoading(false);

      return;
    }

    try {
      await apiPatch(`user/role/${roleId}/`, {
        name: roleName,
        description: roleDescription,
        permissions: selectedPermissions,
      });

      // Navigate back to roles page
      router.push("/users/roles");
    } catch (error: any) {
      setError(error.message || "Failed to update role");
      handleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePermission = (permissionId: number) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId],
    );
  };

  const toggleAllInCategory = (categoryId: number, checked: boolean) => {
    const categoryPermissionIds = permissionsByCategory[categoryId].permissions.map((p) => p.id);

    if (checked) {
      setSelectedPermissions((prev) => {
        const newPermissions = [...prev];

        categoryPermissionIds.forEach((id) => {
          if (!newPermissions.includes(id)) {
            newPermissions.push(id);
          }
        });

        return newPermissions;
      });
    } else {
      setSelectedPermissions((prev) => prev.filter((id) => !categoryPermissionIds.includes(id)));
    }
  };

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedPermissions(permissions.map((p) => p.id));
    } else {
      setSelectedPermissions([]);
    }
  };

  const isCategoryFullySelected = (categoryId: number) => {
    const categoryPermissionIds = permissionsByCategory[categoryId].permissions.map((p) => p.id);

    return categoryPermissionIds.every((id) => selectedPermissions.includes(id));
  };

  const isAllSelected = () => {
    return permissions.length > 0 && permissions.every((p) => selectedPermissions.includes(p.id));
  };

  if (isLoadingData) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center h-[60vh] bg-gray-50 min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading role details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-full bg-white-50 min-h-screen">
      <div className="flex items-center mb-6 gap-2">
        <Button variant="outline" onClick={() => router.push("/users/roles")}>
          Back to Roles
        </Button>
        <h1 className="text-2xl font-bold">Edit Role</h1>
      </div>

      <Card className="bg-white rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle>Role Information</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-6 p-3 text-sm font-medium text-white bg-red-500 rounded">
              {error}
            </div>
          )}

          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Role Name */}
              <div className="space-y-2">
                <Label htmlFor="roleName">Role Name *</Label>
                <Input
                  required
                  id="roleName"
                  placeholder="Enter role name"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                />
              </div>

              {/* Role Description */}
              <div className="space-y-2">
                <Label htmlFor="roleDescription">Description</Label>
                <Textarea
                  id="roleDescription"
                  placeholder="Enter role description"
                  rows={3}
                  value={roleDescription}
                  onChange={(e) => setRoleDescription(e.target.value)}
                />
              </div>

              {/* Permissions Section */}
              <div className="border-t pt-6 mt-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Permissions</h3>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={isAllSelected()}
                      id="select-all"
                      onCheckedChange={(checked) => toggleAll(!!checked)}
                    />
                    <Label htmlFor="select-all">Select All</Label>
                  </div>
                </div>

                <div className="space-y-6">
                  {Object.entries(permissionsByCategory).map(([categoryId, category]) => (
                    <div key={categoryId} className="border rounded-md p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">{category.categoryName}</h4>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={isCategoryFullySelected(Number(categoryId))}
                            id={`category-${categoryId}`}
                            onCheckedChange={(checked) =>
                              toggleAllInCategory(Number(categoryId), !!checked)
                            }
                          />
                          <Label htmlFor={`category-${categoryId}`}>Select All in Category</Label>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {category.permissions.map((permission: Permission) => (
                          <div key={permission.id} className="flex items-start space-x-3">
                            <Checkbox
                              checked={selectedPermissions.includes(permission.id)}
                              id={`permission-${permission.id}`}
                              onCheckedChange={() => togglePermission(permission.id)}
                            />
                            <div className="grid gap-0.5">
                              <Label
                                className="font-medium"
                                htmlFor={`permission-${permission.id}`}
                              >
                                {permission.permission_name}
                              </Label>
                              {permission.permission_description && (
                                <p className="text-sm text-muted-foreground">
                                  {permission.permission_description}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Submit button */}
            <div className="flex justify-end">
              <Button className="w-full md:w-auto" disabled={isLoading} size="lg" type="submit">
                {isLoading ? "Updating..." : "Update Role"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
