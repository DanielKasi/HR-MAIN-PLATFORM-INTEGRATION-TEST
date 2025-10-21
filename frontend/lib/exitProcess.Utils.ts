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
	handover_report: {
		report_text: string;
		report_file: string;
	} | null;
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

	// Method to get ALL active termination types with pagination handling
	// Replace the getAllActiveTerminationTypes method in your ExitProcessAPI with this fixed version:

	getAllActiveTerminationTypes: async (institutionId: number): Promise<ITerminationType[]> => {
		try {
			let allTypes: ITerminationType[] = [];
			let nextUrl: string | null = "on-boarding/termination/types/";

			console.log("Starting to fetch all termination types with pagination...");

			// Keep fetching until no more pages
			while (nextUrl) {
				console.log(`Fetching from: ${nextUrl}`);

				// Use the appropriate method based on URL type
				let response;
				if (nextUrl.startsWith("http")) {
					// If it's a full URL, extract the path after /api/
					try {
						const url = new URL(nextUrl);
						const pathAndQuery = url.pathname + url.search;
						// Remove /api/ prefix if present
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
					// It's already a relative path
					response = await apiRequest.get(nextUrl);
				}

				const data = response.data as IPaginatedResponse<ITerminationType>;

				console.log(`Fetched ${data.results.length} types from current page`);
				console.log(`Total count from API: ${data.count}`);

				// Add current page results to our collection
				allTypes = [...allTypes, ...data.results];

				// Get next URL
				nextUrl = data.next;

				console.log(`Next URL: ${nextUrl || "None (last page)"}`);
				console.log(`Total types collected so far: ${allTypes.length}`);
			}

			console.log(`Finished fetching. Total termination types: ${allTypes.length}`);

			// Filter active types
			const activeTypes = allTypes.filter((type) => type.is_active);
			console.log(`Active termination types: ${activeTypes.length}`);

			return activeTypes;
		} catch (error) {
			console.error("Error fetching all active termination types:", error);
			throw error;
		}
	},

	// Alternative method to get all types with large page size (if API supports it)
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

	// Smart method that tries large page first, then falls back to pagination
	getAllTerminationTypesSmart: async (institutionId: number): Promise<ITerminationType[]> => {
		try {
			// First try with large page size (more efficient if supported)
			try {
				const types = await ExitProcessAPI.getAllTerminationTypesLargePage(institutionId);
				if (types.length > 0) {
					console.log("Successfully fetched types using large page size");
					return types;
				}
			} catch (largePageError) {
				console.log("Large page size method failed, falling back to pagination:", largePageError);
			}

			// Fall back to pagination method
			console.log("Using pagination method as fallback");
			return await ExitProcessAPI.getAllActiveTerminationTypes(institutionId);
		} catch (error) {
			console.error("Error in smart termination types fetch:", error);
			throw error;
		}
	},
};
