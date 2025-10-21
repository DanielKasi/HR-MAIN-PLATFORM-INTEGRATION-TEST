// lib/utils/exitProcessUtils.ts
import apiRequest from "@/lib/apiRequest";
import { IPaginatedResponse } from "@/types/types.utils";

export interface ITerminationStage {
	id: number;
	stage: {
		id: number;
		name: string;
		description: string;
		order: number;
		created_at: string;
		updated_at: string;
	};
	custom_order: number;
	completed: boolean;
	completed_at: string | null;
	notes: string;
	skipped: boolean;
	created_at: string;
	updated_at: string;
}

export interface ITerminationType {
	id: number;
	name: string;
	description: string;
	category: "resignation" | "termination" | "retirement" | "contract_end" | "other";
	requires_handover_report: boolean;
	supported_stages: Array<{
		id: number;
		stage: {
			id: number;
			name: string;
			description: string;
			order: number;
		};
		can_be_skipped: boolean;
		order: number;
	}>;
	approval_status: "under_creation" | "approved" | "rejected";
	is_active: boolean;
	created_at: string;
	updated_at: string;
}

export interface IHandoverReport {
	id: number;
	report_text: string;
	report_file: string;
	created_at: string;
	updated_at: string;
	approval_status: "under_creation" | "approved" | "rejected";
	is_active: boolean;
	created_by: number;
	updated_by: number;
	offboarding: number;
}

export interface ITermination {
	id: number;
	employee: {
		id: number;
		name: string;
		email: string;
	} | null;
	termination_type: ITerminationType;
	initiated_by: {
		id: number;
		user: {
			fullname: string;
			email: string;
		};
	} | null;
	last_working_day: string;
	reason: string;
	status: "INITIATED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
	stage_progress: ITerminationStage[];
	handover_report: IHandoverReport | null;
	created_at: string;
	updated_at: string;
	initiator_type: "EMPLOYEE" | "EMPLOYER";
	is_paid_after_termination: boolean;
	final_payment_date: string | null;
}

export interface CreateTerminationData {
	employee_id: number;
	termination_type_id: number;
	last_working_day: string;
	reason: string;
	status?: "INITIATED";
	initiator_type?: "EMPLOYEE" | "EMPLOYER";
	is_paid_after_termination?: boolean;
	final_payment_date?: string;
	created_by?: number;
	updated_by?: number;
	initiated_by_id?: number;
}

export interface CreateHandoverReportData {
	offboarding: number; // The termination ID
	report_text?: string;
	report_file?: File;
	created_by: number;
	updated_by: number;
}

export const ExitProcessAPI = {
	// Get all terminations with optional filters
	getAll: async ({
		institutionId,
		searchParams,
	}: {
		institutionId: number;
		searchParams?: URLSearchParams;
	}): Promise<IPaginatedResponse<ITermination>> => {
		try {
			const url = searchParams
				? `on-boarding/terminations/?${searchParams}`
				: "on-boarding/terminations/";
			const response = await apiRequest.get(url);
			return response.data as IPaginatedResponse<ITermination>;
		} catch (error) {
			throw error;
		}
	},

	// Get paginated terminations
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
	}): Promise<IPaginatedResponse<ITermination>> => {
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
			if (ordering) {
				params.append("ordering", ordering);
			}

			const endpoint = `on-boarding/terminations/?${params.toString()}`;
			const response = await apiRequest.get(endpoint);

			return response.data as IPaginatedResponse<ITermination>;
		} catch (error) {
			console.error("Error fetching paginated terminations:", error);
			throw error;
		}
	},

	// Get terminations from specific URL
	getPaginatedFromUrl: async ({
		url,
	}: {
		url: string;
	}): Promise<IPaginatedResponse<ITermination>> => {
		try {
			const response = await apiRequest.get(url);
			return response.data as IPaginatedResponse<ITermination>;
		} catch (error) {
			console.error("Error fetching terminations from URL:", error);
			throw error;
		}
	},

	// Get termination by ID
	getById: async (terminationId: number): Promise<ITermination | null> => {
		try {
			const response = await apiRequest.get(`on-boarding/terminations/${terminationId}/`);
			return response.data as ITermination;
		} catch (error) {
			throw error;
		}
	},

	create: async ({
		terminationData,
	}: {
		terminationData: CreateTerminationData;
	}): Promise<ITermination | null> => {
		try {
			// Validate required fields
			if (!terminationData.employee_id || terminationData.employee_id === 0) {
				throw new Error("Valid employee ID is required");
			}
			if (!terminationData.termination_type_id || terminationData.termination_type_id === 0) {
				throw new Error("Valid termination type ID is required");
			}
			if (!terminationData.initiated_by_id || terminationData.initiated_by_id === 0) {
				throw new Error("Valid initiator user ID is required");
			}

			const payload = {
				employee_id: terminationData.employee_id,
				termination_type_id: terminationData.termination_type_id,
				initiated_by_id: terminationData.initiated_by_id,
				last_working_day: terminationData.last_working_day,
				reason: terminationData.reason,
				status: terminationData.status || "INITIATED",
				initiator_type: terminationData.initiator_type || "EMPLOYER",
				is_paid_after_termination: terminationData.is_paid_after_termination || false,
				final_payment_date: terminationData.final_payment_date,
				created_by: terminationData.created_by || terminationData.initiated_by_id,
				updated_by: terminationData.updated_by || terminationData.initiated_by_id,
			};

			console.log("Creating termination with payload:", payload);
			const response = await apiRequest.post("on-boarding/terminations/", payload);
			return response.data as ITermination;
		} catch (error) {
			console.error("Error creating termination:", error);
			throw error;
		}
	},

	// Create handover report (separate from termination creation)
	createHandoverReport: async ({
		handoverData,
	}: {
		handoverData: CreateHandoverReportData;
	}): Promise<IHandoverReport | null> => {
		try {
			const formData = new FormData();
			formData.append("offboarding", handoverData.offboarding.toString());
			formData.append("created_by", handoverData.created_by.toString());
			formData.append("updated_by", handoverData.updated_by.toString());

			if (handoverData.report_text) {
				formData.append("report_text", handoverData.report_text);
			}

			if (handoverData.report_file) {
				formData.append("report_file", handoverData.report_file);
			}

			console.log("Creating handover report for termination:", handoverData.offboarding);
			const response = await apiRequest.post("on-boarding/handover-reports/", formData, {
				headers: {
					"Content-Type": "multipart/form-data",
				},
			});
			return response.data as IHandoverReport;
		} catch (error) {
			console.error("Error creating handover report:", error);
			throw error;
		}
	},

	// Update handover report
	updateHandoverReport: async ({
		handoverReportId,
		handoverData,
	}: {
		handoverReportId: number;
		handoverData: Partial<CreateHandoverReportData>;
	}): Promise<IHandoverReport | null> => {
		try {
			const formData = new FormData();

			if (handoverData.report_text !== undefined) {
				formData.append("report_text", handoverData.report_text);
			}

			if (handoverData.report_file) {
				formData.append("report_file", handoverData.report_file);
			}

			if (handoverData.updated_by !== undefined) {
				formData.append("updated_by", handoverData.updated_by.toString());
			}

			const response = await apiRequest.patch(
				`on-boarding/handover-reports/${handoverReportId}/`,
				formData,
				{
					headers: {
						"Content-Type": "multipart/form-data",
					},
				},
			);
			return response.data as IHandoverReport;
		} catch (error) {
			console.error("Error updating handover report:", error);
			throw error;
		}
	},

	// Update termination
	update: async ({
		terminationId,
		terminationData,
	}: {
		terminationId: number;
		terminationData: Partial<CreateTerminationData>;
	}): Promise<ITermination | null> => {
		try {
			const response = await apiRequest.patch(
				`on-boarding/terminations/${terminationId}/`,
				terminationData,
			);
			return response.data as ITermination;
		} catch (error) {
			console.error("Error updating termination:", error);
			throw error;
		}
	},

	// Delete termination
	delete: async (terminationId: number): Promise<boolean> => {
		try {
			await apiRequest.delete(`on-boarding/terminations/${terminationId}/`);
			return true;
		} catch (error) {
			console.error("Error deleting termination:", error);
			throw error;
		}
	},

	// Get termination types
	getTerminationTypes: async ({
		institutionId,
		searchParams,
	}: {
		institutionId: number;
		searchParams?: URLSearchParams;
	}): Promise<IPaginatedResponse<ITerminationType>> => {
		try {
			const url = searchParams
				? `on-boarding/termination/types/?${searchParams}`
				: "on-boarding/termination/types/";
			const response = await apiRequest.get(url);
			return response.data as IPaginatedResponse<ITerminationType>;
		} catch (error) {
			throw error;
		}
	},

	// Get paginated termination types
	getPaginatedTerminationTypes: async ({
		institutionId,
		page = 1,
		search,
		ordering,
	}: {
		institutionId: number;
		page?: number;
		search?: string;
		ordering?: string;
	}): Promise<IPaginatedResponse<ITerminationType>> => {
		try {
			const params = new URLSearchParams({
				page: page.toString(),
			});

			if (search) {
				params.append("search", search);
			}
			if (ordering) {
				params.append("ordering", ordering);
			}

			const endpoint = `on-boarding/termination/types/?${params.toString()}`;
			const response = await apiRequest.get(endpoint);

			return response.data as IPaginatedResponse<ITerminationType>;
		} catch (error) {
			console.error("Error fetching paginated termination types:", error);
			throw error;
		}
	},

	// Get termination types from URL
	getTerminationTypesFromUrl: async ({
		url,
	}: {
		url: string;
	}): Promise<IPaginatedResponse<ITerminationType>> => {
		try {
			const response = await apiRequest.get(url);
			return response.data as IPaginatedResponse<ITerminationType>;
		} catch (error) {
			console.error("Error fetching termination types from URL:", error);
			throw error;
		}
	},

	// Get termination type by ID
	getTerminationTypeById: async (typeId: number): Promise<ITerminationType | null> => {
		try {
			const response = await apiRequest.get(`on-boarding/termination/types/${typeId}/`);
			return response.data as ITerminationType;
		} catch (error) {
			throw error;
		}
	},

	getAllActiveTerminationTypes: async (institutionId: number): Promise<ITerminationType[]> => {
		try {
			let allTypes: ITerminationType[] = [];
			let nextUrl: string | null = "on-boarding/termination/types/";

			console.log("Starting to fetch all termination types with pagination...");

			while (nextUrl) {
				console.log(`Fetching from: ${nextUrl}`);

				let response;
				if (nextUrl.startsWith("http")) {
					try {
						const url = new URL(nextUrl);
						const pathAndQuery = url.pathname + url.search;
						const cleanPath = pathAndQuery.startsWith("/api/")
							? pathAndQuery.substring(5)
							: pathAndQuery;

						console.log(`Cleaned path: ${cleanPath}`);
						response = await apiRequest.get(cleanPath);
					} catch (urlError) {
						console.error("Error parsing URL:", nextUrl, urlError);
						break;
					}
				} else {
					response = await apiRequest.get(nextUrl);
				}

				const data = response.data as IPaginatedResponse<ITerminationType>;

				console.log(`Fetched ${data.results.length} types from current page`);
				console.log(`Total count from API: ${data.count}`);

				allTypes = [...allTypes, ...data.results];
				nextUrl = data.next;

				console.log(`Next URL: ${nextUrl || "None (last page)"}`);
				console.log(`Total types collected so far: ${allTypes.length}`);
			}

			console.log(`Finished fetching. Total termination types: ${allTypes.length}`);

			const activeTypes = allTypes.filter((type) => type.is_active);
			console.log(`Active termination types: ${activeTypes.length}`);

			return activeTypes;
		} catch (error) {
			console.error("Error fetching all active termination types:", error);
			throw error;
		}
	},

	getAllTerminationTypesLargePage: async (institutionId: number): Promise<ITerminationType[]> => {
		try {
			console.log("Fetching all termination types with large page size...");
			const response = await apiRequest.get("on-boarding/termination/types/?page_size=100");
			const data = response.data as IPaginatedResponse<ITerminationType>;

			console.log(`Fetched ${data.results.length} termination types in single request`);
			console.log(`Total count from API: ${data.count}`);

			const activeTypes = data.results.filter((type) => type.is_active);
			console.log(`Active types: ${activeTypes.length}`);

			return activeTypes;
		} catch (error) {
			console.error("Error fetching termination types with large page size:", error);
			throw error;
		}
	},

	getAllTerminationTypesSmart: async (institutionId: number): Promise<ITerminationType[]> => {
		try {
			try {
				const types = await ExitProcessAPI.getAllTerminationTypesLargePage(institutionId);
				if (types.length > 0) {
					console.log("Successfully fetched types using large page size");
					return types;
				}
			} catch (largePageError) {
				console.log("Large page size method failed, falling back to pagination:", largePageError);
			}

			console.log("Using pagination method as fallback");
			return await ExitProcessAPI.getAllActiveTerminationTypes(institutionId);
		} catch (error) {
			console.error("Error in smart termination types fetch:", error);
			throw error;
		}
	},
};
