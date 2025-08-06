"use client";
import type React from "react";
import type { Role, UserProfile, WorkflowAction } from "@/app/types";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import apiRequest from "@/lib/apiRequest";
import { fetchInstitutionRoles, getDefaultInstitutionId } from "@/lib/helpers";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import next from "next";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { ArrowLeft } from "lucide-react";

export default function CreateApprovalStep() {
  const institutionId = useSelector(selectSelectedInstitution)?.id;
  const [stepName, setStepName] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [actionId, setActionId] = useState<string | undefined>(undefined);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [actions, setActions] = useState<WorkflowAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useDocumentTitle("CREATE AN APPROVAL STEP")

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [fetchedRolesResponse, actionsResponse] = await Promise.all([
          fetchAllRoles(),
          apiRequest.get("workflow/workflow-action/"),
        ]);

        setRoles(fetchedRolesResponse);
        setActions(actionsResponse.data);
      } catch (err: any) {
        setError("Failed to load required data for approval step");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    fetchUserProfiles();
  }, []);


  const fetchAllRoles = async () => {
    try {
      let allRoles: Role[] = [];
      let nextUrl: string | null = `user/role/?Institution_id=${getDefaultInstitutionId()}`;
      while (nextUrl) {
        const response = await apiRequest.get(nextUrl);
        allRoles = allRoles.concat(response.data.results);

        if (response.data.next) {
          const receivedNextUrl = new URL(response.data.next);
          nextUrl = `user/role/?Institution_id=${getDefaultInstitutionId()}&${receivedNextUrl.search}`;
        } else {
          nextUrl = null;
        }
      }
      return allRoles;
    } catch (error: any) {
      toast.error("Failed to fetch roles");
      throw error
    }
  };

  const fetchUserProfiles = async () => {
    try {
      const response = await apiRequest.get("institution/profile/" + institutionId);
      setUserProfiles(response.data.results);
    } catch (error: any) {
      setError("Failed to fetch institution users");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation checks
    if (!stepName.trim()) {
      setError("Step name is required");

      return;
    }

    if (selectedRoleIds.length === 0 && selectedUserIds.length === 0) {
      setError("Please select at least one role or user");

      return;
    }

    try {
      setSubmitting(true);
      if (!institutionId) {
        throw new Error("No institution context found");
      }

      const payload = {
        step_name: stepName,
        roles: selectedRoleIds,
        approvers: selectedUserIds,
        institution: institutionId,
        action: actionId ? Number(actionId) : undefined,
      };

      console.log("Submitting approval step:", payload);

      await apiRequest.post(`workflow/institution-approval-step/${institutionId}/`, payload);

      router.push("/admin/institution-approval-steps");
    } catch (err: any) {
      console.error("Error creating approval step:", err);
      setError("Failed to create approval step");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="rounded-full aspect-square" onClick={() => router.push("/admin")}>
            <ArrowLeft />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Create Approval Step</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Approval Step Details</CardTitle>
          <CardDescription>Configure the new approval step parameters</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <p>Loading resources...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Step Name */}
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="step-name">
                    Step Name
                  </label>
                  <Input
                    className="w-full"
                    id="step-name"
                    placeholder="Enter step name"
                    value={stepName}
                    onChange={(e) => setStepName(e.target.value)}
                  />
                </div>

                {/* Role Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Roles</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedRoleIds.map((id) => {
                      const role = roles.find((r) => r.id === id);

                      return role ? (
                        <div
                          key={id}
                          className="flex items-center gap-1 bg-primary/10 text-primary rounded-md px-2 py-1 text-sm"
                        >
                          {role.name}
                          <button
                            className="text-primary hover:text-primary/80"
                            type="button"
                            onClick={() =>
                              setSelectedRoleIds((prev) => prev.filter((roleId) => roleId !== id))
                            }
                          >
                            ×
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                  <Select
                    onValueChange={(value) => {
                      const id = Number(value);

                      if (!selectedRoleIds.includes(id)) {
                        setSelectedRoleIds((prev) => [...prev, id]);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select roles" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id.toString()}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* User Profiles Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">User Profiles</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedUserIds.map((id) => {
                      const userProfile = userProfiles.find((u) => u.id === id);

                      return userProfile ? (
                        <div
                          key={id}
                          className="flex items-center gap-1 bg-primary/10 text-primary rounded-md px-2 py-1 text-sm"
                        >
                          {userProfile.user.fullname || userProfile.user.email}
                          <button
                            className="text-primary hover:text-primary/80"
                            type="button"
                            onClick={() =>
                              setSelectedUserIds((prev) => prev.filter((userId) => userId !== id))
                            }
                          >
                            ×
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                  <Select
                    onValueChange={(value) => {
                      const id = Number(value);

                      if (!selectedUserIds.includes(id)) {
                        setSelectedUserIds((prev) => [...prev, id]);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select users" />
                    </SelectTrigger>
                    <SelectContent>
                      {userProfiles.map((userProfile) => (
                        <SelectItem key={userProfile.id} value={userProfile.id.toString()}>
                          {userProfile.user.fullname || userProfile.user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Action Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Action</label>
                  <Select value={actionId} onValueChange={(value) => setActionId(value)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an action" />
                    </SelectTrigger>
                    <SelectContent>
                      {actions.map((action) => (
                        <SelectItem key={action.id} value={action.id.toString()}>
                          {action.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Level Input with Tooltip */}
                {/* <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    Level
                    <span 
                      className="text-xs font-normal text-muted-foreground cursor-help border border-border rounded-full w-4 h-4 flex items-center justify-center"
                      title="Lower number = first to approve"
                    >
                      i
                    </span>
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    placeholder="Enter approval order level"
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower number indicates earlier approval in the process
                  </p>
                </div> */}
              </div>

              <div className="mt-8 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.push("/admin")}>
                  Cancel
                </Button>
                <Button disabled={submitting} type="submit">
                  {submitting ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Creating...
                    </>
                  ) : (
                    "Create Approval Step"
                  )}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
