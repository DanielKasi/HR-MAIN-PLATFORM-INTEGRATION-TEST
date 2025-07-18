import {type ClassValue, clsx} from "clsx";
import {twMerge} from "tailwind-merge";
import { IDepartment, CreateDepartmentData, DepartmentFormData, IJobPosition, 
  CreateJobPositionData, JobApplication, JobApplicationFormData, JobPositionAdvert, JobPositionAdvertFormData, 
  IInterview, EmployeeFormData, User, IInterviewFormData, IInterviewStage, IInterviewStageFormData,
   IBulkOnBoardingResponse, IBulkOnBoardingRequest, IOnBoarding, IOnBoardingFormData, IEmployeeTypeFormData  , IWorkType,
   IWorkTypeFormData, IEmployeeType,EmployeeBranchSummary,AttachBranchesPayload,SetDefaultBranchPayload,
   DisciplinaryActionForm, DisciplinaryActionRequest, DisciplinaryActionResponse, convertFormToApiRequest,
   DisciplineTypeForm, DisciplineTypeResponse, convertDisciplineTypeFormToApiRequest, DisciplinaryActionAPIResponse,
   ILeaveRequest, ILeaveRequestFormData, LeaveRequestStatus,LeaveType,ILeaveTypeFormData, ILeaveType,ILeavePolicy, 
   ILeavePolicyFormData, ILeavePolicyResponse, IAllowanceType, IAllowanceTypeFormData, IDeductionType, IDeductionTypeFormData,
   IEmployeeAllowance,IEmployeeAllowanceFormData,IEmployeeDeduction, IEmployeeDeductionFormData, IPayrollPeriod, IPayrollPeriodFormData,
   IPayslipFormData, IPayslip, IPayslipItem, PaginatedEmployeeResponse,
   EmployeeFromAPI, PaginatedIOnboardingResponse,
   PaginatedResponse
  } from "@/app/types/types.utils";

import apiRequest from "./apiRequest";
import { IEmployee } from "@/app/types/types.utils";
import { IPaginatedResponse } from "@/app/types";

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
  institution_attached?: any[];
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

export const getDepartments = async ({institutionId}: {institutionId: number}) => {
  try {
    const response = await apiRequest.get(`institution/${institutionId}/department/`)
    const data = response.data as PaginatedResponse<IDepartment>
    
    // Return the results array instead of the entire response
    return data.results
  } catch (error) {
    return null
  }
}

export const getJobPositions = async ({ institutionId }: { institutionId: number }) => {
  try {
    const response = await apiRequest.get(`recruitment/institution/${institutionId}/job-position/`)
    const data = response.data as PaginatedResponse<IJobPosition>
    return data.results
  } catch (error) {
    console.error("Error fetching job positions:", error)
    return null
  }
}

export const getJobPosition = async ({jobPositionId}:{jobPositionId:number}) =>{
  try {
    const response = await apiRequest.get(`recruitment/job-position/${jobPositionId}/`)
    const data = response.data as IJobPosition
    return data
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

   
    return response.data as JobApplication;
};

// Fetch all job applications for a specific institution
export const getJobApplications = async ({
  institutionId,
}: {
  institutionId: number;
}): Promise<PaginatedResponse<JobApplication> | null> => {
  try {
    const response = await apiRequest.get(
      `recruitment/institution/${institutionId}/job-application/`
    );
    return response.data as PaginatedResponse<JobApplication>
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


export const updateJobApplicationStatus = async ({applicationId, status}:{applicationId:number, status:string}): Promise<JobApplication | null> => {
  try {
    const formData = new FormData();
    formData.append("status", status);

      const response = await apiRequest.patch(
      `recruitment/job-application/${applicationId}/`,
      formData
    );

    return response.data as JobApplication;
  } catch (error) {
    console.error("Failed to update job application", error);
    return null;
  }
}

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
  } catch (error: any) {
    if (error?.response?.status === 404 || error?.response?.status === 400) {
      return null;
    }
    throw error;
  }
};


export const getJobPositionAdverts = async ({
  institutionId,
}: {
  institutionId: number;
}): Promise<PaginatedResponse<JobPositionAdvert> | null> => {
  try {
    const response = await apiRequest.get(
      `recruitment/institution/${institutionId}/job-advert/`
    );
    return response.data; 
  } catch (error) {
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


export const updateCandidateStageeFeedback = async ({
  candidateId,
  stageId,
  feedback,
  rating,
}: {
  candidateId: number;
  stageId: number;
  feedback: string;
  rating: number;
}): Promise<any> => {
  try {
    // First find the interview for this candidate in this stage
    const interviewsResponse = await apiRequest.get(
      `recruitment/interviews/?job_position_application=${candidateId}&interview_stage=${stageId}`
    );
    
    if (!interviewsResponse.data.results || interviewsResponse.data.results.length === 0) {
      throw new Error('No interview found for this candidate in this stage');
    }
    
    const interviewId = interviewsResponse.data.results[0].id;
    
    const formData = new FormData();
    formData.append('feedback', feedback);
    formData.append('rating', rating.toString());

    const response = await apiRequest.patch(
      `recruitment/job-interview/${interviewId}/`,
      formData
    );
    return response.data;
  } catch (error) {
    console.error("Failed to update candidate feedback:", error);
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


export const getAllEmployees = async ({institutionId}:{institutionId:number}) => {
  try {
    const endpoint = `employee/${institutionId}/employee/`;
    const response = await apiRequest.get(endpoint)
    const data = response.data as PaginatedEmployeeResponse

    // Return the results array instead of the entire response
    return data.results as EmployeeFromAPI[]
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
}): Promise<any | null> => {
  try {
    const formData = new FormData();
    formData.append("institutionId", institutionId.toString());
    
    if (employeeData.user) {
      formData.append("user.fullname", employeeData.user.fullname);
      formData.append("user.email", employeeData.user.email);
    }
    
    Object.entries(employeeData).forEach(([key, value]) => {
      if (key === "user") return;
      if (key === "employee_profile_picture" && value instanceof File) {
        formData.append(key, value);
      } else if (value !== undefined && value !== null && value !== "") {
        formData.append(key, value.toString());
      }
    });
    
    const response = await apiRequest.post(`/employee/create/`, formData);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.detail || 
      error.response?.data?.message || 
      error.message || 
      "Failed to create employee"
    );
  }
};

export const updateEmployee = async ({
  employeeId,
  employeeData,
}: {
  employeeId: number;
  employeeData: any;
}): Promise<any | null> => {
  try {
    const formData = new FormData();
    
    if (employeeData.user) {
      formData.append("user.fullname", employeeData.user.fullname);
      formData.append("user.email", employeeData.user.email);
    }
    
    Object.entries(employeeData).forEach(([key, value]) => {
      if (key === "user") return;
      if (key === "employee_profile_picture" && value instanceof File) {
        formData.append(key, value);
      } else if (value !== undefined && value !== null && value !== "") {
        formData.append(key, value.toString());
      }
    });
    
    const response = await apiRequest.patch(`/employee/${employeeId}/update/`, formData);
    return response.data;
  } catch (error: any) {
    throw new Error("Failed to update employee. Please try again.");
  }
};

export const getEmployeeById = async ({
  employeeId,
}: {
  employeeId: number;
}): Promise<any | null> => {
  try {
    const response = await apiRequest.get(`/employee/${employeeId}/`);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.detail || 
      error.response?.data?.message || 
      error.message || 
      "Failed to fetch employee"
    );
  }
};

// Helper function to get roles for an institution
export const getRoles = async ({ institutionId }: { institutionId: number }) => {
  try {
    const response = await apiRequest.get(`user/role/?Institution_id=${institutionId}`)
    if (response.data && response.data.results) {
      return response.data.results || []
    }
    return Array.isArray(response.data) ? response.data : []
  } catch (error) {
    console.error("Error fetching roles:", error)
    return []
  }
}

// Helper function to get positions for an institution
export const getPositions = async ({ institutionId }: { institutionId: number }): Promise<IJobPosition[]> => {
  try {
    const response = await apiRequest.get(`recruitment/institution/${institutionId}/job-position/`)
    const data = response.data as PaginatedResponse<IJobPosition>
    return data.results
  } catch (error) {
    console.error("Error fetching positions:", error)
    return []
  }
}


// Fetch a single employee by ID
export const getEmployeeDetailId = async ({
  applicationId,
  employeeId,
}: {
  applicationId: number;
  employeeId: number;
}): Promise<EmployeeFormData | null> => {  // Changed return type from EmployeeFormData to Employee
  try {
    const response = await apiRequest.get(`/employee/${employeeId}/${applicationId}/`);
    return response.data as EmployeeFormData;  // Changed casting
  } catch (error) {
    return null;
  }
};


export const getOnBoardings = async ({ institutionId }: { institutionId: number }) => {
  try {
    const response = await apiRequest.get(`on-boarding/list/${institutionId}/`)
    const data = response.data as PaginatedIOnboardingResponse

    // Return the results array instead of the entire response
    return data.results as IOnBoarding[]
  } catch (error) {
    console.error("Error fetching onboarding records:", error)
    return null
  }
}

// Get onboarding record by ID
export const getOnBoardingById = async ({
  onboardingId,
}: {
  onboardingId: number;
}): Promise<IOnBoarding | null> => {
  try {
    const response = await apiRequest.get(`on-boarding/record/${onboardingId}/`);
    return response.data as IOnBoarding;
  } catch (error) {
    console.error("Failed to fetch onboarding record", error);
    return null;
  }
};

// Create a new onboarding record
export const createOnBoarding = async ({
  institutionId,
  onboardingData,
}: {
  onboardingData: IOnBoardingFormData;
  institutionId: number;
}): Promise<IOnBoarding | null> => {
  try {
    const formData = new FormData();
    Object.entries(onboardingData).forEach(([key, value]) => {
      // Only append defined values
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    const response = await apiRequest.post(
      `on-boarding/${institutionId}/`,
      formData
    );
    return response.data as IOnBoarding;
  } catch (error) {
    console.error("Failed to create onboarding record:", error);
    return null;
  }
};



export const updateOnBoarding = async ({
  onboardingId,
  onboardingData,
}: {
  onboardingId: number;
  onboardingData: Partial<IOnBoardingFormData>;
}): Promise<IOnBoarding | null> => {
  try {
    const response = await apiRequest.patch(
      `on-boarding/record/${onboardingId}/`,
      onboardingData 
    );
    return response.data as IOnBoarding;
  } catch (error) {
    console.error("Failed to update onboarding record:", error);
    return null;
  }
};

// Bulk create onboarding records
export const bulkCreateOnBoarding = async ({
  applicationIds,
}: {
  applicationIds: number[];
}): Promise<IBulkOnBoardingResponse | null> => {
  try {
    const requestData: IBulkOnBoardingRequest = {
      application_ids: applicationIds
    };

    const response = await apiRequest.post(
      `on-boarding/bulk-create/`,
      requestData,
      
    );
    return response.data as IBulkOnBoardingResponse;
  } catch (error) {
    console.error("Failed to bulk create onboarding records:", error);
    return null;
  }
};


export const createWorkType = async ({
  institutionId,
  workTypeData,
}: {
  institutionId: number;
  workTypeData: IWorkTypeFormData;
}): Promise<IWorkType | null> => {
  try {
    const formData = new FormData();
    Object.entries(workTypeData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    const response = await apiRequest.post(
      `employee/work-types/`,
      formData
    );
    return response.data as IWorkType;
  } catch (error) {
    console.error("Failed to create work type:", error);
    return null;
  }
};

export const createEmployeeType = async ({
  institutionId,
  employeeTypeData,
}: {
  institutionId: number;
  employeeTypeData: IEmployeeTypeFormData;
}): Promise<IEmployeeType | null> => {
  try {
    const formData = new FormData();
    Object.entries(employeeTypeData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    const response = await apiRequest.post(
      `employee/employee-types/`,
      formData
    );
    return response.data as IEmployeeType;
  } catch (error) {
    console.error("Failed to create employee type:", error);
    return null;
  }
};

export const getWorkTypes = async ({
  institutionId,
}: {
  institutionId: number;
}): Promise<IWorkType[]> => {
  try {
    const response = await apiRequest.get(
      `employee/work-types/`
    );
    const data = response.data as PaginatedResponse<IWorkType>
    return data.results
  } catch (error) {
    console.error("Failed to fetch work types:", error);
    return [];
  }
};

export const getEmployeeTypes = async ({
  institutionId,
}: {
  institutionId: number;
}): Promise<IEmployeeType[]> => {
  try {
    const response = await apiRequest.get(
      `employee/employee-types/`
    );
    const data = response.data as PaginatedResponse<IEmployeeType>
    return data.results
  } catch (error) {
    console.error("Failed to fetch employee types:", error);
    return [];
  }
};

export const attachEmployeeToBranches = async (
  payload: AttachBranchesPayload
): Promise<EmployeeBranchSummary | null> => {
  try {
    const response = await apiRequest.post("branches/attach/", payload);
    return response.data.data as EmployeeBranchSummary;
  } catch (error) {
    console.error("Error attaching employee to branches:", error);
    return null;
  }
};


export const getEmployeeBranches = async (
  employeeId: number
): Promise<EmployeeBranchSummary | null> => {
  try {
    const response = await apiRequest.get(`${employeeId}/branches/`);
    return response.data.data as EmployeeBranchSummary;
  } catch (error) {
    console.error("Error fetching branches for employee:", error);
    return null;
  }
};

export const setDefaultBranch = async (
  employeeId: number,
  data: SetDefaultBranchPayload
): Promise<EmployeeBranchSummary | null> => {
  try {
    const response = await apiRequest.patch(`${employeeId}/branches/`, data);
    return response.data.data as EmployeeBranchSummary;
  } catch (error) {
    console.error("Error setting default branch:", error);
    return null;
  }
};



export const createDisciplinaryAction = async ({
  disciplinaryActionData,
}: {
  disciplinaryActionData: DisciplinaryActionForm;
}): Promise<DisciplinaryActionResponse | null> => {
  try {
    const apiData = convertFormToApiRequest(disciplinaryActionData);
    const response = await apiRequest.post(
      `discipline/disciplinary-actions/`,
      apiData
    );
    return response.data as DisciplinaryActionResponse;
  } catch (error: any) {
    if (error.response?.status === 400) {
      const errorData = error.response.data;
      if (typeof errorData === 'object' && errorData !== null) {
        const errorMessages = Object.entries(errorData)
          .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
          .join('; ');
        throw new Error(`Validation errors: ${errorMessages}`);
      }
    }
    return null;
  }
};


export const createDisciplineType = async ({
  disciplineTypeData,
}: {
  disciplineTypeData: DisciplineTypeForm;
}): Promise<DisciplineTypeResponse | null> => {
  try {
    const apiData = convertDisciplineTypeFormToApiRequest(disciplineTypeData);
    
    const formData = new FormData();
    
    // Append all the discipline type fields
    Object.entries(apiData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    const response = await apiRequest.post(
      `discipline/discipline-types/`, // Adjust endpoint as needed
      formData
    );
    
    return response.data as DisciplineTypeResponse;
  } catch (error: any) {
    console.error("Failed to create discipline type:", error);
    
    if (error.response?.status === 400) {
      const errorData = error.response.data;
      if (errorData?.name && errorData.name.includes('already exists')) {
        throw new Error('A discipline type with this name already exists');
      }
    }
    
    return null;
  }
};

export const deleteDisciplinaryAction = async (id: number | string): Promise<boolean> => {
  try {
    const response = await apiRequest.delete(
      `discipline/disciplinary-actions/${id}/`
    );
    
    return response.status === 200 || response.status === 204;
  } catch (error) {
    console.error("Failed to delete disciplinary action:", error);
    return false;
  }
};




export const getDisciplineTypes = async ({
  institutionId,
}: {
  institutionId: number;
}): Promise<DisciplineTypeResponse[] | null> => {
  try {
    const response = await apiRequest.get(
      `discipline/discipline-types/?institution=${institutionId}`
    );
  
    const data = response.data as PaginatedResponse<DisciplineTypeResponse>
    
    // Return the results array instead of the entire response
    return data.results
  } catch (error) {
    console.error("Failed to fetch discipline types:", error);
    return null;
  }
};

export const getDisciplinaryActions = async (): Promise<DisciplinaryActionAPIResponse[] | null> => {
  try {
    const response = await apiRequest.get(
      `discipline/disciplinary-actions`
    );
    
    const data = response.data as PaginatedResponse<DisciplinaryActionAPIResponse>
  
    return data.results
  } catch (error) {
    return null;
  }
};

export const updateDisciplinaryAction = async ({
  disciplinaryActionId,
  disciplinaryActionData,
}: {
  disciplinaryActionId: number | string;
  disciplinaryActionData: Partial<DisciplinaryActionRequest> | DisciplinaryActionForm;
}): Promise<DisciplinaryActionAPIResponse | null> => {
  try {
    const dataToSend = 'discipline_type' in disciplinaryActionData && typeof disciplinaryActionData.discipline_type === 'string'
      ? convertFormToApiRequest(disciplinaryActionData as DisciplinaryActionForm)
      : disciplinaryActionData;

    const response = await apiRequest.patch(
      `discipline/disciplinary-actions/${disciplinaryActionId}/`,
      dataToSend
    );
    
    return response.data as DisciplinaryActionAPIResponse;
  } catch (error) {
    console.error("Failed to update disciplinary action:", error);
    return null;
  }
};

export const getDisciplinaryActionById = async (
  disciplinaryActionId: number | string
): Promise<DisciplinaryActionAPIResponse | null> => {
  try {
    const response = await apiRequest.get(
      `discipline/disciplinary-actions/${disciplinaryActionId}/`
    );
    
    return response.data as DisciplinaryActionAPIResponse;
  } catch (error) {
    console.error("Failed to retrieve disciplinary action:", error);
    return null;
  }
};



export const getLeaveTypes = async ({
  institutionId,
}: {
  institutionId: number;
}): Promise<ILeaveType[]> => {
  try {
    const response = await apiRequest.get(`leave-mgt/${institutionId}/leave-types/?is_active=true`);
    return (response.data as IPaginatedResponse<ILeaveType>).results;
  } catch (error) {
    console.error("Failed to fetch leave types:", error);
    return [];
  }
};

export const createLeaveType = async ({
  institutionId,
  leaveTypeData,
}: {
  institutionId: number;
  leaveTypeData: ILeaveTypeFormData;
}): Promise<ILeaveType | null> => {
  try {
    const formData = new FormData();
    
    // Add institution to the form data
    formData.append('institution', institutionId.toString());
    
    Object.entries(leaveTypeData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    const response = await apiRequest.post(
      `leave-mgt/${institutionId}/leave-types/`,
      formData
    );
    return response.data as ILeaveType;
  } catch (error) {
    console.error("Failed to create leave type:", error);
    return null;
  }
};


export const updateLeaveType = async ({
  leaveTypeId,
  leaveTypeData,
}: {
  leaveTypeId: string | number;
  leaveTypeData: ILeaveTypeFormData;
}): Promise<ILeaveType | null> => {
  try {
    const formData = new FormData();
    Object.entries(leaveTypeData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    const response = await apiRequest.patch(  
      `leave-mgt/leave-types/${leaveTypeId}/`,
      formData
    );
    return response.data as ILeaveType;
  } catch (error) {
    console.error("Failed to update leave type:", error);
    return null;
  }
};


export const deleteLeaveType = async ({
  leaveTypeId,
}: {
  leaveTypeId: string | number;
}): Promise<boolean> => {
  try {
    const response = await apiRequest.delete(`leave-mgt/leave-types/${leaveTypeId}/`);
    
    // Check if deletion was successful (status 200, 201, 204, etc.)
    if (response.status >= 200 && response.status < 300) {
      return true;
    }
    return false;
  } catch (error) {
    console.error("Failed to delete leave type:", error);
    return false;
  }
};


export const createLeavePolicy = async ({
  institutionId,
  leavePolicyData,
}: {
  institutionId: number;
  leavePolicyData: ILeavePolicyFormData;
}): Promise<ILeavePolicy | null> => {
  try {
    const formData = new FormData();
    
    // Add institution to the form data
    formData.append('institution', institutionId.toString());
    
    Object.entries(leavePolicyData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    const response = await apiRequest.post(
      `leave-mgt/${institutionId}/leave-policies/`,
      formData
    );
    return response.data as ILeavePolicy;
  } catch (error) {
    console.error("Failed to create leave policy:", error);
    return null;
  }
};

export const getLeavePolicies = async ({
  institutionId,
}: {
  institutionId: number;
}): Promise<ILeavePolicy[]> => {
  try {
    const response = await apiRequest.get(`leave-mgt/${institutionId}/leave-policies/`);
    return (response.data as IPaginatedResponse<ILeavePolicy>).results;
  } catch (error) {
    console.error("Failed to fetch leave policies:", error);
    return [];
  }
}

export const updateLeavePolicy = async ({
  leavePolicyId,
  leavePolicyData,
}: {
  leavePolicyId: string | number;
  leavePolicyData: ILeavePolicyFormData;
}): Promise<ILeavePolicy | null> => {
  try {
    const formData = new FormData();
    Object.entries(leavePolicyData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    const response = await apiRequest.patch(
      `leave-mgt/leave-policies/${leavePolicyId}/`,
      formData
    );
    return response.data as ILeavePolicy;
  } catch (error) {
    console.error("Failed to update leave policy:", error);
    return null;
  }
};


export const deleteLeavePolicy = async ({
  leavePolicyId,
}: {
  leavePolicyId: string | number;
}): Promise<boolean> => {
  try {
    const response = await apiRequest.delete(`leave-mgt/leave-policies/${leavePolicyId}/`);
    
    // 204 means successful deletion (soft delete)
    return response.status === 204;
  } catch (error) {
    console.error("Failed to delete leave policy:", error);
    return false;
  }
};

export const createLeaveApplication = async ({
  institutionId,
  leaveApplicationData,
}: {
  institutionId: number;
  leaveApplicationData: ILeaveRequestFormData;
}): Promise<ILeaveRequest | null> => {
  try {
    const formData = new FormData();
    
    // Change this line from 'Institution' to 'institution' (lowercase)
    formData.append('institution', institutionId.toString());
    
    Object.entries(leaveApplicationData).forEach(([key, value]) => {
      if (key === "supporting_document" && value instanceof File) {
        formData.append(key, value);
      } else if (value !== undefined && value !== null && value !== "") {
        formData.append(key, value.toString());
      }
    });

    const response = await apiRequest.post(
      `leave-mgt/${institutionId}/leave-applications/`, 
      formData
    );
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.detail || 
      error.response?.data?.message || 
      error.message || 
      "Failed to create leave application"
    );
  }
};

export const getLeaveApplications = async ({
  institutionId,
}: {
  institutionId: number;
}): Promise<ILeaveRequest[]> => {
  try {
    const response = await apiRequest.get(`leave-mgt/${institutionId}/leave-applications/`);
    return (response.data as IPaginatedResponse<ILeaveRequest>).results;
  } catch (error) {
    console.error("Failed to fetch leave applications:", error);
    return [];
  }
};


export const getLeaveApplication = async ({
  institutionId,
  leaveApplicationId,
}: {
  institutionId: number;
  leaveApplicationId: number | string;
}): Promise<ILeaveRequest | null> => {
  try {
    const response = await apiRequest.get(
      `leave-mgt/${institutionId}/leave-applications/${leaveApplicationId}/`
    );
    return response.data as ILeaveRequest;
  } catch (error) {
    console.error("Failed to fetch leave application:", error);
    return null;
  }
};

export const updateLeaveApplication = async ({
  leaveApplicationId,
  leaveApplicationData,
}: {
  leaveApplicationId: string | number;
  leaveApplicationData: Partial<ILeaveRequestFormData>;
}): Promise<ILeaveRequest | null> => {
  try {
    const formData = new FormData();
    Object.entries(leaveApplicationData).forEach(([key, value]) => {
      if (key === "supporting_document" && value instanceof File) {
        formData.append(key, value);
      } else if (value !== undefined && value !== null && value !== "") {
        formData.append(key, value.toString());
      }
    });

    const response = await apiRequest.patch(`/leave-mgt/leave-applications/${leaveApplicationId}/`, formData);
    return response.data;
  } catch (error: any) {
    throw new Error(
      error.response?.data?.detail || 
      error.response?.data?.message || 
      error.message || 
      "Failed to update leave application"
    );
  }
};


export const deleteLeaveApplication = async ({
  leaveApplicationId,
  institutionId,
}: {
  leaveApplicationId: number | string;
  institutionId: number;
}): Promise<boolean> => {
  try {
    await apiRequest.delete(
      `leave-mgt/leave-applications/${leaveApplicationId}/`
    );
    return true;
  } catch (error) {
    console.error("Failed to delete leave application:", error);
    return false;
  }
};

export const approveRejectLeaveApplication = async ({
  leaveApplicationId,
  institutionId,
  action,
  rejectionReason,
  approvedBy,
}: {
  leaveApplicationId: number | string;
  institutionId: number;
  action: 'approve' | 'reject';
  rejectionReason?: string;
  approvedBy?: number;
}): Promise<ILeaveRequest | null> => {
  try {
    const formData = new FormData();
    
    formData.append('action', action);
    
    if (action === 'reject' && rejectionReason) {
      formData.append('rejection_reason', rejectionReason);
    }

    if (approvedBy) {
      formData.append('approved_by', approvedBy.toString());
    }


    const response = await apiRequest.post(
      `leave-mgt/leave-applications/${leaveApplicationId}/approval/`,
      formData
    );
    
    return response.data as ILeaveRequest;
  } catch (error) {
    console.error("Failed to approve/reject leave application:", error);
    return null;
  }
};


export const getLeaveApplicationsByEmployee = async ({
  employeeId,
}: {
  employeeId: number;
}): Promise<ILeaveRequest[]> => {
  try {
    const response = await apiRequest.get(
      `leave-mgt/leave-applications/?employee=${employeeId}/`
    );
    return Array.isArray(response.data) ? response.data : response.data.results || [];
  } catch (error) {
    console.error("Failed to fetch employee leave applications:", error);
    return [];
  }
};


export const getLeaveApplicationsByStatus = async ({
  status,
}: {
  status: LeaveRequestStatus;
  institutionId: number;
}): Promise<ILeaveRequest[]> => {
  try {
    const response = await apiRequest.get(
      `leave-mgt/leave-applications/?status=${status}`
    );
    return Array.isArray(response.data) ? response.data : response.data.results || [];
  } catch (error) {
    console.error("Failed to fetch leave applications by status:", error);
    return [];
  }
};


export const getPendingLeaveApplications = async (institutionId: number): Promise<ILeaveRequest[]> => {
  return getLeaveApplicationsByStatus({ status: 'pending', institutionId });
};


export const cancelLeaveApplication = async ({
  leaveApplicationId,
  institutionId,
}: {
  leaveApplicationId: number | string;
  institutionId: number;
}): Promise<ILeaveRequest | null> => {
  return updateLeaveApplication({
    leaveApplicationId,
    leaveApplicationData: { status: 'cancelled' },
  });
};


export const getLeaveApplicationsWithFilters = async ({
  institutionId,
  filters,
}: {
  institutionId: number;
  filters?: {
    employee_id?: number;
    leave_type_id?: number;
    status?: LeaveRequestStatus;
    start_date_from?: string;
    start_date_to?: string;
    approved_by?: number;
    duration_type?: string;
  };
}): Promise<ILeaveRequest[]> => {
  try {
    let queryString = '';
    
    if (filters) {
      const queryParams: string[] = [];
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          queryParams.push(`${key}=${value}`);
        }
      });
      if (queryParams.length > 0) {
        queryString = `?${queryParams.join('&')}`;
      }
    }

    const response = await apiRequest.get(
      `leave-mgt/leave-applications/${queryString}`
    );
    return Array.isArray(response.data) ? response.data : response.data.results || [];
  } catch (error) {
    console.error("Failed to fetch filtered leave applications:", error);
    return [];
  }
};


export const bulkApproveRejectLeaveApplications = async ({
  leaveApplicationIds,
  institutionId,
  action,
  rejectionReason,
  approvedBy,
}: {
  leaveApplicationIds: (number | string)[];
  institutionId: number;
  action: 'approve' | 'reject';
  rejectionReason?: string;
  approvedBy?: number;
}): Promise<(ILeaveRequest | null)[]> => {
  try {
    const promises = leaveApplicationIds.map(id =>
      approveRejectLeaveApplication({
        leaveApplicationId: id,
        institutionId,
        action,
        rejectionReason,
        approvedBy,
      })
    );

    const results = await Promise.allSettled(promises);
    return results.map(result => 
      result.status === 'fulfilled' ? result.value : null
    );
  } catch (error) {
    console.error("Failed to bulk process leave applications:", error);
    return [];
  }
};


export const createAllowanceType = async ({
  institutionId,
  allowanceTypeData,
}: {
  institutionId: number;
  allowanceTypeData: IAllowanceTypeFormData;
}): Promise<IAllowanceType | null> => {
  try {
    const formData = new FormData();
    
    Object.entries(allowanceTypeData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    formData.append('institution', institutionId.toString());

    const response = await apiRequest.post(
      `payroll/${institutionId}/allowance-types/`,
      formData
    );
    
    return response.data as IAllowanceType;
  } catch (error) {
    console.error("Failed to create allowance type:", error);
    return null;
  }
};

export const getAllowanceTypes = async (
  institutionId: number
): Promise<IAllowanceType[] | null> => {
  try {
    const response = await apiRequest.get(`payroll/${institutionId}/allowance-types/`);
    const data = response.data as PaginatedResponse<IAllowanceType>
    
    // Return the results array instead of the entire response
    return data.results
  } catch (error) {
    console.error("Failed to get allowance types:", error);
    return null;
  }
};


export const getAllowanceType = async (
  id: number
): Promise<IAllowanceType | null> => {
  try {
    const response = await apiRequest.get(`payroll/allowance-types/${id}/`);
    return response.data as IAllowanceType;
  } catch (error) {
    console.error("Failed to get allowance type:", error);
    return null;
  }
};


export const updateAllowanceType = async ({
  id,
  allowanceTypeData,
}: {
  id: number;
  allowanceTypeData: Partial<IAllowanceTypeFormData>;
}): Promise<IAllowanceType | null> => {
  try {
    const formData = new FormData();
    Object.entries(allowanceTypeData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    const response = await apiRequest.patch(
      `payroll/allowance-types/${id}/`,
      formData
    );
    return response.data as IAllowanceType;
  } catch (error) {
    console.error("Failed to update allowance type:", error);
    return null;
  }
};


export const deleteAllowanceType = async (
  id: number
): Promise<boolean> => {
  try {
    await apiRequest.delete(`payroll/allowance-types/${id}/`);
    return true;
  } catch (error) {
    console.error("Failed to delete allowance type:", error);
    return false;
  }
};


export const createDeductionType = async ({
  institutionId,
  deductionTypeData,
}: {
  institutionId: number;
  deductionTypeData: IDeductionTypeFormData;
}): Promise<IDeductionType | null> => {
  try {
    const formData = new FormData();
    
    Object.entries(deductionTypeData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    formData.append('institution', institutionId.toString());

    const response = await apiRequest.post(
      `payroll/${institutionId}/deduction-types/`,
      formData
    );
    
    return response.data as IDeductionType;
  } catch (error) {
    console.error("Failed to create deduction type:", error);
    return null;
  }
};


export const getDeductionTypes = async (
  institutionId: number
): Promise<IDeductionType[] | null> => {
  try {
    const response = await apiRequest.get(`payroll/${institutionId}/deduction-types/`);
    const data = response.data as PaginatedResponse<IDeductionType>
    
    // Return the results array instead of the entire response
    return data.results
  } catch (error) {
    console.error("Failed to get deduction types:", error);
    return null;
  }
};


export const getDeductionType = async (
  id: number
): Promise<IDeductionType | null> => {
  try {
    const response = await apiRequest.get(`payroll/deduction-types/${id}/`);
    return response.data as IDeductionType;
  } catch (error) {
    console.error("Failed to get deduction type:", error);
    return null;
  }
};


export const updateDeductionType = async ({
  id,
  deductionTypeData,
}: {
  id: number;
  deductionTypeData: Partial<IDeductionTypeFormData>;
}): Promise<IDeductionType | null> => {
  try {
    const formData = new FormData();
    Object.entries(deductionTypeData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    const response = await apiRequest.patch(
      `payroll/deduction-types/${id}/`,
      formData
    );
    return response.data as IDeductionType;
  } catch (error) {
    console.error("Failed to update deduction type:", error);
    return null;
  }
};


export const deleteDeductionType = async (
  id: number
): Promise<boolean> => {
  try {
    await apiRequest.delete(`payroll/deduction-types/${id}/`);
    return true;
  } catch (error) {
    console.error("Failed to delete deduction type:", error);
    return false;
  }
};


export const createEmployeeAllowance = async ({
  institutionId,
  employeeAllowanceData,
}: {
  institutionId: number;
  employeeAllowanceData: IEmployeeAllowanceFormData;
}): Promise<IEmployeeAllowance | null> => {
  try {
    const formData = new FormData();
    
    Object.entries(employeeAllowanceData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    const response = await apiRequest.post(
      `payroll/${institutionId}/employee-allowances/`,
      formData
    );
    
    return response.data as IEmployeeAllowance;
  } catch (error) {
    console.error("Failed to create employee allowance:", error);
    return null;
  }
};


export const getEmployeeAllowances = async (
  institutionId: number
): Promise<IEmployeeAllowance[] | null> => {
  try {
    const response = await apiRequest.get(`payroll/${institutionId}/employee-allowances/`);
    return response.data as IEmployeeAllowance[];
  } catch (error) {
    console.error("Failed to get employee allowances:", error);
    return null;
  }
};


export const getEmployeeAllowance = async (
  id: number
): Promise<IEmployeeAllowance | null> => {
  try {
    const response = await apiRequest.get(`payroll/employee-allowances/${id}/`);
    return response.data as IEmployeeAllowance;
  } catch (error) {
    console.error("Failed to get employee allowance:", error);
    return null;
  }
};


export const updateEmployeeAllowance = async ({
  id,
  employeeAllowanceData,
}: {
  id: number;
  employeeAllowanceData: Partial<IEmployeeAllowanceFormData>;
}): Promise<IEmployeeAllowance | null> => {
  try {
    const formData = new FormData();
    Object.entries(employeeAllowanceData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    const response = await apiRequest.patch(
      `payroll/employee-allowances/${id}/`,
      formData
    );
    return response.data as IEmployeeAllowance;
  } catch (error) {
    console.error("Failed to update employee allowance:", error);
    return null;
  }
};


export const deleteEmployeeAllowance = async (
  id: number
): Promise<boolean> => {
  try {
    await apiRequest.delete(`payroll/employee-allowances/${id}/`);
    return true;
  } catch (error) {
    console.error("Failed to delete employee allowance:", error);
    return false;
  }
};


export const getEmployeeAllowancesByEmployee = async ({
  institutionId,
  employeeId,
}: {
  institutionId: number;
  employeeId: number;
}): Promise<IEmployeeAllowance[] | null> => {
  try {
    const response = await apiRequest.get(
      `payroll/${institutionId}/employee-allowances/?employee=${employeeId}`
    );
    return response.data as IEmployeeAllowance[];
  } catch (error) {
    console.error("Failed to get employee allowances by employee:", error);
    return null;
  }
};


export const getEmployeeAllowancesByType = async ({
  institutionId,
  allowanceTypeId,
}: {
  institutionId: number;
  allowanceTypeId: number;
}): Promise<IEmployeeAllowance[] | null> => {
  try {
    const response = await apiRequest.get(
      `payroll/${institutionId}/employee-allowances/?allowance_type=${allowanceTypeId}`
    );
    return response.data as IEmployeeAllowance[];
  } catch (error) {
    console.error("Failed to get employee allowances by type:", error);
    return null;
  }
};


export const getActiveEmployeeAllowances = async (
  institutionId: number
): Promise<IEmployeeAllowance[] | null> => {
  try {
    const response = await apiRequest.get(
      `payroll/${institutionId}/employee-allowances/?is_active=true`
    );
    return response.data as IEmployeeAllowance[];
  } catch (error) {
    console.error("Failed to get active employee allowances:", error);
    return null;
  }
};

// Fetch a single employee's details
export async function fetchEmployeeDetail(employeeId: number) {
  const response = await apiRequest.get(`/employee/${employeeId}/`);
  return response.data;
}



export const createEmployeeDeduction = async ({
  institutionId,
  employeeDeductionData,
}: {
  institutionId: number;
  employeeDeductionData: IEmployeeDeductionFormData;
}): Promise<IEmployeeDeduction | null> => {
  try {
    const formData = new FormData();
    
    Object.entries(employeeDeductionData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    const response = await apiRequest.post(
      `payroll/${institutionId}/employee-deductions/`,
      formData
    );
    
    return response.data as IEmployeeDeduction;
  } catch (error) {
    console.error("Failed to create employee deduction:", error);
    return null;
  }
};


export const getEmployeeDeductions = async (
  institutionId: number
): Promise<IEmployeeDeduction[] | null> => {
  try {
    const response = await apiRequest.get(`payroll/${institutionId}/employee-deductions/`);
    return response.data as IEmployeeDeduction[];
  } catch (error) {
    console.error("Failed to get employee deductions:", error);
    return null;
  }
};


export const getEmployeeDeduction = async (
  id: number
): Promise<IEmployeeDeduction | null> => {
  try {
    const response = await apiRequest.get(`payroll/employee-deductions/${id}/`);
    return response.data as IEmployeeDeduction;
  } catch (error) {
    console.error("Failed to get employee deduction:", error);
    return null;
  }
};


export const updateEmployeeDeduction = async ({
  id,
  employeeDeductionData,
}: {
  id: number;
  employeeDeductionData: Partial<IEmployeeDeductionFormData>;
}): Promise<IEmployeeDeduction | null> => {
  try {
    const formData = new FormData();
    Object.entries(employeeDeductionData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    const response = await apiRequest.patch(
      `payroll/employee-deductions/${id}/`,
      formData
    );
    return response.data as IEmployeeDeduction;
  } catch (error) {
    console.error("Failed to update employee deduction:", error);
    return null;
  }
};


export const deleteEmployeeDeduction = async (
  id: number
): Promise<boolean> => {
  try {
    await apiRequest.delete(`payroll/employee-deductions/${id}/`);
    return true;
  } catch (error) {
    console.error("Failed to delete employee deduction:", error);
    return false;
  }
};


export const getEmployeeDeductionsByEmployee = async ({
  institutionId,
  employeeId,
}: {
  institutionId: number;
  employeeId: number;
}): Promise<IEmployeeDeduction[] | null> => {
  try {
    const response = await apiRequest.get(
      `payroll/${institutionId}/employee-deductions/?employee=${employeeId}`
    );
    return response.data as IEmployeeDeduction[];
  } catch (error) {
    console.error("Failed to get employee deductions by employee:", error);
    return null;
  }
};


export const getEmployeeDeductionsByType = async ({
  institutionId,
  deductionTypeId,
}: {
  institutionId: number;
  deductionTypeId: number;
}): Promise<IEmployeeDeduction[] | null> => {
  try {
    const response = await apiRequest.get(
      `payroll/${institutionId}/employee-deductions/?deduction_type=${deductionTypeId}`
    );
    return response.data as IEmployeeDeduction[];
  } catch (error) {
    console.error("Failed to get employee deductions by type:", error);
    return null;
  }
};


export const getActiveEmployeeDeductions = async (
  institutionId: number
): Promise<IEmployeeDeduction[] | null> => {
  try {
    const response = await apiRequest.get(
      `payroll/${institutionId}/employee-deductions/?is_active=true`
    );
    return response.data as IEmployeeDeduction[];
  } catch (error) {
    console.error("Failed to get active employee deductions:", error);
    return null;
  }
};


export const getEmployeeDeductionsByDateRange = async ({
  institutionId,
  startDate,
  endDate,
}: {
  institutionId: number;
  startDate: string;
  endDate: string;
}): Promise<IEmployeeDeduction[] | null> => {
  try {
    const response = await apiRequest.get(
      `payroll/${institutionId}/employee-deductions/?effective_from__gte=${startDate}&effective_from__lte=${endDate}`
    );
    return response.data as IEmployeeDeduction[];
  } catch (error) {
    console.error("Failed to get employee deductions by date range:", error);
    return null;
  }
};



export const bulkCreateEmployeeDeductions = async ({
  institutionId,
  deductionsData,
}: {
  institutionId: number;
  deductionsData: IEmployeeDeductionFormData[];
}): Promise<IEmployeeDeduction[] | null> => {
  try {
    const response = await apiRequest.post(
      `payroll/${institutionId}/employee-deductions/bulk/`,
      { deductions: deductionsData }
    );
    return response.data as IEmployeeDeduction[];
  } catch (error) {
    console.error("Failed to bulk create employee deductions:", error);
    return null;
  }
};


export const calculateDeductionAmount = (
  deduction: IEmployeeDeduction,
  employeeSalary?: number
): number => {
  if (deduction.calculation_method === "percentage" && employeeSalary) {
    return (employeeSalary * parseFloat(deduction.percentage)) / 100;
  }
  return parseFloat(deduction.amount) || 0;
};


export const validateDeductionFormData = (
  data: Partial<IEmployeeDeductionFormData>
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.employee) {
    errors.push("Employee is required");
  }
  
  if (!data.deduction_type) {
    errors.push("Deduction type is required");
  }

  if (!data.effective_from) {
    errors.push("Effective from date is required");
  }

  if (data.calculation_method === "fixed") {
    const amount = parseFloat(data.amount || "0");
    if (!data.amount || isNaN(amount) || amount <= 0) {
      errors.push("Valid fixed amount is required");
    }
  } else if (data.calculation_method === "percentage") {
    const percentage = parseFloat(data.percentage || "0");
    if (!data.percentage || isNaN(percentage) || percentage <= 0 || percentage > 100) {
      errors.push("Valid percentage (1-100) is required");
    }
  }

  if (data.effective_from && data.effective_to) {
    if (new Date(data.effective_to) < new Date(data.effective_from)) {
      errors.push("End date cannot be before start date");
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};


export const createPayrollPeriod = async ({
  institutionId,
  payrollPeriodData,
}: {
  institutionId: number;
  payrollPeriodData: IPayrollPeriodFormData;
}): Promise<IPayrollPeriod | null> => {
  try {
    const formData = new FormData();
    
    // Add the institution field
    formData.append('institution', institutionId.toString());
    
    Object.entries(payrollPeriodData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    const response = await apiRequest.post(
      `payroll/${institutionId}/payroll-periods/`,
      formData
    );
    
    return response.data as IPayrollPeriod;
  } catch (error) {
    console.error("Failed to create payroll period:", error);
    return null;
  }
};

export const getPayrollPeriods = async (
  institutionId: number
): Promise<IPayrollPeriod[] | null> => {
  try {
    const response = await apiRequest.get(`payroll/${institutionId}/payroll-periods/`);
    const data = response.data as PaginatedResponse<IPayrollPeriod>
    
    // Return the results array instead of the entire response
    return data.results
  } catch (error) {
    console.error("Failed to get payroll periods:", error);
    return null;
  }
};


export const getPayrollPeriod = async (
  id: number
): Promise<IPayrollPeriod | null> => {
  try {
    const response = await apiRequest.get(`payroll/payroll-periods/${id}/`);
    return response.data as IPayrollPeriod;
  } catch (error) {
    console.error("Failed to get payroll period:", error);
    return null;
  }
};


export const updatePayrollPeriod = async ({
  id,
  payrollPeriodData,
}: {
  id: number;
  payrollPeriodData: Partial<IPayrollPeriodFormData>;
}): Promise<IPayrollPeriod | null> => {
  try {
    const formData = new FormData();
    Object.entries(payrollPeriodData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    const response = await apiRequest.patch(
      `payroll/payroll-periods/${id}/`,
      formData
    );
    return response.data as IPayrollPeriod;
  } catch (error) {
    console.error("Failed to update payroll period:", error);
    return null;
  }
};


export const deletePayrollPeriod = async (
  id: number
): Promise<boolean> => {
  try {
    await apiRequest.delete(`payroll/payroll-periods/${id}/`);
    return true;
  } catch (error) {
    console.error("Failed to delete payroll period:", error);
    return false;
  }
};


export const getCurrentPayrollPeriod = async (
  institutionId: number
): Promise<IPayrollPeriod | null> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await apiRequest.get(
      `payroll/${institutionId}/payroll-periods/?current_date=${today}`
    );
    
    // Assuming the API returns the current period or we find it from the list
    const periods = response.data as IPayrollPeriod[];
    const currentPeriod = periods.find(period => 
      period.start_date <= today && period.end_date >= today
    );
    
    return currentPeriod || null;
  } catch (error) {
    console.error("Failed to get current payroll period:", error);
    return null;
  }
};


export const getPayrollPeriodsByStatus = async ({
  institutionId,
  isProcessed,
}: {
  institutionId: number;
  isProcessed: boolean;
}): Promise<IPayrollPeriod[] | null> => {
  try {
    const response = await apiRequest.get(
      `payroll/${institutionId}/payroll-periods/?is_processed=${isProcessed}`
    );
    return response.data as IPayrollPeriod[];
  } catch (error) {
    console.error("Failed to get payroll periods by status:", error);
    return null;
  }
};


export const getUnprocessedPayrollPeriods = async (
  institutionId: number
): Promise<IPayrollPeriod[] | null> => {
  return getPayrollPeriodsByStatus({ institutionId, isProcessed: false });
};


export const getProcessedPayrollPeriods = async (
  institutionId: number
): Promise<IPayrollPeriod[] | null> => {
  return getPayrollPeriodsByStatus({ institutionId, isProcessed: true });
};


export const getPayrollPeriodsByDateRange = async ({
  institutionId,
  startDate,
  endDate,
}: {
  institutionId: number;
  startDate: string;
  endDate: string;
}): Promise<IPayrollPeriod[] | null> => {
  try {
    const response = await apiRequest.get(
      `payroll/${institutionId}/payroll-periods/?start_date__gte=${startDate}&end_date__lte=${endDate}`
    );
    return response.data as IPayrollPeriod[];
  } catch (error) {
    console.error("Failed to get payroll periods by date range:", error);
    return null;
  }
};


export const markPayrollPeriodAsProcessed = async (
  id: number
): Promise<IPayrollPeriod | null> => {
  return updatePayrollPeriod({
    id,
    payrollPeriodData: { is_processed: true }
  });
};


export const markPayrollPeriodAsUnprocessed = async (
  id: number
): Promise<IPayrollPeriod | null> => {
  return updatePayrollPeriod({
    id,
    payrollPeriodData: { is_processed: false }
  });
};


export const bulkCreatePayrollPeriods = async ({
  institutionId,
  periodsData,
}: {
  institutionId: number;
  periodsData: IPayrollPeriodFormData[];
}): Promise<IPayrollPeriod[] | null> => {
  try {
    const response = await apiRequest.post(
      `payroll/${institutionId}/payroll-periods/bulk/`,
      { periods: periodsData }
    );
    return response.data as IPayrollPeriod[];
  } catch (error) {
    console.error("Failed to bulk create payroll periods:", error);
    return null;
  }
};


export const validatePayrollPeriodFormData = (
  data: Partial<IPayrollPeriodFormData>
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data.name || data.name.trim().length === 0) {
    errors.push("Period name is required");
  }

  if (!data.start_date) {
    errors.push("Start date is required");
  }

  if (!data.end_date) {
    errors.push("End date is required");
  }

  if (!data.pay_date) {
    errors.push("Pay date is required");
  }

  if (data.start_date && data.end_date) {
    if (new Date(data.end_date) < new Date(data.start_date)) {
      errors.push("End date cannot be before start date");
    }
  }

  if (data.pay_date && data.end_date) {
    if (new Date(data.pay_date) < new Date(data.end_date)) {
      errors.push("Pay date should typically be after or on the end date");
    }
  }

  if (data.start_date && data.end_date) {
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 31) {
      errors.push("Warning: Payroll period is longer than 31 days");
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};


export const generatePeriodName = (startDate: string, endDate: string): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const startMonth = monthNames[start.getMonth()];
  const endMonth = monthNames[end.getMonth()];
  const year = start.getFullYear();
  
  if (start.getMonth() === end.getMonth()) {
    // Same month
    return `${startMonth} ${year}`;
  } else {
    // Different months
    return `${startMonth} - ${endMonth} ${year}`;
  }
};


export const checkPeriodOverlap = async ({
  institutionId,
  startDate,
  endDate,
  excludeId,
}: {
  institutionId: number;
  startDate: string;
  endDate: string;
  excludeId?: number;
}): Promise<{ hasOverlap: boolean; overlappingPeriods: IPayrollPeriod[] }> => {
  try {
    const allPeriods = await getPayrollPeriods(institutionId);
    
    if (!allPeriods) {
      return { hasOverlap: false, overlappingPeriods: [] };
    }
    
    const filteredPeriods = excludeId 
      ? allPeriods.filter(period => period.id !== excludeId)
      : allPeriods;
    
    const overlapping = filteredPeriods.filter(period => {
      const periodStart = new Date(period.start_date);
      const periodEnd = new Date(period.end_date);
      const newStart = new Date(startDate);
      const newEnd = new Date(endDate);
      
      // Check if periods overlap
      return (newStart <= periodEnd && newEnd >= periodStart);
    });
    
    return {
      hasOverlap: overlapping.length > 0,
      overlappingPeriods: overlapping
    };
  } catch (error) {
    console.error("Failed to check period overlap:", error);
    return { hasOverlap: false, overlappingPeriods: [] };
  }
};



export const createPayslip = async ({
  institutionId,
  payslipData,
}: {
  institutionId: number;
  payslipData: IPayslipFormData;
}): Promise<IPayslip | null> => {
  try {
    const formData = new FormData();
    
    Object.entries(payslipData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    const response = await apiRequest.post(
      `payroll/${institutionId}/payslips/`,
      formData
    );
    
    return response.data as IPayslip;
  } catch (error) {
    console.error("Failed to create payslip:", error);
    return null;
  }
};

export const createBulkPayslips = async ({
  institutionId,
  payrollPeriodId,
  employeeIds
}: {
  institutionId: number;
  payrollPeriodId: number;
  employeeIds?: number[];
}): Promise<IPayslip[] | null> => {
  try {
    const requestData = {
      payroll_period: payrollPeriodId,
      employee_ids: employeeIds || []
    };

    const response = await apiRequest.post(
      `payroll/${institutionId}/payslips/`,
      requestData  
    );
    
    return response.data as IPayslip[];
  } catch (error) {
    console.error("Failed to create bulk payslips:", error);
    throw error; 
  }
};

export const getPayslips = async (
  institutionId: number,
  params?: {
    employee?: number;
    payroll_period?: number;
    is_paid?: boolean;
    page?: number;
    page_size?: number;
  }
): Promise<IPayslip[] | null> => {
  try {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const url = `payroll/${institutionId}/payslips/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await apiRequest.get(url);
  
    const data = response.data as PaginatedResponse<IPayslip>
    
    // Return the results array instead of the entire response
    return data.results
  } catch (error) {
    console.error("Failed to get payslips:", error);
    return null;
  }
};

export const getPayslip = async (
  id: number
): Promise<IPayslip | null> => {
  try {
    const response = await apiRequest.get(`payroll/payslips/${id}/`);
    return response.data as IPayslip;
  } catch (error) {
    console.error("Failed to get payslip:", error);
    return null;
  }
};

export const updatePayslip = async ({
  id,
  payslipData,
}: {
  id: number;
  payslipData: Partial<IPayslipFormData>;
}): Promise<IPayslip | null> => {
  try {
    const formData = new FormData();
    
    Object.entries(payslipData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    const response = await apiRequest.patch(
      `payroll/payslips/${id}/`,
      formData
    );
    
    return response.data as IPayslip;
  } catch (error) {
    console.error("Failed to update payslip:", error);
    return null;
  }
};

export const deletePayslip = async (
  id: number
): Promise<boolean> => {
  try {
    await apiRequest.delete(`payroll/payslips/${id}/`);
    return true;
  } catch (error) {
    console.error("Failed to delete payslip:", error);
    return false;
  }
};


export const markPayslipAsPaid = async (
  id: number,
  paidDate?: string
): Promise<IPayslip | null> => {
  try {
    const formData = new FormData();
    formData.append('is_paid', 'true');
    
    if (paidDate) {
      formData.append('paid_date', paidDate);
    } else {
      // Use current date if no date provided
      formData.append('paid_date', new Date().toISOString().split('T')[0]);
    }

    const response = await apiRequest.patch(
      `payroll/payslips/${id}/`,
      formData
    );
    
    return response.data as IPayslip;
  } catch (error) {
    console.error("Failed to mark payslip as paid:", error);
    return null;
  }
};

export const getPayslipsByEmployee = async (
  institutionId: number,
  employeeId: number
): Promise<IPayslip[] | null> => {
  return getPayslips(institutionId, { employee: employeeId });
};

export const getPayslipsByPayrollPeriod = async (
  institutionId: number,
  payrollPeriodId: number
): Promise<IPayslip[] | null> => {
  return getPayslips(institutionId, { payroll_period: payrollPeriodId });
};

export const getUnpaidPayslips = async (
  institutionId: number
): Promise<IPayslip[] | null> => {
  return getPayslips(institutionId, { is_paid: false });
};

export const getPaidPayslips = async (
  institutionId: number
): Promise<IPayslip[] | null> => {
  return getPayslips(institutionId, { is_paid: true });
};


export const getPayslipItems = async (
  payslipId: number
): Promise<IPayslipItem[] | null> => {
  try {
    const response = await apiRequest.get(`payroll/payslips/${payslipId}/items/`);
    const data = response.data as PaginatedResponse<IPayslipItem>
    
    // Return the results array instead of the entire response
    return data.results
  } catch (error) {
    console.error("Failed to get payslip items:", error)
    return null;
  }
};