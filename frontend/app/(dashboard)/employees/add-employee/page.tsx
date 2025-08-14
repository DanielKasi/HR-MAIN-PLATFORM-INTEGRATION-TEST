"use client";

import type React from "react";
import {useState, useEffect, useMemo} from "react";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import PhoneNumberInput from "@/components/phone-number-input";
import CountrySelect from "@/components/common/country-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {Checkbox} from "@/components/ui/checkbox";
import {Separator} from "@/components/ui/separator";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {Textarea} from "@/components/ui/textarea";
import {Upload, User, X, Loader2, Plus} from "lucide-react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {useSelector} from "react-redux";
import {selectSelectedInstitution, selectAttachedInstitutions} from "@/store/auth/selectors";
import {
  createEmployee,
  getPositions,
  getDepartments,
  createWorkType,
  createEmployeeType,
  getWorkTypes,
  getEmployeeTypes,
} from "@/lib/utils";
import {useBranches} from "@/hooks/use-branches";
import {MultiSelectBranches} from "@/components/multi-select-branches";
import type {
  EmployeeFormData,
  ICreateEmployeeForm,
  IDepartment,
  IJobPosition,
  IWorkType,
  IEmployeeType,
  IWorkTypeFormData,
  IEmployeeTypeFormData,
  ICountry,
} from "@/types/types.utils";
import type {IUserInstitution} from "@/types";
import {toast} from "sonner";
import {selectEmployeeCreationForm} from "@/store/miscellaneous/selectors";
import {useDispatch} from "react-redux";
import {clearEmployeeForm, saveEmployeeForm} from "@/store/miscellaneous/actions";

const maritalStatusOptions = [
  {value: "single", label: "Single"},
  {value: "married", label: "Married"},
  {value: "divorced", label: "Divorced"},
  {value: "widowed", label: "Widowed"},
];

const steps = [
  {id: 1, title: "Personal Information"},
  {id: 2, title: "Work Information"},
  {id: 3, title: "Financial Information"},
];

export default function AddEmployeeForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const router = useRouter();
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const currentEmployeeCreationForm = useSelector(selectEmployeeCreationForm);

  // const [institutionId, setInstitutionId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const {branches, loading: branchesLoading, error: branchesError} = useBranches();

  const [positions, setPositions] = useState<IJobPosition[]>([]);
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [workTypes, setWorkTypes] = useState<IWorkType[]>([]);
  const [employeeTypes, setEmployeeTypes] = useState<IEmployeeType[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [employeeProfilePicture, setEmployeeProfilePicture] = useState<File | null>(null);

  const [isWorkTypeModalOpen, setIsWorkTypeModalOpen] = useState(false);
  const [isEmployeeTypeModalOpen, setIsEmployeeTypeModalOpen] = useState(false);
  const [isAddingWorkType, setIsAddingWorkType] = useState(false);
  const [isAddingEmployeeType, setIsAddingEmployeeType] = useState(false);

  const [workTypeFormData, setWorkTypeFormData] = useState<IWorkTypeFormData>({
    name: "",
    description: "",
    code: "",
  });

  const [employeeTypeFormData, setEmployeeTypeFormData] = useState<IEmployeeTypeFormData>({
    name: "",
    description: "",
    code: "",
  });

  const [formData, setFormData] = useState<ICreateEmployeeForm>({
    fullname: "",
    email: "",
    phone_number: "",
    position: 0,
    department: 0,
    work_type: 0,
    employee_type: 0,
    date_of_birth: "",
    date_of_joining: new Date().toISOString().split("T")[0],
    address: "",
    country: "",
    nin: "",
    bank: "",
    bank_account_number: "",
    tin: "",
    nssf_no: "",
    is_active: true,
    experience: 0,
    qualifications: "",
    skills: "",
    selected_branches: [],
    emergency_contact_name: "",
    emergency_contact_phone: "",
    emergency_contact_relationship: "",
    marital_status: "single",
    children_count: 0,
  });

  // Filter positions based on selected department
  const filteredPositions = useMemo(() => {
    if (!formData.department || formData.department === 0) {
      return positions; // Show all positions if no department is selected
    }
    return positions.filter(position => position.department === formData.department);
  }, [positions, formData.department]);

  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const [selectedCountry, setSelectedCountry] = useState<ICountry | null>(null);
  const [phoneInput, setPhoneInput] = useState<{
    country: ICountry | null;
    countryCode: string;
    phoneNumber: string;
    isValid: boolean;
  }>({country: null, countryCode: "", phoneNumber: "", isValid: false});

  // Add state for emergency contact phone input
  const [emergencyPhoneInput, setEmergencyPhoneInput] = useState<{
    country: ICountry | null;
    countryCode: string;
    phoneNumber: string;
    isValid: boolean;
  }>({country: null, countryCode: "", phoneNumber: "", isValid: false});

  const dispatch = useDispatch();

  const showErrorToast = (message: string) => {
    toast.error(message);
  };

  const showSuccessToast = (message: string) => {
    toast.success(message);
  };

  useEffect(() => {
    loadDropdownData();
  }, [selectedInstitution]);

  // Load saved employee form data from Redux on component mount
  useEffect(() => {
    if (currentEmployeeCreationForm && !formData.fullname) {
      setFormData(currentEmployeeCreationForm);
      
      // Initialize phone input states from saved data
      if (currentEmployeeCreationForm.phone_number) {
        setPhoneInput(prev => ({
          ...prev,
          phoneNumber: currentEmployeeCreationForm.phone_number,
          countryCode: ""
        }));
      }
      
      if (currentEmployeeCreationForm.country) {
        setSelectedCountry({ name: { common: currentEmployeeCreationForm.country } } as ICountry);
      }
      
      if (currentEmployeeCreationForm.emergency_contact_phone) {
        setEmergencyPhoneInput(prev => ({
          ...prev,
          phoneNumber: currentEmployeeCreationForm.emergency_contact_phone,
          countryCode: ""
        }));
      }
    }
  }, [currentEmployeeCreationForm, formData.fullname]);



  useEffect(() => {
    setFormData((prev) => ({...prev, selected_branches: branches.map((br) => br.id)}));
  }, [branches]);

  const loadDropdownData = async () => {
    if (!selectedInstitution) return;

    setLoadingData(true);
    try {
      const [positionsData, departmentsData, workTypesData, employeeTypesData] = await Promise.all([
        getPositions({institutionId: selectedInstitution.id}),
        getDepartments({institutionId: selectedInstitution.id}),
        getWorkTypes({institutionId: selectedInstitution.id}),
        getEmployeeTypes({institutionId: selectedInstitution.id}),
      ]);

      setPositions(Array.isArray(positionsData) ? positionsData : []);
      setDepartments(Array.isArray(departmentsData) ? departmentsData : []);
      setWorkTypes(Array.isArray(workTypesData) ? workTypesData : []);
      setEmployeeTypes(Array.isArray(employeeTypesData) ? employeeTypesData : []);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unknown error occurred while loading form data.";
      setSubmitError(errorMessage);
    } finally {
      setLoadingData(false);
    }
  };

  const handleSaveLocalEmployeeCreateForm = (formValue: ICreateEmployeeForm) => {
    dispatch(saveEmployeeForm(formValue));
  };

  const handleClearLocalEmployeeCreateForm = () => {
    // Clear from Redux
    dispatch(clearEmployeeForm());
    
    // Clear local form state
    setFormData({
      fullname: "",
      email: "",
      phone_number: "",
      position: 0,
      department: 0,
      work_type: 0,
      employee_type: 0,
      date_of_birth: "",
      date_of_joining: new Date().toISOString().split("T")[0],
      address: "",
      country: "",
      nin: "",
      bank: "",
      bank_account_number: "",
      tin: "",
      nssf_no: "",
      is_active: true,
      experience: 0,
      qualifications: "",
      skills: "",
      selected_branches: [],
      emergency_contact_name: "",
      emergency_contact_phone: "",
      emergency_contact_relationship: "",
      marital_status: "single",
      children_count: 0,
    });
    
    // Clear profile picture
    setEmployeeProfilePicture(null);
    setPreviewUrl("");
    setUploadError(null);
    setUploadSuccess(null);
    
    // Reset to first step
    setCurrentStep(1);
    
    // Clear any errors
    setSubmitError(null);
    
    toast.success("Form cleared successfully");
  };

  const handleInputChange = (
    field: keyof ICreateEmployeeForm,
    value: string | boolean | File | null | number | number[],
  ) => {
    if (field == "position") {
      const position = positions.find((p) => p.id === value);
      if (position) {
        const updatedFormData = {
          ...formData,
          position: position.id,
          department: position.department || 0,
        };
        setFormData(updatedFormData);
        handleSaveLocalEmployeeCreateForm(updatedFormData);
      }
    } else if (field === "department") {
      // Clear position when department changes
      const departmentValue = typeof value === 'number' ? value : Number(value);
      const updatedFormData = {
        ...formData,
        department: departmentValue,
        position: 0, // Reset position when department changes
      };
      setFormData(updatedFormData);
      handleSaveLocalEmployeeCreateForm(updatedFormData);
    } else {
      const updatedFormData = {
        ...formData,
        [field]: value,
      };
      setFormData(updatedFormData);
      handleSaveLocalEmployeeCreateForm(updatedFormData);
    }
  };

  const handleProflePictureChange = (value: File | null) => {
    setEmployeeProfilePicture(value);
    
    // Also save the updated form data to Redux (without the profile picture)
    const updatedFormData = { ...formData };
    setFormData(updatedFormData);
    handleSaveLocalEmployeeCreateForm(updatedFormData);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setUploadError("No file selected");
      setUploadSuccess(null);
      return;
    }

    const validImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validImageTypes.includes(file.type)) {
      setUploadError("Please upload a valid image (JPEG, PNG, GIF, or WebP)");
      setUploadSuccess(null);
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError("Image size exceeds 5MB limit");
      setUploadSuccess(null);
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    try {
      handleProflePictureChange(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setUploadError(null);
      setUploadSuccess("Image uploaded successfully");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unknown error occurred while processing the image.";
      setUploadError(errorMessage);
      setUploadSuccess(null);
    }
  };

  const handleRemoveImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl("");
    handleProflePictureChange(null);
    setUploadError(null);
    setUploadSuccess(null);

    const fileInput = document.getElementById("profilePicture") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
    
    // Save the updated form data to Redux after removing image
    const updatedFormData = { ...formData };
    setFormData(updatedFormData);
    handleSaveLocalEmployeeCreateForm(updatedFormData);
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleAddWorkType = async () => {
    if (!selectedInstitution) {
      return;
    }
    if (!workTypeFormData.name.trim()) {
      showErrorToast("Work type name is required");
      return;
    }

    setIsAddingWorkType(true);

    try {
      const newWorkType = await createWorkType({
        institutionId: selectedInstitution.id,
        workTypeData: workTypeFormData,
      });

      if (newWorkType) {
        setWorkTypes((prev) => [...prev, newWorkType]);
        setFormData((prev) => ({...prev, work_type: newWorkType.id}));
        setWorkTypeFormData({name: "", description: "", code: ""});
        setIsWorkTypeModalOpen(false);
        showSuccessToast("Work type added successfully");
      } else {
        throw new Error("Failed to create work type");
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unknown error occurred while adding work type.";
      showErrorToast(errorMessage);
    } finally {
      setIsAddingWorkType(false);
    }
  };

  const handleAddEmployeeType = async () => {
    if (!selectedInstitution) {
      return;
    }
    if (!employeeTypeFormData.name.trim()) {
      showErrorToast("Employee type name is required");
      return;
    }

    setIsAddingEmployeeType(true);

    try {
      const newEmployeeType = await createEmployeeType({
        institutionId: selectedInstitution.id,
        employeeTypeData: employeeTypeFormData,
      });

      if (newEmployeeType) {
        setEmployeeTypes((prev) => [...prev, newEmployeeType]);
        setFormData((prev) => ({...prev, employee_type: newEmployeeType.id}));
        setEmployeeTypeFormData({name: "", description: "", code: ""});
        setIsEmployeeTypeModalOpen(false);
        showSuccessToast("Employee type name added successfully");
      } else {
        throw new Error("Failed to create employee type name");
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unknown error occurred while adding employee type name.";
      showErrorToast(errorMessage);
    } finally {
      setIsAddingEmployeeType(false);
    }
  };

  const validateForm = (): boolean => {
    const requiredFields = ["fullname", "email", "position", "department", "date_of_joining"];

    for (const field of requiredFields) {
      if (
        !formData[field as keyof ICreateEmployeeForm] ||
        formData[field as keyof ICreateEmployeeForm] === 0
      ) {
        setSubmitError(`Please fill in the ${field.replace("_", " ")} field`);
        return false;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setSubmitError("Please enter a valid email address");
      return false;
    }

    return true;
  };

  const validateCurrentStep = (): boolean => {
    setSubmitError(null);

    switch (currentStep) {
      case 1: // Personal Information
        const personalRequiredFields = ["fullname", "email"];
        for (const field of personalRequiredFields) {
          if (!formData[field as keyof ICreateEmployeeForm]) {
            setSubmitError(`Please fill in the ${field.replace("_", " ")} field`);
            return false;
          }
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          setSubmitError("Please enter a valid email address");
          return false;
        }
        break;

      case 2: // Work Information
        const workRequiredFields = ["position", "department", "date_of_joining"];
        for (const field of workRequiredFields) {
          const value = formData[field as keyof ICreateEmployeeForm];
          if (!value || value === 0) {
            setSubmitError(`Please fill in the ${field.replace("_", " ")} field`);
            return false;
          }
        }
        break;

      case 3: // Financial Information - no required fields currently
        break;

      default:
        return true;
    }

    return true;
  };

  const isCurrentStepValid = (): boolean => {
    switch (currentStep) {
      case 1: // Personal Information
        const personalRequiredFields = ["fullname", "email"];
        for (const field of personalRequiredFields) {
          if (!formData[field as keyof ICreateEmployeeForm]) {
            return false;
          }
        }
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
          return false;
        }
        break;

      case 2: // Work Information
        const workRequiredFields = ["position", "department", "date_of_joining"];
        for (const field of workRequiredFields) {
          const value = formData[field as keyof ICreateEmployeeForm];
          if (!value || value === 0) {
            return false;
          }
        }
        break;

      case 3: // Financial Information - no required fields currently
        return true;

      default:
        return true;
    }
    return true;
  };

  const nextStep = async () => {
    setIsValidating(true);
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (validateCurrentStep() && currentStep < steps.length) {
      // Save current form data to Redux before moving to next step
      handleSaveLocalEmployeeCreateForm(formData);
      setCurrentStep(currentStep + 1);
    }

    setIsValidating(false);
  };

  const prevStep = () => {
    if (currentStep > 1) {
      // Save current form data to Redux before moving to previous step
      handleSaveLocalEmployeeCreateForm(formData);
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInstitution) {
      setSubmitError("No institution found");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const dataToSubmit: EmployeeFormData = {
        id: 0,
        user: {
          fullname: formData.fullname,
          email: formData.email,
        },
        email: formData.email,
        phone_number: formData.phone_number,
        position: formData.position,
        department: formData.department,
        work_type: formData.work_type,
        employee_type: formData.employee_type,
        date_of_birth: formData.date_of_birth,
        date_of_joining: formData.date_of_joining,
        address: formData.address,
        country: formData.country,
        nin: formData.nin,
        bank: formData.bank,
        bank_account_number: formData.bank_account_number,
        tin: formData.tin,
        nssf_no: formData.nssf_no,
        is_active: formData.is_active,
        experience: formData.experience,
        qualifications: formData.qualifications,
        skills: formData.skills,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        emergency_contact_relationship: formData.emergency_contact_relationship,
        marital_status: formData.marital_status,
        children_count: formData.children_count,
        employee_profile_picture: employeeProfilePicture,
        selected_branches: formData.selected_branches,
      };

      await createEmployee({
        institutionId: selectedInstitution.id,
        employeeData: dataToSubmit,
      });

      handleClearLocalEmployeeCreateForm();
      router.push("/employees/employee-list");
      showSuccessToast("Employee created successfully");
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unknown error occurred while creating the employee.";
      
      showErrorToast(errorMessage);
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sync main phone and country to formData
  useEffect(() => {
    // Only update if there are actual changes to prevent infinite loops
    const newPhoneNumber = phoneInput.countryCode && phoneInput.phoneNumber
      ? `${phoneInput.phoneNumber}`
      : formData.phone_number;
    
    const newCountry = selectedCountry?.name?.common || formData.country;
    
    const newEmergencyPhone = emergencyPhoneInput.countryCode && emergencyPhoneInput.phoneNumber
      ? `${emergencyPhoneInput.phoneNumber}`
      : formData.emergency_contact_phone;
    
    // Check if any values actually changed
    if (newPhoneNumber !== formData.phone_number || 
        newCountry !== formData.country || 
        newEmergencyPhone !== formData.emergency_contact_phone) {
      
      const updatedFormData = {
        ...formData,
        phone_number: newPhoneNumber,
        country: newCountry,
        emergency_contact_phone: newEmergencyPhone,
      };
      
      setFormData(updatedFormData);
      handleSaveLocalEmployeeCreateForm(updatedFormData);
    }
  }, [phoneInput.countryCode, phoneInput.phoneNumber, selectedCountry?.name?.common, emergencyPhoneInput.countryCode, emergencyPhoneInput.phoneNumber]);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Personal Information</h3>

            {/* Basic Personal Info */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-700 border-b pb-2">Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullname">Full Name *</Label>
                  <Input
                    id="fullname"
                    value={formData.fullname}
                    onChange={(e) => handleInputChange("fullname", e.target.value)}
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="Enter email address"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <PhoneNumberInput
                    label="Phone Number"
                    value={formData.phone_number|| ""}
                    country={phoneInput.country}
                    onChange={setPhoneInput}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateOfBirth">Date of Birth</Label>
                  <Input
                    id="dateOfBirth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleInputChange("date_of_birth", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maritalStatus">Marital Status</Label>
                  <Select
                    value={formData.marital_status}
                    onValueChange={(value) => handleInputChange("marital_status", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select marital status" />
                    </SelectTrigger>
                    <SelectContent>
                      {maritalStatusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="childrenCount">Number of Children</Label>
                  <Input
                    id="childrenCount"
                    type="number"
                    min="0"
                    value={formData.children_count}
                    onChange={(e) =>
                      handleInputChange("children_count", Number.parseInt(e.target.value) || 0)
                    }
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-700 border-b pb-2">
                Address Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    placeholder="Enter full address"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <CountrySelect
                    selectedCountry={selectedCountry}
                    onCountryChange={(country) => {
                      setSelectedCountry(country);
                      if (country) {
                        handleInputChange("country", country.name.common);
                      }
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nin">National ID Number (NIN)</Label>
                  <Input
                    id="nin"
                    value={formData.nin}
                    onChange={(e) => handleInputChange("nin", e.target.value)}
                    placeholder="Enter national ID number"
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact Information */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-700 border-b pb-2">
                Emergency Contact Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2  gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactName">Contact Name</Label>
                  <Input
                    id="emergencyContactName"
                    value={formData.emergency_contact_name}
                    onChange={(e) => handleInputChange("emergency_contact_name", e.target.value)}
                    placeholder="Emergency contact name"
                  />
                </div>
                <div className="space-y-2">
                  <PhoneNumberInput
                    label="Contact Phone"
                    value={formData.emergency_contact_phone || ""}
                    country={emergencyPhoneInput.country}
                    onChange={setEmergencyPhoneInput}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactRelationship">Relationship</Label>
                  <Input
                    id="emergencyContactRelationship"
                    value={formData.emergency_contact_relationship}
                    onChange={(e) =>
                      handleInputChange("emergency_contact_relationship", e.target.value)
                    }
                    placeholder="Relationship to employee"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Work Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select
                  value={formData.department > 0 ? formData.department.toString() : ""}
                  onValueChange={(value) => handleInputChange("department", Number.parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.length > 0 ? (
                      departments.map((department) => (
                        <SelectItem key={department.id} value={department.id.toString()}>
                          {department.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-gray-500">
                        No departments available
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position *</Label>
                {formData.department > 0 && (
                  <p className="text-xs text-gray-500">
                    Showing positions for {departments.find(d => d.id === formData.department)?.name}
                  </p>
                )}
                <Select
                  value={formData.position > 0 ? formData.position.toString() : ""}
                  onValueChange={(value) => handleInputChange("position", Number.parseInt(value))}
                  disabled={formData.department === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredPositions.length > 0 ? (
                      filteredPositions.map((position) => (
                        <SelectItem key={position.id} value={position.id.toString()}>
                          {position.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-gray-500">
                        {formData.department > 0 
                          ? "No positions available for this department" 
                          : "Please select a department first"}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="workType">Work Type</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.work_type > 0 ? formData.work_type.toString() : ""}
                    onValueChange={(value) =>
                      handleInputChange("work_type", Number.parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select work type" />
                    </SelectTrigger>
                    <SelectContent>
                      {workTypes.length > 0 ? (
                        workTypes.map((workType) => (
                          <SelectItem key={workType.id} value={workType.id.toString()}>
                            {workType.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-gray-500">
                          No work types available
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <Dialog open={isWorkTypeModalOpen} onOpenChange={setIsWorkTypeModalOpen}>
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0 bg-transparent"
                        title="Add new work type"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Add New Work Type</DialogTitle>
                        <DialogDescription>
                          Create a new work type to add to your institution.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="workTypeName">Name *</Label>
                          <Input
                            id="workTypeName"
                            value={workTypeFormData.name}
                            onChange={(e) =>
                              setWorkTypeFormData((prev) => ({...prev, name: e.target.value}))
                            }
                            placeholder="Enter work type name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="workTypeCode">Code</Label>
                          <Input
                            id="workTypeCode"
                            value={workTypeFormData.code}
                            onChange={(e) =>
                              setWorkTypeFormData((prev) => ({...prev, code: e.target.value}))
                            }
                            placeholder="Enter work type code (optional)"
                            maxLength={10}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="workTypeDescription">Description</Label>
                          <Textarea
                            id="workTypeDescription"
                            value={workTypeFormData.description}
                            onChange={(e) =>
                              setWorkTypeFormData((prev) => ({
                                ...prev,
                                description: e.target.value,
                              }))
                            }
                            placeholder="Enter work type description (optional)"
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsWorkTypeModalOpen(false);
                            setWorkTypeFormData({name: "", description: "", code: ""});
                          }}
                          disabled={isAddingWorkType}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={handleAddWorkType}
                          disabled={isAddingWorkType || !workTypeFormData.name.trim()}
                        >
                          {isAddingWorkType ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            "Add Work Type"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="employeeType">Employee Type Name</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.employee_type > 0 ? formData.employee_type.toString() : ""}
                    onValueChange={(value) =>
                      handleInputChange("employee_type", Number.parseInt(value))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee type name" />
                    </SelectTrigger>
                    <SelectContent>
                      {employeeTypes.length > 0 ? (
                        employeeTypes.map((employeeType) => (
                          <SelectItem key={employeeType.id} value={employeeType.id.toString()}>
                            {employeeType.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-gray-500">
                          No employee type names available
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <Dialog open={isEmployeeTypeModalOpen} onOpenChange={setIsEmployeeTypeModalOpen}>
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="shrink-0 bg-transparent"
                        title="Add new employee type name"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Add New Employee Type Name</DialogTitle>
                        <DialogDescription>
                          Create a new employee type name to add to your institution.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="employeeTypeName">Name *</Label>
                          <Input
                            id="employeeTypeName"
                            value={employeeTypeFormData.name}
                            onChange={(e) =>
                              setEmployeeTypeFormData((prev) => ({...prev, name: e.target.value}))
                            }
                            placeholder="Enter employee type name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="employeeTypeCode">Code</Label>
                          <Input
                            id="employeeTypeCode"
                            value={employeeTypeFormData.code}
                            onChange={(e) =>
                              setEmployeeTypeFormData((prev) => ({...prev, code: e.target.value}))
                            }
                            placeholder="Enter employee type code (optional)"
                            maxLength={10}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="employeeTypeDescription">Description</Label>
                          <Textarea
                            id="employeeTypeDescription"
                            value={employeeTypeFormData.description}
                            onChange={(e) =>
                              setEmployeeTypeFormData((prev) => ({
                                ...prev,
                                description: e.target.value,
                              }))
                            }
                            placeholder="Enter employee type description (optional)"
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsEmployeeTypeModalOpen(false);
                            setEmployeeTypeFormData({name: "", description: "", code: ""});
                          }}
                          disabled={isAddingEmployeeType}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          onClick={handleAddEmployeeType}
                          disabled={isAddingEmployeeType || !employeeTypeFormData.name.trim()}
                        >
                          {isAddingEmployeeType ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Adding...
                            </>
                          ) : (
                            "Add Employee Type"
                          )}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfJoining">Date of Joining *</Label>
                <Input
                  id="dateOfJoining"
                  type="date"
                  value={formData.date_of_joining}
                  onChange={(e) => handleInputChange("date_of_joining", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience">Experience (Years)</Label>
                <Input
                  id="experience"
                  type="number"
                  min="0"
                  value={formData.experience}
                  onChange={(e) =>
                    handleInputChange("experience", Number.parseInt(e.target.value) || 0)
                  }
                  placeholder="Years of experience"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qualifications">Qualifications</Label>
                <Input
                  id="qualifications"
                  value={formData.qualifications}
                  onChange={(e) => handleInputChange("qualifications", e.target.value)}
                  placeholder="Enter qualifications"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="skills">Skills</Label>
                <Input
                  id="skills"
                  value={formData.skills}
                  onChange={(e) => handleInputChange("skills", e.target.value)}
                  placeholder="Enter skills"
                />
              </div>
              <div className="md:col-span-2">
                <MultiSelectBranches
                  branches={branches}
                  selectedBranches={formData.selected_branches}
                  onSelectionChange={(selectedIds) =>
                    handleInputChange("selected_branches", selectedIds)
                  }
                  loading={branchesLoading}
                  error={branchesError}
                  placeholder="Select branches for this employee"
                  label="Employee Branches"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => handleInputChange("is_active", checked)}
                />
                <Label htmlFor="isActive">Active Employee</Label>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Financial Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank">Bank</Label>
                <Input
                  id="bank"
                  value={formData.bank}
                  onChange={(e) => handleInputChange("bank", e.target.value)}
                  placeholder="Enter bank name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAccountNumber">Bank Account Number</Label>
                <Input
                  id="bankAccountNumber"
                  value={formData.bank_account_number}
                  onChange={(e) => handleInputChange("bank_account_number", e.target.value)}
                  placeholder="Enter bank account number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nssf_no">National Social Security Fund</Label>
                <Input
                  id="nssf_no"
                  value={formData.nssf_no}
                  onChange={(e) => handleInputChange("nssf_no", e.target.value)}
                  placeholder="Enter NSSF"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tin">Tax Identification Number</Label>
                <Input
                  id="tin"
                  value={formData.tin}
                  onChange={(e) => handleInputChange("tin", e.target.value)}
                  placeholder="Enter TIN"
                />
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full mx-auto">
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Add New Employee</CardTitle>
            <CardDescription>
              Fill in the employee details to add them to the system
            </CardDescription>

            {/* Progress indicator */}
            <div className="flex items-center justify-between mt-5">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep >= step.id
                        ? "bg-orange-600 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {step.id}
                  </div>
                  <span
                    className={`ml-2 text-sm ${
                      currentStep >= step.id ? "text-orange-600 font-medium" : "text-gray-500"
                    }`}
                  >
                    {step.title}
                  </span>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-12 h-0.5 mx-4 ${currentStep > step.id ? "bg-orange-600" : "bg-gray-200"}`}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {submitError && (
              <div className="mb-6 p-4 border border-red-300 bg-red-50 text-red-700 rounded-md">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8 w-full">
              {/* Profile Picture Upload */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="w-24 h-24">
                    <AvatarImage src={previewUrl || "/placeholder.svg"} alt="Profile preview" />
                    <AvatarFallback>
                      <User className="w-12 h-12" />
                    </AvatarFallback>
                  </Avatar>
                  {previewUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-colors"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="text-center">
                  <Input
                    id="profilePicture"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Label htmlFor="profilePicture" className="cursor-pointer">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex items-center space-x-2 bg-transparent"
                      asChild
                    >
                      <span>
                        <Upload className="w-4 h-4" />
                        <span>{previewUrl ? "Change Photo" : "Upload Photo"}</span>
                      </span>
                    </Button>
                  </Label>
                  <p className="text-xs text-gray-500 mt-2">
                    Max size: 5MB. Formats: JPEG, PNG, GIF, WebP
                  </p>
                </div>
                {uploadError && <p className="text-red-500 text-sm text-center">{uploadError}</p>}
                {uploadSuccess && (
                  <p className="text-green-500 text-sm text-center">{uploadSuccess}</p>
                )}
              </div>

              <Separator />

              {/* Form Steps */}
              {renderStep()}

              <Separator />

              {/* Navigation Buttons */}
              <div className="flex justify-between">
                <div className="flex gap-2">
                  <Link href="/employees/employee-list">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto bg-transparent"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClearLocalEmployeeCreateForm}
                    className="w-full sm:w-auto bg-transparent"
                    disabled={isSubmitting}
                  >
                    Clear Form
                  </Button>

                </div>

                <div className="flex gap-2">
                  {currentStep > 1 && (
                    <Button type="button" onClick={prevStep} variant="outline">
                      Previous
                    </Button>
                  )}
                  {currentStep < steps.length ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      className="bg-orange-600 hover:bg-orange-700 px-6"
                      disabled={!isCurrentStepValid() || isValidating}
                    >
                      {isValidating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Validating...
                        </>
                      ) : (
                        "Next"
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleSubmit}
                      className="bg-orange-600 hover:bg-orange-700"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating Employee...
                        </>
                      ) : (
                        "Submit"
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
