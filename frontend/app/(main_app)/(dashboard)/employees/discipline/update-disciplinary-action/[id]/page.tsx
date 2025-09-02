"use client";

import type React from "react";
import {useState, useEffect} from "react";
import {useRouter, useParams} from "next/navigation";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {Checkbox} from "@/components/ui/checkbox";
import {ArrowLeft, Loader2, Plus} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  updateDisciplinaryAction,
  createDisciplineType,
  getDisciplineTypes,
  getPaginatedEmployees,
  getDisciplinaryActionById,
} from "@/lib/utils";
import type {DisciplinaryActionForm, IDisciplineTypeFormData, IEmployee} from "@/types/types.utils";
import {toast} from "sonner";
import {useSelector} from "react-redux";
import {selectSelectedInstitution, selectAttachedInstitutions} from "@/store/auth/selectors";
import {IUserInstitution} from "@/types";
import {EmployeeSearchableSelect} from "@/components/selects/employee-searchable-select";

export default function DisciplinaryUpdateForm() {
  const router = useRouter();
  const params = useParams();
  const disciplinaryActionId = params?.id as string;

  const selectedInstitution = useSelector(selectSelectedInstitution);
  const institutionsAttached = useSelector(selectAttachedInstitutions) as IUserInstitution[];
  const [institutionId, setInstitutionId] = useState<number | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDisciplineTypeModalOpen, setIsDisciplineTypeModalOpen] = useState(false);
  const [isAddingDisciplineType, setIsAddingDisciplineType] = useState(false);
  const [isLoadingDisciplineTypes, setIsLoadingDisciplineTypes] = useState(true);
  const [isLoadingDisciplinaryAction, setIsLoadingDisciplinaryAction] = useState(true);

  const [disciplineType, setDisciplineType] = useState<IDisciplineTypeFormData>({
    name: "",
    description: "",
    severity: "low",
    is_active: true,
  });

  const [disciplinaryAction, setDisciplinaryAction] = useState<DisciplinaryActionForm>({
    employee: "",
    discipline_type: "",
    incident_date: "",
    description: "",
    evidence: "",
    reported_by: "",
    assigned_to: "",
    status: "pending",
    action_taken: "",
    resolution_date: "",
    follow_up_required: false,
    follow_up_date: null,
    notes: "",
  });

  const [disciplineTypes, setDisciplineTypes] = useState<
    Array<{
      id: string;
      name: string;
      severity: "low" | "medium" | "high" | "critical";
    }>
  >([]);

  useEffect(() => {
    if (selectedInstitution) {
      setInstitutionId(selectedInstitution.id);
    } else if (institutionsAttached && institutionsAttached.length > 0) {
      setInstitutionId(institutionsAttached[0].id);
    }
  }, [institutionsAttached, selectedInstitution]);

  useEffect(() => {
    const fetchDisciplinaryAction = async () => {
      if (!disciplinaryActionId) {
        toast.error("Invalid disciplinary action ID");
        router.push("/employees/discipline");
        return;
      }
      setIsLoadingDisciplinaryAction(true);
      try {
        const idAsNumber = parseInt(disciplinaryActionId, 10);
        if (isNaN(idAsNumber)) {
          throw new Error("Invalid disciplinary action ID: must be a number");
        }
        const existingAction = await getDisciplinaryActionById(idAsNumber);
        if (!existingAction) {
          toast.error("Disciplinary action not found");
          router.push("/employees/discipline");
          return;
        }
        const mappedAction = {
          employee: existingAction.employee?.id?.toString() || "",
          discipline_type: existingAction.discipline_type?.id?.toString() || "",
          incident_date:
            existingAction.incident_date && !isNaN(new Date(existingAction.incident_date).getTime())
              ? new Date(existingAction.incident_date).toISOString().split("T")[0]
              : "",
          description: existingAction.description || "",
          evidence: existingAction.evidence || "",
          reported_by: existingAction.reported_by?.id?.toString() || "",
          assigned_to: existingAction.assigned_to?.id?.toString() || "",
          status: existingAction.status || "pending",
          action_taken: existingAction.action_taken || "",
          resolution_date:
            existingAction.resolution_date &&
            !isNaN(new Date(existingAction.resolution_date).getTime())
              ? new Date(existingAction.resolution_date).toISOString().split("T")[0]
              : "",
          follow_up_required: existingAction.follow_up_required || false,
          follow_up_date:
            existingAction.follow_up_date &&
            !isNaN(new Date(existingAction.follow_up_date).getTime())
              ? new Date(existingAction.follow_up_date).toISOString().split("T")[0]
              : null,
          notes: existingAction.notes || "",
        };
        setDisciplinaryAction(mappedAction);
      } catch (error: any) {
        toast.error("Failed to load disciplinary action");
        router.push("/employees/discipline");
      } finally {
        setIsLoadingDisciplinaryAction(false);
      }
    };
    fetchDisciplinaryAction();
  }, [disciplinaryActionId, router]);

  useEffect(() => {
    const fetchDisciplineTypes = async () => {
      if (!institutionId) return;

      setIsLoadingDisciplineTypes(true);
      try {
        const fetchedDisciplineTypes = await getDisciplineTypes({institutionId});

        if (fetchedDisciplineTypes) {
          const formattedTypes = fetchedDisciplineTypes.map((type) => ({
            id: type.id.toString(),
            name: type.name,
            severity: type.severity as "low" | "medium" | "high" | "critical",
          }));
          setDisciplineTypes(formattedTypes);
        } else {
          setDisciplineTypes([]);
        }
      } catch (error) {
        toast.error("Failed to load discipline types");
        setDisciplineTypes([]);
      } finally {
        setIsLoadingDisciplineTypes(false);
      }
    };

    fetchDisciplineTypes();
  }, [institutionId]);

  const severityOptions = [
    {value: "low", label: "Low", color: "bg-green-200 text-green-900"},
    {value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-800"},
    {value: "high", label: "High", color: "bg-orange-100 text-orange-800"},
    {value: "critical", label: "Critical", color: "bg-red-100 text-red-800"},
  ];

  const statusOptions = [
    {value: "pending", label: "Pending"},
    {value: "in_progress", label: "In Progress"},
    {value: "completed", label: "Completed"},
    {value: "dismissed", label: "Dismissed"},
  ];

  const validateForm = (): boolean => {
    const requiredFields = [
      {field: disciplinaryAction.employee, name: "Employee"},
      {field: disciplinaryAction.discipline_type, name: "Discipline Type"},
      {field: disciplinaryAction.incident_date, name: "Incident Date"},
      {field: disciplinaryAction.description, name: "Description"},
      {field: disciplinaryAction.reported_by, name: "Reported By"},
    ];

    for (const {field, name} of requiredFields) {
      if (!field || field.trim() === "" || field === "0") {
        toast.error(`${name} is required`);
        return false;
      }
    }

    if (disciplinaryAction.description.length < 10) {
      toast.error("Description must be at least 10 characters long");
      return false;
    }

    const incidentDate = new Date(disciplinaryAction.incident_date);
    const today = new Date();
    if (incidentDate > today) {
      toast.error("Incident date cannot be in the future");
      return false;
    }

    if (disciplinaryAction.follow_up_required && !disciplinaryAction.follow_up_date) {
      toast.error("Follow-up date is required when follow-up is checked");
      return false;
    }

    if (disciplinaryAction.follow_up_required && disciplinaryAction.follow_up_date) {
      const followUpDate = new Date(disciplinaryAction.follow_up_date);
      if (followUpDate < incidentDate) {
        toast.error("Follow-up date cannot be before the incident date");
        return false;
      }
    }

    return true;
  };

  const validateDisciplineTypeForm = (): boolean => {
    if (!disciplineType.name.trim()) {
      toast.error("Name is required");
      return false;
    }

    if (disciplineType.name.length > 100) {
      toast.error("Name cannot exceed 100 characters");
      return false;
    }

    return true;
  };

  const handleDisciplineTypeSubmit = async () => {
    if (!validateDisciplineTypeForm()) {
      return;
    }

    setIsAddingDisciplineType(true);

    try {
      const result = await createDisciplineType({
        disciplineTypeData: disciplineType,
      });
      if (result) {
        toast.success("Discipline type created successfully!");

        const newDisciplineType = {
          id: result.id?.toString() || Date.now().toString(),
          name: result.name || disciplineType.name,
          severity: (result.severity || disciplineType.severity) as
            | "low"
            | "medium"
            | "high"
            | "critical",
        };

        setDisciplineTypes((prev) => [...prev, newDisciplineType]);
        setDisciplinaryAction((prev) => ({...prev, discipline_type: newDisciplineType.id}));

        setDisciplineType({
          name: "",
          description: "",
          severity: "low",
          is_active: true,
        });
        setIsDisciplineTypeModalOpen(false);
      } else {
        toast.error("Failed to create discipline type. Please try again.");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to create discipline type. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsAddingDisciplineType(false);
    }
  };

  const handleDisciplinaryActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateDisciplinaryAction({
        disciplinaryActionId: parseInt(disciplinaryActionId, 10),
        disciplinaryActionData: disciplinaryAction,
      });

      if (result) {
        toast.success("Disciplinary action updated successfully!");
        router.push("/employees/discipline");
      } else {
        toast.error("Failed to update disciplinary action. Please try again.");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to update disciplinary action. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisciplineTypeCancel = () => {
    setDisciplineType({
      name: "",
      description: "",
      severity: "low",
      is_active: true,
    });
    setIsDisciplineTypeModalOpen(false);
  };

  const handleDisciplinaryActionCancel = () => {
    router.push("/employees/discipline");
  };

  if (isLoadingDisciplinaryAction) {
    return (
      <div className="min-h-screen w-full bg-gray-50 p-6">
        <div className="max-w-full mx-auto">
          <Card className="w-full">
            <CardContent className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-myOrange" />
                <p className="text-lg text-gray-600">Loading disciplinary action...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen w-full bg-white-50">
      <div className="max-w-full">
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-start gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBack}
                className="rounded-full aspect-ratio"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
              </Button>
              <CardTitle>Update Disciplinary Action</CardTitle>
            </div>
            <CardDescription>Modify the details of this disciplinary action</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDisciplinaryActionSubmit} className="space-y-8">
              {/* Basic Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="employee">Employee *</Label>
                  <EmployeeSearchableSelect
                    value={[disciplinaryAction.employee]}
                    onValueChange={(value) =>
                      setDisciplinaryAction({...disciplinaryAction, employee: value.toString()})
                    }
                    disabled={isSubmitting}
                    placeholder="Search and select employee"
                    showEmployeeId={false}
                    showDepartment={false}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discipline_type">Discipline Type *</Label>
                  <div className="flex gap-2">
                    <Select
                      value={disciplinaryAction.discipline_type}
                      onValueChange={(value) =>
                        setDisciplinaryAction({...disciplinaryAction, discipline_type: value})
                      }
                      disabled={isSubmitting || isLoadingDisciplineTypes}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue
                          placeholder={
                            isLoadingDisciplineTypes ? "Loading..." : "Select discipline type"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {disciplineTypes.length > 0 ? (
                          disciplineTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              <div className="flex items-center gap-2">
                                {type.name}
                                <Badge
                                  variant="outline"
                                  className={
                                    severityOptions.find((s) => s.value === type.severity)?.color
                                  }
                                >
                                  {type.severity}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-1.5 text-sm text-gray-500">
                            {isLoadingDisciplineTypes
                              ? "Loading discipline types..."
                              : "No discipline types available"}
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <Dialog
                      open={isDisciplineTypeModalOpen}
                      onOpenChange={setIsDisciplineTypeModalOpen}
                    >
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0"
                          title="Add new discipline type"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Add New Discipline Type</DialogTitle>
                          <DialogDescription>
                            Create a new discipline type for your organization.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="disciplineTypeName">Name *</Label>
                            <Input
                              id="disciplineTypeName"
                              value={disciplineType.name}
                              onChange={(e) =>
                                setDisciplineType({...disciplineType, name: e.target.value})
                              }
                              placeholder="e.g., Tardiness, Insubordination, Safety Violation"
                              maxLength={100}
                            />
                            <p className="text-xs text-muted-foreground">
                              {disciplineType.name.length}/100 characters
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="disciplineTypeSeverity">Severity Level *</Label>
                            <Select
                              value={disciplineType.severity}
                              onValueChange={(value: any) =>
                                setDisciplineType({...disciplineType, severity: value})
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {severityOptions.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className={option.color}>
                                        {option.label}
                                      </Badge>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="disciplineTypeDescription">Description</Label>
                            <Textarea
                              id="disciplineTypeDescription"
                              value={disciplineType.description}
                              onChange={(e) =>
                                setDisciplineType({...disciplineType, description: e.target.value})
                              }
                              placeholder="Detailed description of this discipline type"
                              rows={3}
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="disciplineTypeActive"
                              checked={disciplineType.is_active}
                              onCheckedChange={(checked) =>
                                setDisciplineType({...disciplineType, is_active: !!checked})
                              }
                            />
                            <Label htmlFor="disciplineTypeActive" className="text-sm">
                              Active (inactive types won't be available for new actions)
                            </Label>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleDisciplineTypeCancel}
                            disabled={isAddingDisciplineType}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            onClick={handleDisciplineTypeSubmit}
                            disabled={isAddingDisciplineType || !disciplineType.name.trim()}
                          >
                            {isAddingDisciplineType ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Adding...
                              </>
                            ) : (
                              "Add Discipline Type"
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={disciplinaryAction.status}
                    onValueChange={(value: any) =>
                      setDisciplinaryAction({...disciplinaryAction, status: value})
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="incident_date">Incident Date *</Label>
                  <Input
                    id="incident_date"
                    type="date"
                    value={disciplinaryAction.incident_date}
                    onChange={(e) =>
                      setDisciplinaryAction({...disciplinaryAction, incident_date: e.target.value})
                    }
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="resolution_date">Resolution Date</Label>
                  <Input
                    id="resolution_date"
                    type="date"
                    value={disciplinaryAction.resolution_date}
                    onChange={(e) =>
                      setDisciplinaryAction({
                        ...disciplinaryAction,
                        resolution_date: e.target.value,
                      })
                    }
                    disabled={isSubmitting}
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="follow_up_required"
                      checked={disciplinaryAction.follow_up_required}
                      onCheckedChange={(checked) =>
                        setDisciplinaryAction({
                          ...disciplinaryAction,
                          follow_up_required: !!checked,
                          follow_up_date: checked ? disciplinaryAction.follow_up_date : null,
                        })
                      }
                      className="data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
                      disabled={isSubmitting}
                    />
                    <Label htmlFor="follow_up_required" className="text-orange-800 font-medium">
                      Follow-up Required
                    </Label>
                  </div>
                  {disciplinaryAction.follow_up_required && (
                    <div className="flex-1">
                      <Label htmlFor="follow_up_date" className="sr-only">
                        Follow-up Date *
                      </Label>
                      <Input
                        id="follow_up_date"
                        type="date"
                        value={disciplinaryAction.follow_up_date || ""}
                        onChange={(e) =>
                          setDisciplinaryAction({
                            ...disciplinaryAction,
                            follow_up_date: e.target.value,
                          })
                        }
                        disabled={isSubmitting}
                        required
                        placeholder="Follow-up Date"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Assignment */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="reported_by">Reported By *</Label>
                  <EmployeeSearchableSelect
                    value={[disciplinaryAction.reported_by]}
                    onValueChange={(value) =>
                      setDisciplinaryAction({...disciplinaryAction, reported_by: value.toString()})
                    }
                    disabled={isSubmitting}
                    placeholder="Search and select reporter"
                    showEmployeeId={false}
                    showDepartment={false}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assigned_to">Assigned To</Label>
                  <EmployeeSearchableSelect
                    value={[disciplinaryAction.assigned_to]}
                    onValueChange={(value) =>
                      setDisciplinaryAction({...disciplinaryAction, assigned_to: value.toString()})
                    }
                    disabled={isSubmitting}
                    placeholder="Search and select assignee"
                    showEmployeeId={false}
                    showDepartment={false}
                  />
                </div>
              </div>

              {/* Description and Evidence - Full Width */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the incident (minimum 10 characters)"
                    value={disciplinaryAction.description}
                    onChange={(e) =>
                      setDisciplinaryAction({...disciplinaryAction, description: e.target.value})
                    }
                    required
                    minLength={10}
                    rows={5}
                    className="resize-none"
                    disabled={isSubmitting}
                  />
                  <p className="text-sm text-muted-foreground">
                    {disciplinaryAction.description.length}/10 characters minimum
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="evidence">Evidence</Label>
                  <Textarea
                    id="evidence"
                    placeholder="Any supporting evidence or documentation"
                    value={disciplinaryAction.evidence}
                    onChange={(e) =>
                      setDisciplinaryAction({...disciplinaryAction, evidence: e.target.value})
                    }
                    rows={5}
                    className="resize-none"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Action Taken - Full Width */}
              <div className="space-y-2">
                <Label htmlFor="action_taken">Action Taken</Label>
                <Textarea
                  id="action_taken"
                  placeholder="Describe the action taken to resolve this issue"
                  value={disciplinaryAction.action_taken}
                  onChange={(e) =>
                    setDisciplinaryAction({...disciplinaryAction, action_taken: e.target.value})
                  }
                  rows={4}
                  className="resize-none"
                  disabled={isSubmitting}
                />
              </div>

              {/* Additional Notes - Full Width */}
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes or comments"
                  value={disciplinaryAction.notes}
                  onChange={(e) =>
                    setDisciplinaryAction({...disciplinaryAction, notes: e.target.value})
                  }
                  rows={4}
                  className="resize-none"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex items-center justify-end gap-8 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className=""
                  onClick={handleDisciplinaryActionCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" className="" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Disciplinary Action"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
