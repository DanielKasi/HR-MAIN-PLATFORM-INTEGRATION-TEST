"use client";
import type React from "react";
import type {Permission} from "@//app/types";

import {useState, useEffect} from "react";
import {useRouter} from "next/navigation";
import {ArrowLeft} from "lucide-react";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {Checkbox} from "@/components/ui/checkbox";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {apiGet, apiPost} from "@/lib/apiRequest";
import {getDefaultInstitutionId} from "@/lib/helpers";
import {handleApiError} from "@/lib/apiErrorHandler";

interface PermissionsByCategory {
  [categoryId: number]: {
    categoryName: string;
    permissions: Permission[];
  };
}

export default function AddRolePage() {
  const router = useRouter();
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [permissionsByCategory, setPermissionsByCategory] = useState<PermissionsByCategory>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);
  const [error, setError] = useState("");

  // Fetch all permissions
  useEffect(() => {
    const fetchPermissions = async () => {
      setIsLoadingPermissions(true);
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
        setError(error.message || "Failed to fetch permissions");
        handleApiError(error);
      } finally {
        setIsLoadingPermissions(false);
      }
    };

    fetchPermissions();
  }, []);

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
      await apiPost("user/role/", {
        name: roleName,
        description: roleDescription,
        permissions: selectedPermissions,
        institution: getDefaultInstitutionId(),
      });

      toast.success("Role Created Successfully");

      router.push("/users/roles");
    } catch (error: any) {
      setError(error.message || "Failed to create role");
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

  return (
    <div className="container mx-auto py-6 max-w-full bg-white-50 min-h-screen">
      <div className="flex items-center mb-6">
        <Button
          className="mr-2"
          size="icon"
          variant="ghost"
          onClick={() => router.push("/users/roles")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Add Role</h1>
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
                      disabled={isLoadingPermissions}
                      id="select-all"
                      onCheckedChange={(checked) => toggleAll(!!checked)}
                    />
                    <Label htmlFor="select-all">Select All</Label>
                  </div>
                </div>

                {isLoadingPermissions ? (
                  <div className="text-center py-6">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading permissions...</p>
                  </div>
                ) : (
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
                )}
              </div>
            </div>

            {/* Submit button */}
            <div className="flex justify-end">
              <Button className="w-full md:w-auto" disabled={isLoading} size="lg" type="submit">
                {isLoading ? "Creating..." : "Create Role"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
