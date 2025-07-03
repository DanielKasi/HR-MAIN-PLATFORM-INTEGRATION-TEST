"use client";
import type React from "react";
import type {ApprovalStep, Role, UserProfile, WorkflowAction} from "@/app/types";

import {useParams, useRouter} from "next/navigation";
import {useEffect, useState} from "react";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {SearchableSelect, type SearchableSelectItem} from "@/components/searchable-select";
import apiRequest from "@/lib/apiRequest";
import {fetchInstitutionRoles, getDefaultInstitutionId} from "@/lib/helpers";
import {handleApiError} from "@/lib/apiErrorHandler";

export default function EditApprovalStep() {
  const params = useParams();
  const stepId = Number.parseInt(params.id as string);
  const [stepName, setStepName] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [actionId, setActionId] = useState<number | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [actions, setActions] = useState<WorkflowAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rolesResponse, actionsResponse, stepResponse] = await Promise.all([
          fetchInstitutionRoles(),
          apiRequest.get("workflow/workflow-action/"),
          apiRequest.get(
            `workflow/Institution-approval-step/${getDefaultInstitutionId()}/?step=${stepId}`,
          ),
        ]);

        setRoles(rolesResponse.data);
        setActions(actionsResponse.data);

        // Set form data from the step
        const stepData: ApprovalStep = stepResponse.data;

        setStepName(stepData.step_name);
        setSelectedRoleIds(stepData.roles || []);
        setSelectedUserIds(stepData.approvers_details?.map((u) => u.approver_user.id) || []);
        setActionId(stepData.action);
      } catch (err: any) {
        setError("Failed to load required data for approval step");
        handleApiError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    fetchUserProfiles();
  }, [stepId]);

  useEffect(() => {}, [selectedUserIds]);

  const fetchUserProfiles = async () => {
    try {
      const InstitutionId = getDefaultInstitutionId();
      const response = await apiRequest.get("institution/profile/" + InstitutionId);

      setUserProfiles(response.data);
    } catch (error: any) {
      setError("Failed to fetch Institution users");
      handleApiError(error);
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

      const InstitutionId = getDefaultInstitutionId();

      if (!InstitutionId) {
        throw new Error("No Institution context found");
      }

      const payload = {
        step_name: stepName,
        roles: selectedRoleIds,
        approvers: selectedUserIds,
        institution: InstitutionId,
        action: actionId,
      };

      // Send PATCH request to update the step
      await apiRequest.patch(
        `workflow/Institution-approval-step/${InstitutionId}/?step=${stepId}`,
        payload,
      );

      // Redirect to approval steps list
      router.push("/admin/Institution-approval-steps");
    } catch (err: any) {
      setError("Failed to update approval step");
      handleApiError(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Convert data to format expected by SearchableSelect
  const roleItems: SearchableSelectItem[] = roles.map((role) => ({
    id: role.id,
    label: role.name,
    value: role.name,
  }));

  const userItems: SearchableSelectItem[] = userProfiles.map((user) => ({
    id: user.id,
    label: user.user.fullname || user.user.email,
    value: user.user.fullname || user.user.email,
  }));

  const actionItems: SearchableSelectItem[] = actions.map((action) => ({
    id: action.id,
    label: `${action.label} (${action.code})`,
    value: `${action.label} ${action.code}`,
  }));

  // Render selected items for multi-select
  const renderSelectedRoles = (selectedIds: (number | string)[], items: SearchableSelectItem[]) => (
    <div className="flex flex-wrap gap-2">
      {selectedIds.map((id) => {
        const item = items.find((i) => i.id === id);

        return item ? (
          <div
            key={id}
            className="flex items-center gap-1 bg-primary/10 text-primary rounded-md px-2 py-1 text-sm"
          >
            {item.label}
            <button
              className="text-primary hover:text-primary/80"
              type="button"
              onClick={() => setSelectedRoleIds((prev) => prev.filter((roleId) => roleId !== id))}
            >
              ×
            </button>
          </div>
        ) : null;
      })}
    </div>
  );

  const renderSelectedUsers = (selectedIds: (number | string)[], items: SearchableSelectItem[]) => (
    <div className="flex flex-wrap gap-2">
      {selectedIds.map((id) => {
        const item = items.find((i) => i.id === id);

        return item ? (
          <div
            key={id}
            className="flex items-center gap-1 bg-primary/10 text-primary rounded-md px-2 py-1 text-sm"
          >
            {item.label}
            <button
              className="text-primary hover:text-primary/80"
              type="button"
              onClick={() => setSelectedUserIds((prev) => prev.filter((userId) => userId !== id))}
            >
              ×
            </button>
          </div>
        ) : null;
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push("/admin/Institution-approval-steps")}
          >
            Back to Approval Steps
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Edit Approval Step</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Approval Step</CardTitle>
          <CardDescription>Update the approval step parameters</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <p>Loading step data...</p>
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
                  <SearchableSelect
                    emptyMessage="No roles found."
                    items={roleItems}
                    multiple={true}
                    placeholder="Select roles"
                    renderSelectedItems={renderSelectedRoles}
                    searchPlaceholder="Search roles..."
                    selectedItems={selectedRoleIds}
                    onSelect={(id) => {
                      if (!selectedRoleIds.includes(id as number)) {
                        setSelectedRoleIds((prev) => [...prev, id as number]);
                      }
                    }}
                  />
                </div>

                {/* User Profiles Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">User Profiles</label>
                  <SearchableSelect
                    emptyMessage="No users found."
                    items={userItems}
                    multiple={true}
                    placeholder="Select users"
                    renderSelectedItems={renderSelectedUsers}
                    searchPlaceholder="Search users..."
                    selectedItems={selectedUserIds}
                    onSelect={(id) => {
                      if (!selectedUserIds.includes(id as number)) {
                        setSelectedUserIds((prev) => [...prev, id as number]);
                      }
                    }}
                  />
                </div>

                {/* Action Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Action</label>
                  <SearchableSelect
                    emptyMessage="No actions found."
                    items={actionItems}
                    multiple={false}
                    placeholder="Select an action"
                    searchPlaceholder="Search actions..."
                    selectedItems={actionId ? [actionId] : []}
                    onSelect={(id) => setActionId(id as number)}
                  />
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/admin/Institution-approval-steps")}
                >
                  Cancel
                </Button>
                <Button disabled={submitting} type="submit">
                  {submitting ? (
                    <>
                      <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Updating...
                    </>
                  ) : (
                    "Update Approval Step"
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
