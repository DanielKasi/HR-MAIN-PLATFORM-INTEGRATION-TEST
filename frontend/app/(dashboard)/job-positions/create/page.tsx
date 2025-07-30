"use client";

import type React from "react";
import {useState, useEffect} from "react";
import {useRouter} from "next/navigation";
import {useSelector} from "react-redux";
import {Briefcase, ArrowLeft, Check, Upload, X, FileText, Plus} from "lucide-react";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
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
import { CreateDepartmentDialog } from "@/components/dialogs/create-department-dialog";

import {selectSelectedInstitution, selectSelectedBranch} from "@/store/auth/selectors";
import {getDepartments, getJobPositions, createJobPosition} from "@/lib/utils";

import type {
  JobPositionFormData,
  IDepartment,
  IJobPosition,
  CreateJobPositionData,
} from "@/app/types/types.utils";
import {toast} from "sonner";

function formatWithCommas(value: string) {
  const num = value.replace(/,/g, "");
  if (!num) return "";
  return parseFloat(num).toLocaleString("en-US");
}

function unformat(value: string) {
  return value.replace(/,/g, "");
}

export default function CreateJobPositionPage() {
  const [formData, setFormData] = useState<JobPositionFormData>({
    name: "",
    description: "",
    department: null,
    reports_to: null,
    job_position_status: "inactive",
    offer_letter_template: null,
    salary: "",
  });
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [jobPositions, setJobPositions] = useState<IJobPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof JobPositionFormData, string>>>({});
  const [salaryDisplay, setSalaryDisplay] = useState(
    formData.salary ? formatWithCommas(String(formData.salary)) : "",
  );

  const router = useRouter();
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const selectedBranch = useSelector(selectSelectedBranch);

  useEffect(() => {
    setSalaryDisplay(formData.salary ? formatWithCommas(String(formData.salary)) : "");
  }, [formData.salary]);

  useEffect(() => {
    if (!selectedInstitution || !selectedBranch) {
      router.push("/dashboard");
      return;
    }

    fetchInitialData();
  }, [selectedInstitution, selectedBranch, router]);

  const fetchInitialData = async () => {
    if (!selectedInstitution) return;

    try {
      setIsLoading(true);
      const [fetchedDepartments, fetchedJobPositions] = await Promise.all([
        getDepartments({institutionId: selectedInstitution.id}),
        getJobPositions({institutionId: selectedInstitution.id}),
      ]);

      if (fetchedDepartments) {
        setDepartments(fetchedDepartments);
      }
      if (fetchedJobPositions) {
        setJobPositions(fetchedJobPositions);
      }
    } catch (error) {
      toast.error("Failed to load departments and job position/titles ");
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (field: keyof JobPositionFormData, value: any) => {
    setFormData((prev) => ({...prev, [field]: value}));
    if (errors[field]) {
      setErrors((prev) => ({...prev, [field]: undefined}));
    }
  };

  const handleFileChange = (field: "offer_letter_template", file: File | null) => {
    updateFormData(field, file);
  };

  const removeFile = (field: "offer_letter_template") => {
    updateFormData(field, null);
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof JobPositionFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Job position name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Job position name must be at least 2 characters";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Job description is required";
    } else if (formData.description.trim().length < 10) {
      newErrors.description = "Description must be at least 10 characters";
    }

    if (!formData.department) {
      newErrors.department = "Please select a department";
    }

    if (!formData.salary.trim()) {
      newErrors.salary = "Salary is required";
    } else if (isNaN(Number(formData.salary)) || Number(formData.salary) <= 0) {
      newErrors.salary = "Please enter a valid salary amount";
    }

    if (!formData.job_position_status) {
      newErrors.job_position_status = "Please select a status";
    } else if (!["active", "inactive"].includes(formData.job_position_status)) {
      newErrors.job_position_status = "Invalid status selected";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInstitution || !selectedBranch) {
      toast.error("Missing organization or branch information");
      return;
    }

    if (!validateForm()) {
      toast.error("Please fix the form errors before submitting");
      return;
    }

    setIsSubmitting(true);

    try {
      const createData: CreateJobPositionData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        department: formData.department!,
        salary: Number(formData.salary),
        affected_employees: [],
        job_position_status: formData.job_position_status,
      };

      if (formData.reports_to) {
        createData.reports_to = formData.reports_to;
      }

      if (formData.offer_letter_template) {
        createData.offer_letter_template = formData.offer_letter_template;
      }

      const newJobPosition = await createJobPosition({
        institutionId: selectedInstitution.id,
        jobPositionData: createData,
      });

      if (newJobPosition) {
        toast.success("Job position created successfully!");
        router.push("/job-positions");
      } else {
        toast.error("Failed to create job position. Please try again.");
      }
    } catch (error: any) {
      // Enhanced error handling
      const errorMessage =
        error.response?.data?.job_position_status?.join(", ") ||
        error.response?.data?.non_field_errors?.join(", ") ||
        "Failed to create job position. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  if (!selectedInstitution || !selectedBranch) {
    return <div>Loading...</div>;
  }

  if (isLoading) {
    return <div>Loading departments and job position/titles ...</div>;
  }

  return (
    <div className="w-full h-full p-6">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Job Positions/Titles
          </Button>
        </div>

        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Create New Job Position/ Title </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Add a new job position/title to {selectedBranch.branch_name} -{" "}
                  {selectedInstitution.institution_name}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Form Fields - Two-Column Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Job Position/ Title  Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">
                    Job Position/ Title  Name *
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="e.g., Software Engineer, HR Manager, Sales Representative"
                    value={formData.name}
                    onChange={(e) => updateFormData("name", e.target.value)}
                    className={errors.name ? "border-destructive" : ""}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>

                {/* Salary */}
                <div className="space-y-2">
                  <Label htmlFor="salary" className="text-sm font-medium">
                    Salary *
                  </Label>
                  <Input
                    id="salary"
                    type="text"
                    inputMode="numeric"
                    placeholder="50,000"
                    value={salaryDisplay}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const numeric = unformat(raw);

                      if (!/^\d*$/.test(numeric)) return;

                      setSalaryDisplay(formatWithCommas(numeric));
                      updateFormData("salary", numeric);
                    }}
                    className={errors.salary ? "border-destructive" : ""}
                  />
                  {errors.salary && <p className="text-sm text-destructive">{errors.salary}</p>}
                </div>

                {/* Department */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="department" className="text-sm font-medium">
                      Department *
                    </Label>
                    <CreateDepartmentDialog 
                      trigger={
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      }
                      onDepartmentCreated={(newDepartment) => {
                        setDepartments((prev) => [...prev, newDepartment]);
                        updateFormData("department", newDepartment.id);
                      }}
                    />
                  </div>
                  <Select
                    value={formData.department?.toString() || "0"}
                    onValueChange={(value) => updateFormData("department", Number(value))}
                  >
                    <SelectTrigger className={errors.department ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id.toString()}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.department && (
                    <p className="text-sm text-destructive">{errors.department}</p>
                  )}
                </div>

                {/* Reports To */}
                <div className="space-y-2">
                  <Label htmlFor="reportsTo" className="text-sm font-medium">
                    Reports To (Optional)
                  </Label>
                  <Select
                    value={formData.reports_to?.toString() || "0"}
                    onValueChange={(value) =>
                      updateFormData("reports_to", value ? Number(value) : null)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a position (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">None</SelectItem>
                      {jobPositions.map((position) => (
                        <SelectItem key={position.id} value={position.id.toString()}>
                          {position.name} - {position.department_details?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Job Description */}
                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Job Description *
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe the job responsibilities, requirements, and qualifications..."
                    value={formData.description}
                    onChange={(e) => updateFormData("description", e.target.value)}
                    rows={4}
                    className={errors.description ? "border-destructive" : ""}
                  />
                  {errors.description && (
                    <p className="text-sm text-destructive">{errors.description}</p>
                  )}
                </div>

                {/* Offer Letter Template */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Offer Letter Template (Optional)</Label>
                  {formData.offer_letter_template ? (
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">
                            {formData.offer_letter_template.name}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile("offer_letter_template")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {(formData.offer_letter_template.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                      <div className="text-center">
                        <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <Label htmlFor="offer_letter_template" className="cursor-pointer">
                          <span className="text-sm font-medium text-primary hover:text-primary/80">
                            Click to upload offer letter template
                          </span>
                          <Input
                            id="offer_letter_template"
                            type="file"
                            accept=".pdf,.doc,.docx"
                            onChange={(e) =>
                              handleFileChange("offer_letter_template", e.target.files?.[0] || null)
                            }
                            className="hidden"
                          />
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          PDF, DOC, DOCX up to 10MB
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Create Job Position/ Title 
                    </>
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
