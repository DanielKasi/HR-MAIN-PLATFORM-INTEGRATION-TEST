import { IPaginatedResponse, JobApplicationStatus } from "@/types/types.utils";
import apiRequest from "../apiRequest";
import {
	ISkillZone,
	ISkillZoneCategory,
	ISkillZoneCategoryFormData,
	ISkillZoneFormData,
} from "@/types/recruitment.types";

export const SKILL_ZONE_CATEGORIES_API = {
	getPaginated: async ({
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
		if (ordering) {
			params.append("ordering", ordering);
		}
		const endpoint = `recruitment/skillzone-categories/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);
		return response.data as IPaginatedResponse<ISkillZoneCategory>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);
		return response.data as IPaginatedResponse<ISkillZoneCategory>;
	},

	create: async ({ data }: { data: ISkillZoneCategoryFormData }) => {
		const response = await apiRequest.post(`recruitment/skillzone-categories/`, data);
		return response.data as ISkillZoneCategory;
	},

	update: async ({
		categoryId,
		data,
	}: {
		categoryId: number;
		data: Partial<ISkillZoneCategoryFormData>;
	}) => {
		const response = await apiRequest.patch(
			`recruitment/skillzone-categories/${categoryId}/`,
			data,
		);
		return response.data as ISkillZoneCategory;
	},

	delete: async ({ categoryId }: { categoryId: number }) => {
		await apiRequest.delete(`recruitment/skillzone-categories/${categoryId}/`);
	},

	getById: async ({ categoryId }: { categoryId: number }) => {
		const response = await apiRequest.get(`recruitment/skillzone-categories/${categoryId}/`);
		return response.data as ISkillZoneCategory;
	},
};

export const SKILL_ZONE_API = {
	getPaginated: async ({
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
		if (ordering) {
			params.append("ordering", ordering);
		}
		const endpoint = `recruitment/skillzone/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);
		return response.data as IPaginatedResponse<ISkillZone>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);
		return response.data as IPaginatedResponse<ISkillZone>;
	},

	create: async ({ data }: { data: ISkillZoneFormData }) => {
		const response = await apiRequest.post(`recruitment/skillzone/`, data);
		return response.data as ISkillZone;
	},

	update: async ({
		skillZoneId,
		data,
	}: {
		skillZoneId: number;
		data: Partial<ISkillZoneFormData>;
	}) => {
		const response = await apiRequest.patch(`recruitment/skillzone/${skillZoneId}/`, data);
		return response.data as ISkillZone;
	},

	delete: async ({ skillZoneId }: { skillZoneId: number }) => {
		await apiRequest.delete(`recruitment/skillzone/${skillZoneId}/`);
	},

	getById: async ({ skillZoneId }: { skillZoneId: number }) => {
		const response = await apiRequest.get(`recruitment/skillzone/${skillZoneId}/`);
		return response.data as ISkillZone;
	},
};
