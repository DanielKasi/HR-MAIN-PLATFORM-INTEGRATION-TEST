"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";
import { Upload, User, X, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useSelector } from "react-redux";
import { selectSelectedInstitution, selectAttachedInstitutions } from "@/store/auth/selectors";
import { getEmployeeById, updateEmployee, getPositions, getDepartments } from "@/lib/utils";
import { IDepartment, IJobPosition } from "@/app/types/types.utils";
import { IUserInstitution } from "@/app/types";

interface Employee {
  id: number;
  user: {
    id: number;
    email: string;
    fullname: string;
    is_active: boolean;
    is_email_verified: boolean;
    is_password_verified: boolean;
    is_staff: boolean;
    roles: string;
    branches: string;
    permissions: string;
  } | null;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  position: {
    id: number;
    name: string;
    department_id?: number;
  };
  department: {
    id: number;
    name: string;
    institution_id: number;
  };
  roles: Array<{
    id: number;
    name: string;
  }>;
  date_of_birth: string;
  date_of_joining: string;
  address: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  experience: number;
  qualifications: string;
  skills: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  marital_status: string;
  children_count: number;
  employee_profile_picture: string;
}

interface EmployeeUpdateFormState {
  fullname: string;
  email: string;
  phone_number: string;
  position: number;
  department: number;
  date_of_birth: string;
  date_of_joining: string;
  address: string;
  is_active: boolean;
  experience: number;
  qualifications: string;
  skills: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  emergency_contact_relationship: string;
  marital_status: string;
  children_count: number;
  employee_profile_picture: File | null;
}

const maritalStatusOptions = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
];

export default function UpdateEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params?.id as string;
  const { toast } = useToast();
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const institutionsAttached = useSelector(selectAttachedInstitutions) as IUserInstitution[];

  const [institutionId, setInstitutionId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);

  const [positions, setPositions] = useState<IJobPosition[]>([]);
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [formData, setFormData] = useState<EmployeeUpdateFormState>({
    fullname: "",
    email: "",
    phone_number: "",
    position: 0,
    department: 0,
    date_of_birth: "",
    date_of_joining: "",
    address: "",
    is_active: true,
    experience: 0,
    qualifications: "",
    skills: "",
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
    const loadEmployee = async () => {
      if (!employeeId) return;

      try {
        setIsLoading(true);
        let employeeData: Employee | null = null;
        
        try {
          employeeData = await getEmployeeById({ employeeId: parseInt(employeeId) });
        } catch (error) {
          const storedEmployee = localStorage.getItem(`employee_${employeeId}`);
          if (storedEmployee) {
            employeeData = JSON.parse(storedEmployee);
          }
        }

        if (employeeData) {
          setEmployee(employeeData);
          
          setFormData({
            fullname: employeeData.user?.fullname || "",
            email: employeeData.email,
            phone_number: employeeData.phone_number || "",
            position: employeeData.position?.id || 0,
            department: employeeData.department?.id || 0,
            date_of_birth: employeeData.date_of_birth || "",
            date_of_joining: employeeData.date_of_joining || "",
            address: employeeData.address || "",
            is_active: employeeData.is_active,
            experience: employeeData.experience || 0,
            qualifications: employeeData.qualifications || "",
            skills: employeeData.skills || "",
            emergency_contact_name: employeeData.emergency_contact_name || "",
            emergency_contact_phone: employeeData.emergency_contact_phone || "",
            emergency_contact_relationship: employeeData.emergency_contact_relationship || "",
            marital_status: employeeData.marital_status || "single",
            children_count: employeeData.children_count || 0,
            employee_profile_picture: null,
          });

          if (employeeData.employee_profile_picture) {
            setPreviewUrl(employeeData.employee_profile_picture);
          }
        } else {
          setSubmitError("Employee not found");
        }
      } catch (error) {
        setSubmitError("Failed to load employee data");
      } finally {
        setIsLoading(false);
      }
    };

    loadEmployee();
  }, [employeeId]);

  useEffect(() => {
    const loadDropdownData = async () => {
      if (!institutionId) return;

      try {
        setLoadingData(true);
        const [positionsData, departmentsData] = await Promise.all([
          getPositions({ institutionId }),
          getDepartments({ institutionId }),
        ]);

        setPositions(Array.isArray(positionsData) ? positionsData : []);
        setDepartments(Array.isArray(departmentsData) ? departmentsData : []);
      } catch (error) {
        setSubmitError("Failed to load form data. Please refresh the page.");
      } finally {
        setLoadingData(false);
      }
    };

    loadDropdownData();
  }, [institutionId]);

  const handleInputChange = (field: string, value: string | boolean | File | null | number) => {
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

    if (previewUrl && !previewUrl.startsWith('http')) {
      URL.revokeObjectURL(previewUrl);
    }

    try {
      handleInputChange("employee_profile_picture", file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setUploadError(null);
      setUploadSuccess("Image uploaded successfully");
    } catch (error) {
      setUploadError("Failed to process image");
      setUploadSuccess(null);
    }
  };

  const handleRemoveImage = () => {
    if (previewUrl && !previewUrl.startsWith('http')) {
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

  const validateForm = (): boolean => {
    const requiredFields = ["fullname", "email", "position", "department", "date_of_joining"];

    for (const field of requiredFields) {
      if (!formData[field as keyof EmployeeUpdateFormState] || formData[field as keyof EmployeeUpdateFormState] === 0) {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeId) {
      setSubmitError("Missing required information");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const updateData = {
        user: {
          fullname: formData.fullname,
          email: formData.email,
        },
        email: formData.email,
        phone_number: formData.phone_number,
        position: formData.position,
        department: formData.department,
        date_of_birth: formData.date_of_birth,
        date_of_joining: formData.date_of_joining,
        address: formData.address,
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

      const result = await updateEmployee({
        employeeId: parseInt(employeeId),
        employeeData: updateData,
      });

      if (result) {
        toast({
          title: "Success!",
          description: "Employee has been updated successfully.",
          variant: "default",
          duration: 3000,
        });

        localStorage.removeItem(`employee_${employeeId}`);
        
        router.push("/employees/employee-list");
      } else {
        setSubmitError("Failed to update employee. Please try again.");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update employee. Please try again.",
        variant: "destructive",
        duration: 5000,
      });

      setSubmitError(error.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl && !previewUrl.startsWith('http')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (isLoading || loadingData) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          <p className="mt-2 text-gray-600">Loading employee data...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Employee not found</p>
          <Link href="/employees/employee-list">
            <Button>Back to Employee List</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 overflow-hidden">
      <div className="max-w-full mx-auto h-full">
        <Card className="bg-white shadow-lg h-full">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between sticky top-0 bg-white z-10 border-b">
            <div className="mb-4 sm:mb-0">
              <CardTitle className="text-2xl flex items-center gap-2">
                <ArrowLeft className="h-5 w-5" />
                Update Employee
              </CardTitle>
              <CardDescription>
                Update {employee.user?.fullname || employee.email}'s information
              </CardDescription>
            </div>
            <Link href="/employees/employee-list" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">
                Back to Employee List
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-6 overflow-y-auto">
            {submitError && (
              <div className="mb-6 p-4 border border-red-300 bg-red-50 text-red-700 rounded-md">
                {submitError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Profile Picture Section */}
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

              {/* Personal Information */}
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
                </div>
              </div>

              <Separator />

              {/* Work Information */}
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
                        {Array.isArray(positions) && positions.length > 0 ? (
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
                        {Array.isArray(departments) && departments.length > 0 ? (
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
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isActive"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleInputChange("is_active", checked as boolean)}
                  />
                  <Label htmlFor="isActive">Active Employee</Label>
                </div>
              </div>

              <Separator />

              {/* Emergency Contact */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Emergency Contact</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <Separator />

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row justify-end gap-4">
                <Link href="/employees/employee-list">
                  <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={isSubmitting}>
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating Employee...
                    </>
                  ) : (
                    "Update Employee"
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