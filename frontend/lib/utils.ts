import {type ClassValue, clsx} from "clsx";
import {twMerge} from "tailwind-merge";
import { IDepartment, CreateDepartmentData, DepartmentFormData, IJobPosition, CreateJobPositionData, JobApplication, JobApplicationFormData } from "@/app/types/types.utils";

import apiRequest from "./apiRequest";
import { IEmployee } from "@/app/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function validatePasswordStrength(password: string): {valid: boolean; errors: string[]} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long.");
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one digit.");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter.");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter.");
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push("Password must contain at least one special character.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export interface TokenVerificationResponse {
  valid: boolean;
  detail?: string;
}

export interface PasswordResetResponse {
  detail: string;
}

export interface ForgotPasswordRequest {
  email: string;
  frontend_url?: string;
}

export interface VerifyTokenRequest {
  token: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface LoginResponse {
  tokens: {
    access: string;
    refresh: string;
  };
  user: {
    id: number;
    email: string;
    fullname: string;
    is_active: boolean;
    is_email_verified: boolean;
    is_password_verified: boolean;
    is_staff: boolean;
  };
  Institutions_attached?: any[];
}

/**
 * Request a password reset
 * @param email User's email address
 * @param frontendUrl The frontend URL for the reset link
 */
export async function forgotPassword(email: string, frontendUrl?: string): Promise<void> {
  const payload: ForgotPasswordRequest = {
    email,
    // Only include frontend_url if provided
    ...(frontendUrl && {frontend_url: frontendUrl}),
  };

  await apiRequest.post("/user/forgot-password", payload);
}

/**
 * Verify if a reset token is valid
 * @param token Reset token
 */
export async function verifyResetToken(token: string): Promise<TokenVerificationResponse> {
  const response = await apiRequest.post("/user/verify-token", {token});

  return response.data;
}

/**
 * Reset password with token
 * @param token Reset token
 * @param newPassword New password
 */
export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<PasswordResetResponse> {
  const response = await apiRequest.post("/user/reset-password", {
    token,
    new_password: newPassword,
  });

  return response.data;
}






export const createDepartment = async ({departmentData}:{departmentData:DepartmentFormData}) =>{
  try {
    const response = await apiRequest.post(`institution/${departmentData.institution}/department/`, departmentData )
    return response.data as IDepartment
  } catch (error) {
    return null
  }
}

export const getDepartment = async ({departmentId}:{departmentId:number}) =>{
  try {
    const response = await apiRequest.get(`institution/department/${departmentId}/` )
    return response.data as IDepartment
  } catch (error) {
    return null
  }
}

export const updateDepartment = async ({departmentData}:{departmentData:IDepartment}) =>{
  try {
    const response = await apiRequest.patch(`institution/department/${departmentData.id}/`, {name:departmentData.name, description:departmentData.description, institution:departmentData.institution} )
    return response.data as IDepartment
  } catch (error) {
    return null
  }
}

export const getDepartments = async ({institutionId}:{institutionId:number}) =>{
  try {
    const response = await apiRequest.get(`institution/${institutionId}/department/` )
    return response.data as IDepartment[]
  } catch (error) {
    return null
  }
}


export const getJobPositions = async ({ institutionId }: { institutionId: number }) => {
  try {
    const response = await apiRequest.get(`recruitment/institution/${institutionId}/job-position/`)
    return response.data as IJobPosition[]
  } catch (error) {
    console.error("Error fetching job positions:", error)
    return null
  }
}

export const getJobPosition = async ({jobPositionId}:{jobPositionId:number}) =>{
  try {
    const response = await apiRequest.get(`recruitment/job-position/${jobPositionId}/`)
    return response.data as IJobPosition
  } catch (error) {
    console.error("Error fetching job position:", error)
    return null
  }
}



export const createJobPosition = async ({
  institutionId,
  jobPositionData,
}: {
  institutionId: number
  jobPositionData: CreateJobPositionData
}) => {
  try {
    const formData = new FormData()

    // Add text fields
    formData.append("name", jobPositionData.name)
    if (jobPositionData.description) {
      formData.append("description", jobPositionData.description)
    }
    formData.append("department", jobPositionData.department.toString())
    if (jobPositionData.reports_to) {
      formData.append("reports_to", jobPositionData.reports_to.toString())
    }
    formData.append("salary", jobPositionData.salary.toString())

    // Add file fields
    if (jobPositionData.contract_template) {
      formData.append("contract_template", jobPositionData.contract_template)
    }
    if (jobPositionData.offer_letter_template) {
      formData.append("offer_letter_template", jobPositionData.offer_letter_template)
    }

    const response = await apiRequest.post(`recruitment/institution/${institutionId}/job-position/`, formData)
    return response.data as IJobPosition
  } catch (error) {
    console.error("Error creating job position:", error)
    return null
  }
}


export const updateJobPosition = async ({
  jobPositionId,
  jobPositionData,
}: {
  jobPositionId: number
  jobPositionData: CreateJobPositionData
}) => {
  try {
    const formData = new FormData()

    // Add text fields
    formData.append("name", jobPositionData.name)
    if (jobPositionData.description) {
      formData.append("description", jobPositionData.description)
    }
    formData.append("department", jobPositionData.department.toString())
    if (jobPositionData.reports_to) {
      formData.append("reports_to", jobPositionData.reports_to.toString())
    }
    formData.append("salary", jobPositionData.salary.toString())

    // Add file fields
    if (jobPositionData.contract_template) {
      formData.append("contract_template", jobPositionData.contract_template)
    }
    if (jobPositionData.offer_letter_template) {
      formData.append("offer_letter_template", jobPositionData.offer_letter_template)
    }

    const response = await apiRequest.patch(`recruitment/job-position/${jobPositionId}/`, formData)
    return response.data as IJobPosition
  } catch (error) {
    console.error("Error updating job position:", error)
    return null
  }
}


export const createJobApplication = async ({
  applicationData,
}: {
  applicationData: JobApplicationFormData;
}): Promise<JobApplication | null> => {
  try {
    const formData = new FormData();
    Object.entries(applicationData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value as any);
      }
    });

    const response = await apiRequest.post(`recruitment/institution/job-application/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return response.data as JobApplication;
  } catch (error) {
    console.error("Failed to create job application", error);
    return null;
  }
};

// Fetch all job applications for a specific institution
export const getJobApplications = async ({
  institutionId,
}: {
  institutionId: number;
}): Promise<JobApplication[] | null> => {
  try {
    const response = await apiRequest.get(
      `recruitment/institution/${institutionId}/job-application/`
    );
    return response.data as JobApplication[];
  } catch (error) {
    console.error("Failed to fetch job applications", error);
    return null;
  }
};

// Fetch a single job application by ID
export const getJobApplicationById = async ({
  applicationId,
}: {
  applicationId: number;
}): Promise<JobApplication | null> => {
  try {
    const response = await apiRequest.get(`recruitment/job-application/${applicationId}/`);
    return response.data as JobApplication;
  } catch (error) {
    console.error("Failed to fetch job application", error);
    return null;
  }
};

// Update an existing job application
export const updateJobApplication = async ({
  applicationId,
  applicationData,
}: {
  applicationId: number;
  applicationData: Partial<JobApplicationFormData>;
}): Promise<JobApplication | null> => {
  try {
    const formData = new FormData();
    Object.entries(applicationData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value as any);
      }
    });

    const response = await apiRequest.patch(
      `recruitment/job-application/${applicationId}/`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );

    return response.data as JobApplication;
  } catch (error) {
    console.error("Failed to update job application", error);
    return null;
  }
};



export const fetchEmployees = async ({institutionId}:{institutionId:number}) =>{
  try {
    const response = await apiRequest.get(`employee/${institutionId}`)
    return response.data as IEmployee[]
  } catch (error) {
    return null
  }
}




