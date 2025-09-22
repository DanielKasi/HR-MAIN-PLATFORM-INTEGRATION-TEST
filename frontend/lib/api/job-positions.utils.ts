import { IPaginatedResponse, JobApplication, JobApplicationFormData } from "@/types/types.utils";
import apiRequest from "../apiRequest";
import { forceUrlToHttps } from "../helpers";

export const JOB_APPLICATIONS_API = {
	getPaginated: async ({
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
	}) => {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (search) params.append("search", search);
		if (status && status !== "all") params.append("status", status);
		if (jobPositionAdvert && jobPositionAdvert !== "all")
			params.append("job_position_advert", jobPositionAdvert);
		if (ordering) params.append("ordering", ordering);

		const response = await apiRequest.get(
			`recruitment/institution/${institutionId}/job-application/?${params.toString()}`,
		);
		return response.data as IPaginatedResponse<JobApplication>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(forceUrlToHttps(url));
		return response.data as IPaginatedResponse<JobApplication>;
	},

	create: async ({
		institutionId,
		data,
	}: {
		institutionId: number;
		data: JobApplicationFormData;
	}) => {
		const formData = new FormData();
		Object.entries(data).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				formData.append(key, value as any);
			}
		});
		const response = await apiRequest.post(
			`recruitment/institution/${institutionId}/job-application/`,
			formData,
		);
		return response.data as JobApplication;
	},

	update: async ({
		applicationId,
		data,
	}: {
		applicationId: number;
		data: Partial<JobApplicationFormData>;
	}) => {
		const formData = new FormData();
		Object.entries(data).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				formData.append(key, value as any);
			}
		});
		const response = await apiRequest.patch(
			`recruitment/job-application/${applicationId}/`,
			formData,
		);
		return response.data as JobApplication;
	},

	getById: async ({ applicationId }: { applicationId: number }) => {
		const response = await apiRequest.get(`recruitment/job-application/${applicationId}/`);
		return response.data as JobApplication;
	},
};
