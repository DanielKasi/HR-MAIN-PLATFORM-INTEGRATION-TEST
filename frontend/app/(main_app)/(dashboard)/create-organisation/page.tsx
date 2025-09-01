"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Store,
  Building2,
  Mail,
  Check,
  Edit,
  ChevronLeft,
  ChevronRight,
  FileText,
  MapPin,
  Upload,
  X,
  Users,
} from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import apiRequest from "@/lib/apiRequest";
import {
  selectRefreshToken,
  selectSelectedInstitution,
  selectUser,
} from "@/store/auth/selectors";
import {
  logoutStart,
  setAccessToken,
  setAttachedInstitutions,
  setRefreshToken,
  setSelectedBranch,
  setSelectedInstitution,
  setCurrentUser,
} from "@/store/auth/actions";
import { toast } from "sonner";
import { AUTH_API, type LoginResponse } from "@/utils/authUtils";
import axios from "axios";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@radix-ui/react-progress";
import PhoneNumberInput from "@/components/phone-number-input";
import type { ICountry } from "@/types/types.utils";
import type { IDepartment } from "@/types/types.utils";
import { getDefaultData, institutionAPI, showErrorToast } from "@/lib/utils";
import DepartmentEditorDialog from "@/components/common/dialogs/setup-department-edit-dialog";
import JobEditorDialog from "@/components/common/dialogs/setup-job-edit-dialog";
import { DeleteConfirmationDialog } from "@/components/common/dialogs/delete-confirmation-dialog";
import { ConfirmationDialog } from "@/components/confirmation-dialog";





interface OrganisationFormData {
  institutionName: string;
  institutionEmail: string;
  firstPhoneNumber: string;
  secondPhoneNumber: string;
  description: string;
  location: string;
  latitude: string;
  longitude: string;
  departments: IDepartment[];
}

const STEPS = [
  {
    id: 1,
    title: "Organisation Info",
    description: "Basic details about your organisation",
  },
  {
    id: 2,
    title: "Location Details",
    description: "Where is your organisation located",
  },
  {
    id: 3,
    title: "Departments",
    description: "Review and select default departments and job positions",
  },
];

export default function CreateOrganisationWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingDepartmentIndex, setEditingDepartmentIndex] = useState<number | null>(null);
  const [editingJob, setEditingJob] = useState<{ deptIndex: number; jobIndex: number } | null>(
    null,
  );
  const [openDepartmentDialog, setOpenDepartmentDialog] = useState(false);
  const [openJobDialog, setOpenJobDialog] = useState(false);
  const [activeDeptForJob, setActiveDeptForJob] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: "dept" | "job"; deptIndex: number; jobIndex?: number, name: string } | null>(null);
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const currentUser = useSelector(selectUser);
  const refreshToken = useSelector(selectRefreshToken);
  const dispatch = useDispatch();

  const [organizationFormData, setOrganizationFormData] = useState<OrganisationFormData>({
    institutionName: "",
    institutionEmail: "",
    firstPhoneNumber: "",
    secondPhoneNumber: "",
    description: "",
    location: "",
    latitude: "",
    longitude: "",
    departments: [],
  });

  const [firstPhone, setFirstPhone] = useState<{
    country: ICountry | null;
    countryCode: string;
    phoneNumber: string;
    isValid: boolean;
  }>({ country: null, countryCode: "", phoneNumber: "", isValid: false });
  const [secondPhone, setSecondPhone] = useState<{
    country: ICountry | null;
    countryCode: string;
    phoneNumber: string;
    isValid: boolean;
  }>({ country: null, countryCode: "", phoneNumber: "", isValid: true });

  useEffect(() => {
    if (currentUser) {
      try {
        const user = currentUser;
        setUserId(user.id);
        if (user.email) {
          setOrganizationFormData((prev) => ({ ...prev, institutionEmail: user.email }));
        }
      } catch (error) {
        toast.error("Error retrieving user information. Please log out and log in again.");
      }
    } else {
      router.push("/login");
    }
  }, [currentUser, router]);

  useEffect(() => {
    // If a selected institution exists, redirect to dashboard — this wizard is only for users without an institution.
    if (selectedInstitution) {
      router.push("/dashboard");
      return;
    }
    fetchDefaultDepartments();
  }, [router, selectedInstitution]);


  const fetchDefaultDepartments = async () => {
    if(selectedInstitution || !currentUser){return};
    try {
      const departments = await getDefaultData();
      if (departments && organizationFormData.departments.length === 0) {
        const mappedDepartments: IDepartment[] = departments.map((dept) => ({
          id: 0,
          name: dept.name,
          description: dept.description ?? "",
          institution: 0,
          institution_details: null,
          job_positions: (dept.job_positions ?? []).map((job) => ({
            id: 0,
            name: job.name,
            description: job.description ?? "",
            department_id: 0,
          })),
        }));
        setOrganizationFormData((prev) => ({ ...prev, departments: mappedDepartments }));
      }
    } catch (error) {
      toast.error("Failed to fetch default departments.");
    }
  };

  const updateFormData = (field: keyof OrganisationFormData, value: any) => {
    setOrganizationFormData((prev) => ({ ...prev, [field]: value }));
  };



  const removeDepartment = (deptName: string) => {
    setOrganizationFormData((prev) => ({
      ...prev,
      departments: prev.departments.filter((dept) => dept.name !== deptName),
    }));
  };

  const removeJobPosition = (deptName: string, jobName: string) => {
    setOrganizationFormData((prev) => ({
      ...prev,
      departments: prev.departments.map((dept) =>
        dept.name === deptName
          ? {
            ...dept,
            job_positions: (dept.job_positions ?? []).filter((job) => job.name !== jobName),
          }
          : dept,
      ),
    }));
  };

  // Add a new department and open it for editing
  const addDepartment = () => {
    setEditingDepartmentIndex(null);
    setOpenDepartmentDialog(true);
  };

  const updateDepartmentField = (index: number, field: keyof any, value: any) => {
    setOrganizationFormData((prev) => {
      const departments = [...prev.departments];
      departments[index] = { ...departments[index], [field]: value };
      return { ...prev, departments };
    });
  };

  const addJobPositionToDepartment = (deptIndex: number) => {
    setEditingJob(null);
    setActiveDeptForJob(deptIndex);
    setOpenJobDialog(true);
  };

  const updateJobField = (deptIndex: number, jobIndex: number, field: keyof any, value: any) => {
    setOrganizationFormData((prev) => {
      const departments = [...prev.departments];
      const dept = { ...departments[deptIndex] };
      const jobs = [...(dept.job_positions ?? [])];
      jobs[jobIndex] = { ...jobs[jobIndex], [field]: value };
      dept.job_positions = jobs;
      departments[deptIndex] = dept;
      return { ...prev, departments };
    });
  };

  // Dialog save handlers
  const handleSaveDepartment = (dept: { id?: number; name: string; description?: string | null }) => {
    setOrganizationFormData((prev) => {
      const departments = [...prev.departments];
      if (editingDepartmentIndex !== null && editingDepartmentIndex >= 0 && editingDepartmentIndex < departments.length) {
        departments[editingDepartmentIndex] = { ...departments[editingDepartmentIndex], name: dept.name, description: dept.description } as any;
      } else {
        departments.push({ id: 0, name: dept.name, description: dept.description ?? "", institution: 0, institution_details: null, job_positions: [] } as any);
      }
      return { ...prev, departments };
    });
    setEditingDepartmentIndex(null);
    setOpenDepartmentDialog(false);
  };

  const handleSaveJob = (job: { id?: number; name: string; description?: string | null }) => {
    setOrganizationFormData((prev) => {
      const departments = [...prev.departments];
      const deptIndex = editingJob ? editingJob.deptIndex : activeDeptForJob ?? departments.length - 1;
      if (deptIndex < 0 || deptIndex >= departments.length) return prev;
      const dept = { ...departments[deptIndex] };
      const jobs = [...(dept.job_positions ?? [])];
      if (editingJob) {
        jobs[editingJob.jobIndex] = { ...jobs[editingJob.jobIndex], name: job.name ?? "", description: job.description ?? "" };
      } else {
        jobs.push({ id: 0, name: job.name ?? "", description: job.description ?? "", department_id: 0 });
      }
      dept.job_positions = jobs;
      departments[deptIndex] = dept;
      return { ...prev, departments };
    });
    setEditingJob(null);
    setActiveDeptForJob(null);
    setOpenJobDialog(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const { type, deptIndex, jobIndex } = deleteTarget;
    if (type === "dept") {
      const name = organizationFormData.departments[deptIndex]?.name;
      if (name) removeDepartment(name);
    } else {
      const dept = organizationFormData.departments[deptIndex];
      const job = dept?.job_positions?.[jobIndex ?? 0];
      if (dept && job) removeJobPosition(dept.name, job.name);
    }
    setDeleteTarget(null);
  };

  const handleCancelDelete = () => setDeleteTarget(null);

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(
          organizationFormData.institutionName &&
          organizationFormData.institutionEmail &&
          firstPhone.isValid &&
          firstPhone.phoneNumber
        );
      case 2:
        return !!(organizationFormData.location && organizationFormData.latitude && organizationFormData.longitude);
      case 3:
        return organizationFormData.departments.length > 0;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
      setErrorMessage("");
    } else {
      setErrorMessage("Please fill in all required fields before proceeding.");
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setErrorMessage("");
  };

  const handleUserRefresh = (loginResponse: LoginResponse) => {
    dispatch(setAccessToken(loginResponse.tokens.access));
    dispatch(setRefreshToken(loginResponse.tokens.refresh));
    dispatch(setCurrentUser(loginResponse.user));

    if (loginResponse.institution_attached.length) {
      const defaultSelectedInstitution = loginResponse.institution_attached.find(
        (institution) =>
          institution.institution_name === organizationFormData.institutionName &&
          institution.first_phone_number === organizationFormData.firstPhoneNumber,
      );
      dispatch(setAttachedInstitutions(loginResponse.institution_attached));
      dispatch(
        setSelectedInstitution(defaultSelectedInstitution || loginResponse.institution_attached[0]),
      );
      if (
        defaultSelectedInstitution &&
        defaultSelectedInstitution.branches &&
        defaultSelectedInstitution.branches.length
      ) {
        dispatch(setSelectedBranch(defaultSelectedInstitution.branches[0]));
      } else if (loginResponse.institution_attached[0].branches?.length) {
        dispatch(setSelectedBranch(loginResponse.institution_attached[0].branches[0]));
      }
    }
  };

  const handleSubmit = async () => {
    if (!userId) {
      setErrorMessage("User information not available. Please log out and log in again.");
      return;
    }

    if (!validateStep(3)) {
      setErrorMessage("Please complete all required fields and documents.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const formdata = new FormData();

      formdata.append("institution_name", organizationFormData.institutionName);
      formdata.append("institution_email", organizationFormData.institutionEmail);
      formdata.append("first_phone_number", `${firstPhone.countryCode}${firstPhone.phoneNumber}`);
      if (secondPhone.phoneNumber) {
        formdata.append("second_phone_number", `${secondPhone.countryCode}${secondPhone.phoneNumber}`);
      }
      if (organizationFormData.description && organizationFormData.description.trim()) {
        formdata.append("description", organizationFormData.description);
      }
      formdata.append("institution_owner_id", userId.toString());
      formdata.append("location", organizationFormData.location);
      formdata.append("latitude", organizationFormData.latitude.toString());
      formdata.append("longitude", organizationFormData.longitude.toString());
      const backendDepartments = organizationFormData.departments.map((dept) => ({
        name: dept.name,
        description: dept.description || "",
        job_positions: (dept.job_positions ?? []).map((job) => ({
          name: job.name,
          description: job.description || "",
        })),
      }));

      formdata.append("departments", JSON.stringify(backendDepartments));

      const response = await institutionAPI.createInstitution({ data: formdata });

      if (response) {
        try {
          const fetchedUserResponse = await AUTH_API.refreshTokens({ refreshToken });
          handleUserRefresh(fetchedUserResponse);
        } catch (refreshError) {
          dispatch(logoutStart());
          toast.error(
            "Organisation created, but failed to refresh user data. Please log in again.",
          );
        }
      }

      toast.success("Organisation created successfully !")
    } catch (error: any) {
      if (error) {
        showErrorToast({ error, defaultMessage: "Failed to create organisation !" })

        if (error?.detail && typeof error.detail === "object") {
          const errorMessages = Object.entries(error.detail)
            .map(([field, messages]) => {
              if (typeof messages === "object" && messages !== null) {
                return Object.entries(messages as Record<string, any>)
                  .map(([subField, subMessages]) => {
                    const messageArray = Array.isArray(subMessages) ? subMessages : [subMessages];
                    return `${field} ${subField}: ${messageArray.join(", ")}`;
                  })
                  .join("\n");
              } else {
                const messageArray = Array.isArray(messages) ? messages : [messages];
                return `${field}: ${messageArray.join(", ")}`;
              }
            })
            .join("\n");
          setErrorMessage(`Validation errors:\n${errorMessages}`);
        } else if (error?.detail) {
          setErrorMessage(error.detail);
        } else if (error?.message) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage(
            `Error ${error?.status || ""},  Something went wrong !`,
          );
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="institutionName" className="text-sm font-medium">
                Organisation Name *
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                </div>
                <Input
                  id="institutionName"
                  type="text"
                  placeholder="Eco Organisation"
                  value={organizationFormData.institutionName}
                  onChange={(e) => updateFormData("institutionName", e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="institutionEmail" className="text-sm font-medium">
                Email *
              </Label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                </div>
                <Input
                  id="institutionEmail"
                  type="email"
                  placeholder="contact@ecoorganisation.com"
                  value={organizationFormData.institutionEmail}
                  onChange={(e) => updateFormData("institutionEmail", e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <PhoneNumberInput
              label="Primary Phone Number"
              required
              value={firstPhone.phoneNumber || ""}
              country={firstPhone.country}
              onChange={setFirstPhone}
            />

            <PhoneNumberInput
              label="Secondary Phone Number (Optional)"
              required={false}
              value={secondPhone.phoneNumber || ""}
              country={secondPhone.country}
              onChange={setSecondPhone}
            />

            <div className="grid gap-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description (Optional)
              </Label>
              <Textarea
                id="description"
                placeholder="Tell us about your company..."
                value={organizationFormData.description}
                onChange={(e) => updateFormData("description", e.target.value)}
                rows={3}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label className="text-sm font-medium">Organisation Location *</Label>
              <LocationAutocomplete
                value={organizationFormData.location}
                onChange={(value) => updateFormData("location", value)}
                onCoordinatesChange={(lat, lon) => {
                  updateFormData("latitude", lat);
                  updateFormData("longitude", lon);
                }}
                placeholder="Search for your organisation location..."
                showCurrentLocationButton={true}
              />
              {organizationFormData.latitude && organizationFormData.longitude && (
                <div className="text-xs text-muted-foreground mt-1">
                  Coordinates: {organizationFormData.latitude}, {organizationFormData.longitude}
                </div>
              )}
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">Location Tips</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Make sure to select the exact location of your organisation. This will help
                    customers find you easily and enable location-based features.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:

        const filteredDepartments = organizationFormData.departments.filter((dept) => {
          const query = searchQuery.toLowerCase();
          const matchesDepartment =
            dept.name.toLowerCase().includes(query) ||
            (dept.description?.toLowerCase().includes(query) ?? false);
          const matchesJobPosition = dept.job_positions?.some(
            (job) =>
              job.name.toLowerCase().includes(query) ||
              (job.description?.toLowerCase().includes(query) ?? false)
          );
          return matchesDepartment || matchesJobPosition;
        });

        return (
          <div className="w-full space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Create Departments and Job Positions</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Review, create, edit or remove the departments and job positions for your organisation
                </p>
              </div>
            </div>

            <div className="grid gap-4 my-2">
              <Label htmlFor="searchDepartments" className="text-sm font-medium">
                Search Departments and Positions
              </Label>
              <div className="relative w-full max-w-md md:max-w-lg lg:max-w-xl mb-4">
                <Input
                  id="searchDepartments"
                  type="text"
                  placeholder="Search by department or job position..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M21 21l-4.35-4.35M16.65 10.65a6 6 0 11-12 0 6 6 0 0112 0z"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {filteredDepartments.length === 0 ? (
              <div className="w-full border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-base font-medium mb-2">
                  {searchQuery ? "No departments match your search" : "No departments selected"}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {searchQuery
                    ? "Try adjusting your search query."
                    : "Please select at least one department to proceed."}
                </p>
                <div>
                  <Button type="button" onClick={addDepartment} className="mt-4">
                    Add Department
                  </Button>
                </div>
              </div>
            ) : (
              <div className="w-full grid grid-cols-1 md:grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60svh] lg:max-h-[50svh] overflow-y-auto place-content-start justify-start items-start place-items-start py-8 pr-4">
                {filteredDepartments.map((dept, deptIndex) => (
                  <div key={deptIndex} className="w-full border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <>
                            <h4 className="font-medium">{dept.name}</h4>
                            <p className="text-xs text-muted-foreground">{dept.description}</p>
                          </>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => { setEditingDepartmentIndex(deptIndex); setOpenDepartmentDialog(true); }}
                          className="h-8 w-8 p-0"
                        >
                          {editingDepartmentIndex === deptIndex ? <Check className="h-4 w-4 text-green-600" /> : <Edit className="h-4 w-4" />}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteTarget({ type: "dept", deptIndex, name: dept.name })}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <>
                        <Label className="text-sm font-medium">Job Positions</Label>
                        {(dept.job_positions?.length ?? 0) === 0 ? (
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground">No job positions selected</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {dept.job_positions?.map((job, jobIndex) => (
                              <div
                                key={`${deptIndex}-${jobIndex}`}
                                className="flex items-center justify-between bg-muted/50 p-2 rounded-md"
                              >
                                <div className="flex-1">
                                  <p className="text-sm font-medium">{job.name}</p>
                                  <p className="text-xs text-muted-foreground">{job.description}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => { setEditingJob({ deptIndex, jobIndex }); setOpenJobDialog(true); }}
                                    className="h-8 w-8 p-0"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeleteTarget({ type: "job", deptIndex, jobIndex, name: job.name })}
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div>
                          <Button type="button" size="sm" onClick={() => addJobPositionToDepartment(deptIndex)}>
                            Add Job
                          </Button>
                        </div>
                      </>
                    </div>
                  </div>
                ))}

              </div>
            )}
            <div className="w-full">
              <Button type="button" onClick={addDepartment}>Add Department</Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const progress = (currentStep / STEPS.length) * 100;

  return (

    <div className="max-h-[calc(100svh-6rem)] overflow-y-auto h-full w-full">

      <>
        {!selectedInstitution &&
          <>


            <form
              encType="multipart/form-data"
              onSubmit={(e) => {
                e.preventDefault();
                if (currentStep === STEPS.length) {
                  handleSubmit();
                } else {
                  nextStep();
                }
              }}
            >
              <Card className="w-full border-none shadow-none overflow-hidden flex flex-col h-full py-4">
                <CardHeader className="py-3 px-4 space-y-2 border-b">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Store className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xlg mb-3">Create Your Organisation</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1]?.title}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Progress value={progress} className="h-1.5" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      {STEPS.map((step) => (
                        <div key={step.id} className="flex items-center gap-1">
                          {currentStep > step.id ? (
                            <Check className="h-3 w-3 text-primary" />
                          ) : (
                            <div
                              className={`h-3 w-3 rounded-full ${currentStep === step.id ? "bg-primary" : "bg-muted"}`}
                            />
                          )}
                          <span className={currentStep === step.id ? "font-medium" : ""}>
                            {step.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="flex-1 overflow-auto p-4">
                  {errorMessage && (
                    <div className="text-sm font-medium text-destructive bg-destructive/10 p-2 rounded-md mb-4 whitespace-pre-line">
                      {errorMessage}
                    </div>
                  )}

                  <div className="h-full">{renderStepContent()}</div>
                </CardContent>

                <CardFooter className="border-t p-4 flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>

                  {currentStep < STEPS.length ? (
                    <Button
                      type="submit"
                      disabled={!validateStep(currentStep)}
                      className="flex items-center gap-2"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={isSubmitting || !validateStep(currentStep)}
                      className="flex items-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Create Organisation
                        </>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            </form>

            {/* Dialogs */}
            <DepartmentEditorDialog
              open={openDepartmentDialog}
              initial={editingDepartmentIndex !== null ? organizationFormData.departments[editingDepartmentIndex] : null}
              onClose={() => { setOpenDepartmentDialog(false); setEditingDepartmentIndex(null); }}
              onSave={handleSaveDepartment}
            />
            <JobEditorDialog
              open={openJobDialog}
              departmentName={activeDeptForJob !== null ? organizationFormData.departments[activeDeptForJob].name : ""}
              initial={editingJob ? organizationFormData.departments[editingJob.deptIndex]?.job_positions?.[editingJob.jobIndex] : null}
              onClose={() => { setOpenJobDialog(false); setEditingJob(null); setActiveDeptForJob(null); }}
              onSave={handleSaveJob}
            />
            <ConfirmationDialog
              isOpen={!!deleteTarget}
              onClose={handleCancelDelete}
              onConfirm={handleConfirmDelete}
              title={(deleteTarget?.type === "dept" ? "Delete Department" : "Delete Job Position") + ` ${deleteTarget?.name || ""}`}
              description={deleteTarget?.type === "dept" ? `Are you sure you want to delete department ${deleteTarget.name}?` : `Are you sure you want to delete job position ${deleteTarget?.name || ""} ?`}
              disabled={false}
            />
          </>

        }
      </>

    </div>
  );
}