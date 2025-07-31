"use client";

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSelector } from "react-redux"
import { Megaphone, ArrowLeft, Check, Calendar, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CreateJobPositionDialog } from "@/components/dialogs/create-job-position-dialog"

import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import { getJobPositions, createJobPositionAdvert, createJobPosition, } from "@/lib/utils"
import type { JobPositionAdvertFormData, IJobPosition, JobAdvertStatus, JobAdvertTypes } from "@/app/types/types.utils"
import { toast } from "sonner"
import { SearchableSelect, SearchableSelectItem } from "@/components/searchable-select";

export default function CreateJobAdvertPage() {
  const [formData, setFormData] = useState<JobPositionAdvertFormData>({
    job_position: 0,
    expiry_date: "",
    number_of_employees_expected: 1,
    extra_information: "",
    advert_type: "external" as JobAdvertTypes,
  });

  const [jobPositions, setJobPositions] = useState<IJobPosition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof JobPositionAdvertFormData, string>>>(
    {},
  );

  const router = useRouter();
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const selectedBranch = useSelector(selectSelectedBranch);

  useEffect(() => {
    if (!selectedInstitution || !selectedBranch) {
      router.push("/dashboard");
      return;
    }
    fetchJobPositions();
  }, [selectedInstitution, selectedBranch, router]);

  const fetchJobPositions = async () => {
    if (!selectedInstitution) return;

    try {
      setIsLoading(true);
      const fetchedJobPositions = await getJobPositions({institutionId: selectedInstitution.id});
      if (fetchedJobPositions) {
        setJobPositions(fetchedJobPositions);
      } else {
        toast.error("Failed to load job positions");
      }
    } catch (error) {
      toast.error("Failed to load job positions");
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (
    field: keyof Exclude<JobPositionAdvertFormData, "job_position_advert_status">,
    value: any,
  ) => {
    setFormData((prev) => ({...prev, [field]: value}));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({...prev, [field]: undefined}));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof JobPositionAdvertFormData, string>> = {};

    if (!formData.job_position || formData.job_position === 0) {
      newErrors.job_position = "Please select a job position";
    }

    if (!formData.expiry_date) {
      newErrors.expiry_date = "Expiry date is required";
    } else {
      const expiryDate = new Date(formData.expiry_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiryDate <= today) {
        newErrors.expiry_date = "Expiry date must be in the future";
      }
    }

    if (formData.number_of_employees_expected && formData.number_of_employees_expected < 1) {
      newErrors.number_of_employees_expected = "Number of employees must be at least 1";
    }

    if (!formData.advert_type) {
      newErrors.advert_type = "Please select an opening type";
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
      const createData: JobPositionAdvertFormData = {
        job_position: formData.job_position,
        job_position_advert_status: formData.job_position_advert_status,
        expiry_date: formData.expiry_date,
        number_of_employees_expected: formData.number_of_employees_expected || undefined,
        extra_information: formData.extra_information || undefined,
        advert_type: formData.advert_type,
      };

      const newJobAdvert = await createJobPositionAdvert({
        institutionId: selectedInstitution.id,
        advertData: createData,
      });

      if (newJobAdvert) {
        toast.success("Job opening created successfully!");
        router.push("/job-adverts");
      } else {
        toast.error("Failed to create job opening. Please try again.");
      }
    } catch (error) {
      toast.error("Failed to create job opening. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleJobPositionCreated = (newJobPosition: IJobPosition) => {
    setJobPositions((prev) => [...prev, newJobPosition]);
    updateFormData("job_position", newJobPosition.id);
  };

  // Set default expiry date to 30 days from now
  useEffect(() => {
    if (!formData.expiry_date) {
      const defaultExpiryDate = new Date();
      defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 30);
      setFormData((prev) => ({
        ...prev,
        expiry_date: defaultExpiryDate.toISOString().split("T")[0],
      }));
    }
  }, [formData.expiry_date]);

  // Prepare job positions for searchable select
  const jobPositionItems: SearchableSelectItem[] = jobPositions.map((position) => ({
    id: position.id,
    label: `${position.name} - ${position.department_details?.name}`,
    value: `${position.name} ${position.department_details?.name}`.toLowerCase(),
  }));

  // Prepare advert types for searchable select
  const advertTypeItems: SearchableSelectItem[] = [
    { id: "external", label: "External", value: "external" },
    { id: "internal", label: "Internal", value: "internal" },
    { id: "both", label: "Both Internal and External", value: "both internal external" },
  ];

  if (!selectedInstitution || !selectedBranch) {
    return <div>Loading...</div>;
  }

  if (isLoading) {
    return <div>Loading job openings...</div>;
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
            Back to Job Openings
          </Button>
        </div>

        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Megaphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">Create New Job Openings</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Create a job opening for {selectedBranch.branch_name} -{" "}
                  {selectedInstitution.institution_name}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Form Fields - Responsive Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Job Position */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="job_position" className="text-sm font-medium">
                      Job Position *
                    </Label>
                    <CreateJobPositionDialog
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
                      onJobPositionCreated={handleJobPositionCreated}
                    />
                  </div>
                  <SearchableSelect
                    items={jobPositionItems}
                    selectedItems={formData.job_position ? [formData.job_position] : []}
                    placeholder="Select a job position"
                    searchPlaceholder="Search job positions..."
                    emptyMessage="No job positions found."
                    onSelect={(itemId) => updateFormData("job_position", Number(itemId))}
                    multiple={false}
                    triggerClassName={errors.job_position ? "border-destructive" : ""}
                    popoverClassName="w-[400px]"
                  />
                  {errors.job_position && (
                    <p className="text-sm text-destructive">{errors.job_position}</p>
                  )}
                </div>

                {/* Advert Type */}
                <div className="space-y-2">
                  <Label htmlFor="advert_type" className="text-sm font-medium">
                    Opening Type *
                  </Label>
                  <SearchableSelect
                    items={advertTypeItems}
                    selectedItems={formData.advert_type ? [formData.advert_type] : []}
                    placeholder="Select opening type"
                    searchPlaceholder="Search opening types..."
                    emptyMessage="No opening types found."
                    onSelect={(itemId) => updateFormData("advert_type", itemId as JobAdvertTypes)}
                    multiple={false}
                    triggerClassName={errors.advert_type ? "border-destructive" : ""}
                    popoverClassName="w-[300px]"
                  />
                  {errors.advert_type && (
                    <p className="text-sm text-destructive">{errors.advert_type}</p>
                  )}
                </div>

                {/* Expiry Date */}
                <div className="space-y-2">
                  <Label htmlFor="expiry_date" className="text-sm font-medium">
                    Expiry Date *
                  </Label>
                  <Input
                    id="expiry_date"
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={formData.expiry_date}
                    onChange={(e) => updateFormData("expiry_date", e.target.value)}
                    className={errors.expiry_date ? "border-destructive" : ""}
                  />
                  {errors.expiry_date && (
                    <p className="text-sm text-destructive">{errors.expiry_date}</p>
                  )}
                </div>

                {/* Number of Employees Required */}
                <div className="space-y-2">
                  <Label htmlFor="number_of_employees_expected" className="text-sm font-medium">
                    Number of Employees Required
                  </Label>
                  <Input
                    id="number_of_employees_expected"
                    type="number"
                    min="1"
                    max="1000"
                    placeholder="1"
                    value={formData.number_of_employees_expected || ""}
                    onChange={(e) =>
                      updateFormData(
                        "number_of_employees_expected",
                        Number(e.target.value) || undefined,
                      )
                    }
                    className={errors.number_of_employees_expected ? "border-destructive" : ""}
                  />
                  {errors.number_of_employees_expected && (
                    <p className="text-sm text-destructive">
                      {errors.number_of_employees_expected}
                    </p>
                  )}
                </div>
              </div>

              {/* Extra Information - Full Width */}
              <div className="space-y-2">
                <Label htmlFor="extra_information" className="text-sm font-medium">
                  Job Description (Optional)
                </Label>
                <Textarea
                  id="extra_information"
                  placeholder="Add any additional information about this job opening..."
                  value={formData.extra_information || ""}
                  onChange={(e) => updateFormData("extra_information", e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Provide additional details about the role, requirements, or company benefits
                </p>
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto bg-transparent"
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
                      Create Job Openings
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