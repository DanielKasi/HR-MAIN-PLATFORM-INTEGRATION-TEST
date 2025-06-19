import {type ClassValue, clsx} from "clsx";
import {twMerge} from "tailwind-merge";
import { Department, CreateDepartmentData, DepartmentFormData } from "@/app/types/types.utils";

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




// Mock departments data
const mockDepartments: Department[] = [
  {
    id: 1,
    name: "Human Resources",
    description: "Manages employee relations, recruitment, and HR policies",
    institution: 1}
    ,
  {
    id: 2,
    name: "Finance",
    description: "Handles financial planning, budgeting, and accounting",
    institution: 1,
  },
  {
    id: 3,
    name: "Operations",
    description: "Oversees daily operations and process optimization",
    institution: 1,
  },
]

// export const mockDepartmentApi = {
//   // Fetch departments for a specific branch
//   getDepartmentsByBranch: async (branchId: number): Promise<Department[]> => {
//     // Simulate API delay
//     await new Promise((resolve) => setTimeout(resolve, 800))

//     // Filter departments by branch_id
//     return mockDepartments.filter((dept) => dept.branch_id === branchId)
//   },

//   // Create a new department
//   createDepartment: async (departmentData: CreateDepartmentData): Promise<Department> => {
//     // Simulate API delay
//     await new Promise((resolve, reject) =>{
//       setTimeout(()=>{resolve("")}, 3000)
//     })

//     // Create new department with mock data
//     const newDepartment: Department = {
//       id: Math.max(...mockDepartments.map((d) => d.id)) + 1,
//       ...departmentData,
//     }

//     // Add to mock data (in real app, this would be handled by backend)
//     mockDepartments.push(newDepartment)

//     return newDepartment
//   },
// }


export const createDepartment = async ({departmentData}:{departmentData:DepartmentFormData}) =>{
  try {
    const response = await apiRequest.post(`institution/${departmentData.institution}/department/`, departmentData )
    return response.data as Department
  } catch (error) {
    return null
  }
}

export const updateDepartment = async ({departmentData}:{departmentData:Department}) =>{
  try {
    const response = await apiRequest.patch(`department/${departmentData.id}/`, {name:departmentData.name, description:departmentData.description, institution:departmentData.institution} )
    return response.data as Department
  } catch (error) {
    return null
  }
}

export const getDepartments = async ({institutionId}:{institutionId:number}) =>{
  try {
    const response = await apiRequest.get(`institution/${institutionId}/department/` )
    return response.data as Department[]
  } catch (error) {
    return null
  }
}



export const fetchEmployees = async ({institutionId}:{institutionId:number}) =>{
  try {
    const response = await apiRequest.get(`employee/${institutionId}`)
    return response.data as IEmployee[]
  } catch (error) {
    return null
  }
}




