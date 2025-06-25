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
import { useToast } from "@/components/ui/use-toast"; // Import useToast hook
import { Upload, User, X, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { selectSelectedInstitution, selectAttachedInstitutions } from "@/store/auth/selectors";
import { createEmployee, getRoles, getPositions, getDepartments } from "@/lib/utils";
import { EmployeeFormData, IRole, IDepartment, IJobPosition } from "@/app/types/types.utils";
import { IUserInstitution } from "@/app/types";

// Marital status options
const maritalStatusOptions = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
];

export default function AddEmployeeForm() {
  const router = useRouter();
  const { toast } = useToast(); // Initialize toast hook
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const institutionsAttached = useSelector(selectAttachedInstitutions) as IUserInstitution[];

  const [institutionId, setInstitutionId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // State for dropdown data
  const [roles, setRoles] = useState<IRole[]>([]);
  const [positions, setPositions] = useState<IJobPosition[]>([]);
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form data structure
  const [formData, setFormData] = useState<EmployeeFormData>({
    user: {
      email: "",
      fullname: "",
      password: "",
      roles_ids: [],
      permissions: "string",
    },
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    position: 0,
    department: 0,
    date_of_birth: "",
    date_of_joining: new Date().toISOString().split("T")[0],
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

  // Set institution ID
  useEffect(() => {
    if (selectedInstitution) {
      setInstitutionId(selectedInstitution.id);
    } else if (institutionsAttached && institutionsAttached.length > 0) {
      setInstitutionId(institutionsAttached[0].id);
    }
  }, [institutionsAttached, selectedInstitution]);

  // Load dropdown data
  useEffect(() => {
    const loadDropdownData = async () => {
      if (!institutionId) {
        console.log("No institution ID available");
        return;
      }

      console.log("Loading data for institution:", institutionId);
      setLoadingData(true);

      try {
        const [rolesData, positionsData, departmentsData] = await Promise.all([
          getRoles({ institutionId }),
          getPositions({ institutionId }),
          getDepartments({ institutionId }),
        ]);

        setRoles(Array.isArray(rolesData) ? rolesData : []);
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

  const handleInputChange = (field: string, value: string | boolean | File | null | number | number[]) => {
    if (field.startsWith("user.")) {
      const userField = field.replace("user.", "");
      setFormData((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          [userField]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
  };

  // Sync email fields
  useEffect(() => {
    if (formData.email !== formData.user.email) {
      setFormData((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          email: prev.email,
        },
      }));
    }
  }, [formData.email]);

  // Sync fullname
  useEffect(() => {
    const fullname = `${formData.first_name} ${formData.last_name}`.trim();
    if (fullname !== formData.user.fullname) {
      setFormData((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          fullname: fullname,
        },
      }));
    }
  }, [formData.first_name, formData.last_name]);

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
    } catch (error) {
      setUploadError("Failed to process image");
      setUploadSuccess(null);
      console.error("Image processing error:", error);
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

  const validateForm = (): boolean => {
    const requiredFields = ["first_name", "last_name", "email", "position", "department", "date_of_joining"];

    for (const field of requiredFields) {
      if (!formData[field as keyof EmployeeFormData] || formData[field as keyof EmployeeFormData] === 0) {
        setSubmitError(`Please fill in the ${field.replace("_", " ")} field`);
        return false;
      }
    }

    if (!formData.user.password) {
      setSubmitError("Please provide a password for the user account");
      return false;
    }

    if (formData.user.roles_ids.length === 0) {
      setSubmitError("Please select at least one role");
      return false;
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
      console.log("Submitting employee data:", formData);

      const dataToSubmit = {
        ...formData,
        employee_profile_picture: null, // Temporarily remove file to test CORS
      };

      const result = await createEmployee({
        institutionId,
        employeeData: dataToSubmit,
      });

      if (result) {
        // Show success toast
        toast({
          title: "Success!",
          description: "Employee has been created successfully and added to the system.",
          variant: "default",
          duration: 4000,
        });

        // Navigate immediately without delay
        router.push("/employees/employee-list");
      } else {
        setSubmitError("Failed to create employee. Please try again.");
      }
    } catch (error: any) {
      console.error("Error creating employee:", error);

      // Show error toast
      toast({
        title: "Error",
        description: error.message || "Failed to create employee. Please try again.",
        variant: "destructive",
        duration: 5000,
      });

      setSubmitError(error.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          <p className="mt-2 text-gray-600">Loading form data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 overflow-hidden">
      <div className="max-w-5xl mx-auto h-full">
        <Card className="bg-white shadow-lg h-full">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between sticky top-0 bg-white z-10 border-b">
            <div className="mb-4 sm:mb-0">
              <CardTitle className="text-2xl">Add New Employee</CardTitle>
              <CardDescription>Fill in the employee details to add them to the system</CardDescription>
            </div>
            <Link href="/employees/employee-list" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">Back to Employee List</Button>
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
                {uploadSuccess && <p className="text-orange-500 text-sm text-center">{uploadSuccess}</p>}
              </div>

              <Separator />

              {/* Personal Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Personal Information</h3>
                <div className="flex flex-col gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={formData.first_name}
                      onChange={(e) => handleInputChange("first_name", e.target.value)}
                      placeholder="Enter first name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      value={formData.last_name}
                      onChange={(e) => handleInputChange("last_name", e.target.value)}
                      placeholder="Enter last name"
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
                    <Label htmlFor="dateOfBirth">Date of Birth *</Label>
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
                  <div className="space-y-2 sm:col-span-2 lg:col-span-1">
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
                <div className="flex flex-col gap-4">
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

              {/* User Account Information */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">User Account Information</h3>
                <div className="flex flex-col gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="userRoles">Roles *</Label>
                    <Select
                      value={formData.user.roles_ids.length > 0 ? formData.user.roles_ids[0].toString() : ""}
                      onValueChange={(value) => handleInputChange("user.roles_ids", [parseInt(value)])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.isArray(roles) && roles.length > 0 ? (
                          roles.map((role) => (
                            <SelectItem key={role.id} value={role.id.toString()}>
                              {role.name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="px-2 py-1.5 text-sm text-gray-500">
                            No roles available (Count: {roles.length})
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userPassword">Password *</Label>
                    <Input
                      id="userPassword"
                      type="password"
                      value={formData.user.password}
                      onChange={(e) => handleInputChange("user.password", e.target.value)}
                      placeholder="Enter password"
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Note: Backend may override this with a generated password
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="userPermissions">Permissions</Label>
                    <Input
                      id="userPermissions"
                      value={formData.user.permissions}
                      onChange={(e) => handleInputChange("user.permissions", e.target.value)}
                      placeholder="Additional permissions"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Emergency Contact */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold">Emergency Contact</h3>
                <div className="flex flex-col gap-4">
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
                      Creating Employee...
                    </>
                  ) : (
                    "Add Employee"
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
