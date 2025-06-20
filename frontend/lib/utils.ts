import {type ClassValue, clsx} from "clsx";
import {twMerge} from "tailwind-merge";
import { IDepartment, CreateDepartmentData, DepartmentFormData, IJobPosition, CreateJobPositionData, JobApplication, JobApplicationFormData, JobPositionAdvert, JobPositionAdvertFormData, IInterview, EmployeeFormData, User, IInterviewFormData, IInterviewStage, IInterviewStageFormData } from "@/app/types/types.utils";

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
  institutionId,
  applicationData,
}: {
  institutionId: number
  applicationData: JobApplicationFormData;
}): Promise<JobApplication | null> => {


    const formData = new FormData();

    // Log what we're appending to FormData
    Object.entries(applicationData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        console.log(`Appending ${key}:`, value instanceof File ? `File: ${value.name}` : value)
        formData.append(key, value as any);
      }
    });




    const response = await apiRequest.post(
      `recruitment/institution/${institutionId}/job-application/`,
      formData
    );

    console.log("API Response:", response.data)
    return response.data as JobApplication;
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
      formData
    );

    return response.data as JobApplication;
  } catch (error) {
    console.error("Failed to update job application", error);
    return null;
  }
};



export const fetchEmployees = async ({institutionId}:{institutionId:number}) =>{
  try {
    const response = await apiRequest.get(`employee/${institutionId}/employee/`)
    return response.data as IEmployee[]
  } catch (error) {
    return null
  }
}


export const createJobPositionAdvert = async ({
  institutionId,
  advertData,
}: {
  institutionId: number;
  advertData: JobPositionAdvertFormData;
}): Promise<JobPositionAdvert | null> => {
  try {
    const formData = new FormData();
    Object.entries(advertData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    const response = await apiRequest.post(
      `recruitment/institution/${institutionId}/job-advert/`,
      formData
    );

    return response.data as JobPositionAdvert;
  } catch (error) {
    console.error("Failed to create job position advert", error);
    return null;
  }
};



// Fetch all job position adverts for a specific institution
export const getJobPositionAdverts = async ({
  institutionId,
}: {
  institutionId: number;
}): Promise<JobPositionAdvert[] | null> => {
  try {
    const response = await apiRequest.get(
      `recruitment/institution/${institutionId}/job-advert/`
    );
    return response.data as JobPositionAdvert[];
  } catch (error) {
    console.error("Failed to fetch job position adverts", error);
    return null;
  }
};

// Fetch a single job position advert by ID
export const getJobPositionAdvertById = async ({
  advertId,
}: {
  advertId: number;
}): Promise<JobPositionAdvert | null> => {
  try {
    const response = await apiRequest.get(`recruitment/job-advert/${advertId}/`);
    return response.data as JobPositionAdvert;
  } catch (error) {
    console.error("Failed to fetch job position advert", error);
    return null;
  }
};



// Update an existing job position advert
export const updateJobPositionAdvert = async ({
  advertId,
  advertData,
}: {
  advertId: number;
  advertData: Partial<JobPositionAdvertFormData>;
}): Promise<JobPositionAdvert | null> => {
  try {
    const formData = new FormData();
    Object.entries(advertData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    const response = await apiRequest.patch(
      `recruitment/job-advert/${advertId}/`,
      formData
    );

    return response.data as JobPositionAdvert;
  } catch (error) {
    console.error("Failed to update job position advert", error);
    return null;
  }
};


export const getInterviews = async ({ institutionId }: { institutionId: number }) => {
    try {
      const response = await apiRequest.get(`recruitment/institution/${institutionId}/job-interview/`)
      return response.data as IInterview[]
    } catch (error) {
      console.error("Error fetching job interviews:", error)
      return null
    }
  }

  export const getInterviewById = async ({
    interviewId,
  }: {
    interviewId: number;
  }): Promise<IInterview | null> => {
    try {
      const response = await apiRequest.get(`recruitment/job-interview/${interviewId}/`);
      return response.data as IInterview;
    } catch (error) {
      console.error("Failed to fetch job position advert", error);
      return null;
    }
  };


// Create a new interview for a given institution
export const createInterview = async ({
  institutionId,
  interviewData,
}: {
  institutionId: number;
  interviewData: IInterviewFormData;
}): Promise<IInterview | null> => {
  try {
    const formData = new FormData();
    Object.entries(interviewData).forEach(([key, value]) => {
      // Only append defined values
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    const response = await apiRequest.post(
      `recruitment/institution/${institutionId}/job-interview/`,
      formData
    );
    return response.data as IInterview;
  } catch (error) {
    console.error("Failed to create job interview:", error);
    return null;
  }
};

// Update an existing interview by its ID
export const updateInterview = async ({
  interviewId,
  interviewData,
}: {
  interviewId: number;
  interviewData: Partial<IInterviewFormData>;
}): Promise<IInterview | null> => {
  try {
    const formData = new FormData();
    Object.entries(interviewData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    const response = await apiRequest.patch(
      `recruitment/job-interview/${interviewId}/`,
      formData
    );
    return response.data as IInterview;
  } catch (error) {
    console.error("Failed to update job interview:", error);
    return null;
  }
};


export const getInterviewStages = async ({
  institutionId,
}: {
  institutionId: number;
}): Promise<IInterviewStage[] | null> => {
  try {
    const response = await apiRequest.get(
      `recruitment/institution/${institutionId}/interview-stage/`
    );
    return response.data as IInterviewStage[];
  } catch (error) {
    console.error("Failed to fetch interview stages:", error);
    return null;
  }
};


export const createInterviewStage = async ({
  institutionId,
  stageData,
}: {
  institutionId: number;
  stageData: IInterviewStageFormData;
}): Promise<IInterviewStage | null> => {
  try {
    const formData = new FormData();
    Object.entries(stageData).forEach(([key, value]) => {
      formData.append(key, value.toString());
    });

    const response = await apiRequest.post(
      `recruitment/institution/${institutionId}/interview-stage/`,
      formData
    );
    return response.data as IInterviewStage;
  } catch (error) {
    console.error("Failed to create interview stage:", error);
    return null;
  }
};

// It returns a promise that resolves to an array of IEmployee objects or throws an error ifAdd commentMore actions
export const getAllEmployees = async ({institutionId}:{institutionId:number}) => {
  try {
    const endpoint = `employee/${institutionId}/employee/`;
    const response = await apiRequest.get(endpoint);
    return response.data as IEmployee[];
  } catch (error) {
    throw error;
  }
};


export const createEmployee = async ({
  institutionId,
  employeeData,
}: {
  institutionId: number;
  employeeData: EmployeeFormData;
}): Promise<EmployeeFormData | null> => {
  try {
    const formData = new FormData();

    // Append institutionId
    formData.append("institutionId", institutionId.toString());

    // Handle nested user object
    if (employeeData.user && typeof employeeData.user === 'object') {
      Object.entries(employeeData.user).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'roles_ids' && Array.isArray(value)) {
            // Handle array - you might need to stringify or handle differently based on your backend
            formData.append(`user.${key}`, JSON.stringify(value));
          } else {
            formData.append(`user.${key}`, value.toString());
          }
        }
      });
    }

    // Handle other fields
    Object.entries(employeeData).forEach(([key, value]) => {
      if (key === "user") {
        // Already handled above
        return;
      }

      if (key === "employee_profile_picture" && value instanceof File) {
        formData.append(key, value);
      } else if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    const response = await apiRequest.post(
      `/employee/employee/create`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    if (!response.data || typeof response.data !== "object") {
      throw new Error("Invalid response format");
    }

    return response.data as EmployeeFormData;
  } catch (error: any) {
    console.error("Failed to create employee:", error.message || error);
    return null;
  }
};



export const updateJobApplicationStatus = async ({applicationId, status}:{applicationId:number, status:string}) =>{
  


}