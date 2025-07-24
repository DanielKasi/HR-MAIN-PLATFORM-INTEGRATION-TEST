"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Upload, User, X, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { selectSelectedInstitution, selectAttachedInstitutions } from "@/store/auth/selectors";
import { createEmployee, getPositions, getDepartments, createWorkType, createEmployeeType, getWorkTypes, getEmployeeTypes } from "@/lib/utils";
import { attachEmployeeBranch } from "@/lib/utils.branch";
import { EmployeeFormData, EmployeeFormState, IDepartment, IJobPosition, IWorkType, IEmployeeType, IWorkTypeFormData, IEmployeeTypeFormData } from "@/app/types/types.utils";
import { IUserInstitution } from "@/app/types";


const maritalStatusOptions = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
];

const steps = [
  { id: 1, title: "Personal Information" },
  { id: 2, title: "Work Information" },
  { id: 3, title: "Financial Information" },
];

export default function AddEmployeeForm() {
  const [currentStep, setCurrentStep] = useState(1);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const dropdown = document.getElementById('branchMultiSelectDropdown');
      if (dropdown && !dropdown.contains(event.target as Node)) {
        setShowBranchDropdown(false);
      }
    };

    if (showBranchDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showBranchDropdown]);

  const router = useRouter();
  const { toast } = useToast();
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const institutionsAttached = useSelector(selectAttachedInstitutions) as IUserInstitution[];

  const [institutionId, setInstitutionId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [positions, setPositions] = useState<IJobPosition[]>([]);
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [workTypes, setWorkTypes] = useState<IWorkType[]>([]);
  const [employeeTypes, setEmployeeTypes] = useState<IEmployeeType[]>([]);
  const [loadingData, setLoadingData] = useState(false);

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

  const [formData, setFormData] = useState<EmployeeFormState>({
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
    employee_profile_picture: null,
  });

  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (selectedInstitution) {
      setInstitutionId(selectedInstitution.id);
    } else if (institutionsAttached && institutionsAttached.length > 0) {
      setInstitutionId(institutionsAttached[0].id);
    }
  }, [institutionsAttached, selectedInstitution]);

  useEffect(() => {
    const loadDropdownData = async () => {
      if (!selectedInstitution?.id) return;

      try {
        const [positionsData, departmentsData, workTypesData, employeeTypesData] = await Promise.all([
          getPositions({ institutionId: selectedInstitution?.id  }),
          getDepartments({ institutionId: selectedInstitution?.id  }),
          getWorkTypes({ institutionId: selectedInstitution?.id  }),
          getEmployeeTypes({ institutionId: selectedInstitution?.id  }),
        ]);

        setPositions(Array.isArray(positionsData) ? positionsData : []);
        setDepartments(Array.isArray(departmentsData) ? departmentsData : []);
        setWorkTypes(Array.isArray(workTypesData) ? workTypesData : []);
        setEmployeeTypes(Array.isArray(employeeTypesData) ? employeeTypesData : []);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while loading form data.";
        setSubmitError(errorMessage);
      }
    };

    loadDropdownData();
  }, [institutionId]);

  const handleInputChange = (field: string, value: string | boolean | File | null | number | number[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
      handleInputChange("employee_profile_picture", file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setUploadError(null);
      setUploadSuccess("Image uploaded successfully");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while processing the image.";
      setUploadError(errorMessage);
      setUploadSuccess(null);
    }
  };

  const handleRemoveImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl("");
    handleInputChange("employee_profile_picture", null);
    setUploadError(null);
    setUploadSuccess(null);

    const fileInput = document.getElementById("profilePicture") as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleAddWorkType = async () => {
    if (!workTypeFormData.name.trim()) {
      toast({
        title: "Error",
        description: "Work type name is required",
        variant: "destructive",
      });
      return;
    }

    setIsAddingWorkType(true);

    try {
      const newWorkType = await createWorkType({
        institutionId: institutionId ?? 0,
        workTypeData: workTypeFormData,
      });

      if (newWorkType) {
        setWorkTypes(prev => [...prev, newWorkType]);
        setFormData(prev => ({ ...prev, work_type: newWorkType.id }));
        setWorkTypeFormData({ name: "", description: "", code: "" });
        setIsWorkTypeModalOpen(false);
        toast({
          title: "Success",
          description: "Work type added successfully",
          variant: "default",
        });
      } else {
        throw new Error("Failed to create work type");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while adding work type.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAddingWorkType(false);
    }
  };

  const handleAddEmployeeType = async () => {
    if (!employeeTypeFormData.name.trim()) {
      toast({
        title: "Error",
        description: "Employee type name is required",
        variant: "destructive",
      });
      return;
    }

    setIsAddingEmployeeType(true);

    try {
      const newEmployeeType = await createEmployeeType({
        institutionId: institutionId ?? 0,
        employeeTypeData: employeeTypeFormData,
      });

      if (newEmployeeType) {
        setEmployeeTypes(prev => [...prev, newEmployeeType]);
        setFormData(prev => ({ ...prev, employee_type: newEmployeeType.id }));
        setEmployeeTypeFormData({ name: "", description: "", code: "" });
        setIsEmployeeTypeModalOpen(false);
        toast({
          title: "Success",
          description: "Employee type added successfully",
          variant: "default",
        });
      } else {
        throw new Error("Failed to create employee type");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while adding employee type.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsAddingEmployeeType(false);
    }
  };

  const validateForm = (): boolean => {
    const requiredFields = ["fullname", "email", "position", "department", "date_of_joining"];

    for (const field of requiredFields) {
      if (!formData[field as keyof EmployeeFormState] || formData[field as keyof EmployeeFormState] === 0) {
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

  const nextStep = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!institutionId) {
      setSubmitError("No institution selected");
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
        is_active: formData.is_active,
        experience: formData.experience,
        qualifications: formData.qualifications,
        skills: formData.skills,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        emergency_contact_relationship: formData.emergency_contact_relationship,
        marital_status: formData.marital_status,
        children_count: formData.children_count,
        employee_profile_picture: formData.employee_profile_picture,
      };

      const result = await createEmployee({
        institutionId,
        employeeData: dataToSubmit,
      });

      if (result && result.id) {
        const employeeId = result.id;
        const selectedBranches = Array.isArray(formData.selected_branches) ? formData.selected_branches : [];
        const branches = selectedBranches.map((branchId, i) => ({
          branch_id: branchId,
          is_default: i === 0
        }));

        try {
          await attachEmployeeBranch({
            employee_id: employeeId,
            branches
          });

          toast({
            title: "Success!",
            description: "Employee has been created successfully and added to the system, and branches attached.",
            variant: "default",
            duration: 4000,
          });

          router.push("/employees/employee-list");
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while attaching branches.";
          toast({
            title: "Error",
            description: errorMessage,
            variant: "destructive",
            duration: 5000,
          });
        }
      } else {
        setSubmitError("Failed to create employee. Please try again.");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred while creating the employee.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
        duration: 5000,
      });
      setSubmitError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Personal Information</h3>
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
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  value={formData.phone_number}
                  onChange={(e) => handleInputChange("phone_number", e.target.value)}
                  placeholder="Enter phone number"
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
                  onChange={(e) => handleInputChange("children_count", parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
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
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => handleInputChange("country", e.target.value)}
                  placeholder="Enter country"
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
                <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
                <Input
                  id="emergencyContactPhone"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => handleInputChange("emergency_contact_phone", e.target.value)}
                  placeholder="Emergency contact phone"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactRelationship">Relationship</Label>
                <Input
                  id="emergencyContactRelationship"
                  value={formData.emergency_contact_relationship}
                  onChange={(e) => handleInputChange("emergency_contact_relationship", e.target.value)}
                  placeholder="Relationship to employee"
                />
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
                <Label htmlFor="position">Position *</Label>
                <Select
                  value={formData.position > 0 ? formData.position.toString() : ""}
                  onValueChange={(value) => handleInputChange("position", parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.length > 0 ? (
                      positions.map((position) => (
                        <SelectItem key={position.id} value={position.id.toString()}>
                          {position.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-gray-500">No positions available</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department *</Label>
                <Select
                  value={formData.department > 0 ? formData.department.toString() : ""}
                  onValueChange={(value) => handleInputChange("department", parseInt(value))}
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
                      <div className="px-2 py-1.5 text-sm text-gray-500">No departments available</div>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="workType">Work Type</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.work_type > 0 ? formData.work_type.toString() : ""}
                    onValueChange={(value) => handleInputChange("work_type", parseInt(value))}
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
                        <div className="px-2 py-1.5 text-sm text-gray-500">No work types available</div>
                      )}
                    </SelectContent>
                  </Select>
                  <Dialog open={isWorkTypeModalOpen} onOpenChange={setIsWorkTypeModalOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="icon" className="shrink-0" title="Add new work type">
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
                            onChange={(e) => setWorkTypeFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter work type name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="workTypeCode">Code</Label>
                          <Input
                            id="workTypeCode"
                            value={workTypeFormData.code}
                            onChange={(e) => setWorkTypeFormData(prev => ({ ...prev, code: e.target.value }))}
                            placeholder="Enter work type code (optional)"
                            maxLength={10}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="workTypeDescription">Description</Label>
                          <Textarea
                            id="workTypeDescription"
                            value={workTypeFormData.description}
                            onChange={(e) => setWorkTypeFormData(prev => ({ ...prev, description: e.target.value }))}
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
                            setWorkTypeFormData({ name: "", description: "", code: "" });
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
                <Label htmlFor="employeeType">Employee Type</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.employee_type > 0 ? formData.employee_type.toString() : ""}
                    onValueChange={(value) => handleInputChange("employee_type", parseInt(value))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employee type" />
                    </SelectTrigger>
                    <SelectContent>
                      {employeeTypes.length > 0 ? (
                        employeeTypes.map((employeeType) => (
                          <SelectItem key={employeeType.id} value={employeeType.id.toString()}>
                            {employeeType.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-gray-500">No employee types available</div>
                      )}
                    </SelectContent>
                  </Select>
                  <Dialog open={isEmployeeTypeModalOpen} onOpenChange={setIsEmployeeTypeModalOpen}>
                    <DialogTrigger asChild>
                      <Button type="button" variant="outline" size="icon" className="shrink-0" title="Add new employee type">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Add New Employee Type</DialogTitle>
                        <DialogDescription>
                          Create a new employee type to add to your institution.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="employeeTypeName">Name *</Label>
                          <Input
                            id="employeeTypeName"
                            value={employeeTypeFormData.name}
                            onChange={(e) => setEmployeeTypeFormData(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter employee type name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="employeeTypeCode">Code</Label>
                          <Input
                            id="employeeTypeCode"
                            value={employeeTypeFormData.code}
                            onChange={(e) => setEmployeeTypeFormData(prev => ({ ...prev, code: e.target.value }))}
                            placeholder="Enter employee type code (optional)"
                            maxLength={10}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="employeeTypeDescription">Description</Label>
                          <Textarea
                            id="employeeTypeDescription"
                            value={employeeTypeFormData.description}
                            onChange={(e) => setEmployeeTypeFormData(prev => ({ ...prev, description: e.target.value }))}
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
                            setEmployeeTypeFormData({ name: "", description: "", code: "" });
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
                  onChange={(e) => handleInputChange("experience", parseInt(e.target.value) || 0)}
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
              <div className="space-y-2">
                <Label htmlFor="branchMultiSelect">Branch (Multi-Select)</Label>
                <div className="relative" id="branchMultiSelectDropdown">
                  <button
                    type="button"
                    className="w-full h-10 px-3 py-2 text-sm border border-gray-300 rounded-md bg-background flex justify-between items-center"
                    onClick={() => setShowBranchDropdown((prev) => !prev)}
                  >
                    <span>
                      {formData.selected_branches.length > 0
                        ? institutionsAttached
                            .filter((branch) => formData.selected_branches.includes(branch.id))
                            .map((branch) => branch.institution_name)
                            .join(", ")
                        : "Select branch(es)"}
                    </span>
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showBranchDropdown && (
                    <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-auto">
                      {institutionsAttached.slice(0, 4).map((branch) => (
                        <label key={branch.id} className="flex items-center px-4 py-2 cursor-pointer hover:bg-gray-100">
                          <input
                            type="checkbox"
                            checked={formData.selected_branches.includes(branch.id)}
                            onChange={(e) => {
                              const selected = [...formData.selected_branches];
                              if (e.target.checked) {
                                if (!selected.includes(branch.id)) selected.push(branch.id);
                              } else {
                                const idx = selected.indexOf(branch.id);
                                if (idx > -1) selected.splice(idx, 1);
                              }
                              handleInputChange('selected_branches', selected);
                            }}
                            className="mr-2"
                          />
                          {branch.institution_name}
                        </label>
                      ))}
                      {institutionsAttached.length === 0 && (
                        <div className="px-4 py-2 text-gray-500">No branches available</div>
                      )}
                    </div>
                  )}
                </div>
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
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-full mx-auto">
        <Card className="bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Add New Employee</CardTitle>
            <CardDescription>Fill in the employee details to add them to the system</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {submitError && (
              <div className="mb-6 p-4 border border-red-300 bg-red-50 text-red-700 rounded-md">
                {submitError}
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-8">
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
                    <Button type="button" variant="outline" className="flex items-center space-x-2" asChild>
                      <span>
                        <Upload className="w-4 h-4" />
                        <span>{previewUrl ? "Change Photo" : "Upload Photo"}</span>
                      </span>
                    </Button>
                  </Label>
                  <p className="text-xs text-gray-500 mt-2">Max size: 5MB. Formats: JPEG, PNG, GIF, WebP</p>
                </div>
                {uploadError && <p className="text-red-500 text-sm text-center">{uploadError}</p>}
                {uploadSuccess && <p className="text-green-500 text-sm text-center">{uploadSuccess}</p>}
              </div>
              <Separator />
              {renderStep()}
              <Separator />
              <div className="flex justify-between">
                <Link href="/employees/employee-list">
                  <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={isSubmitting}>
                    Cancel
                  </Button>
                </Link>
                {currentStep > 1 && (
                  <Button type="button" onClick={prevStep} variant="outline">
                    Previous
                  </Button>
                )}
                {currentStep < steps.length ? (
                  <Button type="button" onClick={nextStep} className="bg-orange-600 hover:bg-orange-700 px-6">
                    Next
                  </Button>
                  
                ) : (
                  <Button type="button" onClick={handleSubmit} className="bg-orange-600 hover:bg-orange-700" disabled={isSubmitting}>
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
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
