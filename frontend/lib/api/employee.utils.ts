import { IPaginatedResponse } from "@/types/other";
import apiRequest from "../apiRequest";
import { IEmployeeLog } from "@/types/employee.types";

export const EMPLOYEE_DEVICE_LOGS = {
	getPaginated: async (params?: {
		page?: number;
		employee_id?: number;
		device_id?: number;
		search?: string;
	}) => {
		const urlParams = new URLSearchParams();
		Object.entries(params || { page: 1 }).forEach(([key, value]) => {
			if (value) {
				urlParams.append(key, value.toString());
			}
		});
		const response = await apiRequest.get(`employee/employee-logs/?${urlParams.toString()}`);
		return response.data as IPaginatedResponse<IEmployeeLog>;
	},
};
