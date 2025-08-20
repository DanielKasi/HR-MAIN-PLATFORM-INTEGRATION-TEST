"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { Briefcase, ArrowLeft, Check, Upload, X, FileText, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { CreateDepartmentDialog } from "@/components/dialogs/create-department-dialog";

import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors";
import { getDepartments, getJobPositions, createJobPosition } from "@/lib/utils";
import { SearchableSelect, SearchableSelectItem } from "@/components/searchable-select";

import type {
  JobPositionFormData,
  IDepartment,
  IJobPosition,
  CreateJobPositionData,
} from "@/types/types.utils";
import { toast } from "sonner";
import RichTextDisplay from "@/components/common/rich-text-display";
import { RichEditorField } from "@/components/common/rich-editor";

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
    salary_min: "",
    salary_max: "",
  });
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [jobPositions, setJobPositions] = useState<IJobPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof JobPositionFormData, string>>>({});
  const [salaryMinDisplay, setSalaryMinDisplay] = useState(
    formData.salary_min ? formatWithCommas(String(formData.salary_min)) : "",
  );
  const [salaryMaxDisplay, setSalaryMaxDisplay] = useState(
    formData.salary_max ? formatWithCommas(String(formData.salary_max)) : "",
  );

  const router = useRouter();
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const selectedBranch = useSelector(selectSelectedBranch);

  useEffect(() => {
    setSalaryMinDisplay(formData.salary_min ? formatWithCommas(String(formData.salary_min)) : "");
  }, [formData.salary_min]);

  useEffect(() => {
    setSalaryMaxDisplay(formData.salary_max ? formatWithCommas(String(formData.salary_max)) : "");
  }, [formData.salary_max]);

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
        getDepartments({ institutionId: selectedInstitution.id }),
        getJobPositions({ institutionId: selectedInstitution.id }),
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
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
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

    if (!formData.salary_min.trim()) {
      newErrors.salary_min = "Minimum salary is required";
    } else if (isNaN(Number(formData.salary_min)) || Number(formData.salary_min) <= 0) {
      newErrors.salary_min = "Please enter a valid minimum salary amount";
    }

    if (!formData.salary_max.trim()) {
      newErrors.salary_max = "Maximum salary is required";
    } else if (isNaN(Number(formData.salary_max)) || Number(formData.salary_max) <= 0) {
      newErrors.salary_max = "Please enter a valid maximum salary amount";
    }

    if (formData.salary_min && formData.salary_max && Number(formData.salary_min) > Number(formData.salary_max)) {
      newErrors.salary_max = "Maximum salary must be greater than minimum salary";
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
        salary_min: Number(formData.salary_min),
        salary_max: Number(formData.salary_max),
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
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center justify-start">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    className="flex items-center gap-2 rounded-full aspect-square"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <CardTitle className="text-xl">Create New Job Position / Title </CardTitle>
                </div>
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
                    Job Position / Title  Name *
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

                <div className="space-y-2">
                  <Label htmlFor="salary_min" className="text-sm font-medium">
                    Salary Range *
                  </Label>
                  <div className="grid grid-cols-2 gap-2">

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">From UGX</span>
                  <Input
                    id="salary_min"
                    type="text"
                    inputMode="numeric"
                    placeholder="50,000"
                    value={salaryMinDisplay}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const numeric = unformat(raw);

                      if (!/^\d*$/.test(numeric)) return;

                      setSalaryMinDisplay(formatWithCommas(numeric));
                      updateFormData("salary_min", numeric);
                    }}
                    className={errors.salary_min ? "border-destructive" : ""}
                  />
                  {errors.salary_min && <p className="text-sm text-destructive">{errors.salary_min}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">To UGX</span>
                    <Input
                    id="salary_max"
                    type="text"
                    inputMode="numeric"
                    placeholder="75,000"
                    value={salaryMaxDisplay}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const numeric = unformat(raw);

                      if (!/^\d*$/.test(numeric)) return;

                      setSalaryMaxDisplay(formatWithCommas(numeric));
                      updateFormData("salary_max", numeric);
                    }}
                    className={errors.salary_max ? "border-destructive" : ""}
                  />
                  {errors.salary_max && <p className="text-sm text-destructive">{errors.salary_max}</p>}
                  </div>
                  </div>
                  
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
                  <SearchableSelect
                    items={departments.map((dept) => ({
                      id: dept.id,
                      label: dept.name,
                      value: dept.name.toLowerCase(),
                    }))}
                    selectedItems={formData.department ? [formData.department] : []}
                    placeholder="Select a department"
                    searchPlaceholder="Search departments..."
                    emptyMessage="No departments found."
                    onSelect={(itemId) => updateFormData("department", Number(itemId))}
                    multiple={false}
                    triggerClassName={errors.department ? "border-destructive" : ""}
                    popoverClassName="w-[400px]"
                  />
                  {errors.department && (
                    <p className="text-sm text-destructive">{errors.department}</p>
                  )}
                </div>

                {/* Reports To */}
                <div className="space-y-2">
                  <Label htmlFor="reportsTo" className="text-sm font-medium">
                    Reports To (Optional)
                  </Label>
                  <SearchableSelect
                    items={[
                      { id: 0, label: "None", value: "none" },
                      ...jobPositions.map((position) => ({
                        id: position.id,
                        label: `${position.name} - ${position.department_details?.name}`,
                        value: `${position.name} ${position.department_details?.name}`.toLowerCase(),
                      }))
                    ]}
                    selectedItems={formData.reports_to ? [formData.reports_to] : [0]}
                    placeholder="Select a position (optional)"
                    searchPlaceholder="Search positions..."
                    emptyMessage="No positions found."
                    onSelect={(itemId) =>
                      updateFormData("reports_to", Number(itemId) === 0 ? null : Number(itemId))
                    }
                    multiple={false}
                    popoverClassName="w-[500px]"
                  />
                </div>


              </div>
              {/* Job Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Job Description *
                </Label>
                <RichEditorField id="description"
                  placeholder="Describe the job responsibilities, requirements, and qualifications..."
                  value={formData.description}
                  onChange={(value) => updateFormData("description", value)}
                  className={errors.description ? "border-destructive" : ""}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description}</p>
                )}
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
                      Create Job Position / Title
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
