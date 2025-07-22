"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createDisciplinaryAction, createDisciplineType, getDisciplineTypes, getAllEmployees } from "@/lib/utils";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { selectSelectedInstitution, selectAttachedInstitutions } from "@/store/auth/selectors";
import { IUserInstitution } from "@/app/types";
import { DisciplineTypeForm, DisciplinaryActionForm } from "@/app/types/types.utils";
import { EmployeeSearchableSelect } from "@/components/ui/employee-searchable-select";

interface DisciplineType {
  id?: number;
  name: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  is_active: boolean;
  created_at?: string;
}

export default function DisciplinaryForm() {
  const router = useRouter();
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const institutionsAttached = useSelector(selectAttachedInstitutions) as IUserInstitution[];

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDisciplineTypeModalOpen, setIsDisciplineTypeModalOpen] = useState(false);
  const [isAddingDisciplineType, setIsAddingDisciplineType] = useState(false);
  const [isLoadingDisciplineTypes, setIsLoadingDisciplineTypes] = useState(true);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true);
  const [institutionId, setInstitutionId] = useState<number | null>(null);

  const [disciplineType, setDisciplineType] = useState<DisciplineTypeForm>({
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

  const [employees, setEmployees] = useState<
    Array<{
      id: string;
      name: string;
      department: string;
      email: string;
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
    const fetchEmployees = async () => {
      if (!institutionId) return;

      setIsLoadingEmployees(true);
      try {
        const fetchedEmployees = await getAllEmployees({ institutionId });

        if (fetchedEmployees && Array.isArray(fetchedEmployees)) {
          const formattedEmployees: typeof employees = fetchedEmployees.map((emp: any) => ({
            id: emp.id.toString(),
            name: emp.user?.fullname || emp.email || "Unknown Employee",
            department: emp.department || "",
            email: emp.email || "",
          }));
          setEmployees(formattedEmployees);
        } else {
          setEmployees([]);
        }
      } catch (error) {
        toast.error("Failed to load employees");
        setEmployees([]);
      } finally {
        setIsLoadingEmployees(false);
      }
    };

    fetchEmployees();
  }, [institutionId]);

  useEffect(() => {
    const fetchDisciplineTypes = async () => {
      if (!institutionId) return;

      setIsLoadingDisciplineTypes(true);
      try {
        const fetchedDisciplineTypes = await getDisciplineTypes({ institutionId });

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
    { value: "low", label: "Low", color: "bg-green-200 text-green-900" },
    { value: "medium", label: "Medium", color: "bg-yellow-100 text-yellow-800" },
    { value: "high", label: "High", color: "bg-orange-100 text-orange-800" },
    { value: "critical", label: "Critical", color: "bg-red-100 text-red-800" },
  ];

  const statusOptions = [
    { value: "pending", label: "Pending" },
    { value: "in_progress", label: "In Progress" },
    { value: "completed", label: "Completed" },
    { value: "dismissed", label: "Dismissed" },
  ];

  const validateForm = (): boolean => {
    const requiredFields = [
      { field: disciplinaryAction.employee, name: "Employee" },
      { field: disciplinaryAction.discipline_type, name: "Discipline Type" },
      { field: disciplinaryAction.incident_date, name: "Incident Date" },
      { field: disciplinaryAction.description, name: "Description" },
      { field: disciplinaryAction.reported_by, name: "Reported By" },
    ];

    for (const { field, name } of requiredFields) {
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
          severity: (result.severity || disciplineType.severity) as "low" | "medium" | "high" | "critical",
        };

        setDisciplineTypes((prev) => [...prev, newDisciplineType]);
        setDisciplinaryAction((prev) => ({ ...prev, discipline_type: newDisciplineType.id }));

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
      const errorMessage = error instanceof Error ? error.message : "Failed to create discipline type. Please try again.";
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
      const result = await createDisciplinaryAction({
        disciplinaryActionData: disciplinaryAction,
      });

      if (result) {
        toast.success("Disciplinary action created successfully!");
        router.push("/employees/discipline");
      } else {
        toast.error("Failed to create disciplinary action. Please try again.");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create disciplinary action. Please try again.";
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

  return (
    <div className="min-h-screen w-full bg-gray-50 p-6">
      <div className="max-w-full mx-auto">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Create Disciplinary Action</CardTitle>
            <CardDescription>Record a new disciplinary action against an employee</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDisciplinaryActionSubmit} className="space-y-8">
              {/* Basic Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="employee">Employee *</Label>
                  <EmployeeSearchableSelect
                    employees={employees}
                    value={disciplinaryAction.employee}
                    onValueChange={(value) => setDisciplinaryAction({ ...disciplinaryAction, employee: value.toString() })}
                    disabled={isSubmitting || isLoadingEmployees}
                    placeholder="Search and select employee"
                    isLoading={isLoadingEmployees}
                    showEmployeeId={false}
                    showDepartment={false}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discipline_type">Discipline Type *</Label>
                  <div className="flex gap-2">
                    <Select
                      value={disciplinaryAction.discipline_type}
                      onValueChange={(value) => setDisciplinaryAction({ ...disciplinaryAction, discipline_type: value })}
                      disabled={isSubmitting || isLoadingDisciplineTypes}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder={isLoadingDisciplineTypes ? "Loading..." : "Select discipline type"} />
                      </SelectTrigger>
                      <SelectContent>
                        {disciplineTypes.length > 0 ? (
                          disciplineTypes.map((type) => (
                            <SelectItem key={type.id} value={type.id}>
                              <div className="flex items-center gap-2">
                                {type.name}
                                <Badge variant="outline" className={severityOptions.find((s) => s.value === type.severity)?.color}>
                                  {type.severity}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-1.5 text-sm text-gray-500">
                            {isLoadingDisciplineTypes ? "Loading discipline types..." : "No discipline types available"}
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <Dialog open={isDisciplineTypeModalOpen} onOpenChange={setIsDisciplineTypeModalOpen}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="icon" className="shrink-0" title="Add new discipline type">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Add New Discipline Type</DialogTitle>
                          <DialogDescription>Create a new discipline type for your organization.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="space-y-2">
                            <Label htmlFor="disciplineTypeName">Name *</Label>
                            <Input
                              id="disciplineTypeName"
                              value={disciplineType.name}
                              onChange={(e) => setDisciplineType({ ...disciplineType, name: e.target.value })}
                              placeholder="e.g., Tardiness, Insubordination, Safety Violation"
                              maxLength={100}
                            />
                            <p className="text-xs text-muted-foreground">{disciplineType.name.length}/100 characters</p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="disciplineTypeSeverity">Severity Level *</Label>
                            <Select
                              value={disciplineType.severity}
                              onValueChange={(value: any) => setDisciplineType({ ...disciplineType, severity: value })}
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
                              onChange={(e) => setDisciplineType({ ...disciplineType, description: e.target.value })}
                              placeholder="Detailed description of this discipline type"
                              rows={3}
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="disciplineTypeActive"
                              checked={disciplineType.is_active}
                              onCheckedChange={(checked) => setDisciplineType({ ...disciplineType, is_active: !!checked })}
                            />
                            <Label htmlFor="disciplineTypeActive" className="text-sm">
                              Active (inactive types won't be available for new actions)
                            </Label>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="button" variant="outline" onClick={handleDisciplineTypeCancel} disabled={isAddingDisciplineType}>
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
                    onValueChange={(value: any) => setDisciplinaryAction({ ...disciplinaryAction, status: value })}
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
                    onChange={(e) => setDisciplinaryAction({ ...disciplinaryAction, incident_date: e.target.value })}
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
                    onChange={(e) => setDisciplinaryAction({ ...disciplinaryAction, resolution_date: e.target.value })}
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
                            follow_up_date: checked ? disciplinaryAction.follow_up_date : null, // Change to null
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
                        <Label htmlFor="follow_up_date" className="sr-only">Follow-up Date *</Label>
                        <Input
                          id="follow_up_date"
                          type="date"
                          value={disciplinaryAction.follow_up_date || ""}
                          onChange={(e) => setDisciplinaryAction({ ...disciplinaryAction, follow_up_date: e.target.value })}
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
                    employees={employees}
                    value={disciplinaryAction.reported_by}
                    onValueChange={(value) => setDisciplinaryAction({ ...disciplinaryAction, reported_by: value.toString() })}
                    disabled={isSubmitting || isLoadingEmployees}
                    placeholder="Search and select reporter"
                    isLoading={isLoadingEmployees}
                    showEmployeeId={false}
                    showDepartment={false}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assigned_to">Assigned To</Label>
                  <EmployeeSearchableSelect
                    employees={employees}
                    value={disciplinaryAction.assigned_to}
                    onValueChange={(value) => setDisciplinaryAction({ ...disciplinaryAction, assigned_to: value.toString() })}
                    disabled={isSubmitting || isLoadingEmployees}
                    placeholder="Search and select assignee"
                    isLoading={isLoadingEmployees}
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
                    onChange={(e) => setDisciplinaryAction({ ...disciplinaryAction, description: e.target.value })}
                    required
                    minLength={10}
                    rows={5}
                    className="resize-none"
                    disabled={isSubmitting}
                  />
                  <p className="text-sm text-muted-foreground">{disciplinaryAction.description.length}/10 characters minimum</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="evidence">Evidence</Label>
                  <Textarea
                    id="evidence"
                    placeholder="Any supporting evidence or documentation"
                    value={disciplinaryAction.evidence}
                    onChange={(e) => setDisciplinaryAction({ ...disciplinaryAction, evidence: e.target.value })}
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
                  onChange={(e) => setDisciplinaryAction({ ...disciplinaryAction, action_taken: e.target.value })}
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
                  onChange={(e) => setDisciplinaryAction({ ...disciplinaryAction, notes: e.target.value })}
                  rows={4}
                  className="resize-none"
                  disabled={isSubmitting}
                />
              </div>

              <div className="flex gap-4 pt-6">
                <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700 h-12" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Disciplinary Action"
                  )}
                </Button>
                <Button type="button" variant="outline" className="flex-1 h-12" onClick={handleDisciplinaryActionCancel} disabled={isSubmitting}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}