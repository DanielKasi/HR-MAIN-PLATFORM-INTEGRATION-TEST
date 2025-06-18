"use client";

import type {IUser} from "@/app/types";

import {useEffect, useState} from "react";
import {useParams, useRouter} from "next/navigation";
import {ArrowLeft, Check, Trash2, Pencil} from "lucide-react";

import {AddBranchForm} from "./add-branch";
import {EditUserRoles} from "./edit-user-roles";

import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Avatar, AvatarFallback} from "@/components/ui/avatar";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {capitalizeEachWord} from "@/lib/helpers";
import apiRequest, {apiDelete} from "@/lib/apiRequest";

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("branches");

  const fetchUserDetails = async () => {
    setLoading(true);
    try {
      const response = await apiRequest.get(`user/${userId}/`);

      setUser(response.data);
      setError("");
    } catch (error: any) {
      setError(error.message || "Failed to fetch user details");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBranch = async (branchId: number) => {
    try {
      await apiDelete(`institution/branch/user/${userId}/${branchId}/`);
      fetchUserDetails();
    } catch (error: any) {
      setError(error.message || "Failed to remove branch");
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserDetails();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">Loading user details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="mb-4" variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!user) {
    return (
      <Alert className="mb-4">
        <AlertDescription>User not found</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-6 bg-[#f9f9f9] min-h-screen p-6">
      <div className="flex items-center gap-2">
        <Button className="gap-2" size="sm" variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          User Profile
        </Button>
      </div>

      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-0">
          <div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
            <Avatar className="h-20 w-20 bg-[#f0f0f0]">
              <AvatarFallback className="text-xl text-[#666]">
                {user.fullname?.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1 flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-2xl font-semibold">
                    {capitalizeEachWord(user.fullname || "")}
                  </h3>
                  <p className="text-sm text-[#666]">{user.email}</p>
                  <div className="flex items-center gap-2 pt-2">
                    <Badge
                      className={
                        user.is_active
                          ? "bg-[#10b981] text-white font-normal hover:bg-[#10b981]"
                          : "bg-[#ef4444] text-white font-normal hover:bg-[#ef4444]"
                      }
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {user.roles && user.roles.length > 0 && (
                      <Badge
                        className="bg-white text-[#666] font-normal border-[#e5e7eb]"
                        variant="outline"
                      >
                        {capitalizeEachWord(user.roles[0].name)}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="rounded-full border-[#e5e7eb] bg-white text-[#666] hover:bg-[#f9f9f9]"
                    size="icon"
                    variant="outline"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    className="rounded-full border-[#e5e7eb] bg-white text-[#ef4444] hover:bg-[#fef2f2]"
                    size="icon"
                    variant="outline"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-[#e5e7eb]">
            <div className="flex border-b border-[#e5e7eb]">
              <button
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === "branches"
                    ? "border-b-2 border-[#10b981] text-[#10b981]"
                    : "text-[#666]"
                }`}
                onClick={() => setActiveTab("branches")}
              >
                Branches
              </button>
              <button
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === "permissions"
                    ? "border-b-2 border-[#10b981] text-[#10b981]"
                    : "text-[#666]"
                }`}
                onClick={() => setActiveTab("permissions")}
              >
                Permissions / role details
              </button>
              <button
                className={`px-6 py-3 text-sm font-medium ${
                  activeTab === "attendance"
                    ? "border-b-2 border-[#10b981] text-[#10b981]"
                    : "text-[#666]"
                }`}
                onClick={() => setActiveTab("attendance")}
              >
                Attendance
              </button>
            </div>

            {activeTab === "branches" && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Branch Access</h3>
                  <AddBranchForm
                    userId={Number.parseInt(userId)}
                    onBranchAdded={fetchUserDetails}
                  />
                </div>
                {user.branches && user.branches.length > 0 ? (
                  <div className="space-y-3">
                    {user.branches.map((branch) => (
                      <div
                        key={branch.id}
                        className="flex items-center justify-between p-3 border rounded-md border-[#e5e7eb] bg-white"
                      >
                        <div>
                          <div className="font-medium">{branch.branch_name}</div>
                          <div className="text-sm text-[#666]">{branch.branch_location}</div>
                        </div>
                        <Button
                          className="text-[#ef4444] hover:bg-[#fef2f2]"
                          size="icon"
                          title="Remove from branch"
                          variant="ghost"
                          onClick={() => branch.id !== undefined && handleRemoveBranch(branch.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-[#666]">No branches assigned</div>
                )}
              </div>
            )}

            {activeTab === "permissions" && (
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Role & Permissions</h3>
                  <EditUserRoles user={user} />
                </div>
                {user.roles && user.roles.length > 0 ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">
                        {capitalizeEachWord(user.roles[0].name)}
                      </h3>
                      {user.roles[0].description && (
                        <p className="text-sm text-[#666] mt-1">{user.roles[0].description}</p>
                      )}
                    </div>

                    {user.roles[0].permissions_details &&
                    user.roles[0].permissions_details.length > 0 ? (
                      <div className="space-y-3 mt-4">
                        {user.roles[0].permissions_details.map((permission) => (
                          <div
                            key={permission.id}
                            className="flex items-start gap-3 p-3 border rounded-md border-[#e5e7eb] bg-white"
                          >
                            <div className="mt-0.5 bg-[#dcfce7] rounded-full p-1">
                              <Check className="h-3 w-3 text-[#10b981]" />
                            </div>
                            <div>
                              <div className="font-medium">{permission.permission_name}</div>
                              {permission.permission_description && (
                                <div className="text-sm text-[#666] mt-1">
                                  {permission.permission_description}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-[#666]">No specific permissions</div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-[#666]">No roles assigned</div>
                )}
              </div>
            )}

            {activeTab === "attendance" && (
              <div className="p-6">
                <h3 className="text-lg font-medium mb-4">Attendance Records</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-[#f9f9f9] text-[#666]">
                        <th className="text-left p-3 border-b border-[#e5e7eb]">Date</th>
                        <th className="text-left p-3 border-b border-[#e5e7eb]">Shift start</th>
                        <th className="text-left p-3 border-b border-[#e5e7eb]">Shift end</th>
                        <th className="text-left p-3 border-b border-[#e5e7eb]">Total hours</th>
                        <th className="text-left p-3 border-b border-[#e5e7eb]">Transactions</th>
                        <th className="text-left p-3 border-b border-[#e5e7eb]">POS Handled</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-[#e5e7eb]">
                        <td className="p-3">20 May, 2025</td>
                        <td className="p-3">9:12 am</td>
                        <td className="p-3">8:35 pm</td>
                        <td className="p-3">11h 23 mins</td>
                        <td className="p-3">112</td>
                        <td className="p-3">8,345,700.00</td>
                      </tr>
                      <tr className="border-b border-[#e5e7eb]">
                        <td className="p-3">19 May, 2025</td>
                        <td className="p-3">10:00 am</td>
                        <td className="p-3">9:00 pm</td>
                        <td className="p-3">10h 45 mins</td>
                        <td className="p-3">115</td>
                        <td className="p-3">5,400,500.00</td>
                      </tr>
                      <tr className="border-b border-[#e5e7eb]">
                        <td className="p-3">18 May, 2025</td>
                        <td className="p-3">11:30 am</td>
                        <td className="p-3">10:15 pm</td>
                        <td className="p-3">12h 05 mins</td>
                        <td className="p-3">118</td>
                        <td className="p-3">9,450,000.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="text-sm text-[#666] mt-4">Showing 1-100 of 232</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
