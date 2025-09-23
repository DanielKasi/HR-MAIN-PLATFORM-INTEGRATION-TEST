import apiRequest from "../apiRequest";
import type {
	IPerformanceConcernType,
	IPerformanceConcernTypeFormData,
	IPerformanceConcern,
	IPerformanceConcernFormData,
	IPIPSupportResourceType,
	IPIPSupportResourceTypeFormData,
	IPIPSupportResource,
	IPIPSupportResourceFormData,
	IPerformanceImprovementPlan,
	IPerformanceImprovementPlanFormData,
	IPIPEmployeeObjectives,
	IPIPEmployeeObjectivesFormData,
} from "@/types/performance.types";
import { IPaginatedResponse } from "@/types/other";

export const PERFORMANCE_CONCERN_TYPE_API = {
	getPaginated: async ({
		page = 1,
		search,
		created_at,
		ordering,
		institutionId,
	}: {
		page?: number;
		search?: string;
		created_at?: string;
		ordering?: string;
		institutionId: number;
	}) => {
		const params = new URLSearchParams({
			page: page.toString(),
			institution_id: institutionId.toString(),
		});
		if (search) params.append("search", search);
		if (created_at) params.append("created_at", created_at);
		if (ordering) params.append("ordering", ordering);

		const endpoint = `performance/concern-types/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);
		return response.data as IPaginatedResponse<IPerformanceConcernType>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);
		return response.data as IPaginatedResponse<IPerformanceConcernType>;
	},

	create: async ({ data }: { data: IPerformanceConcernTypeFormData }) => {
		const response = await apiRequest.post(`performance/concern-types/`, data);
		return response.data as IPerformanceConcernType;
	},

	update: async ({
		concernTypeId,
		data,
	}: {
		concernTypeId: number;
		data: Partial<IPerformanceConcernTypeFormData>;
	}) => {
		const response = await apiRequest.patch(`performance/concern-types/${concernTypeId}/`, data);
		return response.data as IPerformanceConcernType;
	},

	delete: async ({ concernTypeId }: { concernTypeId: number }) => {
		await apiRequest.delete(`performance/concern-types/${concernTypeId}/`);
	},

	getById: async ({ concernTypeId }: { concernTypeId: number }) => {
		const response = await apiRequest.get(`performance/concern-types/${concernTypeId}/`);
		return response.data as IPerformanceConcernType;
	},
};

// PerformanceConcern API
export const PERFORMANCE_CONCERN_API = {
	getPaginated: async ({
		page = 1,
		search,
		category,
		created_at,
		ordering,
		institutionId,
	}: {
		page?: number;
		search?: string;
		category?: number;
		created_at?: string;
		ordering?: string;
		institutionId: number;
	}) => {
		const params = new URLSearchParams({
			page: page.toString(),
			institution_id: institutionId.toString(),
		});
		if (search) params.append("search", search);
		if (category) params.append("category", category.toString());
		if (created_at) params.append("created_at", created_at);
		if (ordering) params.append("ordering", ordering);

		const endpoint = `performance/concerns/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);
		return response.data as IPaginatedResponse<IPerformanceConcern>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);
		return response.data as IPaginatedResponse<IPerformanceConcern>;
	},

	create: async ({ data }: { data: IPerformanceConcernFormData }) => {
		const response = await apiRequest.post(`performance/concerns/`, data);
		return response.data as IPerformanceConcern;
	},

	update: async ({
		concernId,
		data,
	}: {
		concernId: number;
		data: Partial<IPerformanceConcernFormData>;
	}) => {
		const response = await apiRequest.patch(`performance/concerns/${concernId}/`, data);
		return response.data as IPerformanceConcern;
	},

	delete: async ({ concernId }: { concernId: number }) => {
		await apiRequest.delete(`performance/concerns/${concernId}/`);
	},

	getById: async ({ concernId }: { concernId: number }) => {
		const response = await apiRequest.get(`performance/concerns/${concernId}/`);
		return response.data as IPerformanceConcern;
	},
};

// PIPSupportResourceType API
export const PIP_SUPPORT_RESOURCE_TYPE_API = {
	getPaginated: async ({
		page = 1,
		search,
		created_at,
		ordering,
		institutionId,
	}: {
		page?: number;
		search?: string;
		created_at?: string;
		ordering?: string;
		institutionId: number;
	}) => {
		const params = new URLSearchParams({
			page: page.toString(),
			institution_id: institutionId.toString(),
		});
		if (search) params.append("search", search);
		if (created_at) params.append("created_at", created_at);
		if (ordering) params.append("ordering", ordering);

		const endpoint = `performance/support-resource-types/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);
		return response.data as IPaginatedResponse<IPIPSupportResourceType>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);
		return response.data as IPaginatedResponse<IPIPSupportResourceType>;
	},

	create: async ({ data }: { data: IPIPSupportResourceTypeFormData }) => {
		const response = await apiRequest.post(`performance/support-resource-types/`, data);
		return response.data as IPIPSupportResourceType;
	},

	update: async ({
		resourceTypeId,
		data,
	}: {
		resourceTypeId: number;
		data: Partial<IPIPSupportResourceTypeFormData>;
	}) => {
		const response = await apiRequest.patch(
			`performance/support-resource-types/${resourceTypeId}/`,
			data,
		);
		return response.data as IPIPSupportResourceType;
	},

	delete: async ({ resourceTypeId }: { resourceTypeId: number }) => {
		await apiRequest.delete(`performance/support-resource-types/${resourceTypeId}/`);
	},

	getById: async ({ resourceTypeId }: { resourceTypeId: number }) => {
		const response = await apiRequest.get(`performance/support-resource-types/${resourceTypeId}/`);
		return response.data as IPIPSupportResourceType;
	},
};

// PIPSupportResource API
export const PIP_SUPPORT_RESOURCE_API = {
	getPaginated: async ({
		page = 1,
		search,
		created_at,
		ordering,
		institutionId,
	}: {
		page?: number;
		search?: string;
		created_at?: string;
		ordering?: string;
		institutionId: number;
	}) => {
		const params = new URLSearchParams({
			page: page.toString(),
			institution_id: institutionId.toString(),
		});
		if (search) params.append("search", search);
		if (created_at) params.append("created_at", created_at);
		if (ordering) params.append("ordering", ordering);

		const endpoint = `performance/support-resources/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);
		return response.data as IPaginatedResponse<IPIPSupportResource>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);
		return response.data as IPaginatedResponse<IPIPSupportResource>;
	},

	create: async ({ data }: { data: IPIPSupportResourceFormData }) => {
		const response = await apiRequest.post(`performance/support-resources/`, data);
		return response.data as IPIPSupportResource;
	},

	update: async ({
		resourceId,
		data,
	}: {
		resourceId: number;
		data: Partial<IPIPSupportResourceFormData>;
	}) => {
		const response = await apiRequest.patch(`performance/support-resources/${resourceId}/`, data);
		return response.data as IPIPSupportResource;
	},

	delete: async ({ resourceId }: { resourceId: number }) => {
		await apiRequest.delete(`performance/support-resources/${resourceId}/`);
	},

	getById: async ({ resourceId }: { resourceId: number }) => {
		const response = await apiRequest.get(`performance/support-resources/${resourceId}/`);
		return response.data as IPIPSupportResource;
	},
};

// PerformanceImprovementPlan API
export const PERFORMANCE_IMPROVEMENT_PLAN_API = {
	getPaginated: async ({
		page = 1,
		search,
		created_at,
		status,
		employee_id,
		ordering,
		institutionId,
	}: {
		page?: number;
		search?: string;
		created_at?: string;
		status?: string;
		employee_id?: number;
		ordering?: string;
		institutionId: number;
	}) => {
		const params = new URLSearchParams({
			page: page.toString(),
			institution_id: institutionId.toString(),
		});
		if (search) params.append("search", search);
		if (created_at) params.append("created_at", created_at);
		if (status) params.append("status", status);
		if (employee_id) params.append("employee_id", employee_id.toString());
		if (ordering) params.append("ordering", ordering);

		const endpoint = `performance/pips/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);
		return response.data as IPaginatedResponse<IPerformanceImprovementPlan>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);
		return response.data as IPaginatedResponse<IPerformanceImprovementPlan>;
	},

	create: async ({ data }: { data: IPerformanceImprovementPlanFormData }) => {
		const response = await apiRequest.post(`performance/pips/`, data);
		return response.data as IPerformanceImprovementPlan;
	},

	update: async ({
		pipId,
		data,
	}: {
		pipId: number;
		data: Partial<IPerformanceImprovementPlanFormData>;
	}) => {
		const response = await apiRequest.patch(`performance/pips/${pipId}/`, data);
		return response.data as IPerformanceImprovementPlan;
	},

	delete: async ({ pipId }: { pipId: number }) => {
		await apiRequest.delete(`performance/pips/${pipId}/`);
	},

	getById: async ({ pipId }: { pipId: number }) => {
		const response = await apiRequest.get(`performance/pips/${pipId}/`);
		return response.data as IPerformanceImprovementPlan;
	},
};

// PIPEmployeeObjectives API
export const PIP_EMPLOYEE_OBJECTIVES_API = {
	getPaginated: async ({
		page = 1,
		pip_id,
		created_at,
		ordering,
		institutionId,
	}: {
		page?: number;
		pip_id?: number;
		created_at?: string;
		ordering?: string;
		institutionId: number;
	}) => {
		const params = new URLSearchParams({
			page: page.toString(),
			institution_id: institutionId.toString(),
		});
		if (pip_id) params.append("pip_id", pip_id.toString());
		if (created_at) params.append("created_at", created_at);
		if (ordering) params.append("ordering", ordering);

		const endpoint = `performance/employee-objectives/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);
		return response.data as IPaginatedResponse<IPIPEmployeeObjectives>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);
		return response.data as IPaginatedResponse<IPIPEmployeeObjectives>;
	},

	create: async ({ data }: { data: IPIPEmployeeObjectivesFormData }) => {
		const response = await apiRequest.post(`employee-objectives/`, data);
		return response.data as IPIPEmployeeObjectives;
	},

	update: async ({
		objectiveId,
		data,
	}: {
		objectiveId: number;
		data: Partial<IPIPEmployeeObjectivesFormData>;
	}) => {
		const response = await apiRequest.patch(`employee-objectives/${objectiveId}/`, data);
		return response.data as IPIPEmployeeObjectives;
	},

	delete: async ({ objectiveId }: { objectiveId: number }) => {
		await apiRequest.delete(`employee-objectives/${objectiveId}/`);
	},

	getById: async ({ objectiveId }: { objectiveId: number }) => {
		const response = await apiRequest.get(`employee-objectives/${objectiveId}/`);
		return response.data as IPIPEmployeeObjectives;
	},
};
