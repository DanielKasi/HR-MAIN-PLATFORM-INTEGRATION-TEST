"use client";
import type {ApprovalStep} from "@/types";

import {
  Search,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Save,
  ArrowLeft,
} from "lucide-react";
import {Fragment, useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {toast} from "react-toastify";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {Input} from "@/components/ui/input";
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from "@/components/ui/tooltip";
import apiRequest from "@/lib/apiRequest";
import {DeleteConfirmationDialog} from "@/components/delete-confirmation-dialog";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import {useSelector} from "react-redux";
import {capitalizeEachWord} from "@/lib/helpers";
import {ConfirmationDialog} from "@/components/confirmation-dialog";

export default function ShopApprovalStepsPage() {
  const currentInstitution = useSelector(selectSelectedInstitution);
  const [searchQuery, setSearchQuery] = useState("");
  const [approvalSteps, setApprovalSteps] = useState<ApprovalStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState("10");
  const [expandedActions, setExpandedActions] = useState<number[]>([]);
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingStepId, setDeletingStepId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reorderedActions, setReorderedActions] = useState<Record<string, boolean>>({});
  const [savingOrder, setSavingOrder] = useState<Record<string, boolean>>({});

  const fetchApprovalSteps = async () => {
    try {
      if (!currentInstitution?.id) {
        throw new Error("No institution context found");
      }

      const response = await apiRequest.get(
        `workflow/institution-approval-step/${currentInstitution.id}/`,
      );
      const responseData: ApprovalStep[] = response.data.results;

      setApprovalSteps(responseData.sort((a, b) => a.level - b.level));
      setReorderedActions({});
    } catch (error: any) {
      setError(error.message || "Failed to fetch approval steps");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentInstitution?.id) {
      fetchApprovalSteps();
    }
  }, [currentInstitution]);

  const filteredSteps = approvalSteps.filter(
    (step) =>
      step.step_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      step.roles_details.some((role) =>
        role.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ) ||
      step.action_details.label.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Group steps by action
  const stepsByAction = filteredSteps.reduce(
    (acc, step) => {
      const actionId = step.action_details.id;

      if (!acc[actionId]) {
        acc[actionId] = {
          action: step.action_details,
          steps: [],
        };
      }
      acc[actionId].steps.push(step);

      return acc;
    },
    {} as Record<string, {action: ApprovalStep["action_details"]; steps: ApprovalStep[]}>,
  );

  // Sort steps by level within each action group
  Object.values(stepsByAction).forEach((actionGroup) => {
    actionGroup.steps.sort((a, b) => a.level - b.level);
  });

  const toggleActionExpand = (actionId: number) => {
    setExpandedActions((prev) =>
      prev.includes(actionId) ? prev.filter((id) => id !== actionId) : [...prev, actionId],
    );
  };

  const handleEditStep = (stepId: number) => {
    router.push(`/admin/institution-approval-steps/edit/${stepId}`);
  };

  const handleDelete = async (stepId: number) => {
    setDeletingStepId(stepId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      const institutionId = useSelector(selectSelectedInstitution);

      if (!institutionId) {
        throw new Error("No institution context found");
      }

      await apiRequest.delete(
        `workflow/institution-approval-step/${institutionId}/?step=${deletingStepId}`,
      );
      await fetchApprovalSteps();
      setDeleteDialogOpen(false);
      toast.info("Approval step deleted successfully");
    } catch (error: any) {
      setError(error.message || "Failed to delete approval step");
    } finally {
      setIsDeleting(false);
      setDeletingStepId(null);
    }
  };

  const moveStepUp = (actionId: number, stepIndex: number) => {
    if (stepIndex === 0) return;

    setApprovalSteps((prevSteps) => {
      const newSteps = [...prevSteps];

      // Find the steps for this action
      const actionSteps = newSteps
        .filter((step) => step.action_details.id === actionId)
        .sort((a, b) => a.level - b.level);

      if (stepIndex > 0 && stepIndex < actionSteps.length) {
        // Swap levels between current step and the one above it
        const currentStep = actionSteps[stepIndex];
        const prevStep = actionSteps[stepIndex - 1];

        const currentLevel = currentStep.level;
        const prevLevel = prevStep.level;

        // Find these steps in the original array and swap their levels
        const currentStepIndex = newSteps.findIndex((s) => s.id === currentStep.id);
        const prevStepIndex = newSteps.findIndex((s) => s.id === prevStep.id);

        if (currentStepIndex !== -1 && prevStepIndex !== -1) {
          newSteps[currentStepIndex] = {
            ...newSteps[currentStepIndex],
            level: prevLevel,
          };
          newSteps[prevStepIndex] = {
            ...newSteps[prevStepIndex],
            level: currentLevel,
          };

          // Mark this action as reordered
          setReorderedActions((prev) => ({...prev, [actionId]: true}));
        }
      }

      return newSteps;
    });
  };

  const moveStepDown = (actionId: number, stepIndex: number) => {
    setApprovalSteps((prevSteps) => {
      const newSteps = [...prevSteps];

      // Find the steps for this action
      const actionSteps = newSteps
        .filter((step) => step.action_details.id === actionId)
        .sort((a, b) => a.level - b.level);

      if (stepIndex >= 0 && stepIndex < actionSteps.length - 1) {
        // Swap levels between current step and the one below it
        const currentStep = actionSteps[stepIndex];
        const nextStep = actionSteps[stepIndex + 1];

        const currentLevel = currentStep.level;
        const nextLevel = nextStep.level;

        // Find these steps in the original array and swap their levels
        const currentStepIndex = newSteps.findIndex((s) => s.id === currentStep.id);
        const nextStepIndex = newSteps.findIndex((s) => s.id === nextStep.id);

        if (currentStepIndex !== -1 && nextStepIndex !== -1) {
          newSteps[currentStepIndex] = {
            ...newSteps[currentStepIndex],
            level: nextLevel,
          };
          newSteps[nextStepIndex] = {
            ...newSteps[nextStepIndex],
            level: currentLevel,
          };

          // Mark this action as reordered
          setReorderedActions((prev) => ({...prev, [actionId]: true}));
        }
      }

      return newSteps;
    });
  };

  const saveReorderedSteps = async (actionId: number) => {
    try {
      setSavingOrder((prev) => ({...prev, [actionId]: true}));

      if (!currentInstitution?.id) {
        throw new Error("No institution context found");
      }

      // Get all steps for this action
      const stepsToUpdate = approvalSteps
        .filter((step) => step.action_details.id === actionId)
        .map((step) => ({
          id: step.id,
          level: step.level,
        }));

      // Send the update request
      await apiRequest.patch(
        `workflow/institution-approval-step/${currentInstitution.id}/reorder/`,
        {
          steps: stepsToUpdate,
        },
      );

      // Update success state
      setReorderedActions((prev) => {
        const newState = {...prev};

        delete newState[actionId];

        return newState;
      });

      toast.success("The approval steps order has been successfully updated.");
    } catch (error: any) {
      setError(error.message || "Failed to update steps order");
      toast.error("Failed to update the approval steps order.");
    } finally {
      setSavingOrder((prev) => {
        const newState = {...prev};

        delete newState[actionId];

        return newState;
      });
    }
  };

  const getNestedValue = (obj: any, path: string) => {
    if (!obj) return undefined;

    const keys = path.split(".");
    let result = obj;

    for (const key of keys) {
      if (result === undefined || result === null) return undefined;
      result = result[key];
    }

    return result;
  };

  // Helper function to format roles or approvers display
  const formatItemsList = (items: any[], nameKey: string) => {
    if (!items || items.length === 0) return "None";

    if (items.length === 1) {
      const value = getNestedValue(items[0], nameKey);

      return value ? capitalizeEachWord(value) : "Unknown";
    }

    const firstValue = getNestedValue(items[0], nameKey);

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger className="text-left underline decoration-dotted">
            {firstValue ? capitalizeEachWord(firstValue) : "Unknown"}{" "}
            {items.length > 1 && `(+${items.length - 1} more)`}
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-1">
              <p className="font-semibold">All {items.length > 1 ? "items" : "item"}:</p>
              <ul className="list-disc pl-4">
                {items.map((item, i) => {
                  const value = getNestedValue(item, nameKey);

                  return <li key={i}>{value ? capitalizeEachWord(value) : "Unknown"}</li>;
                })}
              </ul>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="rounded-full aspect-square"
            variant="outline"
            onClick={() => router.back()}
          >
            <ArrowLeft />
          </Button>
          <div className="mt-3 ml-2">
            <h1 className="text-2xl font-bold tracking-tight">Approval Steps</h1>
            <p className="text-muted-foreground">
              Manage the multi-step approval process for your institution workflows
            </p>
          </div>
        </div>
      </div>

      {/* Search bar, filters, and button on same line */}
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mt-10">
        <div className="flex flex-1 items-center gap-4">
          {/* Search bar */}
          <div className="relative flex-1 max-w-2xl">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="w-full pl-8"
              placeholder="Search approval steps, roles, or actions..."
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Entries per page filter */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Select value={entriesPerPage} onValueChange={setEntriesPerPage}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="10" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              Entries Per Page
            </span>
          </div>
        </div>

        {/* New Approval Step button */}
        <Button
          className="flex-shrink-0"
          onClick={() => router.push("/admin/institution-approval-steps/create")}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Approval Step
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 text-sm font-medium text-white bg-red-500 rounded-md flex items-center">
          <span className="mr-2">⚠️</span> {error}
        </div>
      )}

      {/* Table without card wrapper */}
      <div className="overflow-x-auto mt-10">
        <Table className="min-w-[800px] [&_th]:border-0 [&_td]:border-0">
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Action</TableHead>
              <TableHead>Category</TableHead>

              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell className="h-24 text-center" colSpan={5}>
                  Loading approval steps...
                </TableCell>
              </TableRow>
            ) : Object.keys(stepsByAction).length > 0 ? (
              Object.entries(stepsByAction).map(([actionId, {action, steps}], idx) => (
                <Fragment key={idx}>
                  <TableRow
                    key={`${actionId}-${idx}-${action.code}`}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleActionExpand(action.id)}
                  >
                    <TableCell>
                      {expandedActions.includes(action.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{action.label}</TableCell>
                    <TableCell>{action.category.label}</TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {reorderedActions[action.id] && (
                          <Button
                            className="gap-1"
                            disabled={savingOrder[action.id]}
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveReorderedSteps(action.id);
                            }}
                          >
                            {savingOrder[action.id] ? (
                              <>
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="h-3 w-3" /> Save Order
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded roles section */}
                  {expandedActions.includes(action.id) && (
                    <TableRow className="bg-muted/30">
                      <TableCell className="p-0" colSpan={5}>
                        <div className="px-4 py-2">
                          <h4 className="text-sm font-medium mb-2">Roles & Approval Steps</h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Step Name</TableHead>
                                <TableHead>Roles</TableHead>
                                <TableHead>Approvers</TableHead>
                                <TableHead>Level</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {steps.map((step, idx) => (
                                <TableRow key={`${step.action}-${idx}-${step.step_name}`}>
                                  <TableCell className="font-medium">
                                    {capitalizeEachWord(step.step_name)}
                                  </TableCell>
                                  <TableCell>
                                    {formatItemsList(step.roles_details, "name")}
                                  </TableCell>
                                  <TableCell>
                                    {step.approvers_details && step.approvers_details.length > 0
                                      ? formatItemsList(
                                          step.approvers_details,
                                          "approver_user.user.fullname",
                                        )
                                      : "None"}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      {step.level}
                                      <span className="text-xs text-muted-foreground">
                                        {step.level === Math.min(...steps.map((s) => s.level))
                                          ? "(First)"
                                          : step.level === Math.max(...steps.map((s) => s.level))
                                            ? "(Last)"
                                            : ""}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      {/* Reordering buttons */}
                                      <Button
                                        className={idx === 0 ? "opacity-50" : ""}
                                        disabled={idx === 0}
                                        size="icon"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          moveStepUp(action.id, idx);
                                        }}
                                      >
                                        <ArrowUp className="h-4 w-4 text-primary" />
                                        <span className="sr-only">Move Up</span>
                                      </Button>
                                      <Button
                                        className={idx === steps.length - 1 ? "opacity-50" : ""}
                                        disabled={idx === steps.length - 1}
                                        size="icon"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          moveStepDown(action.id, idx);
                                        }}
                                      >
                                        <ArrowDown className="h-4 w-4 text-primary" />
                                        <span className="sr-only">Move Down</span>
                                      </Button>

                                      {/* Edit and Delete buttons */}
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleEditStep(step.id);
                                        }}
                                      >
                                        <Pencil className="h-4 w-4 text-primary" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDelete(step.id);
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell className="h-24 text-center" colSpan={5}>
                  No approval steps found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!loading && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing 1 to{" "}
            {Math.min(Object.keys(stepsByAction).length, Number.parseInt(entriesPerPage))} of{" "}
            {Object.keys(stepsByAction).length} entries
          </div>
          <div className="flex items-center gap-2">
            <Button disabled size="sm" variant="outline">
              Previous
            </Button>
            <Button className="bg-primary text-primary-foreground" size="sm" variant="outline">
              1
            </Button>
            <Button disabled size="sm" variant="outline">
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        description="Are you sure you want to delete this approval step? This action cannot be undone."
        disabled={isDeleting}
        isOpen={deleteDialogOpen}
        title="Delete Approval Step"
        onConfirm={confirmDelete}
        onClose={() => {
          setIsDeleting(false);
          setDeleteDialogOpen(false);
        }}
      />
    </div>
  );
}
