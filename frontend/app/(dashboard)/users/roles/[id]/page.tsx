"use client";
import {useState, useEffect} from "react";
import {useRouter, useParams} from "next/navigation";
import {ArrowLeft} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import {Checkbox} from "@/components/ui/checkbox";
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {apiGet} from "@/lib/apiRequest";
import {capitalizeEachWord} from "@/lib/helpers";

interface Permission {
  id: number;
  permission_name: string;
  permission_code: string;
  permission_description: string;
  category: {
    id: number;
    permission_category_name: string;
    permission_category_description: string;
  };
}

interface PermissionsByCategory {
  [categoryId: number]: {
    categoryName: string;
    permissions: Permission[];
  };
}

interface Role {
  id: number;
  name: string;
  description: string;
  permissions_details: Permission[];
}

export default function RoleDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const roleId = params.id;

  const [role, setRole] = useState<Role | null>(null);
  const [permissionsByCategory, setPermissionsByCategory] = useState<PermissionsByCategory>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchRoleDetails = async () => {
      setIsLoading(true);
      try {
        const response = await apiGet(`user/role/${roleId}/`);
        const roleData = response.data;

        setRole(roleData);

        // Organize permissions by category
        const byCategory: PermissionsByCategory = {};

        roleData.permissions_details.forEach((permission: Permission) => {
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
        setError("Failed to fetch role details");
        console.error("Error fetching role:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoleDetails();
  }, [roleId]);

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center h-[60vh] bg-gray-50 min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading role details...</p>
        </div>
      </div>
    );
  }

  if (error || !role) {
    return (
      <div className="container mx-auto py-6 max-w-7xl bg-gray-50 min-h-screen">
        <div className="flex items-center mb-6 gap-2">
          <Button variant="outline" onClick={() => router.push("/users/roles")}>
            Back to Roles
          </Button>
          <h1 className="text-2xl font-bold">Role Details</h1>
        </div>
        <Card className="bg-white rounded-xl shadow-sm">
          <CardContent className="pt-6">
            <div className="p-4 text-center">
              <p className="text-red-500 font-medium">{error || "Role not found"}</p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => router.push("/users/roles")}
              >
                Back to Roles
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 max-w-full bg-white-50 min-h-screen">
      <div className="flex items-center mb-6">
        <Button variant="outline" onClick={() => router.push("/users/roles")}>
          Back to Roles
        </Button>
        <h1 className="text-2xl font-bold">Role Details</h1>
      </div>

      <div className="grid gap-6">
        {/* Role Information Card */}
        <Card className="bg-white rounded-xl shadow-sm">
          <CardHeader>
            <CardTitle>Role Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Role Name</h3>
                  <p className="text-lg font-semibold">{capitalizeEachWord(role.name)}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Description</h3>
                <p className="text-base">{role.description || "No description provided"}</p>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                  Total Permissions
                </h3>
                <Badge className="text-base px-3 py-1" variant="secondary">
                  {role.permissions_details.length} permissions
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permissions Card */}
        <Card className="bg-white rounded-xl shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Permissions</CardTitle>
              <CardDescription>List of all permissions assigned to this role</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.keys(permissionsByCategory).length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  This role has no permissions assigned.
                </div>
              ) : (
                Object.entries(permissionsByCategory).map(([categoryId, category]) => (
                  <div key={categoryId} className="border rounded-md p-4">
                    <div className="mb-3">
                      <h4 className="font-medium text-lg">{category.categoryName}</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {category.permissions.map((permission: Permission) => (
                        <div key={permission.id} className="flex items-start space-x-3">
                          <Checkbox disabled checked={true} id={`permission-${permission.id}`} />
                          <div className="grid gap-0.5">
                            <Label className="font-medium" htmlFor={`permission-${permission.id}`}>
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
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button onClick={() => router.push(`/users/roles/edit/${role.id}`)}>Edit Role</Button>
        </div>
      </div>
    </div>
  );
}
