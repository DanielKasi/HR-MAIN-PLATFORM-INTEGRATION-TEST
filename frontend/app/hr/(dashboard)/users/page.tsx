"use client";

import type {UserProfile} from "@/app/types";

import {useEffect, useState} from "react";
import {Search, ChevronDown, Eye, Trash2, ArrowLeft, Plus} from "lucide-react";
import {useRouter} from "next/navigation";

import {AddUserForm} from "./addUser";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Avatar, AvatarFallback} from "@/components/ui/avatar";
import apiRequest from "@/lib/apiRequest";
import {capitalizeEachWord, getDefaultInstitutionId} from "@/lib/helpers";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {PaginationControls} from "@/components/ui/pagination-controls";
import {PageSizeSelector} from "@/components/ui/page-size-selector";
import ProtectedComponent from "@/components/ProtectedComponent";
import {PERMISSION_CODES} from "@/app/types/types.utils";
import {handleApiError} from "@/lib/apiErrorHandler";

export default function StaffPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [selectedBranch, setSelectedBranch] = useState("All Branches");
  const [selectedRole, setSelectedRole] = useState("All Roles");
  const [selectedStatus, setSelectedStatus] = useState("All status");
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    next: null,
    previous: null,
    count: 0,
  });
  const router = useRouter();

  const fetchUserProfiles = async () => {
    setLoading(true);
    const InstitutionId = getDefaultInstitutionId();

    try {
      const response = await apiRequest.get(
        `institution/profile/${InstitutionId}/?page_size=${pageSize}`,
      );

      const data = response.data;

      // Check if the response is paginated
      if (data.results && data.count !== undefined) {
        setUserProfiles(data.results);
        setPagination({
          next: data.next,
          previous: data.previous,
          count: data.count,
        });
      } else {
        // Handle non-paginated response
        setUserProfiles(data);
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
    fetchUserProfiles();
  }, [pageSize]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
  };

  const handlePageChange = (url: string | null) => {
    if (url) {
      fetchRoles();
    }
  };

  useEffect(() => {
    fetchUserProfiles();
  }, []);

  const filteredStaff = userProfiles.filter((userProfile) => {
    // Search filter
    const matchesSearch =
      searchQuery === "" ||
      userProfile.user.fullname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      userProfile.user.email.toLowerCase().includes(searchQuery.toLowerCase());

    // Branch filter
    const matchesBranch =
      selectedBranch === "All Branches" ||
      userProfile.user.branches?.some((branch) => branch.branch_name === selectedBranch);

    // Role filter
    const matchesRole =
      selectedRole === "All Roles" ||
      (userProfile.user.roles &&
        userProfile.user.roles.length > 0 &&
        capitalizeEachWord(userProfile.user.roles[0].name) === selectedRole);

    // Status filter
    const matchesStatus =
      selectedStatus === "All status" ||
      (selectedStatus === "Active" && userProfile.user.is_active) ||
      (selectedStatus === "Inactive" && !userProfile.user.is_active);

    return matchesSearch && matchesBranch && matchesRole && matchesStatus;
  });

  // Function to get the first role name or "No Role Assigned".
  const getUserRoleName = (userProfile: UserProfile) => {
    if (userProfile.user.roles && userProfile.user.roles.length > 0) {
      return capitalizeEachWord(userProfile.user.roles[0].name);
    }

    return "No Role Assigned";
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => router.push("/admin")}>
            Back to Admin
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Staff</h1>
        </div>
        <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_USERS}>
          <AddUserForm onAddSuccess={fetchUserProfiles} />
        </ProtectedComponent>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Staff</CardTitle>
          <CardDescription className="py-3">Manage your staff details</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:w-[400px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                className="pl-9 border-gray-300 bg-white"
                placeholder="Search Staff"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="border-gray-300 bg-white text-gray-700" variant="outline">
                    {selectedBranch} <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSelectedBranch("All Branches")}>
                    All Branches
                  </DropdownMenuItem>
                  {Array.from(
                    new Set(
                      userProfiles.flatMap(
                        (profile) =>
                          profile.user.branches?.map((branch) => branch.branch_name) || [],
                      ),
                    ),
                  ).map((branch) => (
                    <DropdownMenuItem key={branch} onClick={() => setSelectedBranch(branch)}>
                      {branch}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="border-gray-300 bg-white text-gray-700" variant="outline">
                    {selectedRole} <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSelectedRole("All Roles")}>
                    All Roles
                  </DropdownMenuItem>
                  {Array.from(
                    new Set(
                      userProfiles
                        .filter((profile) => profile.user.roles && profile.user.roles.length > 0)
                        .map((profile) => capitalizeEachWord(profile.user.roles[0].name)),
                    ),
                  ).map((role) => (
                    <DropdownMenuItem key={role} onClick={() => setSelectedRole(role)}>
                      {role}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="border-gray-300 bg-white text-gray-700" variant="outline">
                    {selectedStatus} <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setSelectedStatus("All status")}>
                    All status
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedStatus("Active")}>
                    Active
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSelectedStatus("Inactive")}>
                    Inactive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div>
              <PageSizeSelector
                disabled={loading}
                pageSize={pageSize}
                onPageSizeChange={handlePageSizeChange}
              />
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-white border-b border-gray-200">
                <TableRow>
                  <TableHead className="text-gray-600 font-medium">Name</TableHead>
                  <TableHead className="text-gray-600 font-medium">Contact Info</TableHead>
                  <TableHead className="text-gray-600 font-medium">Role</TableHead>
                  <TableHead className="text-gray-600 font-medium">Branch Access</TableHead>
                  <TableHead className="text-gray-600 font-medium">Status</TableHead>
                  <TableHead className="text-gray-600 font-medium text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              {filteredStaff.length > 0 ? (
                <TableBody>
                  {filteredStaff.map((userProfile) => (
                    <TableRow key={userProfile.id} className="border-b border-gray-100">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 bg-gray-200">
                            <AvatarFallback className="text-gray-600">
                              {userProfile.user.fullname?.substring(0, 2).toUpperCase() || "??"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="font-medium">
                            {userProfile.user.fullname
                              ? capitalizeEachWord(userProfile.user.fullname)
                              : "Unknown User"}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-600">{userProfile.user.email}</TableCell>
                      <TableCell className="text-gray-600">
                        {getUserRoleName(userProfile)}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {userProfile.user.branches?.length
                          ? userProfile.user.branches.map((branch) => branch.branch_name).join(", ")
                          : "No branches assigned"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            userProfile.user.is_active
                              ? "bg-[#dcfce7] text-[#10b981]"
                              : "bg-[#fee2e2] text-[#ef4444]"
                          }`}
                        >
                          {userProfile.user.is_active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            className="h-8 w-8 text-gray-500 hover:text-gray-700"
                            size="icon"
                            variant="ghost"
                            onClick={() => router.push(`/users/${userProfile.user.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            className="h-8 w-8 text-gray-500 hover:text-red-500"
                            size="icon"
                            variant="ghost"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              ) : (
                <TableBody>
                  <TableRow>
                    <TableCell className="text-center py-8 text-gray-500" colSpan={6}>
                      No staff found
                    </TableCell>
                  </TableRow>
                </TableBody>
              )}
            </Table>
          </div>

          <div className="mt-4">
            <PaginationControls
              currentItems={filteredStaff.length}
              isLoading={loading}
              pagination={pagination}
              onPageChange={handlePageChange}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
function fetchRoles() {
  throw new Error("Function not implemented.");
}

function setPageSize(newSize: number) {
  throw new Error("Function not implemented.");
}
