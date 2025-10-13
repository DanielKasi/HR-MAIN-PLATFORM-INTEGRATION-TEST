import { IPaginatedResponse } from "@/types/types.utils";
import apiRequest from "../apiRequest";
import {
	IDeviceStatus,
	IDevice,
	IDeviceFormData,
	IDeviceEmployeeAttachment,
	IDeviceEmployeeAttachmentFormData,
} from "@/types/devices.types";

export interface IDevicesPaginatedResponse extends IPaginatedResponse<IDevice> {}

export const DEVICES_API = {
	getPaginated: async ({
		page = 1,
		search,
		status,
		created_at,
		employee_id,
		ordering,
	}: {
		page?: number;
		search?: string;
		status?: IDeviceStatus;
		created_at?: string;
		employee_id?: number;
		ordering?: string;
	}): Promise<IDevicesPaginatedResponse> => {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (search) {
			params.append("search", search);
		}
		if (status) {
			params.append("status", status);
		}
		if (created_at) {
			params.append("created_at", created_at);
		}
		if (employee_id) {
			params.append("employee_id", employee_id.toString());
		}
		if (ordering) {
			params.append("ordering", ordering);
		}

		const endpoint = `devices/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);
		return response.data as IDevicesPaginatedResponse;
	},

	create: async ({ data }: { data: IDeviceFormData }): Promise<IDevice> => {
		const response = await apiRequest.post(`devices/`, data);
		return response.data as IDevice;
	},

	update: async ({
		deviceId,
		data,
	}: {
		deviceId: number;
		data: Partial<IDeviceFormData>;
	}): Promise<IDevice> => {
		const response = await apiRequest.patch(`devices/${deviceId}/`, data);
		return response.data as IDevice;
	},

	delete: async ({ deviceId }: { deviceId: number }): Promise<{ message: string }> => {
		const response = await apiRequest.delete(`devices/${deviceId}/`);
		return response.data;
	},

	getById: async ({ deviceId }: { deviceId: number }): Promise<IDevice> => {
		const response = await apiRequest.get(`devices/${deviceId}/`);
		return response.data as IDevice;
	},

	captureFingerprint: async ({
		deviceId,
		employeeId,
	}: {
		deviceId: number;
		employeeId: string;
	}): Promise<{ detail: string }> => {
		const response = await apiRequest.post(`devices/capture-fingerprint/`, {
			device_id: deviceId,
			employee_id: employeeId,
		});
		return response.data as { detail: string };
	},
};

export const DEVICE_EMPLOYEE_ATTACHMENTS_API = {
	getPaginated: async ({
		page = 1,
		search,
		device_id,
		employee_id,
		ordering,
	}: {
		page?: number;
		search?: string;
		device_id?: number;
		employee_id?: number;
		ordering?: string;
	}) => {
		const params = new URLSearchParams({
			page: page.toString(),
		});

		if (search) params.append("search", search);
		if (device_id) params.append("device_id", device_id.toString());
		if (employee_id) params.append("employee_id", employee_id.toString());
		if (ordering) params.append("ordering", ordering);

		const endpoint = `devices/employee-attachments/?${params.toString()}`;
		const response = await apiRequest.get(endpoint);
		return response.data as IPaginatedResponse<IDeviceEmployeeAttachment>;
	},

	getPaginatedFromUrl: async ({ url }: { url: string }) => {
		const response = await apiRequest.get(url);
		return response.data as IPaginatedResponse<IDeviceEmployeeAttachment>;
	},

	create: async ({
		data,
	}: {
		data: IDeviceEmployeeAttachmentFormData;
	}): Promise<IDeviceEmployeeAttachment> => {
		const response = await apiRequest.post(`devices/employee-attachments/`, data);
		return response.data as IDeviceEmployeeAttachment;
	},

	update: async ({
		attachmentId,
		data,
	}: {
		attachmentId: number;
		data: Partial<IDeviceEmployeeAttachmentFormData>;
	}): Promise<IDeviceEmployeeAttachment> => {
		const response = await apiRequest.patch(`devices/employee-attachments/${attachmentId}/`, data);
		return response.data as IDeviceEmployeeAttachment;
	},

	delete: async ({ attachmentId }: { attachmentId: number }): Promise<{ message: string }> => {
		const response = await apiRequest.delete(`devices/employee-attachments/${attachmentId}/`);
		return response.data;
	},

	getById: async ({
		attachmentId,
	}: {
		attachmentId: number;
	}): Promise<IDeviceEmployeeAttachment> => {
		const response = await apiRequest.get(`devices/employee-attachments/${attachmentId}/`);
		return response.data as IDeviceEmployeeAttachment;
	},
};
