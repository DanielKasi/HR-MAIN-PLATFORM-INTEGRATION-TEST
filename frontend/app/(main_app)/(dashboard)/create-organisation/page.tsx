"use client";

import type React from "react";
import {useState, useEffect, useRef} from "react";
import {useRouter} from "next/navigation";
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
  Camera,
  Image as ImageIcon,
  Pen,
  Plus,
  MoreHorizontal,
  Trash,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {useSelector, useDispatch} from "react-redux";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Icon} from "@iconify/react";
import {selectRefreshToken, selectSelectedInstitution, selectUser} from "@/store/auth/selectors";
import {
  logoutStart,
  setAccessToken,
  setAttachedInstitutions,
  setRefreshToken,
  setSelectedBranch,
  setSelectedInstitution,
  setCurrentUser,
} from "@/store/auth/actions";
import {toast} from "sonner";
import {AUTH_API, type LoginResponse} from "@/utils/auth-utils";

import {LocationAutocomplete} from "@/components/location-autocomplete";
import {Textarea} from "@/components/ui/textarea";
import PhoneNumberInput from "@/components/phone-number-input";
import type {ICountry} from "@/types/types.utils";
import type {IDepartment} from "@/types/types.utils";
import {getDefaultData, institutionAPI, showErrorToast} from "@/lib/utils";
import DepartmentEditorDialog from "@/components/common/dialogs/setup-department-edit-dialog";
import JobEditorDialog from "@/components/common/dialogs/setup-job-edit-dialog";
import {ConfirmationDialog} from "@/components/confirmation-dialog";
import {Steps, type StepItem} from "@/components/generic/steps";
import {
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenu,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";

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
  institutionLogo?: File | null;
}

const STEPS: StepItem[] = [
  {
    id: 1,
    title: "Organisation Info",
    description: "Basic details about your organisation",
  },
  {
    id: 2,
    title: "Location",
    description: "Where is your organisation located",
  },
  {
    id: 3,
    title: "Departments",
    description: "Set up departments and job positions",
  },
];

export default function CreateOrganisationWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [userId, setUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingDepartmentIndex, setEditingDepartmentIndex] = useState<number | null>(null);
  const [editingJob, setEditingJob] = useState<{deptIndex: number; jobIndex: number} | null>(null);
  
  const [openDepartmentDialog, setOpenDepartmentDialog] = useState(false);
  const [openJobDialog, setOpenJobDialog] = useState(false);
  const [activeDeptForJob, setActiveDeptForJob] = useState<number | null>(null);
  const [expandedDepartmentId, setExpandedDepartmentId] = useState<number|null>(null);
  
  const [deleteTarget, setDeleteTarget] = useState<{
    type: "dept" | "job";
    deptIndex: number;
    jobIndex?: number;
    name: string;
  } | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    institutionLogo: null,
  });

  const [firstPhone, setFirstPhone] = useState<{
    country: ICountry | null;
    countryCode: string;
    phoneNumber: string;
    isValid: boolean;
  }>({country: null, countryCode: "", phoneNumber: "", isValid: false});

  const [secondPhone, setSecondPhone] = useState<{
    country: ICountry | null;
    countryCode: string;
    phoneNumber: string;
    isValid: boolean;
  }>({country: null, countryCode: "", phoneNumber: "", isValid: true});

  useEffect(() => {
    if (currentUser) {
      try {
        const user = currentUser;
        setUserId(user.id);
        if (user.email) {
          setOrganizationFormData((prev) => ({...prev, institutionEmail: user.email}));
        }
      } catch (error) {
        toast.error("Error retrieving user information. Please log out and log in again.");
      }
    } else {
      router.push("/login");
    }
  }, [currentUser, router]);

  useEffect(() => {
    if (selectedInstitution) {
      router.push("/dashboard");
      return;
    }
    fetchDefaultDepartments();
  }, [router, selectedInstitution]);

  const fetchDefaultDepartments = async () => {
    if (selectedInstitution || !currentUser) {
      return;
    }
    try {
      const departments = await getDefaultData();
      if (departments && organizationFormData.departments.length === 0) {
        const mappedDepartments: IDepartment[] = departments.map((dept, idx) => ({
          id: idx,
          name: dept.name,
          description: dept.description ?? "",
          institution: 0,
          institution_details: null,
          job_positions: (dept.job_positions ?? []).map((job, jobIdx) => ({
            id: jobIdx,
            name: job.name,
            description: job.description ?? "",
            department_id: 0,
          })),
        }));
        setOrganizationFormData((prev) => ({...prev, departments: mappedDepartments}));
      }
    } catch (error) {
      toast.error("Failed to fetch default departments.");
    }
  };

  const updateFormData = (field: keyof OrganisationFormData, value: any) => {
    setOrganizationFormData((prev) => ({...prev, [field]: value}));
  };

  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file");
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }

      updateFormData("institutionLogo", file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    updateFormData("institutionLogo", null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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

  const addDepartment = () => {
    setEditingDepartmentIndex(null);
    setOpenDepartmentDialog(true);
  };

  const addJobPositionToDepartment = (deptIndex: number) => {
    setEditingJob(null);
    setActiveDeptForJob(deptIndex);
    setOpenJobDialog(true);
  };

  const handleSaveDepartment = (dept: {id?: number; name: string; description?: string | null}) => {
    setOrganizationFormData((prev) => {
      const departments = [...prev.departments];
      if (
        editingDepartmentIndex !== null &&
        editingDepartmentIndex >= 0 &&
        editingDepartmentIndex < departments.length
      ) {
        departments[editingDepartmentIndex] = {
          ...departments[editingDepartmentIndex],
          name: dept.name,
          description: dept.description,
        } as any;
      } else {
        departments.push({
          id: departments.length,
          name: dept.name,
          description: dept.description ?? "",
          institution: 0,
          institution_details: null,
          job_positions: [],
        } as any);
      }
      return {...prev, departments};
    });
    setEditingDepartmentIndex(null);
    setOpenDepartmentDialog(false);
  };

  const toggleDepartment = (deptId:number) => {
    if(expandedDepartmentId === deptId){
      setExpandedDepartmentId(null)
    }else{
      setExpandedDepartmentId(deptId)
    }
  }

  const handleSaveJob = (job: {id?: number; name: string; description?: string | null}) => {
    setOrganizationFormData((prev) => {
      const departments = [...prev.departments];
      const deptIndex = editingJob
        ? editingJob.deptIndex
        : (activeDeptForJob ?? departments.length - 1);
      if (deptIndex < 0 || deptIndex >= departments.length) return prev;
      const dept = {...departments[deptIndex]};
      const jobs = [...(dept.job_positions ?? [])];
      if (editingJob) {
        jobs[editingJob.jobIndex] = {
          ...jobs[editingJob.jobIndex],
          name: job.name ?? "",
          description: job.description ?? "",
        };
      } else {
        jobs.push({
          id: jobs.length,
          name: job.name ?? "",
          description: job.description ?? "",
          department_id: dept.id,
        });
      }
      dept.job_positions = jobs;
      departments[deptIndex] = dept;
      return {...prev, departments};
    });
    setEditingJob(null);
    setActiveDeptForJob(null);
    setOpenJobDialog(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const {type, deptIndex, jobIndex} = deleteTarget;
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
        return !!(
          organizationFormData.location &&
          organizationFormData.latitude &&
          organizationFormData.longitude
        );
      case 3:
        return organizationFormData.departments.length > 0;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCompletedSteps(prev => {
        if(!prev.find(step => step === currentStep)){
          return [...prev, currentStep]
        }
        return prev
      })
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
        formdata.append(
          "second_phone_number",
          `${secondPhone.countryCode}${secondPhone.phoneNumber}`,
        );
      }
      if (organizationFormData.description && organizationFormData.description.trim()) {
        formdata.append("description", organizationFormData.description);
      }
      if (organizationFormData.institutionLogo) {
        formdata.append("institution_logo", organizationFormData.institutionLogo);
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

      const response = await institutionAPI.createInstitution({data: formdata});

      if (response) {
        try {
          const fetchedUserResponse = await AUTH_API.refreshTokens({refreshToken});
          handleUserRefresh(fetchedUserResponse);
        } catch (refreshError) {
          dispatch(logoutStart());
          toast.error(
            "Organisation created, but failed to refresh user data. Please log in again.",
          );
        }
      }

      toast.success("Organisation created successfully!");
    } catch (error: any) {
      if (error) {
        showErrorToast({error, defaultMessage: "Failed to create organisation!"});

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
          setErrorMessage(`Error ${error?.status || ""}, Something went wrong!`);
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
          <div className="w-full space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column - Form Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="institutionName" className="text-sm font-medium">
                    Organization Name <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="institutionName"
                      type="text"
                      placeholder="Organization name"
                      value={organizationFormData.institutionName}
                      onChange={(e) => updateFormData("institutionName", e.target.value)}
                      className="pl-10 rounded-2xl"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="institutionEmail" className="text-sm font-medium">
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="institutionEmail"
                      type="email"
                      placeholder="example@mail.com"
                      value={organizationFormData.institutionEmail}
                      onChange={(e) => updateFormData("institutionEmail", e.target.value)}
                      className="pl-10 rounded-2xl"
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

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Tell us about your company..."
                    value={organizationFormData.description}
                    onChange={(e) => updateFormData("description", e.target.value)}
                    rows={3}
                    className="resize-none rounded-2xl"
                  />
                </div>
              </div>

              {/* Right Column - Logo Upload */}
              <div className="space-y-2">
                <p className="text-sm font-medium md:pl-12 text-center md:text-start w-full">
                  Organization Logo
                </p>
                <div className="space-y-4 flex md:pl-12 flex-col items-center md:items-start">
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div
                        onClick={() => {
                          !logoPreview && fileInputRef.current?.click();
                        }}
                        className="w-48 aspect-square border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center bg-muted/10 overflow-hidden cursor-pointer"
                      >
                        {logoPreview ? (
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center text-muted-foreground">
                            <ImageIcon className="h-8 w-8 mb-2" />
                            <span className="text-xs text-center">Upload Logo</span>
                          </div>
                        )}
                      </div>
                      {/* {logoPreview && (
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )} */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors"
                      >
                        <Icon icon="hugeicons:edit-02" className="!h-4 !w-4" />
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      id="logo"
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </div>
                  {organizationFormData.institutionLogo && (
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={removeLogo}
                        className="text-xs !bg-primary/10 rounded-full text-primary"
                      >
                        Remove Image
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-4 max-w-6xl">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Organisation Location <span className="text-destructive">*</span>
                </Label>
                <LocationAutocomplete
                  value={organizationFormData.location}
                  onChange={(value) => updateFormData("location", value)}
                  onCoordinatesChange={(lat, lon) => {
                    updateFormData("latitude", lat);
                    updateFormData("longitude", lon);
                  }}
                  className="rounded-xl"
                  placeholder="Search for your organisation location..."
                  showCurrentLocationButton={true}
                />
                {organizationFormData.latitude && organizationFormData.longitude && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Coordinates: {organizationFormData.latitude}, {organizationFormData.longitude}
                  </div>
                )}
              </div>

              <div className="bg-primary/5 border border-primary/10 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-sm text-foreground">Location Tips</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Make sure to select the exact location of your organisation. This will provide
                      more accuracy for location-based features.
                    </p>
                  </div>
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
              (job.description?.toLowerCase().includes(query) ?? false),
          );
          return matchesDepartment || matchesJobPosition;
        });

        return (
          <div className="w-full space-y-6">
            <div className="">
              <div className="text-center md:text-start mb-6">
                <h2 className="text-lg font-semibold text-foreground mb-2">
                  Setup your departments And job positions
                </h2>
                <p className="text-sm text-muted-foreground">
                  Review, create, edit or remove the departments and job positions for your
                  organisation
                </p>
              </div>

              <div className="flex items-center justify-between mb-6">
                <div className="relative flex-1 max-w-md">
                  <Input
                    type="text"
                    placeholder="Search by department or job position..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10 rounded-2xl"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg
                      className="h-4 w-4 text-muted-foreground"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
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
                <Button type="button" onClick={addDepartment} className="shrink-0 rounded-2xl">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Department
                </Button>
              </div>
            </div>

            {filteredDepartments.length === 0 ? (
              <div className="w-full border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {searchQuery ? "No departments match your search" : "No departments selected"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {searchQuery
                    ? "Try adjusting your search query."
                    : "Please select at least one department to proceed."}
                </p>
                {!searchQuery && (
                  <Button type="button" className="rounded-2xl" onClick={addDepartment}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Department
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 max-h-[60vh] overflow-y-auto pr-4 py-4">
                {filteredDepartments.map((dept, deptIndex) => (
                  <Card key={deptIndex} className={`h-fit shadow-none bg-white border border-l-0 border-r-0 border-t-0   rounded-sm !border-b ${deptIndex === 0 && "!border-t"}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                            <Icon icon="hugeicons:departement" className="text-primary h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm font-medium leading-tight">
                              {dept.name}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {dept.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-end gap-4 ml-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant={"ghost"} size={"sm"}>
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => addJobPositionToDepartment(deptIndex)}
                              >
                                <Plus className="h-3 w-3" /> Add Job Position
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="cursor-pointer"
                                onClick={() => {
                                  setEditingDepartmentIndex(deptIndex);
                                  setOpenDepartmentDialog(true);
                                }}
                              >
                                <Edit className="h-3 w-3" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="!text-destructive hover:!text-destructive cursor-pointer"
                                onClick={() =>
                                  setDeleteTarget({type: "dept", deptIndex, name: dept.name})
                                }
                              >
                                <Trash className="h-3 w-3" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <Button type="button" size={"sm"} variant={"ghost"} onClick={() => toggleDepartment(dept.id)}>
                            {
                              expandedDepartmentId === dept.id ?
                              <ChevronUp/>:
                              <ChevronDown/>
                            }
                          </Button>
                        </div>

                      </div>
                    </CardHeader>
                    {expandedDepartmentId === dept.id &&
                    <CardContent className="pt-0">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium text-muted-foreground">
                            Job Positions ({dept.job_positions?.length || 0})
                          </Label>
                        </div>

                        {(dept.job_positions?.length ?? 0) === 0 ? (
                          <p className="text-xs text-muted-foreground italic">
                            No job positions added
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto">
                            {dept.job_positions?.map((job, jobIndex) => (
                              <div
                                key={`${deptIndex}-${jobIndex}`}
                                className="flex items-start justify-between bg-muted p-2 rounded-md "
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium leading-tight">{job.name}</p>
                                  {job.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                      {job.description}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 ml-2">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant={"ghost"} size={"sm"}>
                                        <MoreHorizontal />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      <DropdownMenuItem
                                        className="cursor-pointer"
                                        onClick={() => {
                                          setEditingJob({deptIndex, jobIndex});
                                          setOpenJobDialog(true);
                                        }}
                                      >
                                        <Edit className="h-3 w-3" /> Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="!text-destructive hover:!text-destructive cursor-pointer"
                                        onClick={() =>
                                          setDeleteTarget({
                                            type: "job",
                                            deptIndex,
                                            jobIndex,
                                            name: job.name,
                                          })
                                        }
                                      >
                                        <Trash className="h-3 w-3" /> Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                    }
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (selectedInstitution) {
    return <></>;
  }

  return (
    <div className="min-h-screen overflow-y-auto bg-background">
      <div className="px-4 py-4">
        {/* Header */}
        <div className="">
          <div className="flex items-center gap-3 md:mb-8">
            <div>
              <h1 className="text-2xl font-bold text-foreground my-4">Create Your Organisation</h1>
              <p className="text-sm text-muted-foreground">
                Set up your organization to manage teams, roles, and resources in one place.
              </p>
            </div>
          </div>
          <Steps completedSteps={completedSteps} setCurrentStep={setCurrentStep} steps={STEPS} currentStep={currentStep} />
        </div>

        {/* Main Content */}
        <form
          className="max-h-screen"
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
          <div className="h-full">
            {errorMessage && (
              <div className="mb-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive font-medium whitespace-pre-line">
                  {errorMessage}
                </p>
              </div>
            )}
            <div className={`px-6 py-4 ${errorMessage ? "h-[50svh] max-h-[50vh]":"h-[60svh] max-h-[60vh]"} overflow-y-auto`}>
              {renderStepContent()}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between p-6 border-t bg-muted/30">
              {currentStep !== 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="flex items-center gap-2 rounded-full"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
              )}

              {currentStep < STEPS.length ? (
                <Button
                  type="submit"
                  disabled={!validateStep(currentStep)}
                  className="flex items-center gap-2 rounded-full px-8 md:px-12 lg:px-16"
                >
                  Continue
                </Button>
              ) : (
                <Button
                  type="submit"
                  disabled={isSubmitting || !validateStep(currentStep)}
                  className="flex items-center gap-2 px-8 md:px-12 rounded-full"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Complete & Create Organisation
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </form>

        {/* Dialogs */}
        <DepartmentEditorDialog
          open={openDepartmentDialog}
          initial={
            editingDepartmentIndex !== null
              ? organizationFormData.departments[editingDepartmentIndex]
              : null
          }
          onClose={() => {
            setOpenDepartmentDialog(false);
            setEditingDepartmentIndex(null);
          }}
          onSave={handleSaveDepartment}
        />
        <JobEditorDialog
          open={openJobDialog}
          departmentName={
            activeDeptForJob !== null ? organizationFormData.departments[activeDeptForJob].name : ""
          }
          initial={
            editingJob
              ? organizationFormData.departments[editingJob.deptIndex]?.job_positions?.[
                  editingJob.jobIndex
                ]
              : null
          }
          onClose={() => {
            setOpenJobDialog(false);
            setEditingJob(null);
            setActiveDeptForJob(null);
          }}
          onSave={handleSaveJob}
        />
        <ConfirmationDialog
          isOpen={!!deleteTarget}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          title={
            (deleteTarget?.type === "dept" ? "Delete Department" : "Delete Job Position") +
            ` ${deleteTarget?.name || ""}`
          }
          description={
            deleteTarget?.type === "dept"
              ? `Are you sure you want to delete department ${deleteTarget.name}?`
              : `Are you sure you want to delete job position ${deleteTarget?.name || ""}?`
          }
          disabled={false}
        />
      </div>
    </div>
  );
}
