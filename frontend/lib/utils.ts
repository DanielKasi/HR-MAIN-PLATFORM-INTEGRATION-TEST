import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { toast } from "sonner";

import apiRequest from "./apiRequest";
import { forceUrlToHttps } from "./helpers";

import {
	IDepartment,
	DepartmentFormData,
	IJobPosition,
	CreateJobPositionData,
	JobApplication,
	JobApplicationFormData,
	JobPositionAdvert,
	JobPositionAdvertFormData,
	IInterview,
	IEmployeeFormData,
	IInterviewFormData,
	IInterviewStage,
	IInterviewStageFormData,
	IBulkOnBoardingResponse,
	IBulkOnBoardingRequest,
	IOnBoarding,
	IOnBoardingFormData,
	IEmployeeTypeFormData,
	IWorkType,
	IWorkTypeFormData,
	IEmployeeType,
	EmployeeBranchSummary,
	AttachBranchesPayload,
	SetDefaultBranchPayload,
	DisciplinaryActionForm,
	DisciplinaryActionRequest,
	DisciplinaryActionResponse,
	convertFormToApiRequest,
	IDisciplineTypeFormData,
	DisciplineTypeResponse,
	convertDisciplineTypeFormToApiRequest,
	IDisciplinaryAction,
	ILeaveRequest,
	ILeaveRequestFormData,
	LeaveRequestStatus,
	ILeaveTypeFormData,
	ILeaveType,
	ILeavePolicy,
	ILeavePolicyFormData,
	IAllowanceType,
	IAllowanceTypeFormData,
	IDeductionType,
	IDeductionTypeFormData,
	IEmployeeAllowance,
	IEmployeeAllowanceFormData,
	IEmployeeDeduction,
	IEmployeeDeductionFormData,
	IPayrollPeriod,
	IPayrollPeriodFormData,
	IPayslipFormData,
	IPayslip,
	IPayslipItem,
	ILeaveBalance,
	IPaginatedResponse,
	IContract,
	IContractFormData,
	IDocumentTypeFormData,
	IDocumentType,
	IDocumentTemplateFormData,
	IDocumentTemplate,
	IOffboardingStageFormData,
	IOffboardingStage,
	ISeparationType,
	ISeparationTypeFormData,
	ISeparationPolicy,
	ITermination,
	ITerminationFormData,
	IAttendance,
	IAttendanceFormData,
	IBankType,
	IBankTypeFormData,
	IBankAccountFormData,
	IBankAccount,
	IInstitutionWorkingDays,
	IWorkingDaysFormData,
	ISystemWorkingDay,
	Itax,
	ITax,
	ITaxFormData,
	ITaxRule,
	ITaxRuleFormData,
	IAssetCategory,
	IAssetCategoryFormData,
	IAsset,
	IAssetFormData,
	IAssetRequest,
	IAssetRequestFormData,
	IAssetAllocation,
	IAssetAllocationFormData,
	IAssetReturn,
	IAssetReturnFormData,
	AttendanceResponse,
	IEmployeeTaxFormData,
	IEmployeeTax,
	IInstitutionAnalytics,
	ICalendar,
	IEvent,
	ISpotCheck,
	ISpotCheckStatus,
	IInstitutionPenaltyConfig,
	IInstitutionPenaltyConfigFormData,
	IBranchPenaltyConfig,
	IBranchPenaltyConfigFormData,
	IBranchLocationComparisonConfig,
	IBranchLocationComparisonConfigFormData,
	ILocation,
	ISpotCheckFormData,
	IBranchShift,
	IBranchShiftFormData,
	IEmployeeShift,
	IEmployeeShiftFormData,
	IEmployeePenalty,
	IPenaltyType,
	IEmployeePenaltyFormData,
	IRecruitmentDashboard,
	IEmployeeDashboard,
	ILeaveDashboard,
	IAttendanceDashboard,
	IPayrollDashboard,
	IBranchWorkingDays,
	OffboardingData,
	AssetsData,
	ChangePasswordData,
	ApprovalTasksDashboardResponse,
	IBranchSpotCheckSettingFormData,
	IInstitutionSpotCheckSettingFormData,
	IInstitutionSpotCheckSetting,
	IBranchSpotCheckSetting,
	IEmployeeSpotCheckSetting,
	IEmployeeSpotCheckSettingFormData,
	IWorkExperience,
	INextOfKin,
	IChild,
	ISpouse,
	IEmployeeEducationFormData,
	IQualificationAward,
	IProject,
	IProjectFormData,
	IEmployeeBankAccountFormData,
	IProjectDashboard,
	IProjectTaskFormData,
	IProjectTask,
	IEmployeeObjective,
	IBonusPointSettings,
	IBonusPointSettingsFormData,
	IDurationUnit,
	IEmployeeBonusPoint,
	IEmployeeBonusPointFormData,
	IEmployeeObjectiveFormData,
	IEventMode,
	IFeedback360,
	IFeedback360FormData,
	IKeyResult,
	IKeyResultFormData,
	IMeeting,
	IMeetingFormData,
	IObjective,
	IObjectiveFormData,
	IObjectiveStatus,
	IPeriod,
	IPeriodFormData,
	IQuestionTemplate,
	IQuestionTemplateFormData,
} from "@/types/types.utils";
import { IEmployee } from "@/types/types.utils";
import {
	BulkEmployeeUploadResult,
	IKYCDocument,
	IUserInstitution,
	IUserInstitutionFormData,
	Role,
	UserProfile,
} from "@/types";
import { MAIN_DOMAIN_URL } from "@/constants";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function validatePasswordStrength(password: string): { valid: boolean; errors: string[] } {
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
		...(frontendUrl && { frontend_url: frontendUrl }),
	};

	await apiRequest.post("/user/forgot-password", payload);
}

/**
 * Verify if a reset token is valid
 * @param token Reset token
 */
export async function verifyResetToken(token: string): Promise<TokenVerificationResponse> {
	const response = await apiRequest.post("/user/verify-token", { token });

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

export const createDepartment = async ({
	departmentData,
}: {
	departmentData: DepartmentFormData;
}) => {
	try {
		const response = await apiRequest.post(
			`institution/${departmentData.institution}/department/`,
			departmentData,
		);

		return response.data as IDepartment;
	} catch (error) {
		throw error;
		throw error;
	}
};

export const getDepartment = async ({ departmentId }: { departmentId: number }) => {
	const response = await apiRequest.get(`institution/department/${departmentId}/`);

	return response.data as IDepartment;
};

export const updateDepartment = async ({ departmentData }: { departmentData: IDepartment }) => {
	const response = await apiRequest.patch(`institution/department/${departmentData.id}/`, {
		name: departmentData.name,
		description: departmentData.description,
		institution: departmentData.institution,
	});

	return response.data as IDepartment;
};

export const deleteDepartment = async ({ departmentId }: { departmentId: number }) => {
	try {
		await apiRequest.delete(`institution/department/${departmentId}/`);
	} catch (error) {
		// console.error("Error deleting department:", error);
	}
};

export const getDepartments = async ({ institutionId }: { institutionId: number }) => {
	try {
		const response = await apiRequest.get(`institution/${institutionId}/department/`);
		const data = response.data as IPaginatedResponse<IDepartment>;

		return data.results;
	} catch (error) {
		throw error;
	}
};

export const getPaginatedDepartments = async ({
	institutionId,
	page = 1,
	search,
	ordering,
}: {
	institutionId: number;
	page?: number;
	search?: string;
	ordering?: string;
}) => {
	const params = new URLSearchParams({
		page: page?.toString() || "1",
	});

	params.append("page", page.toString());
	if (search) {
		params.append("search", search);
	}
	ordering && params.append("ordering", ordering);
	const response = await apiRequest.get(
		`institution/${institutionId}/department/?${params.toString()}`,
	);

	return response.data as IPaginatedResponse<IDepartment>;
};

export const getPaginatedDepartmentsFromUrl = async ({ url }: { url: string }) => {
	const response = await apiRequest.get(forceUrlToHttps(url));

	return response.data as IPaginatedResponse<IDepartment>;
};

export const getJobPositions = async ({
	institutionId,
	page = 1,
	search,
	ordering,
}: {
	institutionId: number;
	page?: number;
	search?: string;
	ordering?: string;
}) => {
	const params = new URLSearchParams({
		page: page?.toString() || "1",
	});

	if (search) {
		params.append("search", search);
	}
	ordering && params.append("ordering", ordering);
	const response = await apiRequest.get(
		`recruitment/institution/${institutionId}/job-position/?${params.toString()}`,
	);
	const data = response.data as IPaginatedResponse<IJobPosition>;

	return data.results;
};

export const getPaginatedJobPositions = async ({
	institutionId,
	page = 1,
	search,
	ordering,
}: {
	institutionId: number;
	page?: number;
	search?: string;
	ordering?: string;
}) => {
	const params = new URLSearchParams({
		page: page?.toString() || "1",
	});

	params.append("page", page.toString());
	if (search) {
		params.append("search", search);
	}
	ordering && params.append("ordering", ordering);
	const response = await apiRequest.get(
		`recruitment/institution/${institutionId}/job-position/?${params.toString()}`,
	);

	return response.data as IPaginatedResponse<IJobPosition>;
};

export const getPaginatedJobPositionsFromUrl = async (url: string) => {
	const response = await apiRequest.get(forceUrlToHttps(url));

	return response.data as IPaginatedResponse<IJobPosition>;
};

export const getDefaultData = async (): Promise<IDepartment[] | null> => {
	const response = await apiRequest.get("institution/default-data/");

	return response.data as IDepartment[];
};

export const getJobPosition = async ({ jobPositionId }: { jobPositionId: number }) => {
	try {
		const response = await apiRequest.get(`recruitment/job-position/${jobPositionId}/`);
		const data = response.data as IJobPosition;

		return data;
	} catch (error) {
		// console.error("Error fetching job position/title:", error);
		throw error;
	}
};

export const deleteJobPosition = async ({ jobPositionId }: { jobPositionId: number }) => {
	try {
		await apiRequest.delete(`recruitment/job-position/${jobPositionId}/`);
	} catch (error) {
		// console.error("Error deleting job position/title:", error);
	}
};

export const createJobPosition = async ({
	institutionId,
	jobPositionData,
}: {
	institutionId: number;
	jobPositionData: CreateJobPositionData;
}) => {
	try {
		const formData = new FormData();

		// Add text fields
		formData.append("name", jobPositionData.name);
		if (jobPositionData.description) {
			formData.append("description", jobPositionData.description);
		}
		formData.append("department", jobPositionData.department.toString());
		if (jobPositionData.reports_to) {
			formData.append("reports_to", jobPositionData.reports_to.toString());
		}
		formData.append("salary_min", jobPositionData.salary_min.toString());
		formData.append("salary_max", jobPositionData.salary_max.toString());
		formData.append("job_position_status", jobPositionData.job_position_status.toString());

		if (jobPositionData.offer_letter_template) {
			formData.append("offer_letter_template", jobPositionData.offer_letter_template);
		}

		const response = await apiRequest.post(
			`recruitment/institution/${institutionId}/job-position/`,
			formData,
		);

		return response.data as IJobPosition;
	} catch (error) {
		// console.error("Error creating job position/title:", error);
		throw error;
	}
};

export const updateJobPosition = async ({
	jobPositionId,
	jobPositionData,
}: {
	jobPositionId: number;
	jobPositionData: CreateJobPositionData;
}) => {
	try {
		const formData = new FormData();

		// Add text fields
		formData.append("name", jobPositionData.name);
		if (jobPositionData.description) {
			formData.append("description", jobPositionData.description);
		}
		formData.append("department", jobPositionData.department.toString());
		if (jobPositionData.reports_to) {
			formData.append("reports_to", jobPositionData.reports_to.toString());
		}
		formData.append("salary_min", jobPositionData.salary_min.toString());
		formData.append("salary_max", jobPositionData.salary_max.toString());
		formData.append("job_position_status", jobPositionData.job_position_status.toString());

		if (jobPositionData.offer_letter_template) {
			formData.append("offer_letter_template", jobPositionData.offer_letter_template);
		}

		// Add affected_employees as individual entries
		if (jobPositionData.affected_employees && jobPositionData.affected_employees.length > 0) {
			jobPositionData.affected_employees.forEach((employeeId) => {
				formData.append("apply_salary_to_employees", employeeId.toString());
			});
		}

		const response = await apiRequest.patch(`recruitment/job-position/${jobPositionId}/`, formData);

		return response.data as IJobPosition;
	} catch (error) {
		// console.error("Error updating job position/title:", error);
		if ((error as any).response?.data?.apply_salary_to_employees) {
			toast.error(
				(error as any)?.response?.data?.apply_salary_to_employees.join(", ") ||
					"Failed to update job position/title ",
			);
		} else {
			toast.error("Failed to update job position/title. Please try again.");
		}
		throw error;
	}
};

export const createJobApplication = async ({
	institutionId,
	applicationData,
}: {
	institutionId: number;
	applicationData: JobApplicationFormData;
}): Promise<JobApplication | null> => {
	const formData = new FormData();

	// Log what we're appending to FormData
	Object.entries(applicationData).forEach(([key, value]) => {
		if (value !== undefined && value !== null) {
			formData.append(key, value as any);
		}
	});
	const response = await apiRequest.post(
		`recruitment/institution/${institutionId}/job-application/`,
		formData,
	);

	return response.data as JobApplication;
};

// Fetch all job applications for a specific institution
export const getJobApplications = async ({
	institutionId,
}: {
	institutionId: number;
}): Promise<IPaginatedResponse<JobApplication> | null> => {
	try {
		const response = await apiRequest.get(
			`recruitment/institution/${institutionId}/job-application/`,
		);

		return response.data as IPaginatedResponse<JobApplication>;
	} catch (error) {
		// console.error("Failed to fetch job applications", error);
		throw error;
	}
};

// Fetch paginated job applications for a specific institution
export const getPaginatedJobApplications = async ({
	institutionId,
	page = 1,
	search,
	status,
	jobPositionAdvert,
	ordering,
}: {
	institutionId: number;
	page?: number;
	search?: string;
	status?: string;
	jobPositionAdvert?: string;
	ordering?: string;
}): Promise<IPaginatedResponse<JobApplication>> => {
	try {
		const params = new URLSearchParams();

		params.append("page", page.toString());
		ordering && params.append("ordering", ordering);
		if (search) params.append("search", search);
		if (status && status !== "all") params.append("status", status);
		if (jobPositionAdvert && jobPositionAdvert !== "all")
			params.append("job_position_advert", jobPositionAdvert);

		const response = await apiRequest.get(
			`recruitment/institution/${institutionId}/job-application/?${params.toString()}`,
		);

		return response.data as IPaginatedResponse<JobApplication>;
	} catch (error) {
		// console.error("Failed to fetch paginated job applications", error);
		throw error;
	}
};

// Fetch paginated job applications from URL (for direct navigation)
export const getPaginatedJobApplicationsFromUrl = async (
	url: string,
): Promise<IPaginatedResponse<JobApplication>> => {
	try {
		const response = await apiRequest.get(forceUrlToHttps(url));

		return response.data as IPaginatedResponse<JobApplication>;
	} catch (error) {
		// console.error("Failed to fetch paginated job applications from URL", error);
		throw error;
	}
};

// Fetch a single job application by ID
export const getJobApplicationById = async ({ applicationId }: { applicationId: number }) => {
	const response = await apiRequest.get(`recruitment/job-application/${applicationId}/`);

	return response.data as JobApplication;
};

// Update an existing job application
// There is no delete for a job application (For now)
export const updateJobApplication = async ({
	applicationId,
	applicationData,
}: {
	applicationId: number;
	applicationData: Partial<JobApplicationFormData>;
}) => {
	const formData = new FormData();

	Object.entries(applicationData).forEach(([key, value]) => {
		if (value !== undefined && value !== null) {
			formData.append(key, value as any);
		}
	});

	const response = await apiRequest.patch(
		`recruitment/job-application/${applicationId}/`,
		formData,
	);

	return response.data as JobApplication;
};

export const updateJobApplicationStatus = async ({
	applicationId,
	status,
	shortlisted_by,
	reviewed_by,
	rejected_by,
}: {
	applicationId: number;
	status: string;
	shortlisted_by?: number;
	reviewed_by?: number;
	rejected_by?: number;
}): Promise<JobApplication | null> => {
	try {
		const formData = new FormData();

		formData.append("status", status);

		// Add user tracking fields based on the action - just like how created_by works
		if (shortlisted_by) {
			formData.append("shortlisted_by", shortlisted_by.toString());
		}
		if (reviewed_by) {
			formData.append("reviewed_by", reviewed_by.toString());
		}
		if (rejected_by) {
			formData.append("rejected_by", rejected_by.toString());
		}

		const response = await apiRequest.patch(
			`recruitment/job-application/${applicationId}/`,
			formData,
		);

		return response.data as JobApplication;
	} catch (error) {
		// console.error("Failed to update job application", error);
		throw error;
	}
};

export const fetchEmployees = async ({ institutionId }: { institutionId: number }) => {
	const response = await apiRequest.get(`employee/${institutionId}/employee/`);

	return response.data as IEmployee[];
};

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
			formData,
		);

		return response.data as JobPositionAdvert;
	} catch (error: any) {
		if (error?.response?.status === 404 || error?.response?.status === 400) {
			throw error;
		}
		throw error;
	}
};

export const getJobPositionAdverts = async ({ institutionId }: { institutionId: number }) => {
	try {
		const response = await apiRequest.get(`recruitment/institution/${institutionId}/job-advert/`);

		return response.data as IPaginatedResponse<JobPositionAdvert>;
	} catch (error) {
		throw error;
	}
};

export const getPaginatedJobAdverts = async ({
	institutionId,
	page = 1,
	search,
	status,
	branch,
	ordering,
}: {
	institutionId: number;
	page?: number;
	search?: string;
	status?: string;
	branch?: string;
	ordering?: string;
}): Promise<IPaginatedResponse<JobPositionAdvert>> => {
	try {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		ordering && params.append("ordering", ordering);
		if (search) {
			params.append("search", search);
		}
		if (status && status !== "all") {
			params.append("status", status);
		}
		if (branch && branch !== "all") {
			params.append("branch", branch);
		}

		const endpoint = `recruitment/institution/${institutionId}/job-advert/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);

		return response.data as IPaginatedResponse<JobPositionAdvert>;
	} catch (error) {
		console.error("Error fetching paginated job adverts:", error);
		throw error;
	}
};

export const getPaginatedJobAdvertsFromUrl = async ({
	url,
}: {
	url: string;
}): Promise<IPaginatedResponse<JobPositionAdvert>> => {
	try {
		const response = await apiRequest.get(forceUrlToHttps(url));

		return response.data as IPaginatedResponse<JobPositionAdvert>;
	} catch (error) {
		console.error("Error fetching paginated job adverts from URL:", error);
		throw error;
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
		// console.error("Failed to fetch job position advert", error);
		throw error;
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

		const response = await apiRequest.patch(`recruitment/job-advert/${advertId}/`, formData);

		return response.data as JobPositionAdvert;
	} catch (error) {
		// console.error("Failed to update job position advert", error);
		throw error;
	}
};

export const getInterviews = async ({ institutionId }: { institutionId: number }) => {
	try {
		const response = await apiRequest.get(
			`recruitment/institution/${institutionId}/job-interview/`,
		);

		return response.data as IInterview[];
	} catch (error) {
		// console.error("Error fetching job interviews:", error);
		throw error;
	}
};

export const getPaginatedInterviews = async ({
	institutionId,
	page = 1,
	search,
	status,
	ordering,
}: {
	institutionId: number;
	page?: number;
	search?: string;
	status?: string;
	ordering?: string;
}): Promise<IPaginatedResponse<IInterview>> => {
	try {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (search) {
			params.append("search", search);
		}
		if (status && status !== "all") {
			params.append("status", status);
		}
		ordering && params.append("ordering", ordering);
		const endpoint = `recruitment/institution/${institutionId}/job-interview/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);

		return response.data as IPaginatedResponse<IInterview>;
	} catch (error) {
		console.error("Error fetching paginated interviews:", error);
		throw error;
	}
};

export const getPaginatedInterviewsFromUrl = async ({
	url,
}: {
	url: string;
}): Promise<IPaginatedResponse<IInterview>> => {
	try {
		const response = await apiRequest.get(forceUrlToHttps(url));

		return response.data as IPaginatedResponse<IInterview>;
	} catch (error) {
		console.error("Error fetching interviews from URL:", error);
		throw error;
	}
};

export const getInterviewById = async ({
	interviewId,
}: {
	interviewId: number;
}): Promise<IInterview | null> => {
	try {
		const response = await apiRequest.get(`recruitment/job-interview/${interviewId}/`);

		return response.data as IInterview;
	} catch (error) {
		// console.error("Failed to fetch job position advert", error);
		throw error;
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
			formData,
		);

		return response.data as IInterview;
	} catch (error) {
		// console.error("Failed to create job interview:", error);
		throw error;
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

		const response = await apiRequest.patch(`recruitment/job-interview/${interviewId}/`, formData);

		return response.data as IInterview;
	} catch (error) {
		// console.error("Failed to update job interview:", error);
		throw error;
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
			`recruitment/interviews/?job_position_application=${candidateId}&interview_stage=${stageId}`,
		);

		if (!interviewsResponse.data.results || interviewsResponse.data.results.length === 0) {
			throw new Error("No interview found for this candidate in this stage");
		}

		const interviewId = interviewsResponse.data.results[0].id;

		const formData = new FormData();

		formData.append("feedback", feedback);
		formData.append("rating", rating.toString());

		const response = await apiRequest.patch(`recruitment/job-interview/${interviewId}/`, formData);

		return response.data;
	} catch (error) {
		// console.error("Failed to update candidate feedback:", error);
		throw error;
	}
};

export const getInterviewStages = async ({
	institutionId,
}: {
	institutionId: number;
}): Promise<IInterviewStage[] | null> => {
	try {
		const response = await apiRequest.get(
			`recruitment/institution/${institutionId}/interview-stage/`,
		);
		const data = response.data as IPaginatedResponse<IInterviewStage>;

		// Return the results array instead of the entire response
		return data.results;
	} catch (error) {
		// console.error("Failed to fetch interview stages:", error);
		throw error;
	}
};

export const createInterviewStage = async ({
	institutionId,
	stageData,
}: {
	institutionId: number;
	stageData: IInterviewStageFormData;
}): Promise<IInterviewStage | null> => {
	const formData = new FormData();

	formData.append("name", stageData.name);
	formData.append("level", stageData.level.toString());
	formData.append("job_position_advert", stageData.job_position_advert.toString());

	stageData.interviewers.forEach((interviewerId) => {
		formData.append("interviewers", interviewerId.toString());
	});

	const response = await apiRequest.post(
		`recruitment/institution/${institutionId}/interview-stage/`,
		formData,
	);

	return response.data as IInterviewStage;
};

export const upddateInterviewStage = async ({
	stageId,
	stageData,
}: {
	stageId: number;
	stageData: IInterviewStageFormData;
}): Promise<IInterviewStage | null> => {
	const formData = new FormData();

	formData.append("name", stageData.name);
	formData.append("level", stageData.level.toString());
	formData.append("job_position_advert", stageData.job_position_advert.toString());

	stageData.interviewers.forEach((interviewerId) => {
		formData.append("interviewers", interviewerId.toString());
	});

	const response = await apiRequest.post(`recruitment/interview-stage/${stageId}/`, formData);

	return response.data as IInterviewStage;
};

export const createInterviewStageJSON = async ({
	institutionId,
	stageData,
}: {
	institutionId: number;
	stageData: IInterviewStageFormData;
}): Promise<IInterviewStage | null> => {
	try {
		const response = await apiRequest.post(
			`recruitment/institution/${institutionId}/interview-stage/`,
			stageData,
			{
				headers: {
					"Content-Type": "application/json",
				},
			},
		);

		return response.data as IInterviewStage;
	} catch (error) {
		// console.error("Failed to create interview stage:", error);
		throw error;
	}
};

export const downloadEmployeesTemplate = async ({
	accessToken,
}: {
	accessToken: string;
}): Promise<void> => {
	try {
		const baseURL = process.env.NEXT_PUBLIC_API_URL;

		// Create a direct fetch request for file download
		const response = await fetch(`${baseURL}/employee/template/`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
		});

		if (!response.ok) {
			const errorText = await response.text();

			//// console.error("Download error response:", errorText);
			throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
		}

		// Check if response is actually a file
		const contentType = response.headers.get("content-type");

		if (
			!contentType ||
			(!contentType.includes("application/vnd.openxmlformats") &&
				!contentType.includes("application/vnd.ms-excel") &&
				!contentType.includes("application/octet-stream"))
		) {
			const responseText = await response.text();

			//// console.error("Unexpected response type:", contentType, responseText);
			throw new Error("Server did not return an Excel file. Please check the API endpoint.");
		}

		// Get the blob data
		const blob = await response.blob();

		// Create a URL for the blob
		const url = window.URL.createObjectURL(blob);
		const link = document.createElement("a");

		link.href = url;
		link.setAttribute("download", "employees_template.xlsx");
		document.body.appendChild(link);
		link.click();
		link.remove();
		window.URL.revokeObjectURL(url);
	} catch (error) {
		throw error;
	}
};

export const downloadPayrollPasslipsReport = async ({
	accessToken,
	period_id,
}: {
	accessToken: string;
	period_id: string | number;
}): Promise<void> => {
	const payload = {
		payroll_period_id: period_id,
	};

	const response = await fetch(
		`${process.env.NEXT_PUBLIC_API_URL || `${MAIN_DOMAIN_URL}/api`}/payroll/export-passlips-report2excel/`,
		{
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${accessToken}`,
			},
			body: JSON.stringify(payload),
		},
	);

	if (response.ok) {
		const blob = await response.blob();
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement("a");

		a.href = url;
		a.download = `excel-payslips-report-${period_id}.xlsx`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		window.URL.revokeObjectURL(url);
	} else {
		const errorText = await response.text();

		//// console.error("Download error response:", errorText);
		throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
	}
};

export const downloadSinglePayslip = async ({
	accessToken,
	payslipId,
}: {
	accessToken: string;
	payslipId: string | number;
}): Promise<void> => {
	const url = `${process.env.NEXT_PUBLIC_API_URL || `${MAIN_DOMAIN_URL}/api`}/payroll/payslips/${payslipId}/download/`;

	const response = await fetch(url, {
		method: "GET",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${accessToken}`,
		},
	});

	if (!response.ok) {
		const errorText = await response.text();

		throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
	}

	// helper to parse filename from Content-Disposition header
	const getFilenameFromContentDisposition = (cd?: string | null): string | null => {
		if (!cd) return null;

		// RFC5987: filename*=UTF-8''... (percent-encoded)
		const fnStarMatch = cd.match(/filename\*\s*=\s*([^;]+)/i);

		if (fnStarMatch) {
			const part = fnStarMatch[1].trim();
			// part may be: UTF-8''%e2%82%ac%20rates.pdf
			const starParts = part.split("''");
			const encoded = starParts.length > 1 ? starParts[1] : part;

			try {
				return decodeURIComponent(encoded.replace(/(^"|"$)/g, ""));
			} catch {
				return encoded.replace(/(^"|"$)/g, "");
			}
		}

		// fallback to filename="..." or filename=...
		const fnMatch = cd.match(/filename\s*=\s*\"?([^\";]+)\"?/i);

		if (fnMatch) {
			return fnMatch[1];
		}

		return null;
	};

	// lightweight mime -> ext map
	const mimeToExt = (mime?: string | null) => {
		if (!mime) return ".bin";
		const m = mime.split(";")[0].trim().toLowerCase();

		switch (m) {
			case "application/pdf":
				return ".pdf";
			case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
				return ".xlsx";
			case "application/vnd.ms-excel":
				return ".xls";
			case "text/csv":
				return ".csv";
			case "application/msword":
				return ".doc";
			case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
				return ".docx";
			default:
				// try to derive from the subtype
				const parts = m.split("/");

				return parts.length === 2 && parts[1] ? `.${parts[1].replace(/[^a-z0-9]/g, "")}` : ".bin";
		}
	};

	// read headers first
	const contentDisposition = response.headers.get("content-disposition");
	const contentTypeHeader = response.headers.get("content-type") || "";

	// get the blob (we need it to build the object URL)
	const blob = await response.blob();

	// try content-disposition filename
	let filename = getFilenameFromContentDisposition(contentDisposition);

	// fallback: if filename missing, use mime/type to pick extension
	if (!filename) {
		const ext = mimeToExt(contentTypeHeader || blob.type);

		filename = `Payslip-${payslipId}${ext}`;
	}

	// Create a download link
	const urlObject = window.URL.createObjectURL(blob);
	const a = document.createElement("a");

	a.href = urlObject;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	window.URL.revokeObjectURL(urlObject);
};

export const downloadPayrollDocument = async ({
	accessToken,
	payrollId,
	payingAccountId,
}: {
	accessToken: string;
	payrollId: string;
	payingAccountId: string | number;
}): Promise<void> => {
	try {
		const baseURL = process.env.NEXT_PUBLIC_API_URL;

		// Create a direct fetch request for file download
		const response = await fetch(
			`${baseURL}/payroll/export/?payroll_period_id=${payrollId}&paying_account_id=${payingAccountId}`,
			{
				method: "GET",
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
			},
		);

		if (!response.ok) {
			const errorText = await response.text();

			//// console.error("Download error response:", errorText);
			throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
		}

		// Check if response is actually a file
		const contentType = response.headers.get("content-type");

		if (
			!contentType ||
			(!contentType.includes("application/vnd.openxmlformats") &&
				!contentType.includes("application/vnd.ms-excel") &&
				!contentType.includes("application/octet-stream"))
		) {
			const responseText = await response.text();

			//// console.error("Unexpected response type:", contentType, responseText);
			throw new Error("Server did not return an Excel file. Please check the API endpoint.");
		}

		// Get the blob data
		const blob = await response.blob();

		// Create a URL for the blob
		const url = window.URL.createObjectURL(blob);
		const link = document.createElement("a");

		link.href = url;
		link.setAttribute("download", "payroll.xlsx");
		document.body.appendChild(link);
		link.click();
		link.remove();
		window.URL.revokeObjectURL(url);
		toast.success("Download started", {
			description: `Payroll is being downloaded.`,
		});
	} catch (error) {
		toast.error("Download failed", {
			description: "Failed to download the file. Please try again.",
		});
		throw error;
	}
};

export const bulkCreateEmployees = async ({
	institutionId,
	file,
}: {
	institutionId: number;
	file: File;
}): Promise<BulkEmployeeUploadResult> => {
	const formData = new FormData();

	formData.append("file", file);
	formData.append("institution", institutionId.toString());

	const response = await apiRequest.post("employee/create/", formData);

	return response.data;
};

export const getPaginatedEmployees = async ({
	institutionId,
	page = 1,
	search,
	ordering,
	positionSearch,
}: {
	institutionId: number;
	page?: number;
	search?: string;
	ordering?: string;
	positionSearch?: string; 
}) => {
	const params = new URLSearchParams({
		page: page.toString(),
	});

	if (positionSearch) { 
		params.append("position_search", positionSearch);
	}

	if (search) {
		params.append("search", search);
	}
	ordering && params.append("ordering", ordering);
	const endpoint = `employee/${institutionId}/employee/?${params.toString()}`;
	const response = await apiRequest.get(endpoint);

	return response.data as IPaginatedResponse<IEmployee>;
};

export const getPaginatedEmployeesFromUrl = async ({
	url,
}: {
	url: string;
}): Promise<IPaginatedResponse<IEmployee>> => {
	const response = await apiRequest.get(forceUrlToHttps(url));

	return response.data as IPaginatedResponse<IEmployee>;
};

export const createEmployee = async ({
	institutionId,
	employeeData,
}: {
	institutionId: number;
	employeeData: IEmployeeFormData;
}) => {
	try {
		const formData = new FormData();

		formData.append("institutionId", institutionId.toString());

		if (employeeData.user) {
			formData.append("user.fullname", employeeData.user.fullname || "");
			formData.append("user.email", employeeData.user.email || "");
		}

		Object.entries(employeeData).forEach(([key, value]) => {
			if (key === "user") return;

			if (key === "employee_profile_picture" && value instanceof File) {
				formData.append(key, value);
			} else if (key === "selected_branches" && Array.isArray(value)) {
				value.forEach((branchId) => {
					formData.append("selected_branches", branchId.toString());
				});
			} else if (key === "children" && Array.isArray(value)) {
				value.forEach((child: IChild, index) => {
					formData.append(`children[${index}].name`, child.name || "");
					formData.append(`children[${index}].gender`, child.gender || "");
					formData.append(`children[${index}].date_of_birth`, child.date_of_birth || "");
				});
			} else if (key === "next_of_kin" && Array.isArray(value)) {
				value.forEach((nok: INextOfKin, index) => {
					formData.append(`next_of_kin[${index}].name`, nok.name || "");
					formData.append(`next_of_kin[${index}].relationship`, nok.relationship || "");
					formData.append(`next_of_kin[${index}].phone_number`, nok.phone_number || "");
					formData.append(`next_of_kin[${index}].address`, nok.address || "");
				});
			} else if (key === "educations" && Array.isArray(value)) {
				value.forEach((edu: IEmployeeEducationFormData, index) => {
					formData.append(`educations[${index}].name`, edu.name || "");
					formData.append(`educations[${index}].institution`, edu.institution || "");
					formData.append(`educations[${index}].year`, edu.year || "");
					formData.append(
						`educations[${index}].qualification_id`,
						edu.qualification_id.toString() || "",
					);
				});
			} else if (key === "work_experiences" && Array.isArray(value)) {
				value.forEach((exp: IWorkExperience, index) => {
					formData.append(`work_experiences[${index}].company`, exp.company || "");
					formData.append(`work_experiences[${index}].position`, exp.position || "");
					formData.append(`work_experiences[${index}].duration`, exp.duration || "");
					formData.append(`work_experiences[${index}].reason_of_leave`, exp.reason_of_leave || "");
				});
			} else if (key === "bank_accounts" && Array.isArray(value)) {
				value.forEach((bank: IEmployeeBankAccountFormData, index) => {
					formData.append(`bank_accounts[${index}].bank_id`, bank.bank_id.toString());
					formData.append(`bank_accounts[${index}].account_number`, bank.account_number || "");
					formData.append(`bank_accounts[${index}].account_name`, bank.account_name || "");
				});
			} else if (key === "spouse" && value && typeof value === "object") {
				formData.append("spouse.name", value.name || "");
				formData.append("spouse.phone_number", value.phone_number || "");
				formData.append("spouse.date_of_birth", value.date_of_birth || "");
			} else if (value !== undefined && value !== null && value !== "") {
				formData.append(key, value.toString());
			}
		});

		const response = await apiRequest.post(`/employee/create/`, formData);

		return response.data as IEmployee;
	} catch (error: any) {
		throw new Error(
			error.response?.data?.detail ||
				error.response?.data?.message ||
				error.message ||
				"Failed to create employee",
		);
	}
};

export const updateEmployee = async ({
	employeeId,
	employeeData,
}: {
	employeeId: number;
	employeeData: any;
}) => {
	const formData = new FormData();

	if (employeeData.user) {
		formData.append("user.fullname", employeeData.user.fullname);
		formData.append("user.email", employeeData.user.email);
	}

	Object.entries(employeeData).forEach(([key, value]) => {
		if (key === "user") return;

		if (key === "employee_profile_picture" && value instanceof File) {
			formData.append(key, value);
		} else if (key === "selected_branches" && Array.isArray(value)) {
			value.forEach((branchId) => {
				formData.append("selected_branches", branchId.toString());
			});
		} else if (key === "children" && Array.isArray(value)) {
			value.forEach((child: IChild, index) => {
				formData.append(`children[${index}].name`, child.name || "");
				formData.append(`children[${index}].gender`, child.gender || "");
				formData.append(`children[${index}].date_of_birth`, child.date_of_birth || "");
			});
		} else if (key === "next_of_kin" && Array.isArray(value)) {
			value.forEach((nok: INextOfKin, index) => {
				formData.append(`next_of_kin[${index}].name`, nok.name || "");
				formData.append(`next_of_kin[${index}].relationship`, nok.relationship || "");
				formData.append(`next_of_kin[${index}].phone_number`, nok.phone_number || "");
				formData.append(`next_of_kin[${index}].address`, nok.address || "");
			});
		} else if (key === "educations" && Array.isArray(value)) {
			value.forEach((edu: IEmployeeEducationFormData, index) => {
				formData.append(`educations[${index}].name`, edu.name || "");
				formData.append(`educations[${index}].institution`, edu.institution || "");
				formData.append(`educations[${index}].year`, edu.year || "");
				formData.append(
					`educations[${index}].qualification_id`,
					edu.qualification_id.toString() || "",
				);
			});
		} else if (key === "work_experiences" && Array.isArray(value)) {
			value.forEach((exp: IWorkExperience, index) => {
				formData.append(`work_experiences[${index}].company`, exp.company || "");
				formData.append(`work_experiences[${index}].position`, exp.position || "");
				formData.append(`work_experiences[${index}].duration`, exp.duration || "");
				formData.append(`work_experiences[${index}].reason_of_leave`, exp.reason_of_leave || "");
			});
		} else if (key === "bank_accounts" && Array.isArray(value)) {
			value.forEach((bank: IEmployeeBankAccountFormData, index) => {
				formData.append(`bank_accounts[${index}].bank_id`, bank.bank_id.toString());
				formData.append(`bank_accounts[${index}].account_number`, bank.account_number || "");
				formData.append(`bank_accounts[${index}].account_name`, bank.account_name || "");
			});
		} else if (key === "spouse" && value && typeof value === "object") {
			formData.append("spouse.name", (value as ISpouse).name || "");
			formData.append("spouse.phone_number", (value as ISpouse).phone_number || "");
			formData.append("spouse.date_of_birth", (value as ISpouse).date_of_birth || "");
		} else if (value !== undefined && value !== null && value !== "") {
			formData.append(key, value.toString());
		}
	});

	const response = await apiRequest.patch(`/employee/${employeeId}/update/`, formData);

	return response.data as IEmployee;
};

export const deleteEmployee = async ({
	employeeId,
	institutionId,
}: {
	employeeId: number;
	institutionId: number;
}) => {
	await apiRequest.delete(`/employee/${institutionId}/${employeeId}/delete/`);
};

export const getEmployeeById = async ({ employeeId }: { employeeId: number | string }) => {
	try {
		const response = await apiRequest.get(`/employee/${employeeId}/`);

		return response.data as IEmployee;
	} catch (error: any) {
		throw new Error(
			error.response?.data?.detail ||
				error.response?.data?.message ||
				error.message ||
				"Failed to fetch employee",
		);
	}
};

// Helper function to get roles for an institution
export const getRoles = async ({ institutionId }: { institutionId: number }): Promise<Role[]> => {
	const response = await apiRequest.get(`user/role/?Institution_id=${institutionId}`);

	if (response.data && response.data.results) {
		return response.data.results || [];
	}

	return Array.isArray(response.data) ? response.data : [];
};

// Helper function to get positions for an institution
export const getPositions = async ({ institutionId }: { institutionId: number }) => {
	try {
		const response = await apiRequest.get(`recruitment/institution/${institutionId}/job-position/`);
		const data = response.data as IPaginatedResponse<IJobPosition>;

		return data.results;
	} catch (error) {
		// console.error("Error fetching positions:", error);
		return [];
	}
};

// Fetch a single employee by ID
export const getEmployeeDetailId = async ({
	applicationId,
	employeeId,
}: {
	applicationId: number;
	employeeId: number;
}): Promise<IEmployeeFormData | null> => {
	// Changed return type from IEmployeeFormData to Employee
	try {
		const response = await apiRequest.get(`/employee/${employeeId}/${applicationId}/`);

		return response.data as IEmployeeFormData; // Changed casting
	} catch (error) {
		throw error;
	}
};

export const getOnBoardings = async ({ institutionId }: { institutionId: number }) => {
	const response = await apiRequest.get(`on-boarding/list/${institutionId}/`);
	const data = response.data as IPaginatedResponse<IOnBoarding>;

	return data.results;
};

export const getPaginatedOnBoardings = async ({
	institutionId,
	search,
	page = 1,
	ordering,
}: {
	institutionId: number;
	search?: string;
	page?: number;
	ordering?: string;
}) => {
	const params = new URLSearchParams({
		page: page.toString(),
	});

	if (search) {
		params.append("search", search);
	}
	ordering && params.append("ordering", ordering);
	const response = await apiRequest.get(`on-boarding/list/${institutionId}/?${params.toString()}`);

	return response.data as IPaginatedResponse<IOnBoarding>;
};

export const getPaginatedOnBoardingsFromUrl = async ({ url }: { url: string }) => {
	const response = await apiRequest.get(url);

	return response.data as IPaginatedResponse<IOnBoarding>;
};

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
		// console.error("Failed to fetch onboarding record", error);
		throw error;
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

		const response = await apiRequest.post(`on-boarding/${institutionId}/`, formData);

		return response.data as IOnBoarding;
	} catch (error) {
		// console.error("Failed to create onboarding record:", error);
		throw error;
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
		const response = await apiRequest.patch(`on-boarding/record/${onboardingId}/`, onboardingData);

		return response.data as IOnBoarding;
	} catch (error) {
		// console.error("Failed to update onboarding record:", error);
		throw error;
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
			application_ids: applicationIds,
		};

		const response = await apiRequest.post(`on-boarding/bulk-create/`, requestData);

		return response.data as IBulkOnBoardingResponse;
	} catch (error) {
		// console.error("Failed to bulk create onboarding records:", error);
		throw error;
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

		const response = await apiRequest.post(`employee/work-types/${institutionId}/`, formData);

		return response.data as IWorkType;
	} catch (error) {
		// console.error("Failed to create work type:", error);
		throw error;
	}
};

export const getWorkTypes = async ({
	institutionId,
	page = 1,
	search,
	ordering,
}: {
	institutionId: number;
	page?: number;
	search?: string;
	ordering?: string;
}) => {
	const params = new URLSearchParams({
		page: page.toString(),
	});

	if (search) {
		params.append("search", search);
	}
	ordering && params.append("ordering", ordering);
	const response = await apiRequest.get(
		`employee/work-types/${institutionId}/?${params.toString()}`,
	);
	const data = response.data as IPaginatedResponse<IWorkType>;

	return data;
};

export const getPaginatedWorkTypesFromUrl = async ({ url }: { url: string }) => {
	const response = await apiRequest.get(forceUrlToHttps(url));

	return response.data as IPaginatedResponse<IWorkType>;
};

export const updateWorkType = async ({
	employeeTypeId,
	employeeTypeData,
}: {
	institutionId: number;
	employeeTypeId: number;
	employeeTypeData: Partial<Omit<IWorkType, "id" | "created_at" | "updated_at">>;
}): Promise<IWorkType> => {
	try {
		const response = await apiRequest.patch(
			`employee/work-types/detail/${employeeTypeId}/`,
			employeeTypeData,
		);

		return response.data as IWorkType;
	} catch (error) {
		throw error;
	}
};

export const deleteWorkType = async ({
	workTypeId,
}: {
	institutionId: number;
	workTypeId: number;
}): Promise<void> => {
	try {
		await apiRequest.delete(`employee/work-types/detail/${workTypeId}/`);
	} catch (error) {
		throw error;
	}
};

export const createEmployeeType = async ({
	institutionId,
	employeeTypeData,
}: {
	institutionId: number;
	employeeTypeData: IEmployeeTypeFormData;
}) => {
	try {
		const formData = new FormData();

		Object.entries(employeeTypeData).forEach(([key, value]) => {
			if (value !== null && value !== undefined) {
				formData.append(key, value.toString());
			}
		});

		const response = await apiRequest.post(`employee/employee-types/${institutionId}/`, formData);

		return response.data as IEmployeeType;
	} catch (error) {
		throw error;
	}
};

export const getEmployeeTypes = async ({
	institutionId,
	page = 1,
	search,
	ordering,
}: {
	institutionId: number;
	page?: number;
	search?: string;
	ordering?: string;
}): Promise<IPaginatedResponse<IEmployeeType>> => {
	try {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (search) {
			params.append("search", search);
		}
		ordering && params.append("ordering", ordering);
		const response = await apiRequest.get(
			`employee/employee-types/${institutionId}/?${params.toString()}`,
		);

		return response.data as IPaginatedResponse<IEmployeeType>;
	} catch (error) {
		throw error;
	}
};

export const getPaginatedEmployeeTypesFromUrl = async ({ url }: { url: string }) => {
	const response = await apiRequest.get(forceUrlToHttps(url));

	return response.data as IPaginatedResponse<IEmployeeType>;
};

export const updateEmployeeType = async ({
	employeeTypeId,
	employeeTypeData,
}: {
	institutionId: number;
	employeeTypeId: number;
	employeeTypeData: Partial<Omit<IEmployeeType, "id" | "created_at" | "updated_at">>;
}): Promise<IEmployeeType> => {
	try {
		const response = await apiRequest.patch(
			`employee/employee-types/detail/${employeeTypeId}/`,
			employeeTypeData,
		);

		return response.data as IEmployeeType;
	} catch (error) {
		throw error;
	}
};

export const deleteEmployeeType = async ({
	employeeTypeId,
}: {
	institutionId: number;
	employeeTypeId: number;
}): Promise<void> => {
	try {
		await apiRequest.delete(`employee/employee-types/detail/${employeeTypeId}/`);
	} catch (error) {
		throw error;
	}
};

export const attachEmployeeToBranches = async (
	payload: AttachBranchesPayload,
): Promise<EmployeeBranchSummary | null> => {
	try {
		const response = await apiRequest.post("branches/attach/", payload);

		return response.data.data as EmployeeBranchSummary;
	} catch (error) {
		// console.error("Error attaching employee to branches:", error);
		throw error;
	}
};

export const getEmployeeBranches = async (
	employeeId: number,
): Promise<EmployeeBranchSummary | null> => {
	try {
		const response = await apiRequest.get(`${employeeId}/branches/`);

		return response.data.data as EmployeeBranchSummary;
	} catch (error) {
		// console.error("Error fetching branches for employee:", error);
		throw error;
	}
};

export const setDefaultBranch = async (
	employeeId: number,
	data: SetDefaultBranchPayload,
): Promise<EmployeeBranchSummary | null> => {
	try {
		const response = await apiRequest.patch(`${employeeId}/branches/`, data);

		return response.data.data as EmployeeBranchSummary;
	} catch (error) {
		// console.error("Error setting default branch:", error);
		throw error;
	}
};

export const createDisciplinaryAction = async ({
	disciplinaryActionData,
}: {
	disciplinaryActionData: DisciplinaryActionForm;
}): Promise<DisciplinaryActionResponse | null> => {
	try {
		const apiData = convertFormToApiRequest(disciplinaryActionData);
		const response = await apiRequest.post(`discipline/disciplinary-actions/`, apiData);

		return response.data as DisciplinaryActionResponse;
	} catch (error: any) {
		if (error.response?.status === 400) {
			const errorData = error.response.data;

			if (typeof errorData === "object" && errorData !== null) {
				const errorMessages = Object.entries(errorData)
					.map(
						([field, messages]) =>
							`${field}: ${Array.isArray(messages) ? messages.join(", ") : messages}`,
					)
					.join("; ");

				throw new Error(`Validation errors: ${errorMessages}`);
			}
		}
		throw error;
	}
};

export const createDisciplineType = async ({
	disciplineTypeData,
}: {
	disciplineTypeData: IDisciplineTypeFormData;
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
			formData,
		);

		return response.data as DisciplineTypeResponse;
	} catch (error: any) {
		// console.error("Failed to create discipline type:", error);

		if (error.response?.status === 400) {
			const errorData = error.response.data;

			if (errorData?.name && errorData.name.includes("already exists")) {
				throw new Error("A discipline type with this name already exists");
			}
		}

		throw error;
	}
};

export const deleteDisciplinaryAction = async (id: number | string): Promise<boolean> => {
	try {
		const response = await apiRequest.delete(`discipline/disciplinary-actions/${id}/`);

		return response.status === 200 || response.status === 204;
	} catch (error) {
		// console.error("Failed to delete disciplinary action:", error);
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
			`discipline/discipline-types/?institution=${institutionId}`,
		);

		const data = response.data as IPaginatedResponse<DisciplineTypeResponse>;

		// Return the results array instead of the entire response
		return data.results;
	} catch (error) {
		throw error;
	}
};

export const getDisciplinaryActions = async ({
	institutionId,
	page = 1,
	search,
	employeeId,
	ordering,
}: {
	institutionId?: number;
	page?: number;
	search?: string;
	employeeId?: string;
	ordering?: string;
}): Promise<IPaginatedResponse<IDisciplinaryAction>> => {
	try {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (search) {
			params.append("search", search);
		}
		if (employeeId) {
			params.append("employee_id", employeeId);
		}
		ordering && params.append("ordering", ordering);
		const response = await apiRequest.get(
			`discipline/disciplinary-actions/?institution=${institutionId}&${params.toString()}`,
		);

		return response.data as IPaginatedResponse<IDisciplinaryAction>;
	} catch (error) {
		throw error;
	}
};

export const getPaginatedDisciplinaryActionsFromUrl = async ({ url }: { url: string }) => {
	const response = await apiRequest.get(forceUrlToHttps(url));

	return response.data as IPaginatedResponse<IDisciplinaryAction>;
};

export const updateDisciplinaryAction = async ({
	disciplinaryActionId,
	disciplinaryActionData,
}: {
	disciplinaryActionId: number | string;
	disciplinaryActionData: Partial<DisciplinaryActionRequest> | DisciplinaryActionForm;
}): Promise<IDisciplinaryAction | null> => {
	try {
		const dataToSend =
			"discipline_type" in disciplinaryActionData &&
			typeof disciplinaryActionData.discipline_type === "string"
				? convertFormToApiRequest(disciplinaryActionData as DisciplinaryActionForm)
				: disciplinaryActionData;

		const response = await apiRequest.patch(
			`discipline/disciplinary-actions/${disciplinaryActionId}/`,
			dataToSend,
		);

		return response.data as IDisciplinaryAction;
	} catch (error) {
		// console.error("Failed to update disciplinary action:", error);
		throw error;
	}
};

export const getDisciplinaryActionById = async (
	disciplinaryActionId: number | string,
): Promise<IDisciplinaryAction | null> => {
	try {
		const response = await apiRequest.get(
			`discipline/disciplinary-actions/${disciplinaryActionId}/`,
		);

		return response.data as IDisciplinaryAction;
	} catch (error) {
		// console.error("Failed to retrieve disciplinary action:", error);
		throw error;
	}
};

// Leave Types API Namespace
export const LeaveTypesAPI = {
	getAll: async ({
		institutionId,
		searchParams,
	}: {
		institutionId: number;
		searchParams?: URLSearchParams;
	}): Promise<IPaginatedResponse<ILeaveType>> => {
		try {
			const response = await apiRequest.get(
				`leave-mgt/${institutionId}/leave-types/?${searchParams}`,
			);

			return response.data as IPaginatedResponse<ILeaveType>;
		} catch (error) {
			throw error;
		}
	},

	getPaginated: async ({
		institutionId,
		page = 1,
		search,
		status,
		category,
		ordering,
	}: {
		institutionId: number;
		page?: number;
		search?: string;
		status?: string;
		category?: string;
		ordering?: string;
	}): Promise<IPaginatedResponse<ILeaveType>> => {
		try {
			const params = new URLSearchParams({
				page: page.toString(),
			});

			if (search) {
				params.append("search", search);
			}

			if (status && status !== "all") {
				params.append("is_active", status === "active" ? "true" : "false");
			}
			ordering && params.append("ordering", ordering);

			if (category && category !== "all") {
				params.append("category", category);
			}

			const endpoint = `leave-mgt/${institutionId}/leave-types/?${params.toString()}`;
			const response = await apiRequest.get(endpoint);

			return response.data as IPaginatedResponse<ILeaveType>;
		} catch (error) {
			console.error("Error fetching paginated leave types:", error);
			throw error;
		}
	},

	getPaginatedFromUrl: async ({
		url,
	}: {
		url: string;
	}): Promise<IPaginatedResponse<ILeaveType>> => {
		try {
			const response = await apiRequest.get(forceUrlToHttps(url));

			return response.data as IPaginatedResponse<ILeaveType>;
		} catch (error) {
			console.error("Error fetching leave types from URL:", error);
			throw error;
		}
	},

	getById: async (leaveTypeId: number): Promise<ILeaveType | null> => {
		try {
			const response = await apiRequest.get(`leave-mgt/leave-types/${leaveTypeId}/`);

			return response.data as ILeaveType;
		} catch (error) {
			throw error;
		}
	},

	create: async ({
		institutionId,
		leaveTypeData,
	}: {
		institutionId: number;
		leaveTypeData: ILeaveTypeFormData;
	}): Promise<ILeaveType | null> => {
		try {
			const formData = new FormData();

			// Add institution to the form data
			formData.append("institution", institutionId.toString());

			Object.entries(leaveTypeData).forEach(([key, value]) => {
				if (value !== null && value !== undefined) {
					formData.append(key, value.toString());
				}
			});

			const response = await apiRequest.post(`leave-mgt/${institutionId}/leave-types/`, formData);

			return response.data as ILeaveType;
		} catch (error) {
			throw error;
		}
	},

	update: async ({
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

			const response = await apiRequest.patch(`leave-mgt/leave-types/${leaveTypeId}/`, formData);

			return response.data as ILeaveType;
		} catch (error) {
			throw error;
		}
	},

	delete: async (leaveTypeId: string | number): Promise<boolean> => {
		try {
			const response = await apiRequest.delete(`leave-mgt/leave-types/${leaveTypeId}/`);

			// Check if deletion was successful (status 200, 201, 204, etc.)
			if (response.status >= 200 && response.status < 300) {
				return true;
			}

			return false;
		} catch (error) {
			return false;
		}
	},
};

// Legacy function for backward compatibility
export const getLeaveTypes = async ({
	institutionId,
}: {
	institutionId: number;
}): Promise<ILeaveType[]> => {
	try {
		const response = await apiRequest.get(`leave-mgt/${institutionId}/leave-types/?is_active=true`);

		return (response.data as IPaginatedResponse<ILeaveType>).results;
	} catch (error) {
		// console.error("Failed to fetch leave types:", error);
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
		formData.append("institution", institutionId.toString());

		Object.entries(leaveTypeData).forEach(([key, value]) => {
			if (value !== null && value !== undefined) {
				formData.append(key, value.toString());
			}
		});

		const response = await apiRequest.post(`leave-mgt/${institutionId}/leave-types/`, formData);

		return response.data as ILeaveType;
	} catch (error) {
		// console.error("Failed to create leave type:", error);
		throw error;
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

		const response = await apiRequest.patch(`leave-mgt/leave-types/${leaveTypeId}/`, formData);

		return response.data as ILeaveType;
	} catch (error) {
		// console.error("Failed to update leave type:", error);
		throw error;
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
		// console.error("Failed to delete leave type:", error);
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
		formData.append("institution", institutionId.toString());

		Object.entries(leavePolicyData).forEach(([key, value]) => {
			if (value !== null && value !== undefined) {
				formData.append(key, value.toString());
			}
		});

		const response = await apiRequest.post(`leave-mgt/${institutionId}/leave-policies/`, formData);

		return response.data as ILeavePolicy;
	} catch (error) {
		// console.error("Failed to create leave policy:", error);
		throw error;
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
		// console.error("Failed to fetch leave policies:", error);
		return [];
	}
};

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

		const response = await apiRequest.patch(`leave-mgt/leave-policies/${leavePolicyId}/`, formData);

		return response.data as ILeavePolicy;
	} catch (error) {
		// console.error("Failed to update leave policy:", error);
		throw error;
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
		// console.error("Failed to delete leave policy:", error);
		return false;
	}
};

// Leave Policies API Namespace
export const LeavePoliciesAPI = {
	getAll: async ({ institutionId }: { institutionId: number }): Promise<ILeavePolicy[]> => {
		return getLeavePolicies({ institutionId });
	},

	getPaginated: async ({
		institutionId,
		page = 1,
		search,
		ordering,
	}: {
		institutionId: number;
		page?: number;
		search?: string;
		ordering?: string;
	}): Promise<IPaginatedResponse<ILeavePolicy>> => {
		try {
			const params = new URLSearchParams({
				page: page.toString(),
			});

			if (search) {
				params.append("search", search);
			}
			ordering && params.append("ordering", ordering);
			const response = await apiRequest.get(
				`leave-mgt/${institutionId}/leave-policies/?${params.toString()}`,
			);

			return response.data as IPaginatedResponse<ILeavePolicy>;
		} catch (error) {
			console.error("Error fetching paginated leave policies:", error);
			throw error;
		}
	},

	getPaginatedFromUrl: async ({
		url,
	}: {
		url: string;
	}): Promise<IPaginatedResponse<ILeavePolicy>> => {
		try {
			const response = await apiRequest.get(forceUrlToHttps(url));

			return response.data as IPaginatedResponse<ILeavePolicy>;
		} catch (error) {
			console.error("Error fetching leave policies from URL:", error);
			throw error;
		}
	},

	getById: async (policyId: number): Promise<ILeavePolicy | null> => {
		try {
			const response = await apiRequest.get(`leave-mgt/leave-policies/${policyId}/`);

			return response.data as ILeavePolicy;
		} catch (error) {
			return null;
		}
	},

	create: async ({
		institutionId,
		leavePolicyData,
	}: {
		institutionId: number;
		leavePolicyData: ILeavePolicyFormData;
	}): Promise<ILeavePolicy | null> => {
		return createLeavePolicy({ institutionId, leavePolicyData });
	},

	update: async ({
		leavePolicyId,
		leavePolicyData,
	}: {
		leavePolicyId: string | number;
		leavePolicyData: ILeavePolicyFormData;
	}): Promise<ILeavePolicy | null> => {
		return updateLeavePolicy({ leavePolicyId, leavePolicyData });
	},

	delete: async (leavePolicyId: string | number): Promise<boolean> => {
		return deleteLeavePolicy({ leavePolicyId });
	},
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
		formData.append("institution", institutionId.toString());

		Object.entries(leaveApplicationData).forEach(([key, value]) => {
			if (key === "supporting_document" && value instanceof File) {
				formData.append(key, value);
			} else if (value !== undefined && value !== null && value !== "") {
				formData.append(key, value.toString());
			}
		});

		const response = await apiRequest.post(
			`leave-mgt/${institutionId}/leave-applications/`,
			formData,
		);

		return response.data;
	} catch (error: any) {
		throw error;
	}
};

export const getLeaveApplications = async ({
	institutionId,
	employeeId,
}: {
	institutionId: number;
	employeeId?: string;
}): Promise<ILeaveRequest[]> => {
	try {
		let endpoint = `leave-mgt/${institutionId}/leave-applications/`;

		if (employeeId) {
			endpoint += `?employee_id=${employeeId}`;
		}

		const response = await apiRequest.get(endpoint);

		return (response.data as IPaginatedResponse<ILeaveRequest>).results;
	} catch (error) {
		throw error;
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
			`leave-mgt/${institutionId}/leave-applications/${leaveApplicationId}/`,
		);

		return response.data as ILeaveRequest;
	} catch (error) {
		// console.error("Failed to fetch leave application:", error);
		throw error;
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

		const response = await apiRequest.patch(
			`/leave-mgt/leave-applications/${leaveApplicationId}/`,
			formData,
		);

		return response.data;
	} catch (error: any) {
		throw new Error(
			error.response?.data?.detail ||
				error.response?.data?.message ||
				error.message ||
				"Failed to update leave application",
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
		await apiRequest.delete(`leave-mgt/leave-applications/${leaveApplicationId}/`);

		return true;
	} catch (error) {
		// console.error("Failed to delete leave application:", error);
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
	action: "approve" | "reject";
	rejectionReason?: string;
	approvedBy?: number;
}): Promise<ILeaveRequest | null> => {
	try {
		const formData = new FormData();

		formData.append("action", action);

		if (action === "reject" && rejectionReason) {
			formData.append("rejection_reason", rejectionReason);
		}

		if (approvedBy) {
			formData.append("approved_by", approvedBy.toString());
		}

		const response = await apiRequest.post(
			`leave-mgt/leave-applications/${leaveApplicationId}/approval/`,
			formData,
		);

		return response.data as ILeaveRequest;
	} catch (error) {
		// console.error("Failed to approve/reject leave application:", error);
		throw error;
	}
};

export const getLeaveApplicationsByEmployee = async ({
	employeeId,
}: {
	employeeId: number;
}): Promise<ILeaveRequest[]> => {
	try {
		const response = await apiRequest.get(`leave-mgt/leave-applications/?employee=${employeeId}/`);

		return Array.isArray(response.data) ? response.data : response.data.results || [];
	} catch (error) {
		// console.error("Failed to fetch employee leave applications:", error);
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
		const response = await apiRequest.get(`leave-mgt/leave-applications/?status=${status}`);

		return Array.isArray(response.data) ? response.data : response.data.results || [];
	} catch (error) {
		// console.error("Failed to fetch leave applications by status:", error);
		return [];
	}
};

export const getPendingLeaveApplications = async (
	institutionId: number,
): Promise<ILeaveRequest[]> => {
	return getLeaveApplicationsByStatus({ status: "pending", institutionId });
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
		leaveApplicationData: { status: "cancelled" },
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
		let queryString = "";

		if (filters) {
			const queryParams: string[] = [];

			Object.entries(filters).forEach(([key, value]) => {
				if (value !== null && value !== undefined) {
					queryParams.push(`${key}=${value}`);
				}
			});
			if (queryParams.length > 0) {
				queryString = `?${queryParams.join("&")}`;
			}
		}

		const response = await apiRequest.get(`leave-mgt/leave-applications/${queryString}`);

		return Array.isArray(response.data) ? response.data : response.data.results || [];
	} catch (error) {
		// console.error("Failed to fetch filtered leave applications:", error);
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
	action: "approve" | "reject";
	rejectionReason?: string;
	approvedBy?: number;
}): Promise<(ILeaveRequest | null)[]> => {
	try {
		const promises = leaveApplicationIds.map((id) =>
			approveRejectLeaveApplication({
				leaveApplicationId: id,
				institutionId,
				action,
				rejectionReason,
				approvedBy,
			}),
		);

		const results = await Promise.allSettled(promises);

		return results.map((result) => (result.status === "fulfilled" ? result.value : null));
	} catch (error) {
		// console.error("Failed to bulk process leave applications:", error);
		return [];
	}
};

// Leave Applications API Namespace
export const LeaveApplicationsAPI = {
	getAll: async ({
		institutionId,
		employeeId,
	}: {
		institutionId: number;
		employeeId?: string;
	}): Promise<ILeaveRequest[]> => {
		return getLeaveApplications({ institutionId, employeeId });
	},

	getPaginated: async ({
		institutionId,
		page = 1,
		search,
		status,
		leaveType,
		ordering,
	}: {
		institutionId: number;
		page?: number;
		search?: string;
		status?: string;
		leaveType?: string;
		ordering?: string;
	}): Promise<IPaginatedResponse<ILeaveRequest>> => {
		try {
			const params = new URLSearchParams({
				page: page.toString(),
			});

			if (search) {
				params.append("search", search);
			}
			if (status && status !== "all") {
				params.append("status", status);
			}
			if (leaveType && leaveType !== "all") {
				params.append("leave_type_id", leaveType);
			}
			ordering && params.append("ordering", ordering);
			const response = await apiRequest.get(
				`leave-mgt/${institutionId}/leave-applications/?${params.toString()}`,
			);

			return response.data as IPaginatedResponse<ILeaveRequest>;
		} catch (error) {
			console.error("Error fetching paginated leave applications:", error);
			throw error;
		}
	},

	getPaginatedFromUrl: async ({
		url,
	}: {
		url: string;
	}): Promise<IPaginatedResponse<ILeaveRequest>> => {
		try {
			const response = await apiRequest.get(forceUrlToHttps(url));

			return response.data as IPaginatedResponse<ILeaveRequest>;
		} catch (error) {
			console.error("Error fetching leave applications from URL:", error);
			throw error;
		}
	},

	getById: async (applicationId: number): Promise<ILeaveRequest | null> => {
		try {
			const response = await apiRequest.get(`leave-mgt/leave-applications/${applicationId}/`);

			return response.data as ILeaveRequest;
		} catch (error) {
			return null;
		}
	},

	create: async ({
		institutionId,
		leaveApplicationData,
	}: {
		institutionId: number;
		leaveApplicationData: ILeaveRequestFormData;
	}): Promise<ILeaveRequest | null> => {
		return createLeaveApplication({ institutionId, leaveApplicationData });
	},

	update: async ({
		leaveApplicationId,
		leaveApplicationData,
	}: {
		leaveApplicationId: number | string;
		leaveApplicationData: Partial<ILeaveRequestFormData>;
	}): Promise<ILeaveRequest | null> => {
		return updateLeaveApplication({ leaveApplicationId, leaveApplicationData });
	},

	delete: async (applicationId: number | string): Promise<boolean> => {
		try {
			const response = await apiRequest.delete(`leave-mgt/leave-applications/${applicationId}/`);

			return response.status === 204;
		} catch (error) {
			return false;
		}
	},

	approve: async ({
		leaveApplicationId,
		institutionId,
		rejectionReason,
	}: {
		leaveApplicationId: number | string;
		institutionId: number;
		rejectionReason?: string;
	}): Promise<ILeaveRequest | null> => {
		return approveRejectLeaveApplication({
			leaveApplicationId,
			institutionId,
			action: "approve",
			rejectionReason,
		});
	},

	reject: async ({
		leaveApplicationId,
		institutionId,
		rejectionReason,
	}: {
		leaveApplicationId: number | string;
		institutionId: number;
		rejectionReason?: string;
	}): Promise<ILeaveRequest | null> => {
		return approveRejectLeaveApplication({
			leaveApplicationId,
			institutionId,
			action: "reject",
			rejectionReason,
		});
	},
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

		formData.append("institution", institutionId.toString());

		const response = await apiRequest.post(`payroll/${institutionId}/allowance-types/`, formData);

		return response.data as IAllowanceType;
	} catch (error) {
		// console.error("Failed to create allowance type:", error);
		throw error;
	}
};

export const getAllowanceTypes = async (institutionId: number) => {
	try {
		const response = await apiRequest.get(`payroll/${institutionId}/allowance-types/`);
		const data = response.data as IPaginatedResponse<IAllowanceType>;

		// Return the results array instead of the entire response
		return data.results;
	} catch (error) {
		// console.error("Failed to get allowance types:", error);
		throw error;
	}
};

export const getPaginatedAllowanceTypes = async ({
	institutionId,
	page = 1,
	search,
	status,
	ordering,
}: {
	institutionId: number;
	page?: number;
	search?: string;
	status?: string;
	ordering?: string;
}): Promise<IPaginatedResponse<IAllowanceType>> => {
	try {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (search) {
			params.append("search", search);
		}
		if (status && status !== "all") {
			params.append("is_active", status === "active" ? "true" : "false");
		}
		ordering && params.append("ordering", ordering);
		const endpoint = `payroll/${institutionId}/allowance-types/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);

		return response.data as IPaginatedResponse<IAllowanceType>;
	} catch (error) {
		console.error("Error fetching paginated allowance types:", error);
		throw error;
	}
};

export const getPaginatedAllowanceTypesFromUrl = async ({
	url,
}: {
	url: string;
}): Promise<IPaginatedResponse<IAllowanceType>> => {
	try {
		const response = await apiRequest.get(forceUrlToHttps(url));

		return response.data as IPaginatedResponse<IAllowanceType>;
	} catch (error) {
		console.error("Error fetching allowance types from URL:", error);
		throw error;
	}
};

export const getAllLeaveBalances = async ({
	institutionId,
	employeeId,
}: {
	institutionId: number;
	employeeId?: string;
}) => {
	try {
		let endpoint = `leave-mgt/${institutionId}/leave-balances/`;

		if (employeeId) {
			endpoint += `?employee_id=${employeeId}`;
		}

		const response = await apiRequest.get(endpoint);
		const data = response.data as IPaginatedResponse<ILeaveBalance>;

		return data.results;
	} catch (error) {
		throw error;
	}
};

export const getPaginatedLeaveBalances = async ({
	institutionId,
	employeeId,
	page = 1,
	search,
	ordering,
}: {
	institutionId: number;
	employeeId?: string;
	page?: number;
	search?: string;
	ordering?: string;
}) => {
	const params = new URLSearchParams({
		page: page.toString(),
	});

	ordering && params.append("ordering", ordering);
	if (search) {
		params.append("search", search);
	}

	if (employeeId) {
		params.append("employee_id", employeeId);
	}

	const response = await apiRequest.get(
		`leave-mgt/${institutionId}/leave-balances/?${params.toString()}`,
	);

	return response.data as IPaginatedResponse<ILeaveBalance>;
};

export const getPaginatedLeaveBalancesFromUrl = async ({ url }: { url: string }) => {
	const response = await apiRequest.get(forceUrlToHttps(url));

	return response.data as IPaginatedResponse<ILeaveBalance>;
};

export const createLeaveBalance = async ({
	institutionId,
	leaveBalanceData,
}: {
	institutionId: number;
	leaveBalanceData: Partial<ILeaveBalance>;
}) => {
	try {
		const endpoint = `leave-mgt/${institutionId}/leave-balances/`;
		const response = await apiRequest.post(endpoint, leaveBalanceData);

		return response.data as ILeaveBalance;
	} catch (error) {
		throw error;
	}
};

// Get a specific leave balance by ID
export const getLeaveBalanceById = async ({ id }: { id: number }) => {
	try {
		const endpoint = `leave-mgt/leave-balances/${id}/`;
		const response = await apiRequest.get(endpoint);

		return response.data as ILeaveBalance;
	} catch (error) {
		throw error;
	}
};

// Update a leave balance by ID
export const updateLeaveBalance = async ({
	id,
	leaveBalanceData,
}: {
	id: number;
	leaveBalanceData: Partial<ILeaveBalance>;
}) => {
	try {
		const endpoint = `leave-mgt/leave-balances/${id}/`;
		const response = await apiRequest.patch(endpoint, leaveBalanceData);

		return response.data as ILeaveBalance;
	} catch (error) {
		throw error;
	}
};

// Delete a leave balance by ID
export const deleteLeaveBalance = async ({ id }: { id: number }) => {
	try {
		const endpoint = `leave-mgt/leave-balances/${id}/`;

		await apiRequest.delete(endpoint);
	} catch (error) {
		throw error;
	}
};

// Leave Balances API Namespace
export const LeaveBalancesAPI = {
	getAll: async ({
		institutionId,
		employeeId,
	}: {
		institutionId: number;
		employeeId?: string;
	}): Promise<ILeaveBalance[]> => {
		return getAllLeaveBalances({ institutionId, employeeId });
	},

	getPaginated: async ({
		institutionId,
		page = 1,
		search,
		ordering,
	}: {
		institutionId: number;
		page?: number;
		search?: string;
		ordering?: string;
	}): Promise<IPaginatedResponse<ILeaveBalance>> => {
		try {
			const params = new URLSearchParams({
				page: page.toString(),
			});

			ordering && params.append("ordering", ordering);
			if (search) {
				params.append("search", search);
			}

			const response = await apiRequest.get(
				`leave-mgt/${institutionId}/leave-balances/?${params.toString()}`,
			);

			return response.data as IPaginatedResponse<ILeaveBalance>;
		} catch (error) {
			console.error("Error fetching paginated leave balances:", error);
			throw error;
		}
	},

	getPaginatedFromUrl: async ({
		url,
	}: {
		url: string;
	}): Promise<IPaginatedResponse<ILeaveBalance>> => {
		try {
			const response = await apiRequest.get(forceUrlToHttps(url));

			return response.data as IPaginatedResponse<ILeaveBalance>;
		} catch (error) {
			console.error("Error fetching leave balances from URL:", error);
			throw error;
		}
	},

	getById: async (balanceId: number): Promise<ILeaveBalance | null> => {
		try {
			const response = await apiRequest.get(`leave-mgt/leave-balances/${balanceId}/`);

			return response.data as ILeaveBalance;
		} catch (error) {
			return null;
		}
	},

	create: async ({
		institutionId,
		leaveBalanceData,
	}: {
		institutionId: number;
		leaveBalanceData: Partial<ILeaveBalance>;
	}): Promise<ILeaveBalance | null> => {
		return createLeaveBalance({ institutionId, leaveBalanceData });
	},

	update: async ({
		balanceId,
		leaveBalanceData,
	}: {
		balanceId: number;
		leaveBalanceData: Partial<ILeaveBalance>;
	}): Promise<ILeaveBalance | null> => {
		return updateLeaveBalance({ id: balanceId, leaveBalanceData });
	},

	delete: async (balanceId: number): Promise<boolean> => {
		try {
			await deleteLeaveBalance({ id: balanceId });

			return true;
		} catch (error) {
			return false;
		}
	},
};

export const getAllowanceType = async (id: number): Promise<IAllowanceType | null> => {
	try {
		const response = await apiRequest.get(`payroll/allowance-types/${id}/`);

		return response.data as IAllowanceType;
	} catch (error) {
		// console.error("Failed to get allowance type:", error);
		throw error;
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

		const response = await apiRequest.patch(`payroll/allowance-types/${id}/`, formData);

		return response.data as IAllowanceType;
	} catch (error) {
		// console.error("Failed to update allowance type:", error);
		throw error;
	}
};

export const deleteAllowanceType = async (id: number): Promise<boolean> => {
	try {
		await apiRequest.delete(`payroll/allowance-types/${id}/`);

		return true;
	} catch (error) {
		// console.error("Failed to delete allowance type:", error);
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

		formData.append("institution", institutionId.toString());

		const response = await apiRequest.post(`payroll/${institutionId}/deduction-types/`, formData);

		return response.data as IDeductionType;
	} catch (error) {
		// console.error("Failed to create deduction type:", error);
		throw error;
	}
};

export const getDeductionTypes = async (institutionId: number) => {
	try {
		const response = await apiRequest.get(`payroll/${institutionId}/deduction-types/`);
		const data = response.data as IPaginatedResponse<IDeductionType>;

		// Return the results array instead of the entire response
		return data.results;
	} catch (error) {
		throw error;
	}
};

export const getPaginatedDeductionTypes = async ({
	institutionId,
	page = 1,
	search,
	status,
	ordering,
}: {
	institutionId: number;
	page?: number;
	search?: string;
	status?: string;
	ordering?: string;
}): Promise<IPaginatedResponse<IDeductionType>> => {
	try {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		ordering && params.append("ordering", ordering);
		if (search) {
			params.append("search", search);
		}
		if (status && status !== "all") {
			params.append("is_active", status === "active" ? "true" : "false");
		}

		const endpoint = `payroll/${institutionId}/deduction-types/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);

		return response.data as IPaginatedResponse<IDeductionType>;
	} catch (error) {
		console.error("Error fetching paginated deduction types:", error);
		throw error;
	}
};

export const getPaginatedDeductionTypesFromUrl = async ({
	url,
}: {
	url: string;
}): Promise<IPaginatedResponse<IDeductionType>> => {
	try {
		const response = await apiRequest.get(forceUrlToHttps(url));

		return response.data as IPaginatedResponse<IDeductionType>;
	} catch (error) {
		console.error("Error fetching deduction types from URL:", error);
		throw error;
	}
};

export const getDeductionType = async (id: number): Promise<IDeductionType | null> => {
	try {
		const response = await apiRequest.get(`payroll/deduction-types/${id}/`);

		return response.data as IDeductionType;
	} catch (error) {
		// console.error("Failed to get deduction type:", error);
		throw error;
	}
};

export const updateDeductionType = async ({
	id,
	deductionTypeData,
}: {
	id: number;
	deductionTypeData: Partial<IDeductionTypeFormData>;
}) => {
	try {
		const formData = new FormData();

		Object.entries(deductionTypeData).forEach(([key, value]) => {
			if (value !== null && value !== undefined) {
				formData.append(key, value.toString());
			}
		});

		const response = await apiRequest.patch(`payroll/deduction-types/${id}/`, formData);

		return response.data as IDeductionType;
	} catch (error) {
		throw error;
	}
};

export const deleteDeductionType = async (id: number): Promise<boolean> => {
	try {
		await apiRequest.delete(`payroll/deduction-types/${id}/`);

		return true;
	} catch (error) {
		// console.error("Failed to delete deduction type:", error);
		return false;
	}
};

export const createEmployeeAllowance = async ({
	institutionId,
	employeeAllowanceData,
}: {
	institutionId: number;
	employeeAllowanceData: Partial<IEmployeeAllowanceFormData>;
}): Promise<IEmployeeAllowance | null> => {
	try {
		const response = await apiRequest.post(
			`payroll/${institutionId}/employee-allowances/`,
			employeeAllowanceData,
		);

		return response.data as IEmployeeAllowance;
	} catch (error) {
		// console.error("Failed to create employee allowance:", error);
		throw error;
	}
};

export const getEmployeeAllowances = async (institutionId: number) => {
	try {
		const response = await apiRequest.get(`payroll/${institutionId}/employee-allowances/`);

		return response.data.results as IEmployeeAllowance[];
	} catch (error) {
		// console.error("Failed to get employee allowances:", error);
		throw error;
	}
};

export const getPaginatedEmployeeAllowances = async ({
	institutionId,
	page = 1,
	search,
	status,
	method,
	ordering,
}: {
	institutionId: number;
	page?: number;
	search?: string;
	status?: string;
	method?: string;
	ordering?: string;
}): Promise<IPaginatedResponse<IEmployeeAllowance>> => {
	try {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (search) {
			params.append("search", search);
		}
		if (status && status !== "all") {
			params.append("is_active", status === "active" ? "true" : "false");
		}
		if (method && method !== "all") {
			params.append("calculation_method", method);
		}
		ordering && params.append("ordering", ordering);
		const endpoint = `payroll/${institutionId}/employee-allowances/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);

		return response.data as IPaginatedResponse<IEmployeeAllowance>;
	} catch (error) {
		console.error("Error fetching paginated employee allowances:", error);
		throw error;
	}
};

export const getPaginatedEmployeeAllowancesFromUrl = async ({
	url,
}: {
	url: string;
}): Promise<IPaginatedResponse<IEmployeeAllowance>> => {
	try {
		const response = await apiRequest.get(forceUrlToHttps(url));

		return response.data as IPaginatedResponse<IEmployeeAllowance>;
	} catch (error) {
		console.error("Error fetching employee allowances from URL:", error);
		throw error;
	}
};

export const getEmployeeAllowance = async (id: number): Promise<IEmployeeAllowance | null> => {
	try {
		const response = await apiRequest.get(`payroll/employee-allowances/${id}/`);

		return response.data.results as IEmployeeAllowance;
	} catch (error) {
		// console.error("Failed to get employee allowance:", error);
		throw error;
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

		const response = await apiRequest.patch(`payroll/employee-allowances/${id}/`, formData);

		return response.data as IEmployeeAllowance;
	} catch (error) {
		// console.error("Failed to update employee allowance:", error);
		throw error;
	}
};

export const deleteEmployeeAllowance = async (id: number): Promise<boolean> => {
	try {
		await apiRequest.delete(`payroll/employee-allowances/${id}/`);

		return true;
	} catch (error) {
		// console.error("Failed to delete employee allowance:", error);
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
			`payroll/${institutionId}/employee-allowances/?employee=${employeeId}`,
		);

		return response.data as IEmployeeAllowance[];
	} catch (error) {
		// console.error("Failed to get employee allowances by employee:", error);
		throw error;
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
			`payroll/${institutionId}/employee-allowances/?allowance_type=${allowanceTypeId}`,
		);

		return response.data as IEmployeeAllowance[];
	} catch (error) {
		// console.error("Failed to get employee allowances by type:", error);
		throw error;
	}
};

export const getActiveEmployeeAllowances = async (
	institutionId: number,
): Promise<IEmployeeAllowance[] | null> => {
	try {
		const response = await apiRequest.get(
			`payroll/${institutionId}/employee-allowances/?is_active=true`,
		);

		return response.data as IEmployeeAllowance[];
	} catch (error) {
		// console.error("Failed to get active employee allowances:", error);
		throw error;
	}
};

export const createEmployeeDeduction = async ({
	institutionId,
	employeeDeductionData,
}: {
	institutionId: number;
	employeeDeductionData: Partial<IEmployeeDeductionFormData>;
}) => {
	try {
		const response = await apiRequest.post(
			`payroll/${institutionId}/employee-deductions/`,
			employeeDeductionData,
		);

		return response.data as IEmployeeDeduction;
	} catch (error) {
		// console.error("Failed to create employee deduction:", error);
		throw error;
	}
};

export const getEmployeeDeductions = async (institutionId: number) => {
	try {
		const response = await apiRequest.get(`payroll/${institutionId}/employee-deductions/`);

		return response.data.results as IEmployeeDeduction[];
	} catch (error) {
		// console.error("Failed to get employee deductions:", error);
		throw error;
	}
};

export const getPaginatedEmployeeDeductions = async ({
	institutionId,
	page = 1,
	search,
	status,
	method,
	ordering,
}: {
	institutionId: number;
	page?: number;
	search?: string;
	status?: string;
	method?: string;
	ordering?: string;
}): Promise<IPaginatedResponse<IEmployeeDeduction>> => {
	try {
		const params = new URLSearchParams({ page: page.toString() });

		if (search) {
			params.append("search", search);
		}
		if (status && status !== "all") {
			params.append("is_active", status === "active" ? "true" : "false");
		}
		if (method && method !== "all") {
			params.append("calculation_method", method);
		}
		ordering && params.append("ordering", ordering);
		const endpoint = `payroll/${institutionId}/employee-deductions/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);

		return response.data as IPaginatedResponse<IEmployeeDeduction>;
	} catch (error) {
		console.error("Error fetching paginated employee deductions:", error);
		throw error;
	}
};

export const getPaginatedEmployeeDeductionsFromUrl = async ({
	url,
}: {
	url: string;
}): Promise<IPaginatedResponse<IEmployeeDeduction>> => {
	try {
		const response = await apiRequest.get(forceUrlToHttps(url));

		return response.data as IPaginatedResponse<IEmployeeDeduction>;
	} catch (error) {
		console.error("Error fetching employee deductions from URL:", error);
		throw error;
	}
};

export const getEmployeeDeduction = async (id: number): Promise<IEmployeeDeduction | null> => {
	try {
		const response = await apiRequest.get(`payroll/employee-deductions/${id}/`);

		return response.data as IEmployeeDeduction;
	} catch (error) {
		// console.error("Failed to get employee deduction:", error);
		throw error;
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

		const response = await apiRequest.patch(`payroll/employee-deductions/${id}/`, formData);

		return response.data as IEmployeeDeduction;
	} catch (error) {
		// console.error("Failed to update employee deduction:", error);
		throw error;
	}
};

export const deleteEmployeeDeduction = async (id: number): Promise<boolean> => {
	try {
		await apiRequest.delete(`payroll/employee-deductions/${id}/`);

		return true;
	} catch (error) {
		// console.error("Failed to delete employee deduction:", error);
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
			`payroll/${institutionId}/employee-deductions/?employee=${employeeId}`,
		);

		return response.data as IEmployeeDeduction[];
	} catch (error) {
		// console.error("Failed to get employee deductions by employee:", error);
		throw error;
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
			`payroll/${institutionId}/employee-deductions/?deduction_type=${deductionTypeId}`,
		);

		return response.data as IEmployeeDeduction[];
	} catch (error) {
		// console.error("Failed to get employee deductions by type:", error);
		throw error;
	}
};

export const getActiveEmployeeDeductions = async (
	institutionId: number,
): Promise<IEmployeeDeduction[] | null> => {
	try {
		const response = await apiRequest.get(
			`payroll/${institutionId}/employee-deductions/?is_active=true`,
		);

		return response.data as IEmployeeDeduction[];
	} catch (error) {
		// console.error("Failed to get active employee deductions:", error);
		throw error;
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
			`payroll/${institutionId}/employee-deductions/?effective_from__gte=${startDate}&effective_from__lte=${endDate}`,
		);

		return response.data as IEmployeeDeduction[];
	} catch (error) {
		// console.error("Failed to get employee deductions by date range:", error);
		throw error;
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
		const response = await apiRequest.post(`payroll/${institutionId}/employee-deductions/bulk/`, {
			deductions: deductionsData,
		});

		return response.data as IEmployeeDeduction[];
	} catch (error) {
		// console.error("Failed to bulk create employee deductions:", error);
		throw error;
	}
};

export const calculateDeductionAmount = (
	deduction: IEmployeeDeduction,
	employeeSalary?: number,
): number => {
	if (deduction.calculation_method === "percentage" && employeeSalary) {
		return (employeeSalary * parseFloat(deduction.percentage)) / 100;
	}

	return parseFloat(deduction.amount) || 0;
};

export const validateDeductionFormData = (
	data: Partial<IEmployeeDeductionFormData>,
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
		errors,
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
		formData.append("institution", institutionId.toString());

		Object.entries(payrollPeriodData).forEach(([key, value]) => {
			if (value !== null && value !== undefined) {
				formData.append(key, value.toString());
			}
		});

		const response = await apiRequest.post(`payroll/${institutionId}/payroll-periods/`, formData);

		return response.data as IPayrollPeriod;
	} catch (error) {
		// console.error("Failed to create payroll period:", error);
		throw error;
	}
};

export const getPayrollPeriods = async (
	institutionId: number,
): Promise<IPayrollPeriod[] | null> => {
	try {
		const response = await apiRequest.get(`payroll/${institutionId}/payroll-periods/`);
		const data = response.data as IPaginatedResponse<IPayrollPeriod>;

		// Return the results array instead of the entire response
		return data.results;
	} catch (error) {
		// console.error("Failed to get payroll periods:", error);
		throw error;
	}
};

export const getPaginatedPayrollPeriods = async ({
	institutionId,
	page = 1,
	search,
	status,
	ordering,
}: {
	institutionId: number;
	page?: number;
	search?: string;
	status?: string;
	ordering?: string;
}): Promise<IPaginatedResponse<IPayrollPeriod>> => {
	try {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (search) {
			params.append("search", search);
		}
		if (status && status !== "all") {
			params.append("is_processed", status === "processed" ? "true" : "false");
		}
		ordering && params.append("ordering", ordering);
		const endpoint = `payroll/${institutionId}/payroll-periods/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);

		return response.data as IPaginatedResponse<IPayrollPeriod>;
	} catch (error) {
		console.error("Error fetching paginated payroll periods:", error);
		throw error;
	}
};

export const getPaginatedPayrollPeriodsFromUrl = async ({
	url,
}: {
	url: string;
}): Promise<IPaginatedResponse<IPayrollPeriod>> => {
	try {
		const response = await apiRequest.get(forceUrlToHttps(url));

		return response.data as IPaginatedResponse<IPayrollPeriod>;
	} catch (error) {
		console.error("Error fetching paginated payroll periods from URL:", error);
		throw error;
	}
};

export const getPayrollPeriod = async ({
	payrollPeriodId,
}: {
	payrollPeriodId: number | string;
}): Promise<IPayrollPeriod | null> => {
	try {
		const response = await apiRequest.get(`payroll/payroll-periods/${payrollPeriodId}/`);

		return response.data as IPayrollPeriod;
	} catch (error) {
		// console.error("Failed to get payroll period:", error);
		throw error;
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

		const response = await apiRequest.patch(`payroll/payroll-periods/${id}/`, formData);

		return response.data as IPayrollPeriod;
	} catch (error) {
		// console.error("Failed to update payroll period:", error);
		throw error;
	}
};

export const deletePayrollPeriod = async (id: number) => {
	await apiRequest.delete(`payroll/payroll-periods/${id}/`);
};

export const getCurrentPayrollPeriod = async (
	institutionId: number,
): Promise<IPayrollPeriod | null> => {
	try {
		const today = new Date().toISOString().split("T")[0];
		const response = await apiRequest.get(
			`payroll/${institutionId}/payroll-periods/?current_date=${today}`,
		);

		// Assuming the API returns the current period or we find it from the list
		const periods = response.data as IPayrollPeriod[];
		const currentPeriod = periods.find(
			(period) => period.start_date <= today && period.end_date >= today,
		);

		return currentPeriod || null;
	} catch (error) {
		// console.error("Failed to get current payroll period:", error);
		throw error;
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
			`payroll/${institutionId}/payroll-periods/?is_processed=${isProcessed}`,
		);

		return response.data as IPayrollPeriod[];
	} catch (error) {
		// console.error("Failed to get payroll periods by status:", error);
		throw error;
	}
};

export const getUnprocessedPayrollPeriods = async (
	institutionId: number,
): Promise<IPayrollPeriod[] | null> => {
	return getPayrollPeriodsByStatus({ institutionId, isProcessed: false });
};

export const getProcessedPayrollPeriods = async (
	institutionId: number,
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
			`payroll/${institutionId}/payroll-periods/?start_date__gte=${startDate}&end_date__lte=${endDate}`,
		);

		return response.data as IPayrollPeriod[];
	} catch (error) {
		// console.error("Failed to get payroll periods by date range:", error);
		throw error;
	}
};

export const markPayrollPeriodAsProcessed = async (id: number): Promise<IPayrollPeriod | null> => {
	return updatePayrollPeriod({
		id,
		payrollPeriodData: { is_processed: true },
	});
};

export const markPayrollPeriodAsUnprocessed = async (
	id: number,
): Promise<IPayrollPeriod | null> => {
	return updatePayrollPeriod({
		id,
		payrollPeriodData: { is_processed: false },
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
		const response = await apiRequest.post(`payroll/${institutionId}/payroll-periods/bulk/`, {
			periods: periodsData,
		});

		return response.data as IPayrollPeriod[];
	} catch (error) {
		// console.error("Failed to bulk create payroll periods:", error);
		throw error;
	}
};

export const validatePayrollPeriodFormData = (
	data: Partial<IPayrollPeriodFormData>,
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
		errors,
	};
};

export function generatePeriodName(startDate: string, endDate: string): string {
	if (!startDate || !endDate) {
		return "";
	}

	const start = new Date(startDate);
	const end = new Date(endDate);

	// Optional: Calculate duration in days to customize name (e.g., for weekly vs. monthly)
	const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

	// Example logic: If ~7 days, name as "Week X - Month Year"; if ~30 days, "Month Year"
	const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "long" });
	const year = start.getFullYear();

	if (durationDays <= 10) {
		// Weekly example: Determine week number in the month
		const weekNumber = Math.ceil(start.getDate() / 7);
		const monthName = monthFormatter.format(start);

		return `Week ${weekNumber} - ${monthName} ${year}`;
	} else {
		// Monthly default: "August 2025"
		const monthName = monthFormatter.format(start);

		return `${monthName} ${year}`;
	}
}

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
			? allPeriods.filter((period) => period.id !== excludeId)
			: allPeriods;

		const overlapping = filteredPeriods.filter((period) => {
			const periodStart = new Date(period.start_date);
			const periodEnd = new Date(period.end_date);
			const newStart = new Date(startDate);
			const newEnd = new Date(endDate);

			// Check if periods overlap
			return newStart <= periodEnd && newEnd >= periodStart;
		});

		return {
			hasOverlap: overlapping.length > 0,
			overlappingPeriods: overlapping,
		};
	} catch (error) {
		// console.error("Failed to check period overlap:", error);
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

		const response = await apiRequest.post(`payroll/${institutionId}/payslips/`, formData);

		return response.data as IPayslip;
	} catch (error) {
		// console.error("Failed to create payslip:", error);
		throw error;
	}
};

export const createBulkPayslips = async ({
	institutionId,
	payrollPeriodId,
	// employeeIds,
}: {
	institutionId: number;
	payrollPeriodId: number;
	employeeIds?: number[];
}): Promise<IPayslip[] | null> => {
	try {
		const requestData = {
			payroll_period: payrollPeriodId,
			// employee_ids: employeeIds || [],
		};

		const response = await apiRequest.post(`payroll/${institutionId}/payslips/`, requestData);

		return response.data as IPayslip[];
	} catch (error) {
		// console.error("Failed to create bulk payslips:", error);
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
	},
) => {
	try {
		const queryParams = new URLSearchParams();

		if (params) {
			Object.entries(params).forEach(([key, value]) => {
				if (value !== null && value !== undefined) {
					queryParams.append(key, value.toString());
				}
			});
		}

		const url = `payroll/${institutionId}/payslips/${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
		const response = await apiRequest.get(forceUrlToHttps(url));

		const data = response.data as IPaginatedResponse<IPayslip>;

		// Return the results array instead of the entire response
		return data.results;
	} catch (error) {
		// console.error("Failed to get payslips:", error);
		throw error;
	}
};

export const getDashboardTasksAnalytics = async () => {
	try {
		const response = await apiRequest.get("approval/tasks-analytics/");

		return response.data as ApprovalTasksDashboardResponse;
	} catch (error) {
		throw error;
	}
};

export const getRecruitmentDashboard = async () => {
	try {
		const response = await apiRequest.get("recruitment/analytics/");

		return response.data as IRecruitmentDashboard;
	} catch (error) {
		// console.error("Failed to fetch recruitment dashboard:", error);
		throw error;
	}
};

export const getAttendanceDashboard = async () => {
	try {
		const response = await apiRequest.get("employee/attendance-analytics/");

		return response.data as IAttendanceDashboard;
	} catch (error) {
		// console.error("Failed to fetch recruitment dashboard:", error);
		throw error;
	}
};

export const getProjectDashboard = async () => {
	try {
		const response = await apiRequest.get("projects/analytics");

		return response.data as IProjectDashboard;
	} catch (error) {
		throw error;
	}
};

export const getPayrollDashboard = async () => {
	try {
		const response = await apiRequest.get("payroll/analytics/");

		return response.data as IPayrollDashboard;
	} catch (error) {
		// console.error("Failed to fetch recruitment dashboard:", error);
		throw error;
	}
};

export const getLeaveDashboard = async () => {
	try {
		const response = await apiRequest.get("leave-mgt/analytics/");

		return response.data as ILeaveDashboard;
	} catch (error) {
		// console.error("Failed to fetch recruitment dashboard:", error);
		throw error;
	}
};

export const changePassword = async (data: ChangePasswordData) => {
	try {
		const response = await apiRequest.post("users/change-password/", data);

		return response.data as { message: string };
	} catch (error) {
		// console.error("Failed to change password:", error);
		throw error;
	}
};

export const getEmployeeDashboard = async (): Promise<IEmployeeDashboard> => {
	try {
		const response = await apiRequest.get("employee/analytics/");

		return response.data as IEmployeeDashboard;
	} catch (error) {
		throw error;
	}
};
export const getOffboardingDashboard = async (): Promise<OffboardingData> => {
	try {
		const response = await apiRequest.get("on-boarding/analytics/");

		return response.data as OffboardingData;
	} catch (error) {
		throw error;
	}
};

export const getAssetDashboard = async (): Promise<AssetsData> => {
	try {
		const response = await apiRequest.get("assets/analytics/");

		return response.data as AssetsData;
	} catch (error) {
		throw error;
	}
};

export const getPayslip = async (id: number) => {
	try {
		const response = await apiRequest.get(`payroll/payslips/${id}/`);

		return response.data as IPayslip;
	} catch (error) {
		// console.error("Failed to get payslip:", error);
		throw error;
	}
};

export const updatePayslip = async ({
	id,
	payslipData,
}: {
	id: number;
	payslipData: Partial<IPayslipFormData>;
}) => {
	try {
		const response = await apiRequest.patch(`payroll/payslips/${id}/`, payslipData, {});

		return response.data as IPayslip;
	} catch (error) {
		// console.error("Failed to update payslip:", error);
		throw error;
	}
};

export const deletePayslip = async (id: number): Promise<boolean> => {
	try {
		await apiRequest.delete(`payroll/payslips/${id}/`);

		return true;
	} catch (error) {
		throw error;
	}
};

export const markPayslipAsPaid = async (
	id: number,
	paidDate?: string,
): Promise<IPayslip | null> => {
	try {
		const formData = new FormData();

		formData.append("is_paid", "true");

		if (paidDate) {
			formData.append("paid_date", paidDate);
		} else {
			// Use current date if no date provided
			formData.append("paid_date", new Date().toISOString().split("T")[0]);
		}

		const response = await apiRequest.patch(`payroll/payslips/${id}/`, formData);

		return response.data as IPayslip;
	} catch (error) {
		// console.error("Failed to mark payslip as paid:", error);
		throw error;
	}
};

export const getPayslipsByEmployee = async (
	institutionId: number,
	employeeId: number,
): Promise<IPayslip[] | null> => {
	return getPayslips(institutionId, { employee: employeeId });
};

export const getUnpaidPayslips = async (institutionId: number): Promise<IPayslip[] | null> => {
	return getPayslips(institutionId, { is_paid: false });
};

export const getPaidPayslips = async (institutionId: number): Promise<IPayslip[] | null> => {
	return getPayslips(institutionId, { is_paid: true });
};

export const getPayslipItems = async (payslipId: number) => {
	try {
		const response = await apiRequest.get(`payroll/payslips/${payslipId}/items/`);
		const data = response.data as IPaginatedResponse<IPayslipItem>;

		// Return the results array instead of the entire response
		return data.results;
	} catch (error) {
		// console.error("Failed to get payslip items:", error);
		throw error;
	}
};

export const getContracts = async ({
	institutionId,
	employeeId,
	page = 1,
	search,
	ordering,
}: {
	institutionId: number;
	employeeId?: number;
	page?: number;
	search?: string;
	ordering?: string;
}) => {
	const params = new URLSearchParams({
		page: page.toString(),
	});

	if (search) {
		params.append("search", search);
	}
	if (employeeId) {
		params.append("employee_id", employeeId.toString());
	}
	ordering && params.append("ordering", ordering);
	const endpoint = `employee/employee-contracts/?${params.toString()}`;
	const response = await apiRequest.get(endpoint);

	return response.data as IPaginatedResponse<IContract>;
};

export const getPaginatedContractsFromUrl = async ({
	url,
}: {
	url: string;
}): Promise<IPaginatedResponse<IContract>> => {
	const response = await apiRequest.get(forceUrlToHttps(url));

	return response.data as IPaginatedResponse<IContract>;
};

export const getContractById = async ({
	contractId,
}: {
	contractId: number;
}): Promise<IContract | null> => {
	try {
		const response = await apiRequest.get(`employee/employee-contracts/${contractId}/`);

		return response.data as IContract;
	} catch (error) {
		// console.error("Failed to fetch contract:", error);
		throw error;
	}
};

export const updateContract = async ({
	contractId,
	contractData,
}: {
	contractId: number;
	contractData: Partial<IContractFormData>;
}): Promise<IContract | null> => {
	try {
		const formData = new FormData();

		Object.entries(contractData).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				if (key === "signed_contract" && value instanceof File) {
					formData.append(key, value);
				} else {
					formData.append(key, value.toString());
				}
			}
		});

		const response = await apiRequest.patch(`employee/employee-contracts/${contractId}/`, formData);

		return response.data as IContract;
	} catch (error) {
		// console.error("Failed to update contract:", error);
		throw error;
	}
};

export const deleteContract = async ({ contractId }: { contractId: number }): Promise<boolean> => {
	try {
		await apiRequest.delete(`employee/employee-contracts/${contractId}/`);

		return true;
	} catch (error) {
		// console.error("Failed to delete contract:", error);
		return false;
	}
};

export const approveContract = async ({
	contractId,
}: {
	contractId: number;
}): Promise<IContract | null> => {
	try {
		const response = await apiRequest.post(`employee/contracts/${contractId}/approve/`, {});

		return response.data as IContract;
	} catch (error) {
		// console.error("Failed to approve contract:", error);
		throw error;
	}
};

export const createDocumentType = async ({
	institutionId,
	documentTypeData,
}: {
	institutionId: number;
	documentTypeData: IDocumentTypeFormData;
}): Promise<IDocumentType | null> => {
	try {
		const formData = new FormData();

		Object.entries(documentTypeData).forEach(([key, value]) => {
			if (value !== null && value !== undefined) {
				formData.append(key, value.toString());
			}
		});

		const response = await apiRequest.post(
			`documents/institution/${institutionId}/types/`,
			formData,
		);

		return response.data as IDocumentType;
	} catch (error) {
		throw error;
	}
};

export const getDocumentTypes = async ({
	institutionId,
}: {
	institutionId: number;
}): Promise<IDocumentType[]> => {
	try {
		const response = await apiRequest.get(`documents/institution/${institutionId}/types/`);
		const data = response.data as IPaginatedResponse<IDocumentType>;

		return data.results;
	} catch (error) {
		return [];
	}
};

export const updateDocumentType = async ({
	institutionId,
	documentTypeId,
	documentTypeData,
}: {
	institutionId: number;
	documentTypeId: number;
	documentTypeData: IDocumentTypeFormData;
}): Promise<IDocumentType | null> => {
	try {
		const formData = new FormData();

		Object.entries(documentTypeData).forEach(([key, value]) => {
			if (value !== null && value !== undefined) {
				formData.append(key, value.toString());
			}
		});

		const response = await apiRequest.patch(`documents/types/${documentTypeId}/`, formData);

		return response.data as IDocumentType;
	} catch (error) {
		throw error;
	}
};

export const deleteDocumentType = async ({
	institutionId,
	documentTypeId,
}: {
	institutionId: number;
	documentTypeId: number;
}): Promise<boolean> => {
	try {
		await apiRequest.delete(`documents/types/${documentTypeId}/`);

		return true;
	} catch (error) {
		return false;
	}
};

// utils.ts
export const createDocumentTemplate = async ({
	institutionId,
	documentTemplateData,
}: {
	institutionId: number;
	documentTemplateData: IDocumentTemplateFormData;
}): Promise<IDocumentTemplate | null> => {
	try {
		const formData = new FormData();

		Object.entries(documentTemplateData).forEach(([key, value]) => {
			if (key === "placeholders" && Array.isArray(value)) {
				formData.append(key, JSON.stringify(value));
			} else if (key === "file" && value instanceof File) {
				formData.append(key, value);
			} else if (value !== null && value !== undefined) {
				formData.append(key, value.toString());
			}
		});

		const response = await apiRequest.post(
			`documents/institution/${institutionId}/templates/`,
			formData,
		);

		return response.data as IDocumentTemplate;
	} catch (error) {
		throw error;
	}
};

export const updateDocumentTemplate = async ({
	institutionId,
	documentTemplateId,
	documentTemplateData,
}: {
	institutionId: number;
	documentTemplateId: number;
	documentTemplateData: IDocumentTemplateFormData;
}): Promise<IDocumentTemplate | null> => {
	try {
		const formData = new FormData();

		Object.entries(documentTemplateData).forEach(([key, value]) => {
			if (key === "placeholders" && Array.isArray(value)) {
				formData.append(key, JSON.stringify(value));
			} else if (key === "file" && value instanceof File) {
				formData.append(key, value);
			} else if (value !== null && value !== undefined) {
				formData.append(key, value.toString());
			}
		});

		const response = await apiRequest.patch(`documents/templates/${documentTemplateId}/`, formData);

		return response.data as IDocumentTemplate;
	} catch (error) {
		throw error;
	}
};

export const getDocumentTemplates = async ({
	institutionId,
}: {
	institutionId: number;
}): Promise<IDocumentTemplate[]> => {
	try {
		const response = await apiRequest.get(`documents/institution/${institutionId}/templates/`);
		const data = response.data as IPaginatedResponse<IDocumentTemplate>;

		return data.results;
	} catch (error) {
		return [];
	}
};

export const deleteDocumentTemplate = async ({
	institutionId,
	documentTemplateId,
}: {
	institutionId: number;
	documentTemplateId: number;
}): Promise<boolean> => {
	try {
		await apiRequest.delete(`documents/templates/${documentTemplateId}/`);

		return true;
	} catch (error) {
		throw error;
	}
};

// Termination Initiations API Namespace
export const TerminationInitiationsAPI = {
	getAll: async ({
		searchParams,
	}: {
		searchParams?: URLSearchParams;
	}): Promise<IPaginatedResponse<ITermination>> => {
		try {
			const queryString = searchParams ? `?${searchParams}` : "";
			const response = await apiRequest.get(`on-boarding/termination-initiations/${queryString}`);

			return response.data as IPaginatedResponse<ITermination>;
		} catch (error) {
			throw error;
		}
	},

	getPaginated: async ({
		institutionId,
		page = 1,
		search,
		ordering,
	}: {
		institutionId: number;
		page?: number;
		search?: string;
		ordering?: string;
	}): Promise<IPaginatedResponse<ITermination>> => {
		try {
			const params = new URLSearchParams({
				page: page.toString(),
			});

			if (search) {
				params.append("search", search);
			}
			ordering && params.append("ordering", ordering);
			const endpoint = `on-boarding/termination-initiations/?${params.toString()}`;
			const response = await apiRequest.get(endpoint);

			return response.data as IPaginatedResponse<ITermination>;
		} catch (error) {
			console.error("Error fetching paginated termination initiations:", error);
			throw error;
		}
	},

	getPaginatedFromUrl: async ({
		url,
	}: {
		url: string;
	}): Promise<IPaginatedResponse<ITermination>> => {
		try {
			const response = await apiRequest.get(forceUrlToHttps(url));

			return response.data as IPaginatedResponse<ITermination>;
		} catch (error) {
			console.error("Error fetching termination initiations from URL:", error);
			throw error;
		}
	},

	update: async ({
		terminationId,
		terminationData,
	}: {
		terminationId: number;
		terminationData: Partial<ITerminationFormData>;
	}): Promise<ITermination> => {
		try {
			const formData = new FormData();

			Object.entries(terminationData).forEach(([key, value]) => {
				if (value !== null) {
					if (value instanceof File) {
						formData.append(key, value);
					} else {
						formData.append(key, value.toString());
					}
				}
			});
			const response = await apiRequest.patch(
				`on-boarding/termination-initiations/${terminationId}/`,
				formData,
			);

			return response.data as ITermination;
		} catch (error) {
			throw error;
		}
	},

	delete: async ({ terminationId }: { terminationId: number }): Promise<void> => {
		try {
			await apiRequest.delete(`on-boarding/termination-initiations/${terminationId}/`);
		} catch (error) {
			throw error;
		}
	},

	getById: async (terminationId: number): Promise<ITermination | null> => {
		try {
			const response = await apiRequest.get(
				`on-boarding/termination-initiations/${terminationId}/`,
			);

			return response.data as ITermination;
		} catch (error) {
			throw error;
		}
	},

	create: async ({
		terminationData,
	}: {
		terminationData: ITerminationFormData;
	}): Promise<ITermination | null> => {
		try {
			const formData = new FormData();

			// Append all fields to FormData
			Object.entries(terminationData).forEach(([key, value]) => {
				if (value !== undefined && value !== null) {
					if (key === "termination_letter" && value instanceof File) {
						formData.append(key, value);
					} else {
						formData.append(key, value.toString());
					}
				}
			});

			const response = await apiRequest.post("on-boarding/termination-initiations/", formData);

			return response.data as ITermination;
		} catch (error) {
			throw error;
		}
	},
};

// Separation Policy Types API Namespace
export const SeparationPolicyTypesAPI = {
	getAll: async ({
		institutionId,
		searchParams,
	}: {
		institutionId: number;
		searchParams?: URLSearchParams;
	}): Promise<IPaginatedResponse<ISeparationType>> => {
		try {
			const response = await apiRequest.get(`on-boarding/separation-types/?${searchParams}`);

			return response.data as IPaginatedResponse<ISeparationType>;
		} catch (error) {
			throw error;
		}
	},

	getPaginated: async ({
		institutionId,
		page = 1,
		search,
		ordering,
	}: {
		institutionId: number;
		page?: number;
		search?: string;
		ordering?: string;
	}): Promise<IPaginatedResponse<ISeparationType>> => {
		try {
			const params = new URLSearchParams({
				page: page.toString(),
			});

			if (search) {
				params.append("search", search);
			}
			ordering && params.append("ordering", ordering);
			const endpoint = `on-boarding/separation-types/?${params.toString()}`;
			const response = await apiRequest.get(endpoint);

			return response.data as IPaginatedResponse<ISeparationType>;
		} catch (error) {
			console.error("Error fetching paginated separation policy types:", error);
			throw error;
		}
	},

	getPaginatedFromUrl: async ({
		url,
	}: {
		url: string;
	}): Promise<IPaginatedResponse<ISeparationType>> => {
		try {
			const response = await apiRequest.get(forceUrlToHttps(url));

			return response.data as IPaginatedResponse<ISeparationType>;
		} catch (error) {
			console.error("Error fetching separation policy types from URL:", error);
			throw error;
		}
	},

	getById: async (policyTypeId: number): Promise<ISeparationType | null> => {
		try {
			const response = await apiRequest.get(`on-boarding/separation-types/${policyTypeId}/`);

			return response.data as ISeparationType;
		} catch (error) {
			throw error;
		}
	},

	create: async ({
		policyTypeData,
	}: {
		policyTypeData: Partial<ISeparationTypeFormData>;
	}): Promise<ISeparationType | null> => {
		try {
			const response = await apiRequest.post("on-boarding/separation-types/", policyTypeData);

			return response.data as ISeparationType;
		} catch (error) {
			throw error;
		}
	},

	update: async ({
		policyTypeId,
		policyTypeData,
	}: {
		policyTypeId: number;
		policyTypeData: Partial<ISeparationTypeFormData>;
	}): Promise<ISeparationType | null> => {
		try {
			const response = await apiRequest.patch(
				`on-boarding/separation-types/${policyTypeId}/`,
				policyTypeData,
			);

			return response.data as ISeparationType;
		} catch (error) {
			throw error;
		}
	},

	delete: async (policyTypeId: number): Promise<boolean> => {
		try {
			await apiRequest.delete(`on-boarding/separation-types/${policyTypeId}/`);

			return true;
		} catch (error) {
			throw error;
		}
	},
};

// Offboarding Stages API Namespace
export const OffboardingStagesAPI = {
	getAll: async ({
		institutionId,
		searchParams,
	}: {
		institutionId: number;
		searchParams?: URLSearchParams;
	}): Promise<IPaginatedResponse<IOffboardingStage>> => {
		try {
			const response = await apiRequest.get(`on-boarding/offboarding-stages/?${searchParams}`);

			return response.data as IPaginatedResponse<IOffboardingStage>;
		} catch (error) {
			throw error;
		}
	},

	getPaginated: async ({
		institutionId,
		page = 1,
		search,
		ordering,
	}: {
		institutionId: number;
		page?: number;
		search?: string;
		ordering?: string;
	}): Promise<IPaginatedResponse<IOffboardingStage>> => {
		try {
			const params = new URLSearchParams({
				page: page.toString(),
			});

			if (search) {
				params.append("search", search);
			}
			ordering && params.append("ordering", ordering);
			const endpoint = `on-boarding/offboarding-stages/?${params.toString()}`;
			const response = await apiRequest.get(endpoint);

			return response.data as IPaginatedResponse<IOffboardingStage>;
		} catch (error) {
			console.error("Error fetching paginated offboarding stages:", error);
			throw error;
		}
	},

	getPaginatedFromUrl: async ({
		url,
	}: {
		url: string;
	}): Promise<IPaginatedResponse<IOffboardingStage>> => {
		try {
			const response = await apiRequest.get(forceUrlToHttps(url));

			return response.data as IPaginatedResponse<IOffboardingStage>;
		} catch (error) {
			console.error("Error fetching offboarding stages from URL:", error);
			throw error;
		}
	},

	getById: async (stageId: number): Promise<IOffboardingStage | null> => {
		try {
			const response = await apiRequest.get(`on-boarding/offboarding-stages/${stageId}/`);

			return response.data as IOffboardingStage;
		} catch (error) {
			throw error;
		}
	},

	create: async ({
		stageData,
	}: {
		stageData: IOffboardingStageFormData;
	}): Promise<IOffboardingStage | null> => {
		try {
			const response = await apiRequest.post("on-boarding/offboarding-stages/", stageData);

			return response.data as IOffboardingStage;
		} catch (error) {
			throw error;
		}
	},

	update: async ({
		stageId,
		stageData,
	}: {
		stageId: number;
		stageData: Partial<IOffboardingStageFormData>;
	}): Promise<IOffboardingStage | null> => {
		try {
			const response = await apiRequest.patch(
				`on-boarding/offboarding-stages/${stageId}/`,
				stageData,
			);

			return response.data as IOffboardingStage;
		} catch (error) {
			throw error;
		}
	},

	delete: async (stageId: number): Promise<boolean> => {
		try {
			await apiRequest.delete(`on-boarding/offboarding-stages/${stageId}/`);

			return true;
		} catch (error) {
			throw error;
		}
	},
};

export const AttendanceAPI = {
	createAttendanceRecord: async (data: IAttendanceFormData) => {
		const response = await apiRequest.post(`/employee/${data.employee}/attendance/`, data);

		return response.data;
	},

	fetchAttendanceRecords: async ({
		date,
		institutionId,
		search,
		page = 1,
		ordering,
	}: {
		date?: string;
		institutionId?: number;
		page?: number;
		search?: string;
		ordering?: string;
	}) => {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (search) {
			params.append("search", search);
		}
		if (date) {
			params.append("date", date);
		}
		ordering && params.append("ordering", ordering);
		const response = await apiRequest.get(`/employee/attendance/?${params.toString()}`);

		return response.data as IPaginatedResponse<IAttendance>;
	},

	fetchAttendanceRecordsByEmployee: async ({
		employee_id,
		date,
		institutionId,
		search,
		page = 1,
		ordering,
	}: {
		employee_id: number;
		date?: string;
		institutionId?: number;
		page?: number;
		search?: string;
		ordering?: string;
	}) => {
		const params = new URLSearchParams({
			page: page.toString(),
			employee_id: employee_id.toString(),
		});

		if (search) {
			params.append("search", search);
		}
		if (date) {
			params.append("date", date);
		}
		ordering && params.append("ordering", ordering);
		const response = await apiRequest.get(`/employee/attendance/?${params.toString()}`);

		return response.data as IPaginatedResponse<IAttendance>;
	},

	fetchAttendanceRecordsFromUrl: async (url: string) => {
		const response = await apiRequest.get(forceUrlToHttps(url));

		return response.data as IPaginatedResponse<IAttendance>;
	},

	// Fetch attendance records for a specific employee over a date range
	fetchEmployeeAttendanceRecords: async (
		employeeId: number | string,
		startDate?: string,
		endDate?: string,
	) => {
		let url = `/employee/${employeeId}/attendance/`;
		const params = [];

		if (startDate) params.push(`start_date=${startDate}`);
		if (endDate) params.push(`end_date=${endDate}`);
		if (params.length) url += `?${params.join("&")}`;
		const response = await apiRequest.get(forceUrlToHttps(url));

		return response.data as IPaginatedResponse<IAttendance>;
	},

	// Update an attendance record by ID
	updateAttendanceRecord: async (id: number, data: Partial<IAttendanceFormData>) => {
		const response = await apiRequest.patch(`/employee/attendance/${id}/`, data);

		return response.data;
	},

	// Delete an attendance record by ID
	deleteAttendanceRecord: async (id: number) => {
		const response = await apiRequest.delete(`/employee/attendance/${id}/`);

		return response.data;
	},
};

export const bankTypesAPI = {
	getAll: async (searchParams?: string) => {
		try {
			const response = await apiRequest.get(
				`/institution/bank-type/${searchParams ? `${searchParams}` : ""}`,
			);

			return response.data as IPaginatedResponse<IBankType>;
		} catch (error) {
			throw error;
		}
	},
	getById: async ({ bankTypeId }: { bankTypeId: string }) => {
		try {
			const response = await apiRequest.get(`/institution/bank-type/${bankTypeId}`);

			return response.data as IBankType;
		} catch (error) {
			throw error;
		}
	},
	create: async ({ bankType }: { bankType: IBankTypeFormData }) => {
		try {
			const response = await apiRequest.post(`/institution/bank-type/`, bankType);

			return response.data as IBankType;
		} catch (error) {
			throw error;
		}
	},
	update: async ({ bankTypeId, data }: { bankTypeId: string; data: IBankTypeFormData }) => {
		try {
			const response = await apiRequest.patch(`/institution/bank-type/${bankTypeId}/`, data);

			return response.data as IBankType;
		} catch (error) {
			throw error;
		}
	},
	delete: async ({ bankTypeId }: { bankTypeId: string }) => {
		try {
			await apiRequest.delete(`/institution/bank-type/${bankTypeId}/`);
		} catch (error) {
			throw error;
		}
	},
};

export const bankAccountsAPI = {
	getAll: async (searchParams?: string) => {
		try {
			const url = searchParams
				? `/institution/bank-account/${searchParams}`
				: `/institution/bank-account/`;
			const response = await apiRequest.get(forceUrlToHttps(url));

			return response.data as IPaginatedResponse<IBankAccount>;
		} catch (error) {
			throw error;
		}
	},
	getPaginatedFRomUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(forceUrlToHttps(url));

		return response.data as IPaginatedResponse<IBankAccount>;
	},
	getById: async ({ bankAccountId }: { bankAccountId: string }) => {
		try {
			const response = await apiRequest.get(`/institution/bank-account/${bankAccountId}`);

			return response.data as IBankAccount;
		} catch (error) {
			throw error;
		}
	},
	create: async ({ bankAccount }: { bankAccount: IBankAccountFormData }) => {
		try {
			const response = await apiRequest.post(`/institution/bank-account/`, bankAccount);

			return response.data as IBankAccount;
		} catch (error) {
			throw error;
		}
	},
	update: async ({
		bankAccountId,
		data,
	}: {
		bankAccountId: string;
		data: IBankAccountFormData;
	}) => {
		try {
			const response = await apiRequest.patch(`/institution/bank-account/${bankAccountId}/`, data);

			return response.data as IBankAccount;
		} catch (error) {
			throw error;
		}
	},
	delete: async ({ bankAccountId }: { bankAccountId: string }) => {
		try {
			await apiRequest.delete(`/institution/bank-account/${bankAccountId}/`);
		} catch (error) {
			throw error;
		}
	},
};

// Tax API functions
export const taxesAPI = {
	// Get all taxes for the institution
	getAll: async (): Promise<ITax[]> => {
		try {
			const response = await apiRequest.get("/institution/tax/");

			// console.log("Tax response", response);
			return response.data as ITax[];
		} catch (error) {
			throw error;
		}
	},

	// Get a specific tax by ID
	getById: async (taxId: number): Promise<ITax> => {
		try {
			const response = await apiRequest.get(`/institution/tax/${taxId}/`);

			return response.data as ITax;
		} catch (error) {
			throw error;
		}
	},

	// Create a new tax
	create: async (data: ITaxFormData): Promise<ITax> => {
		try {
			const response = await apiRequest.post("/institution/tax/", data);

			return response.data as ITax;
		} catch (error) {
			throw error;
		}
	},

	// Update a tax
	update: async (taxId: number, data: Partial<ITaxFormData>): Promise<ITax> => {
		try {
			const response = await apiRequest.patch(`/institution/tax/${taxId}/`, data);

			return response.data as ITax;
		} catch (error) {
			throw error;
		}
	},

	// Delete a tax
	delete: async (taxId: number): Promise<void> => {
		try {
			await apiRequest.delete(`/institution/tax/${taxId}/`);
		} catch (error) {
			throw error;
		}
	},
};

// Tax Rule API functions
export const taxRulesAPI = {
	// Get all tax rules for the institution
	getAll: async (): Promise<ITaxRule[]> => {
		try {
			const response = await apiRequest.get("/institution/tax-rule/");

			return response.data as ITaxRule[];
		} catch (error) {
			throw error;
		}
	},

	// Get tax rules for a specific tax
	getByTaxId: async (taxId: number): Promise<ITaxRule[]> => {
		try {
			const allRules = await apiRequest.get("/institution/tax-rule/");
			const rules = allRules.data as ITaxRule[];

			return rules.filter((rule) => rule.institution_tax.id === taxId);
		} catch (error) {
			throw error;
		}
	},

	// Get a specific tax rule by ID
	getById: async (taxRuleId: number): Promise<ITaxRule> => {
		try {
			const response = await apiRequest.get(`/institution/tax-rule/${taxRuleId}/`);

			return response.data as ITaxRule;
		} catch (error) {
			throw error;
		}
	},

	// Create a new tax rule
	create: async (data: ITaxRuleFormData): Promise<ITaxRule> => {
		try {
			const response = await apiRequest.post("/institution/tax-rule/", data);

			return response.data as ITaxRule;
		} catch (error) {
			throw error;
		}
	},

	// Update a tax rule
	update: async (taxRuleId: number, data: Partial<ITaxRuleFormData>): Promise<ITaxRule> => {
		try {
			const response = await apiRequest.patch(`/institution/tax-rule/${taxRuleId}/`, data);

			return response.data as ITaxRule;
		} catch (error) {
			throw error;
		}
	},

	// Delete a tax rule
	delete: async (taxRuleId: number): Promise<void> => {
		try {
			await apiRequest.delete(`/institution/tax-rule/${taxRuleId}/`);
		} catch (error) {
			throw error;
		}
	},
};

export const payrollAPI = {
	getPayslipsByInstitution: async ({
		institutionId,
		params,
	}: {
		institutionId: number | string;
		params: {
			employee_id?: number;
			payroll_period?: number;
			is_paid?: boolean;
			page?: number;
			search?: string;
		};
	}) => {
		try {
			const queryParams = new URLSearchParams();

			if (params) {
				Object.entries(params).forEach(([key, value]) => {
					if (value !== null && value !== undefined) {
						queryParams.append(key, value.toString());
					}
				});
			}

			const url = `payroll/${institutionId}/payslips/${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
			const response = await apiRequest.get(forceUrlToHttps(url));

			return response.data as IPaginatedResponse<IPayslip>;
		} catch (error) {
			// console.error("Failed to get payslips:", error);
			throw error;
		}
	},

	getPayslipsByPayrollPeriod: async ({
		payrollId,
		params,
		institutionId,
		page = 1,
		search,
		ordering,
	}: {
		payrollId: number | string;
		params?: {
			employee?: number;
			payroll_period?: number;
			is_paid?: boolean;
		};
		institutionId: number;
		page?: number;
		search?: string;
		ordering?: string;
	}) => {
		try {
			const queryParams = new URLSearchParams();

			if (params) {
				Object.entries(params).forEach(([key, value]) => {
					if (value !== null && value !== undefined) {
						queryParams.append(key, value.toString());
					}
				});
			}
			if (search) {
				queryParams.append("search", search);
			}
			queryParams.append("page", page.toString());
			ordering && queryParams.append("ordering", ordering);
			const url = `/payroll/payslips/by-payroll/${payrollId}/${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
			const response = await apiRequest.get(forceUrlToHttps(url));

			const data = response.data as IPaginatedResponse<IPayslip>;

			// Return the results array instead of the entire response
			return data;
		} catch (error) {
			// console.error("Failed to get payslips:", error);
			throw error;
		}
	},

	getPaginatedPayslipsByPeriollPeriodFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(forceUrlToHttps(url));

		return response.data as IPaginatedResponse<IPayslip>;
	},
};

export const ROLES_API = {
	getPaginatedFirstPage: async ({ institutionId }: { institutionId: number }) => {
		const response = await apiRequest.get(`user/role/?Institution_id=${institutionId}`);

		return response.data as IPaginatedResponse<Role>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }): Promise<IPaginatedResponse<Role>> => {
		const response = await apiRequest.get(forceUrlToHttps(url));

		return response.data as IPaginatedResponse<Role>;
	},
};

export const institutionAPI = {
	getDasboardAnalytics: async ({ institutionId }: { institutionId: number }) => {
		const response = await apiRequest.get(`/institution/${institutionId}/dashboard-analytics/`);

		return response.data as IInstitutionAnalytics;
	},

	getWorkingDays: async () => {
		try {
			const response = await apiRequest.get("/institution/working-days/");

			return response.data as IInstitutionWorkingDays[];
		} catch (error) {
			throw error;
		}
	},

	createWorkingDays: async (data: IWorkingDaysFormData) => {
		try {
			const response = await apiRequest.post("/institution/working-days/", data);

			return response.data as IInstitutionWorkingDays;
		} catch (error) {
			throw error;
		}
	},

	updateWorkingDays: async ({
		workingDaysId,
		data,
	}: {
		workingDaysId: number | string;
		data: IWorkingDaysFormData;
	}) => {
		try {
			const response = await apiRequest.patch(`/institution/working-days/${workingDaysId}/`, data);

			return response.data as IInstitutionWorkingDays;
		} catch (error) {
			throw error;
		}
	},

	createInstitution: async ({ data }: { data: FormData }) => {
		const response = await await apiRequest.post("institution/", data);

		return response as IUserInstitution;
	},

	updateInstitution: async ({
		institutionId,
		data,
	}: {
		institutionId: number;
		data: Partial<IUserInstitutionFormData> & { institution_logo?: File };
	}) => {
		const formData = new FormData();

		// Append all data fields to FormData
		Object.entries(data).forEach(([key, value]) => {
			if (key === "institution_logo" && value instanceof File) {
				formData.append(key, value);
			} else if (value !== undefined && value !== null) {
				formData.append(key, String(value));
			}
		});
		const response = await apiRequest.patch(`/institution/${institutionId}/`, formData);

		return response.data as IUserInstitution;
	},

	createKYCDocuments: async (documents: { document_title: string; document_file: File }[]) => {
		const formData = new FormData();

		documents.forEach((doc) => {
			formData.append("document_title", doc.document_title);
			formData.append("document_file", doc.document_file);
		});

		const response = await apiRequest.post("/institution/kyc_docs", formData);

		return response.data;
	},

	getKYCDocuments: async (): Promise<IPaginatedResponse<IKYCDocument>> => {
		const response = await apiRequest.get("/institution/kyc_docs");

		return response.data as IPaginatedResponse<IKYCDocument>;
	},

	getKYCDocumentsFromUrl: async ({
		url,
	}: {
		url: string;
	}): Promise<IPaginatedResponse<IKYCDocument>> => {
		const response = await apiRequest.get(forceUrlToHttps(url));

		return response.data as IPaginatedResponse<IKYCDocument>;
	},

	updateKYCDocument: async ({
		documentId,
		data,
	}: {
		documentId: number;
		data: { document_title: string; document_file?: File };
	}) => {
		const formData = new FormData();

		formData.append("document_title", data.document_title);
		if (data.document_file) {
			formData.append("document_file", data.document_file);
		}

		const response = await apiRequest.patch(`/institution/kyc_doc/${documentId}/`, formData);

		return response.data as IKYCDocument;
	},

	deleteKYCDocument: async ({ documentId }: { documentId: number }): Promise<boolean> => {
		try {
			const response = await apiRequest.delete(`/institution/kyc_doc/${documentId}/`);

			return response.status === 204;
		} catch (error) {
			throw error;
		}
	},
};

export const systemAPI = {
	getWorkingDays: async () => {
		try {
			const response = await apiRequest.get("/settings/system-days/");

			return response.data as ISystemWorkingDay[];
		} catch (error) {
			throw error;
		}
	},
};

export const taxAPI = {
	create: async (data: Itax) => {
		try {
			const response = await apiRequest.post("/institution/tax", data);

			return response.data as Itax;
		} catch (error) {
			throw error;
		}
	},

	getAll: async () => {
		try {
			const response = await apiRequest.get("/institution/tax");

			return response.data as Itax[];
		} catch (error) {}
	},

	getAllEmployeeTaxes: async ({}) => {
		const response = await apiRequest.get("/payroll/employee-taxes");

		return response.data as IPaginatedResponse<Itax>;
	},

	getPaginatedEmployeeTaxes: async ({
		institutionId,
		page = 1,
		search,
		status,
		ordering,
	}: {
		institutionId: number;
		page?: number;
		search?: string;
		status?: string;
		ordering?: string;
	}): Promise<IPaginatedResponse<IEmployeeTax>> => {
		try {
			const params = new URLSearchParams({
				page: page.toString(),
			});

			if (search) {
				params.append("search", search);
			}
			if (status && status !== "all") {
				params.append("status", status);
			}
			ordering && params.append("ordering", ordering);

			const endpoint = `/payroll/employee-taxes/?${params.toString()}`;
			const response = await apiRequest.get(endpoint);

			return response.data as IPaginatedResponse<IEmployeeTax>;
		} catch (error) {
			console.error("Error fetching paginated employee taxes:", error);
			throw error;
		}
	},

	getPaginatedEmployeeTaxesFromUrl: async ({
		url,
	}: {
		url: string;
	}): Promise<IPaginatedResponse<IEmployeeTax>> => {
		try {
			const response = await apiRequest.get(forceUrlToHttps(url));

			return response.data as IPaginatedResponse<IEmployeeTax>;
		} catch (error) {
			console.error("Error fetching paginated employee taxes from URL:", error);
			throw error;
		}
	},

	createEmployeeTaxes: async ({ data }: { data: IEmployeeTaxFormData }) => {
		const response = await apiRequest.post("/payroll/employee-taxes/", data);

		return response.data as Itax;
	},
	getEmployeeTax: async ({ taxId }: { taxId: number | string }) => {
		const response = await apiRequest.get(`/payroll/employee-taxes/${taxId}`);

		return response.data as Itax;
	},
	updateEmployeeTax: async ({
		data,
		taxId,
	}: {
		data: Partial<IEmployeeTaxFormData>;
		taxId: number | string;
	}) => {
		const response = await apiRequest.patch(`/payroll/employee-taxes/${taxId}/`, data);

		return response.data as Itax;
	},

	deleteEmployeeTax: async (taxId: number): Promise<boolean> => {
		try {
			const response = await apiRequest.delete(`/payroll/employee-taxes/${taxId}/`);

			return response.status === 204;
		} catch (error) {
			throw error;
		}
	},
};

// Asset Category API functions
export const assetCategoriesAPI = {
	getAll: async (): Promise<IAssetCategory[]> => {
		const response = await apiRequest.get("/assets/asset-categories/");

		return response.data?.results || response.data;
	},

	getPaginated: async ({
		institutionId,
		page = 1,
		search,
		status,
		ordering,
	}: {
		institutionId: number;
		page?: number;
		search?: string;
		status?: string;
		ordering?: string;
	}): Promise<IPaginatedResponse<IAssetCategory>> => {
		try {
			const params = new URLSearchParams({
				page: page.toString(),
			});

			if (search) {
				params.append("search", search);
			}
			if (status && status !== "all") {
				params.append("is_active", status === "active" ? "true" : "false");
			}
			ordering && params.append("ordering", ordering);
			const endpoint = `/assets/asset-categories/?${params.toString()}`;
			const response = await apiRequest.get(endpoint);

			return response.data as IPaginatedResponse<IAssetCategory>;
		} catch (error) {
			console.error("Error fetching paginated asset categories:", error);
			throw error;
		}
	},

	getPaginatedFromUrl: async ({
		url,
	}: {
		url: string;
	}): Promise<IPaginatedResponse<IAssetCategory>> => {
		const response = await apiRequest.get(forceUrlToHttps(url));

		return response.data as IPaginatedResponse<IAssetCategory>;
	},

	getById: async (id: number): Promise<IAssetCategory> => {
		try {
			const response = await apiRequest.get(`/assets/asset-categories/${id}/`);

			return response.data;
		} catch (error) {
			console.error("Error fetching asset category:", error);
			throw error;
		}
	},

	create: async (data: IAssetCategoryFormData): Promise<IAssetCategory> => {
		try {
			const response = await apiRequest.post("/assets/asset-categories/", data);

			return response.data;
		} catch (error) {
			console.error("Error creating asset category:", error);
			throw error;
		}
	},

	update: async (id: number, data: Partial<IAssetCategoryFormData>): Promise<IAssetCategory> => {
		try {
			const response = await apiRequest.patch(`/assets/asset-categories/${id}/`, data);

			return response.data;
		} catch (error) {
			console.error("Error updating asset category:", error);
			throw error;
		}
	},

	delete: async (id: number): Promise<boolean> => {
		try {
			const response = await apiRequest.delete(`/assets/asset-categories/${id}/`);

			return response.status === 204;
		} catch (error) {
			console.error("Error deleting asset category:", error);
			throw error;
		}
	},
};

// Asset API functions
export const assetsAPI = {
	getAll: async (): Promise<IAsset[]> => {
		try {
			const response = await apiRequest.get("/assets/");

			return response.data.results || response.data;
		} catch (error) {
			console.error("Error fetching assets:", error);
			throw error;
		}
	},

	getPaginated: async ({
		institutionId,
		page = 1,
		search,
		status,
		category,
		ordering,
	}: {
		institutionId: number;
		page?: number;
		search?: string;
		status?: string;
		category?: string;
		ordering?: string;
	}): Promise<IPaginatedResponse<IAsset>> => {
		try {
			const params = new URLSearchParams({
				page: page.toString(),
			});

			if (search) {
				params.append("search", search);
			}
			if (status && status !== "all") {
				params.append("status", status);
			}
			if (category && category !== "all") {
				params.append("category", category);
			}
			ordering && params.append("ordering", ordering);
			const endpoint = `/assets/?${params.toString()}`;
			const response = await apiRequest.get(endpoint);

			return response.data as IPaginatedResponse<IAsset>;
		} catch (error) {
			console.error("Error fetching paginated assets:", error);
			throw error;
		}
	},

	getPaginatedFromUrl: async ({ url }: { url: string }): Promise<IPaginatedResponse<IAsset>> => {
		try {
			const response = await apiRequest.get(forceUrlToHttps(url));

			return response.data as IPaginatedResponse<IAsset>;
		} catch (error) {
			console.error("Error fetching assets from URL:", error);
			throw error;
		}
	},

	getById: async (id: number): Promise<IAsset> => {
		try {
			const response = await apiRequest.get(`/assets/${id}/`);

			return response.data;
		} catch (error) {
			console.error("Error fetching asset:", error);
			throw error;
		}
	},

	create: async (data: IAssetFormData): Promise<IAsset> => {
		try {
			const response = await apiRequest.post("/assets/", data);

			return response.data;
		} catch (error) {
			console.error("Error creating asset:", error);
			throw error;
		}
	},

	update: async (id: number, data: Partial<IAssetFormData>): Promise<IAsset> => {
		try {
			const response = await apiRequest.patch(`/assets/${id}/`, data);

			return response.data;
		} catch (error) {
			console.error("Error updating asset:", error);
			throw error;
		}
	},

	delete: async (id: number): Promise<boolean> => {
		try {
			const response = await apiRequest.delete(`/assets/${id}/`);

			return response.status === 204;
		} catch (error) {
			console.error("Error deleting asset:", error);
			throw error;
		}
	},

	// Asset Request API methods
	getAssetRequests: async (): Promise<IAssetRequest[]> => {
		try {
			const response = await apiRequest.get("/assets/asset-requests/");

			return response.data.results || response.data;
		} catch (error) {
			console.error("Error fetching asset requests:", error);
			throw error;
		}
	},

	getPaginatedAssetRequests: async ({
		institutionId,
		page = 1,
		search,
		employeeId,
		status,
		ordering,
	}: {
		institutionId: number;
		page?: number;
		search?: string;
		status?: string;
		employeeId?: string;
		ordering?: string;
	}): Promise<IPaginatedResponse<IAssetRequest>> => {
		try {
			const params = new URLSearchParams({
				page: page.toString(),
			});

			if (search) {
				params.append("search", search);
			}
			if (status && status !== "all") {
				params.append("asset_request_status", status);
			}
			if (employeeId) {
				params.append("employee_id", employeeId);
			}
			ordering && params.append("ordering", ordering);
			const endpoint = `/assets/asset-requests/?${params.toString()}`;
			const response = await apiRequest.get(endpoint);

			return response.data as IPaginatedResponse<IAssetRequest>;
		} catch (error: any) {
			if (
				error?.response?.data?.detail?.includes("has no profile") ||
				error?.detail?.includes("has no profile") ||
				error?.message?.includes("has no profile")
			) {
			}

			throw error;
		}
	},

	getPaginatedAssetRequestsFromUrl: async ({
		url,
	}: {
		url: string;
	}): Promise<IPaginatedResponse<IAssetRequest>> => {
		try {
			const response = await apiRequest.get(forceUrlToHttps(url));

			return response.data as IPaginatedResponse<IAssetRequest>;
		} catch (error) {
			console.error("Error fetching asset requests from URL:", error);
			throw error;
		}
	},

	getAssetRequestById: async (id: number): Promise<IAssetRequest> => {
		try {
			const response = await apiRequest.get(`/assets/asset-requests/${id}/`);

			return response.data;
		} catch (error) {
			console.error("Error fetching asset request:", error);
			throw error;
		}
	},

	createAssetRequest: async (data: IAssetRequestFormData): Promise<IAssetRequest> => {
		try {
			const response = await apiRequest.post("/assets/asset-requests/", data);

			return response.data;
		} catch (error) {
			console.error("Error creating asset request:", error);
			throw error;
		}
	},

	updateAssetRequest: async (
		id: number,
		data: Partial<IAssetRequestFormData>,
	): Promise<IAssetRequest> => {
		try {
			const response = await apiRequest.patch(`/assets/asset-requests/${id}/`, data);

			return response.data;
		} catch (error) {
			console.error("Error updating asset request:", error);
			throw error;
		}
	},

	deleteAssetRequest: async (id: number): Promise<boolean> => {
		try {
			const response = await apiRequest.delete(`/assets/asset-requests/${id}/`);

			return response.status === 204;
		} catch (error) {
			console.error("Error deleting asset request:", error);
			throw error;
		}
	},

	// Asset Allocation API methods
	getAssetAllocations: async (): Promise<IAssetAllocation[]> => {
		try {
			const response = await apiRequest.get("/assets/asset-allocations/");

			return response.data.results || response.data;
		} catch (error) {
			console.error("Error fetching asset allocations:", error);
			throw error;
		}
	},

	getPaginatedAssetAllocations: async ({
		institutionId,
		page = 1,
		search,
		status,
		employeeId,
		ordering,
	}: {
		institutionId: number;
		page?: number;
		search?: string;
		status?: string;
		employeeId?: string;
		ordering?: string;
	}): Promise<IPaginatedResponse<IAssetAllocation>> => {
		try {
			const params = new URLSearchParams({
				page: page.toString(),
			});

			if (search) {
				params.append("search", search);
			}
			if (status && status !== "all") {
				params.append("allocation_status", status);
			}
			if (employeeId) {
				params.append("employee_id", employeeId);
			}
			ordering && params.append("ordering", ordering);
			const endpoint = `/assets/asset-allocations/?${params.toString()}`;
			const response = await apiRequest.get(endpoint);

			return response.data as IPaginatedResponse<IAssetAllocation>;
		} catch (error) {
			throw error;
		}
	},

	getPaginatedAssetAllocationsFromUrl: async ({
		url,
	}: {
		url: string;
	}): Promise<IPaginatedResponse<IAssetAllocation>> => {
		try {
			const response = await apiRequest.get(forceUrlToHttps(url));

			return response.data as IPaginatedResponse<IAssetAllocation>;
		} catch (error) {
			console.error("Error fetching asset allocations from URL:", error);
			throw error;
		}
	},

	getAssetAllocationById: async (id: number): Promise<IAssetAllocation> => {
		try {
			const response = await apiRequest.get(`/assets/asset-allocations/${id}/`);

			return response.data;
		} catch (error) {
			console.error("Error fetching asset allocation:", error);
			throw error;
		}
	},

	createAssetAllocation: async (data: IAssetAllocationFormData): Promise<IAssetAllocation> => {
		try {
			const response = await apiRequest.post("/assets/asset-allocations/", data);

			return response.data;
		} catch (error) {
			console.error("Error creating asset allocation:", error);
			throw error;
		}
	},

	updateAssetAllocation: async (
		id: number,
		data: Partial<IAssetAllocationFormData>,
	): Promise<IAssetAllocation> => {
		try {
			const response = await apiRequest.patch(`/assets/asset-allocations/${id}/`, data);

			return response.data;
		} catch (error) {
			console.error("Error updating asset allocation:", error);
			throw error;
		}
	},

	deleteAssetAllocation: async (id: number): Promise<boolean> => {
		try {
			const response = await apiRequest.delete(`/assets/asset-allocations/${id}/`);

			return response.status === 204;
		} catch (error) {
			console.error("Error deleting asset allocation:", error);
			throw error;
		}
	},

	approveAssetAllocation: async (
		id: number,
		action: "completed" | "rejected",
		comment?: string,
	): Promise<any> => {
		try {
			const response = await apiRequest.patch(`workflow/task/${id}/status/`, {
				status: action,
				comment: comment || "",
			});

			return response.data;
		} catch (error) {
			console.error("Error approving/rejecting asset allocation:", error);
			throw error;
		}
	},

	// Asset Request Approval API method
	approveAssetRequest: async (
		id: number,
		new_status: "completed" | "rejected",
		comment?: string,
	): Promise<any> => {
		try {
			const response = await apiRequest.patch(`workflow/task/${id}/status/`, {
				status: new_status,
				comment: comment || "",
			});

			return response.data;
		} catch (error) {
			console.error("Error approving/rejecting asset request:", error);
			throw error;
		}
	},

	// Asset Return API methods
	getAssetReturns: async (): Promise<IAssetReturn[]> => {
		try {
			const response = await apiRequest.get("/assets/asset-returns/");

			// console.log("Asset Returns response", response);
			return response.data.results || response.data;
		} catch (error) {
			console.error("Error fetching asset returns:", error);
			throw error;
		}
	},

	getPaginatedAssetReturns: async ({
		institutionId,
		page = 1,
		search,
		condition,
		ordering,
	}: {
		institutionId: number;
		page?: number;
		search?: string;
		condition?: string;
		ordering?: string;
	}): Promise<IPaginatedResponse<IAssetReturn>> => {
		try {
			const params = new URLSearchParams({
				page: page.toString(),
			});

			if (search) {
				params.append("search", search);
			}
			if (condition && condition !== "all") {
				params.append("condition", condition);
			}
			ordering && params.append("ordering", ordering);
			const endpoint = `/assets/asset-returns/?${params.toString()}`;
			const response = await apiRequest.get(endpoint);

			return response.data as IPaginatedResponse<IAssetReturn>;
		} catch (error) {
			console.error("Error fetching paginated asset returns:", error);
			throw error;
		}
	},

	getPaginatedAssetReturnsFromUrl: async ({
		url,
	}: {
		url: string;
	}): Promise<IPaginatedResponse<IAssetReturn>> => {
		try {
			const response = await apiRequest.get(forceUrlToHttps(url));

			return response.data as IPaginatedResponse<IAssetReturn>;
		} catch (error) {
			console.error("Error fetching asset returns from URL:", error);
			throw error;
		}
	},

	getAssetReturnById: async (id: number): Promise<IAssetReturn> => {
		try {
			const response = await apiRequest.get(`/assets/asset-returns/${id}/`);

			return response.data;
		} catch (error) {
			console.error("Error fetching asset return:", error);
			throw error;
		}
	},

	createAssetReturn: async (data: IAssetReturnFormData): Promise<IAssetReturn> => {
		try {
			const response = await apiRequest.post("/assets/asset-returns/", data);

			return response.data;
		} catch (error) {
			console.error("Error creating asset return:", error);
			throw error;
		}
	},

	updateAssetReturn: async (
		id: number,
		data: Partial<IAssetReturnFormData>,
	): Promise<IAssetReturn> => {
		try {
			const response = await apiRequest.patch(`/assets/asset-returns/${id}/`, data);

			return response.data;
		} catch (error) {
			console.error("Error updating asset return:", error);
			throw error;
		}
	},

	deleteAssetReturn: async (id: number): Promise<boolean> => {
		try {
			const response = await apiRequest.delete(`/assets/asset-returns/${id}/`);

			return response.status === 204;
		} catch (error) {
			console.error("Error deleting asset return:", error);
			throw error;
		}
	},
};

export const employeeAPI = {
	getAll: async (institutionId: number): Promise<IEmployee[]> => {
		try {
			const response = await apiRequest.get(`/${institutionId}/employee/`);

			return response.data.results || response.data;
		} catch (error) {
			console.error("Error fetching employees:", error);
			throw error;
		}
	},
	getByUserId: async ({ user_id }: { user_id: number }) => {
		const response = await apiRequest.get(`/employee/${user_id}/?by_user=true`);

		return response.data as IEmployee;
	},

	getQualificationAwards: async () => {
		const response = await apiRequest.get(`/employee/qualification-awards/`);

		return response.data as IQualificationAward[];
	},
};

// Calendar API functions
export const calendarAPI = {
	// Get calendar data for a specific institution and year
	getInstitutionCalendar: async ({ year }: { year: number; url?: string }) => {
		const response = await apiRequest.get(`calendar/institutions-calendar/?year=${year}`);

		if (response.status === 200) {
			return response.data as ICalendar;
		} else {
			throw new Error("Failed to fetch calendar data");
		}
	},

	// Get all events for an institution
	getEvents: async () => {
		const response = await apiRequest.get(`calendar/events/`);

		if (response.status === 200) {
			return response.data as IPaginatedResponse<IEvent>;
		} else {
			throw new Error("Failed to fetch events");
		}
	},

	// Create a new event
	createEvent: async (eventData: {
		institution: number;
		title: string;
		description: string;
		date: string;
		target_audience: "all" | "department" | "individual" | "specific_employees";
		event_mode: "physical" | "online" | "hybrid";
		department?: string;
		specific_employees?: string[];
	}) => {
		const response = await apiRequest.post("calendar/events/", eventData);

		if (response.status === 201) {
			return response.data;
		} else {
			throw new Error("Failed to create event");
		}
	},

	// Update an existing event
	updateEvent: async (
		eventId: number,
		eventData: {
			title?: string;
			description?: string;
			date?: string;
			target_audience?: "all" | "department" | "individual" | "specific_employees";
			event_mode?: "physical" | "online" | "hybrid";
			department?: string;
			specific_employees?: string[];
		},
	) => {
		const response = await apiRequest.patch(`calendar/events/${eventId}/`, eventData);

		if (response.status === 200) {
			return response.data;
		} else {
			throw new Error("Failed to update event");
		}
	},

	// Delete an event
	deleteEvent: async (eventId: number) => {
		const response = await apiRequest.delete(`calendar/events/${eventId}/`);

		if (response.status === 204) {
			return true;
		} else {
			throw new Error("Failed to delete event");
		}
	},

	// Get a specific event by ID
	getEvent: async (eventId: number) => {
		const response = await apiRequest.get(`calendar/events/${eventId}/`);

		if (response.status === 200) {
			return response.data;
		} else {
			throw new Error("Failed to fetch event");
		}
	},

	// Get public holidays for an institution
	getPublicHolidays: async (institutionId: number) => {
		const response = await apiRequest.get(`calendar/public-holidays/?institution=${institutionId}`);

		if (response.status === 200) {
			return response.data;
		} else {
			throw new Error("Failed to fetch public holidays");
		}
	},

	// Create a new public holiday
	createPublicHoliday: async (holidayData: {
		institution: number;
		title: string;
		date: string;
	}) => {
		const response = await apiRequest.post("calendar/public-holidays/", holidayData);

		if (response.status === 201) {
			return response.data;
		} else {
			throw new Error("Failed to create public holiday");
		}
	},

	// Update a public holiday
	updatePublicHoliday: async (
		holidayId: number,
		holidayData: {
			title?: string;
			date?: string;
		},
	) => {
		const response = await apiRequest.patch(`calendar/public-holidays/${holidayId}/`, holidayData);

		if (response.status === 200) {
			return response.data;
		} else {
			throw new Error("Failed to update public holiday");
		}
	},

	// Delete a public holiday
	deletePublicHoliday: async (holidayId: number) => {
		const response = await apiRequest.delete(`calendar/public-holidays/${holidayId}/`, {
			method: "DELETE",
		});

		if (response.status === 204) {
			return true;
		} else {
			throw new Error("Failed to delete public holiday");
		}
	},

	// Get calendar data for a specific month/year
	getMonthCalendar: async (institutionId: number, year: number, month: number) => {
		const response = await apiRequest.get(
			`calendar/institutions-calendar/?institution=${institutionId}&year=${year}&month=${month}`,
		);

		if (response.status === 200) {
			return response.data;
		} else {
			throw new Error("Failed to fetch month calendar");
		}
	},
};

// Separation Policies API Namespace
export const SeparationPoliciesAPI = {
	getAll: async ({
		institutionId,
		searchParams,
	}: {
		institutionId: number;
		searchParams?: URLSearchParams;
	}): Promise<IPaginatedResponse<ISeparationPolicy>> => {
		try {
			const response = await apiRequest.get(`on-boarding/separation-policies/?${searchParams}`);

			return response.data as IPaginatedResponse<ISeparationPolicy>;
		} catch (error) {
			throw error;
		}
	},

	getPaginated: async ({
		institutionId,
		page = 1,
		search,
		ordering,
	}: {
		institutionId: number;
		page?: number;
		search?: string;
		ordering?: string;
	}): Promise<IPaginatedResponse<ISeparationPolicy>> => {
		try {
			const params = new URLSearchParams({
				page: page.toString(),
			});

			if (search) {
				params.append("search", search);
			}
			ordering && params.append("ordering", ordering);
			const endpoint = `on-boarding/separation-policies/?${params.toString()}`;
			const response = await apiRequest.get(endpoint);

			return response.data as IPaginatedResponse<ISeparationPolicy>;
		} catch (error) {
			console.error("Error fetching paginated separation policies:", error);
			throw error;
		}
	},

	getPaginatedFromUrl: async ({
		url,
	}: {
		url: string;
	}): Promise<IPaginatedResponse<ISeparationPolicy>> => {
		try {
			const response = await apiRequest.get(forceUrlToHttps(url));

			return response.data as IPaginatedResponse<ISeparationPolicy>;
		} catch (error) {
			console.error("Error fetching separation policies from URL:", error);
			throw error;
		}
	},

	getById: async (policyId: number): Promise<ISeparationPolicy | null> => {
		try {
			const response = await apiRequest.get(`on-boarding/separation-policies/${policyId}/`);

			return response.data as ISeparationPolicy;
		} catch (error) {
			throw error;
		}
	},

	create: async ({
		policyData,
	}: {
		policyData: Partial<ISeparationPolicy>;
	}): Promise<ISeparationPolicy | null> => {
		try {
			const response = await apiRequest.post("on-boarding/separation-policies/", policyData);

			return response.data as ISeparationPolicy;
		} catch (error) {
			throw error;
		}
	},

	update: async ({
		policyId,
		policyData,
	}: {
		policyId: number;
		policyData: Partial<ISeparationPolicy>;
	}): Promise<ISeparationPolicy | null> => {
		try {
			const response = await apiRequest.patch(
				`on-boarding/separation-policies/${policyId}/`,
				policyData,
			);

			return response.data as ISeparationPolicy;
		} catch (error) {
			throw error;
		}
	},

	delete: async (policyId: number): Promise<boolean> => {
		try {
			await apiRequest.delete(`on-boarding/separation-policies/${policyId}/`);

			return true;
		} catch (error) {
			throw error;
		}
	},
};

export async function fetchAttendanceData(startDate?: string, endDate?: string) {
	let endpoint = "employee/attendance-data/";

	const params = new URLSearchParams();

	if (startDate) {
		params.append("start_date", startDate);
	}
	if (endDate) {
		params.append("end_date", endDate);
	}

	if (params.toString()) {
		endpoint += `?${params.toString()}`;
	}

	const response = await apiRequest.get(endpoint);

	return response.data as AttendanceResponse;
}

export const showErrorToast = ({
	error,
	defaultMessage,
}: {
	error: any;
	defaultMessage?: string;
}) => {
	const errorMessage =
		typeof error?.detail === "string"
			? error.detail
			: typeof error?.error === "string"
				? error.error
				: typeof error?.message === "string"
					? error.message
					: defaultMessage;

	toast.error(errorMessage);
};

export const showSuccessToast = (message: string) => {
	toast.success(message);
};

// Spotcheck API functions
export const spotcheckAPI = {
	getPaginated: async ({
		institutionId,
		scope,
		page = 1,
		search,
		status,
		ordering,
	}: {
		institutionId: number;
		scope: { type: "default" } | { type: "employee"; employee: IEmployee };
		page?: number;
		search?: string;
		status?: string;
		ordering?: string;
	}): Promise<IPaginatedResponse<ISpotCheck>> => {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (search) {
			params.append("search", search);
		}
		if (status && status !== "all") {
			params.append("status", status);
		}
		if (scope.type === "employee") {
			params.append("employee_id", scope.employee.id.toString());
		}
		ordering && params.append("ordering", ordering);
		const endpoint = `/spotcheck/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);

		return response.data as IPaginatedResponse<ISpotCheck>;
	},

	getPaginatedFromUrl: async ({
		url,
	}: {
		url: string;
	}): Promise<IPaginatedResponse<ISpotCheck>> => {
		try {
			const response = await apiRequest.get(forceUrlToHttps(url));

			return response.data as IPaginatedResponse<ISpotCheck>;
		} catch (error) {
			console.warn("Error fetching spotchecks from URL:", error);
			throw error;
		}
	},

	getById: async (id: number): Promise<ISpotCheck> => {
		try {
			const response = await apiRequest.get(`/spotcheck/${id}/details`);

			return response.data;
		} catch (error) {
			console.warn("Error fetching spotcheck:", error);
			throw error;
		}
	},

	getStatuses: async (): Promise<ISpotCheckStatus[]> => {
		const response = await apiRequest.get("/spotcheck/statuses/");

		return response.data.results || response.data;
	},

	checkin: async ({
		spotCheckId,
		data,
	}: {
		spotCheckId: number;
		data: ILocation;
	}): Promise<ISpotCheck> => {
		const response = await apiRequest.patch(`/spotcheck/${spotCheckId}/checkin/`, data);

		return response.data;
	},

	create: async (data: Partial<ISpotCheckFormData>) => {
		const response = await apiRequest.post("/spotcheck/create/", data);

		return response.data as ISpotCheck;
	},

	update: async (id: number, data: any): Promise<ISpotCheck> => {
		const response = await apiRequest.patch(`/spotcheck/${id}/`, data);

		return response.data;
	},

	delete: async (id: number): Promise<boolean> => {
		const response = await apiRequest.delete(`/spotcheck/${id}/`);

		return response.status === 204;
	},

	CONFIGS: {
		INSTITUTION: {
			getByInstitution: async ({ institutionId }: { institutionId: number }) => {
				const endpoint = `/spotcheck/institution/${institutionId}/setting/details/`;
				const response = await apiRequest.get(endpoint);

				return response.data as IInstitutionSpotCheckSetting;
			},

			create: async ({
				institutionId,
				data,
			}: {
				institutionId: number;
				data: IInstitutionSpotCheckSettingFormData;
			}) => {
				const response = await apiRequest.post(
					`spotcheck/institution/${institutionId}/setting/`,
					data,
				);

				return response.data as IInstitutionSpotCheckSetting;
			},

			update: async ({
				institutionId,
				data,
			}: {
				institutionId: number;
				data: Partial<IInstitutionSpotCheckSettingFormData>;
			}) => {
				const response = await apiRequest.patch(
					`spotcheck/institution/${institutionId}/setting/update/`,
					data,
				);

				return response.data as IInstitutionSpotCheckSetting;
			},
		},

		BRANCH: {
			getByBranch: async ({ branchId }: { branchId: number }) => {
				const endpoint = `/spotcheck/branch/${branchId}/setting/details/`;
				const response = await apiRequest.get(endpoint);

				return response.data as IBranchSpotCheckSetting;
			},

			create: async ({
				branchId,
				data,
			}: {
				branchId: number;
				data: IBranchSpotCheckSettingFormData;
			}) => {
				const response = await apiRequest.post(`spotcheck/branch/${branchId}/setting/`, data);

				return response.data as IBranchSpotCheckSetting;
			},

			update: async ({
				branchId,
				data,
			}: {
				branchId: number;
				data: Partial<IBranchSpotCheckSettingFormData>;
			}) => {
				const response = await apiRequest.patch(
					`spotcheck/branch/${branchId}/setting/update/`,
					data,
				);

				return response.data as IBranchSpotCheckSetting;
			},
		},

		EMPLOYEE: {
			getByEmployee: async ({ employeeId }: { employeeId: number }) => {
				const endpoint = `spotcheck/employee/${employeeId}/setting/details`;
				const response = await apiRequest.get(endpoint);

				return response.data as IEmployeeSpotCheckSetting;
			},

			create: async ({
				employeeId,
				data,
			}: {
				employeeId: number;
				data: IEmployeeSpotCheckSettingFormData;
			}) => {
				const response = await apiRequest.post(`spotcheck/employee/${employeeId}/setting/`, data);

				return response.data as IEmployeeSpotCheckSetting;
			},

			update: async ({
				employeeId,
				data,
			}: {
				employeeId: number;
				data: Partial<IEmployeeSpotCheckSettingFormData>;
			}) => {
				const response = await apiRequest.patch(
					`spotcheck/employee/${employeeId}/setting/update/`,
					data,
				);

				return response.data as IEmployeeSpotCheckSetting;
			},
		},
	},
};

// Penalty Configuration API functions
export const penaltyConfigAPI = {
	// Institution Penalty Config
	getInstitutionPenaltyConfigs: async ({
		institutionId,
		page = 1,
		search,
		penalty_type,
		ordering,
	}: {
		institutionId: number;
		page?: number;
		search?: string;
		penalty_type?: string;
		ordering?: string;
	}): Promise<IPaginatedResponse<IInstitutionPenaltyConfig>> => {
		try {
			const params = new URLSearchParams({
				page: page.toString(),
			});

			if (search) {
				params.append("search", search);
			}
			if (penalty_type && penalty_type !== "all") {
				params.append("penalty_type", penalty_type);
			}
			ordering && params.append("ordering", ordering);
			const endpoint = `/institution/institution-penalties/?${params.toString()}`;
			const response = await apiRequest.get(endpoint);

			return response.data as IPaginatedResponse<IInstitutionPenaltyConfig>;
		} catch (error) {
			console.warn("Error fetching institution penalty configs:", error);
			throw error;
		}
	},

	getInstitutionPenaltyConfigsFromUrl: async ({
		url,
	}: {
		url: string;
	}): Promise<IPaginatedResponse<IInstitutionPenaltyConfig>> => {
		try {
			const response = await apiRequest.get(forceUrlToHttps(url));

			return response.data as IPaginatedResponse<IInstitutionPenaltyConfig>;
		} catch (error) {
			console.warn("Error fetching institution penalty configs from URL:", error);
			throw error;
		}
	},

	createInstitutionPenaltyConfig: async (
		data: IInstitutionPenaltyConfigFormData,
	): Promise<IInstitutionPenaltyConfig> => {
		try {
			const response = await apiRequest.post("/institution/institution-penalties/", data);

			return response.data;
		} catch (error) {
			console.error("Error creating institution penalty config:", error);
			throw error;
		}
	},

	updateInstitutionPenaltyConfig: async (
		id: number,
		data: Partial<IInstitutionPenaltyConfigFormData>,
	): Promise<IInstitutionPenaltyConfig> => {
		try {
			const response = await apiRequest.patch(`/institution/institution-penalties/${id}/`, data);

			return response.data;
		} catch (error) {
			console.error("Error updating institution penalty config:", error);
			throw error;
		}
	},

	deleteInstitutionPenaltyConfig: async (id: number): Promise<boolean> => {
		try {
			const response = await apiRequest.delete(`/institution/institution-penalties/${id}/`);

			return response.marital_status;
		} catch (error) {
			console.error("Error deleting institution penalty config:", error);
			throw error;
		}
	},

	// Branch Penalty Config
	getBranchPenaltyConfigs: async ({
		branchId,
		page = 1,
		search,
		penalty_type,
		ordering,
	}: {
		branchId: number;
		page?: number;
		search?: string;
		penalty_type?: string;
		ordering?: string;
	}): Promise<IPaginatedResponse<IBranchPenaltyConfig>> => {
		try {
			const params = new URLSearchParams({
				page: page.toString(),
			});

			if (search) {
				params.append("search", search);
			}
			if (penalty_type && penalty_type !== "all") {
				params.append("penalty_type", penalty_type);
			}
			ordering && params.append("ordering", ordering);
			const endpoint = `/institution/branch-penalties/?branch_id=${branchId}&${params.toString()}`;
			const response = await apiRequest.get(endpoint);

			return response.data as IPaginatedResponse<IBranchPenaltyConfig>;
		} catch (error) {
			console.warn("Error fetching branch penalty configs:", error);
			throw error;
		}
	},

	createBranchPenaltyConfig: async (
		data: IBranchPenaltyConfigFormData,
	): Promise<IBranchPenaltyConfig> => {
		try {
			const response = await apiRequest.post("/institution/branch-penalties/", data);

			return response.data;
		} catch (error) {
			console.warn("Error creating branch penalty config:", error);
			throw error;
		}
	},

	updateBranchPenaltyConfig: async (
		id: number,
		data: Partial<IBranchPenaltyConfigFormData>,
	): Promise<IBranchPenaltyConfig> => {
		try {
			const response = await apiRequest.patch(`/institution/branch-penalties/${id}/`, data);

			return response.data;
		} catch (error) {
			console.error("Error updating branch penalty config:", error);
			throw error;
		}
	},

	deleteBranchPenaltyConfig: async (id: number): Promise<boolean> => {
		try {
			const response = await apiRequest.delete(`/institution/branch-penalties/${id}/`);

			return response.status === 204;
		} catch (error) {
			console.error("Error deleting branch penalty config:", error);
			throw error;
		}
	},

	getBranchPenaltyConfigsFromUrl: async ({
		url,
	}: {
		url: string;
	}): Promise<IPaginatedResponse<IBranchPenaltyConfig>> => {
		try {
			const response = await apiRequest.get(forceUrlToHttps(url));

			return response.data as IPaginatedResponse<IBranchPenaltyConfig>;
		} catch (error) {
			console.warn("Error fetching branch penalty configs from URL:", error);
			throw error;
		}
	},
};

// Branch Location Comparison Config API functions
export const branchLocationComparisonConfigAPI = {
	getBranchLocationComparisonConfigs: async ({
		branchId,
		page = 1,
		search,
		ordering,
	}: {
		branchId: number;
		page?: number;
		search?: string;
		ordering?: string;
	}): Promise<IPaginatedResponse<IBranchLocationComparisonConfig>> => {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (search) {
			params.append("search", search);
		}
		params.append("branch_id", branchId.toString());
		ordering && params.append("ordering", ordering);
		const response = await apiRequest.get(
			`/institution/branch-location-comparison/?${params.toString()}`,
		);

		return response.data as IPaginatedResponse<IBranchLocationComparisonConfig>;
	},

	getBranchLocationComparisonConfigsFromUrl: async ({
		url,
	}: {
		url: string;
	}): Promise<IPaginatedResponse<IBranchLocationComparisonConfig>> => {
		try {
			const response = await apiRequest.get(forceUrlToHttps(url));

			return response.data as IPaginatedResponse<IBranchLocationComparisonConfig>;
		} catch (error) {
			console.warn("Error fetching branch location comparison configs from URL:", error);
			throw error;
		}
	},

	createBranchLocationComparisonConfig: async (
		data: IBranchLocationComparisonConfigFormData,
	): Promise<IBranchLocationComparisonConfig> => {
		try {
			const response = await apiRequest.post("/institution/branch-location-comparison/", data);

			return response.data as IBranchLocationComparisonConfig;
		} catch (error) {
			console.warn("Error creating branch location comparison config:", error);
			throw error;
		}
	},

	updateBranchLocationComparisonConfig: async (
		id: number,
		data: IBranchLocationComparisonConfigFormData,
	): Promise<IBranchLocationComparisonConfig> => {
		try {
			const response = await apiRequest.patch(
				`/institution/branch-location-comparison/${id}/`,
				data,
			);

			return response.data as IBranchLocationComparisonConfig;
		} catch (error) {
			console.warn("Error updating branch location comparison config:", error);
			throw error;
		}
	},

	deleteBranchLocationComparisonConfig: async (id: number): Promise<boolean> => {
		try {
			const response = await apiRequest.delete(`/institution/branch-location-comparison/${id}/`);

			return response;
		} catch (error) {
			console.warn("Error deleting branch location comparison config:", error);
			throw error;
		}
	},
};

export const shiftsAPI = {
	BRANCH: {
		getAll: async (args: {
			branch_id: number;
			search?: string;
			page?: number;
			ordering?: string;
		}) => {
			const params = new URLSearchParams();

			Object.entries(args).forEach(([key, value]) => {
				if (value !== undefined && value !== null) {
					params.append(key, value.toString());
				}
			});

			const response = await apiRequest.get(
				`/institution/branch-shifts/${args.branch_id}/?${params.toString()}`,
			);

			return response.data as IPaginatedResponse<IBranchShift>;
		},
		getById: async (shiftId: number) => {
			const response = await apiRequest.get(`/institution/branch-shifts/detail/${shiftId}/`);

			return response.data as IBranchShift;
		},
		create: async (data: IBranchShiftFormData) => {
			const response = await apiRequest.post(`/institution/branch-shifts/`, data);

			return response.data as IBranchShift;
		},
		update: async (shiftId: number, data: Partial<IBranchShiftFormData>) => {
			const response = await apiRequest.patch(`/institution/branch-shifts/${shiftId}/`, data);

			return response.data as IBranchShift;
		},
		delete: async (shiftId: number) => {
			const response = await apiRequest.delete(`/institution/branch-shifts/${shiftId}/`);

			return response.status === 204;
		},
		getPaginatedFromUrl: async ({ url }: { url: string }) => {
			const response = await apiRequest.get(url);

			return response.data as IPaginatedResponse<IBranchShift>;
		},
	},
	EMPLOYEE: {
		getPaginatedForEmployee: async ({
			employee_id,
			search,
			page = 1,
			ordering,
		}: {
			employee_id: number;
			search?: string;
			page?: number;
			ordering?: string;
		}) => {
			const params = new URLSearchParams();

			params.append("is_employee_specific", "true");
			params.append("employee_id", employee_id.toString());
			search && params.append("search", search);
			ordering && params.append("ordering", ordering);

			params.append("page", page.toString());
			ordering && params.append("ordering", ordering);
			const response = await apiRequest.get(`/employee/employee-shifts/?${params.toString()}`);

			return response.data as IPaginatedResponse<IEmployeeShift>;
		},
		getPaginatedForInstitution: async ({
			search,
			page = 1,
		}: {
			search?: string;
			page?: number;
		}) => {
			const params = new URLSearchParams();

			params.append("is_employee_specific", "false");
			params.append("page", page.toString());
			if (search) {
				params.append("search", search);
			}
			const response = await apiRequest.get(`/employee/employee-shifts/?${params.toString()}`);

			return response.data as IPaginatedResponse<IEmployeeShift>;
		},
		getById: async (shiftId: number) => {
			const response = await apiRequest.get(`/employee/employee-shifts/detail/${shiftId}/`);

			return response.data as IEmployeeShift;
		},
		create: async (data: IEmployeeShiftFormData) => {
			const response = await apiRequest.post(`/employee/employee-shifts/`, data);

			return response.data as IEmployeeShift;
		},
		update: async (shiftId: number, data: Partial<IEmployeeShiftFormData>) => {
			const response = await apiRequest.patch(`/employee/employee-shifts/${shiftId}/`, data);

			return response.data as IEmployeeShift;
		},
		delete: async (shiftId: number) => {
			const response = await apiRequest.delete(`/employee/employee-shifts/${shiftId}/`);

			return response.status === 204;
		},
		getPaginatedFromUrl: async ({
			url,
			is_employee_specific,
			employee_id,
		}: {
			url: string;
			is_employee_specific: boolean;
			employee_id?: number;
		}) => {
			const separator = url.includes("?") ? "&" : "?";

			url = `${url}${separator}is_employee_specific=${is_employee_specific}&employee_id=${employee_id}`;
			const response = await apiRequest.get(url);

			return response.data as IPaginatedResponse<IEmployeeShift>;
		},
	},
	COMMON: {},
};

export const penaltiesAPI = {
	EMPLOYEE: {
		getPaginated: async (args: {
			employee_id: number;
			search?: string;
			page?: number;
			penalty_type?: IPenaltyType;
			date_from?: string;
			date_to?: string;
		}) => {
			const params = new URLSearchParams();

			Object.entries(args).forEach(([key, value]) => {
				if (value !== undefined && value !== null) {
					params.append(key, value.toString());
				}
			});

			const response = await apiRequest.get(`/payroll/penalties/?${params.toString()}`);

			return response.data as IPaginatedResponse<IEmployeePenalty>;
		},
		getById: async (penaltyId: number) => {
			const response = await apiRequest.get(`/payroll/penalties/${penaltyId}/`);

			return response.data as IEmployeePenalty;
		},
		create: async (
			data: IEmployeePenaltyFormData & {
				target_employees?: number[];
				target_departments?: number[];
				target_job_positions?: number[];
			},
		) => {
			const response = await apiRequest.post(`/payroll/penalties/`, data);

			return response.data as IEmployeePenalty;
		},
		update: async (
			penaltyId: number,
			data: Partial<IEmployeePenaltyFormData> & {
				target_employees?: number[];
				target_departments?: number[];
				target_job_positions?: number[];
			},
		) => {
			const response = await apiRequest.patch(`/payroll/penalties/${penaltyId}/`, data);

			return response.data as IEmployeePenalty;
		},
		delete: async (penaltyId: number) => {
			await apiRequest.delete(`/payroll/penalties/${penaltyId}/`);
		},
	},

	COMMON: {
		getPaginatedFromUrl: async ({ url }: { url: string }) => {
			const response = await apiRequest.get(url);

			return response.data as IPaginatedResponse<IEmployeePenalty>;
		},
	},
};

export const branchesAPI = {
	WORKING_DAYS: {
		getAll: async ({ branchId }: { branchId: number }): Promise<IBranchWorkingDays | null> => {
			const response = await apiRequest.get(
				`/institution/branch-working-days/?branch_id=${branchId}`,
			);

			return response.data as IBranchWorkingDays;
		},
		create: async (data: {
			branch_days: Array<{ day_id: number; day_type: "REMOTE" | "PHYSICAL" }>;
		}): Promise<IBranchWorkingDays | null> => {
			const response = await apiRequest.post(`/institution/branch-working-days/`, data);

			return response.data as IBranchWorkingDays;
		},

		update: async (
			branchDaysId: number,
			data: { branch_days: Array<{ day_id: number; day_type: "REMOTE" | "PHYSICAL" }> },
		): Promise<IBranchWorkingDays | null> => {
			const response = await apiRequest.patch(
				`/institution/branch-working-day-detail/${branchDaysId}/`,
				data,
			);

			return response.data as IBranchWorkingDays;
		},
	},
};

export const usersAPI = {
	getProfilesByInstitutionId: async ({ institutionId }: { institutionId: number }) => {
		const response = await apiRequest.get(`/institution/profile/${institutionId}/`);

		return response.data as IPaginatedResponse<UserProfile>;
	},
};

export const PROFILES_API = {
	getPaginatedUserProfiles: async ({
		page = 1,
		search,
		ordering,
	}: {
		page?: number;
		search?: string;
		ordering?: string;
	}) => {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (search) {
			params.append("search", search);
		}
		ordering && params.append("ordering", ordering);
		const endpoint = `institution/profile/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);

		return response.data as IPaginatedResponse<UserProfile>;
	},

	getPaginatedUserProfilesFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(forceUrlToHttps(url));

		return response.data as IPaginatedResponse<UserProfile>;
	},
};

export const PROJECTS_API = {
	getPaginatedProjects: async ({
		institutionId,
		page = 1,
		search,
		ordering,
	}: {
		institutionId: number;
		page?: number;
		search?: string;
		ordering?: string;
	}) => {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (search) {
			params.append("search", search);
		}
		ordering && params.append("ordering", ordering);
		const endpoint = `projects/projects/${institutionId}/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);

		return response.data as IPaginatedResponse<IProject>;
	},

	getPaginatedProjectsFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(forceUrlToHttps(url));

		return response.data as IPaginatedResponse<IProject>;
	},

	create: async ({ institutionId, data }: { institutionId: number; data: IProjectFormData }) => {
		const response = await apiRequest.post(`/projects/projects/${institutionId}/`, data);

		return response.data as IProject;
	},

	update: async ({ project_id, data }: { project_id: number; data: Partial<IProjectFormData> }) => {
		const response = await apiRequest.patch(`/projects/projects/${project_id}/details/`, data);

		return response.data as IProject;
	},
	delete: async ({ project_id }: { project_id: number }) => {
		await apiRequest.delete(`/projects/projects/${project_id}/details/`);
	},

	getByProjectById: async ({ project_id }: { project_id: number }) => {
		const response = await apiRequest.get(`/projects/projects/${project_id}/details/`);

		return response.data as IProject;
	},
};

export const PROJECTS_TASKS_API = {
	getPaginatedTasks: async ({
		projectId,
		page = 1,
		search,
		ordering,
	}: {
		projectId: number;
		page?: number;
		search?: string;
		ordering?: string;
	}) => {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (search) {
			params.append("search", search);
		}
		ordering && params.append("ordering", ordering);
		const endpoint = `projects/tasks/${projectId}/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);

		return response.data as IPaginatedResponse<IProjectTask>;
	},

	getPaginatedTasksFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(forceUrlToHttps(url));

		return response.data as IPaginatedResponse<IProjectTask>;
	},

	create: async ({ projectId, data }: { projectId: number; data: IProjectTaskFormData }) => {
		const response = await apiRequest.post(`projects/tasks/${projectId}/`, data);

		return response.data as IProjectTask;
	},

	update: async ({ taskId, data }: { taskId: number; data: Partial<IProjectTaskFormData> }) => {
		const response = await apiRequest.patch(`projects/tasks/${taskId}/details/`, data);

		return response.data as IProjectTask;
	},

	delete: async ({ taskId }: { taskId: number }) => {
		await apiRequest.delete(`projects/tasks/${taskId}/details/`);
	},

	getByTaskId: async ({ taskId }: { taskId: number }) => {
		const response = await apiRequest.get(`projects/tasks/${taskId}/details/`);

		return response.data as IProjectTask;
	},
};

export const PERIODS_API = {
	getPaginated: async ({
		page = 1,
		search,
		start_date,
		is_closed,
		ordering,
	}: {
		page?: number;
		search?: string;
		start_date?: string;
		is_closed?: boolean;
		ordering?: string;
	}) => {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (search) {
			params.append("search", search);
		}
		if (start_date) {
			params.append("start_date", start_date);
		}
		if (is_closed !== undefined) {
			params.append("is_closed", is_closed.toString());
		}
		if (ordering) {
			params.append("ordering", ordering);
		}
		const endpoint = `performance/periods/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);
		return response.data as IPaginatedResponse<IPeriod>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);
		return response.data as IPaginatedResponse<IPeriod>;
	},

	create: async ({ data }: { data: IPeriodFormData }) => {
		const response = await apiRequest.post(`performance/periods/`, data);
		return response.data as IPeriod;
	},

	update: async ({ periodId, data }: { periodId: number; data: Partial<IPeriodFormData> }) => {
		const response = await apiRequest.patch(`performance/periods/${periodId}/`, data);
		return response.data as IPeriod;
	},

	delete: async ({ periodId }: { periodId: number }) => {
		await apiRequest.delete(`performance/periods/${periodId}/`);
	},

	getById: async ({ periodId }: { periodId: number }) => {
		const response = await apiRequest.get(`performance/periods/${periodId}/`);
		return response.data as IPeriod;
	},
};

export const OBJECTIVES_API = {
	getPaginated: async ({
		page = 1,
		search,
		duration_unit,
		ordering,
	}: {
		page?: number;
		search?: string;
		duration_unit?: IDurationUnit;
		ordering?: string;
	}) => {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (search) {
			params.append("search", search);
		}
		if (duration_unit) {
			params.append("duration_unit", duration_unit);
		}
		if (ordering) {
			params.append("ordering", ordering);
		}
		const endpoint = `performance/objectives/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);
		return response.data as IPaginatedResponse<IObjective>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);
		return response.data as IPaginatedResponse<IObjective>;
	},

	create: async ({ data }: { data: IObjectiveFormData }) => {
		const response = await apiRequest.post(`performance/objectives/`, data);
		return response.data as IObjective;
	},

	update: async ({
		objectiveId,
		data,
	}: {
		objectiveId: number;
		data: Partial<IObjectiveFormData>;
	}) => {
		const response = await apiRequest.patch(`performance/objectives/${objectiveId}/`, data);
		return response.data as IObjective;
	},

	delete: async ({ objectiveId }: { objectiveId: number }) => {
		await apiRequest.delete(`performance/objectives/${objectiveId}/`);
	},

	getById: async ({ objectiveId }: { objectiveId: number }) => {
		const response = await apiRequest.get(`performance/objectives/${objectiveId}/`);
		return response.data as IObjective;
	},
};

export const EMPLOYEE_OBJECTIVES_API = {
	getPaginated: async ({
		page = 1,
		search,
		status,
		ordering,
	}: {
		page?: number;
		search?: string;
		status?: IObjectiveStatus;
		ordering?: string;
	}) => {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (search) {
			params.append("search", search);
		}
		if (status) {
			params.append("status", status);
		}
		if (ordering) {
			params.append("ordering", ordering);
		}
		const endpoint = `performance/employee-objectives/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);

		return response.data as IPaginatedResponse<IEmployeeObjective>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);

		return response.data as IPaginatedResponse<IEmployeeObjective>;
	},

	create: async ({ data }: { data: IEmployeeObjectiveFormData }) => {
		const response = await apiRequest.post(`performance/employee-objectives/`, data);

		return response.data as IEmployeeObjective;
	},

	update: async ({
		objectiveId,
		data,
	}: {
		objectiveId: number;
		data: Partial<IEmployeeObjectiveFormData>;
	}) => {
		const response = await apiRequest.patch(
			`performance/employee-objectives/${objectiveId}/`,
			data,
		);

		return response.data as IEmployeeObjective;
	},

	delete: async ({ objectiveId }: { objectiveId: number }) => {
		await apiRequest.delete(`performance/employee-objectives/${objectiveId}/`);
	},

	getById: async ({ objectiveId }: { objectiveId: number }) => {
		const response = await apiRequest.get(`performance/employee-objectives/${objectiveId}/`);

		return response.data as IEmployeeObjective;
	},
};

export const KEY_RESULTS_API = {
	getPaginated: async ({ page = 1, ordering }: { page?: number; ordering?: string }) => {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (ordering) {
			params.append("ordering", ordering);
		}
		const endpoint = `performance/key-results/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);

		return response.data as IPaginatedResponse<IKeyResult>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);

		return response.data as IPaginatedResponse<IKeyResult>;
	},

	create: async ({ data }: { data: IKeyResultFormData }) => {
		const response = await apiRequest.post(`performance/key-results/`, data);

		return response.data as IKeyResult;
	},

	update: async ({
		keyResultId,
		data,
	}: {
		keyResultId: number;
		data: Partial<IKeyResultFormData>;
	}) => {
		const response = await apiRequest.patch(`performance/key-results/${keyResultId}/`, data);

		return response.data as IKeyResult;
	},

	delete: async ({ keyResultId }: { keyResultId: number }) => {
		await apiRequest.delete(`performance/key-results/${keyResultId}/`);
	},

	getById: async ({ keyResultId }: { keyResultId: number }) => {
		const response = await apiRequest.get(`performance/key-results/${keyResultId}/`);

		return response.data as IKeyResult;
	},
};

export const FEEDBACK_360_API = {
	getPaginated: async ({ page = 1, ordering }: { page?: number; ordering?: string }) => {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (ordering) {
			params.append("ordering", ordering);
		}
		const endpoint = `performance/feedback/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);

		return response.data as IPaginatedResponse<IFeedback360>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);

		return response.data as IPaginatedResponse<IFeedback360>;
	},

	create: async ({ data }: { data: IFeedback360FormData }) => {
		const response = await apiRequest.post(`performance/feedback/`, data);

		return response.data as IFeedback360;
	},

	update: async ({
		feedbackId,
		data,
	}: {
		feedbackId: number;
		data: Partial<IFeedback360FormData>;
	}) => {
		const response = await apiRequest.patch(`performance/feedback/${feedbackId}/`, data);

		return response.data as IFeedback360;
	},

	delete: async ({ feedbackId }: { feedbackId: number }) => {
		await apiRequest.delete(`performance/feedback/${feedbackId}/`);
	},

	getById: async ({ feedbackId }: { feedbackId: number }) => {
		const response = await apiRequest.get(`performance/feedback/${feedbackId}/`);

		return response.data as IFeedback360;
	},
};

export const EMPLOYEE_BONUS_POINTS_API = {
	getPaginated: async ({ page = 1, ordering }: { page?: number; ordering?: string }) => {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (ordering) {
			params.append("ordering", ordering);
		}
		const endpoint = `performance/bonus-points/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);

		return response.data as IPaginatedResponse<IEmployeeBonusPoint>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);

		return response.data as IPaginatedResponse<IEmployeeBonusPoint>;
	},

	create: async ({ data }: { data: IEmployeeBonusPointFormData }) => {
		const response = await apiRequest.post(`performance/bonus-points/`, data);

		return response.data as IEmployeeBonusPoint;
	},

	update: async ({
		bonusPointId,
		data,
	}: {
		bonusPointId: number;
		data: Partial<IEmployeeBonusPointFormData>;
	}) => {
		const response = await apiRequest.patch(`performance/bonus-points/${bonusPointId}/`, data);

		return response.data as IEmployeeBonusPoint;
	},

	delete: async ({ bonusPointId }: { bonusPointId: number }) => {
		await apiRequest.delete(`performance/bonus-points/${bonusPointId}/`);
	},

	getById: async ({ bonusPointId }: { bonusPointId: number }) => {
		const response = await apiRequest.get(`performance/bonus-points/${bonusPointId}/`);

		return response.data as IEmployeeBonusPoint;
	},
};

export const QUESTION_TEMPLATES_API = {
	getPaginated: async ({ page = 1, ordering }: { page?: number; ordering?: string }) => {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (ordering) {
			params.append("ordering", ordering);
		}
		const endpoint = `performance/question-templates/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);

		return response.data as IPaginatedResponse<IQuestionTemplate>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);

		return response.data as IPaginatedResponse<IQuestionTemplate>;
	},

	create: async ({ data }: { data: IQuestionTemplateFormData }) => {
		const response = await apiRequest.post(`performance/question-templates/`, data);

		return response.data as IQuestionTemplate;
	},

	update: async ({
		templateId,
		data,
	}: {
		templateId: number;
		data: Partial<IQuestionTemplateFormData>;
	}) => {
		const response = await apiRequest.patch(`performance/question-templates/${templateId}/`, data);

		return response.data as IQuestionTemplate;
	},

	delete: async ({ templateId }: { templateId: number }) => {
		await apiRequest.delete(`performance/question-templates/${templateId}/`);
	},

	getById: async ({ templateId }: { templateId: number }) => {
		const response = await apiRequest.get(`performance/question-templates/${templateId}/`);

		return response.data as IQuestionTemplate;
	},
};

export const BONUS_POINT_SETTINGS_API = {
	getPaginated: async ({ page = 1, ordering }: { page?: number; ordering?: string }) => {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (ordering) {
			params.append("ordering", ordering);
		}
		const endpoint = `performance/bonus-point-settings/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);

		return response.data as IPaginatedResponse<IBonusPointSettings>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);

		return response.data as IPaginatedResponse<IBonusPointSettings>;
	},

	create: async ({ data }: { data: IBonusPointSettingsFormData }) => {
		const response = await apiRequest.post(`performance/bonus-point-settings/`, data);

		return response.data as IBonusPointSettings;
	},

	update: async ({
		settingsId,
		data,
	}: {
		settingsId: number;
		data: Partial<IBonusPointSettingsFormData>;
	}) => {
		const response = await apiRequest.patch(
			`performance/bonus-point-settings/${settingsId}/`,
			data,
		);

		return response.data as IBonusPointSettings;
	},

	delete: async ({ settingsId }: { settingsId: number }) => {
		await apiRequest.delete(`performance/bonus-point-settings/${settingsId}/`);
	},

	getById: async ({ settingsId }: { settingsId: number }) => {
		const response = await apiRequest.get(`performance/bonus-point-settings/${settingsId}/`);

		return response.data as IBonusPointSettings;
	},
};

export const MEETINGS_API = {
	getPaginated: async ({
		page = 1,
		search,
		mode,
		start_time,
		ordering,
	}: {
		page?: number;
		search?: string;
		mode?: IEventMode;
		start_time?: string;
		ordering?: string;
	}) => {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (search) {
			params.append("search", search);
		}
		if (mode) {
			params.append("mode", mode);
		}
		if (start_time) {
			params.append("start_time", start_time);
		}
		if (ordering) {
			params.append("ordering", ordering);
		}
		const endpoint = `performance/meetings/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);

		return response.data as IPaginatedResponse<IMeeting>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);

		return response.data as IPaginatedResponse<IMeeting>;
	},

	create: async ({ data }: { data: IMeetingFormData }) => {
		const response = await apiRequest.post(`performance/meetings/`, data);

		return response.data as IMeeting;
	},

	update: async ({ meetingId, data }: { meetingId: number; data: Partial<IMeetingFormData> }) => {
		const response = await apiRequest.patch(`performance/meetings/${meetingId}/`, data);

		return response.data as IMeeting;
	},

	delete: async ({ meetingId }: { meetingId: number }) => {
		await apiRequest.delete(`performance/meetings/${meetingId}/`);
	},

	getById: async ({ meetingId }: { meetingId: number }) => {
		const response = await apiRequest.get(`performance/meetings/${meetingId}/`);

		return response.data as IMeeting;
	},
};

export const PERFORMANCE_ANALYTICS_API = {
	get: async () => {
		const response = await apiRequest.get(`performance/analytics/`);

		return response.data;
	},
};
