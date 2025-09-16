import axios, { InternalAxiosRequestConfig } from "axios";

import { CustomApiRequestError } from "@/constants";
import { store } from "@/store";
import { logoutStart, setAccessToken, setRefreshToken } from "@/store/auth/actions";
import { LoginResponse } from "@/utils/auth-utils";
import { MAIN_DOMAIN_URL } from "@/constants";

const axiosJsonInstance = axios.create({
	baseURL: process.env.NEXT_PUBLIC_API_URL || `${MAIN_DOMAIN_URL}/api`,
	headers: {},
	timeout: 30000,
	validateStatus: (status) => status !== 401 && status !== 403,
});

axiosJsonInstance.interceptors.request.use((config) => {
	const token = store.getState().auth.accessToken;

	if (token) {
		config.headers.Authorization = `Bearer ${token}`;
	}

	return config;
});

let isRefreshing = false;
let failedQueue: any[] = [];

type Subscriber = (token: string) => void;
let subscribers: Subscriber[] = [];

function onRefreshed(token: string) {
	subscribers.forEach((callback) => callback(token));
	subscribers = [];
}

function addSubscriber(callback: Subscriber) {
	subscribers.push(callback);
}

// const processQueue = (error: any, token: string | null = null) => {
//   failedQueue.forEach((prom) => {
//     if (error) {
//       prom.reject(error);
//     } else {
//       prom.resolve(token);
//     }
//   });

//   failedQueue = [];
// };

axiosJsonInstance.interceptors.response.use(
	(response) => response,
	async (error: any) => {
		const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

		if (
			(error.response?.status === 401 || error.response?.status === 403) &&
			!originalRequest._retry
		) {
			originalRequest._retry = true;

			const refreshToken = store.getState().auth.refreshToken;

			if (!refreshToken || originalRequest.url?.endsWith("/user/token/refresh")) {
				if (typeof window !== "undefined") {
					store.dispatch(logoutStart());
				}

				return Promise.reject(error);
			}

			if (isRefreshing) {
				return new Promise((resolve) => {
					addSubscriber((token: string) => {
						if (!originalRequest.headers) {
							originalRequest.headers = new axios.AxiosHeaders();
						}
						originalRequest.headers.Authorization = `Bearer ${token}`;
						resolve(axiosJsonInstance(originalRequest));
					});
				});
			}
			isRefreshing = true;
			try {
				const response = await axios.post(
					`${process.env.NEXT_PUBLIC_API_URL || MAIN_DOMAIN_URL}/user/token/refresh/`,
					{ refresh: refreshToken },
					{
						headers: {
							"Content-Type": "application/json",
						},
					},
				);

				const { access, refresh } = (response.data as LoginResponse).tokens;

				store.dispatch(setAccessToken(access));
				store.dispatch(setRefreshToken(refresh));

				axiosJsonInstance.defaults.headers.common["Authorization"] = `Bearer ${access}`;
				originalRequest.headers["Authorization"] = `Bearer ${access}`;
				onRefreshed(access);

				return axiosJsonInstance(originalRequest);
			} catch (err) {
				store.dispatch(logoutStart());

				return Promise.reject(err);
			} finally {
				isRefreshing = false;
			}
		}

		const errorMessage =
			error.response?.data?.detail ||
			error.response?.data?.error ||
			error.response ||
			"An unknown error occurred, please make sure you are connected to a network";

		return Promise.reject(new Error(errorMessage));
	},
);

/**
 * @param {string} endpoint - API endpoint path (without base URL)
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE, etc.)
 * @param {Object} [data=null] - Request payload for POST/PUT requests
 * @param {Object} [customHeaders={}] - Additional headers to include
 * @returns {Promise<any>} Response data
 */
export const apiRequest = async (
	endpoint: string,
	method: string,
	data = null,
	customHeaders: object = {},
	config: object = {}, // Add config parameter to pass additional Axios options
): Promise<any> => {
	const normalizedEndpoint = endpoint.startsWith("/") ? endpoint.slice(1) : endpoint;
	const response = await axiosJsonInstance({
		url: normalizedEndpoint,
		method: method.toUpperCase(),
		headers: customHeaders,
		data: ["POST", "PUT", "PATCH"].includes(method.toUpperCase()) ? data : undefined,
		params: method.toUpperCase() === "GET" && data ? data : undefined,
		...config, // Spread additional config (e.g., responseType)
	});

	if (response.status >= 200 && response.status <= 300) {
		return response;
	} else {
		let err: CustomApiRequestError = {
			message: Array.isArray(response?.data?.error)
				? response?.data?.error[0]
				: typeof response?.data?.error === "string"
					? response?.data?.error
					: response.data?.detail || null,
			status: response.status,
			custom_code: response.data?.custom_code || null,
		};

		if (endpoint.endsWith("employee/create/")) {
			err = response.data;
		}
		throw err;
	}
};

export const apiGet = (endpoint: string, params = null, customHeaders = {}, config = {}) =>
	apiRequest(endpoint, "GET", params, customHeaders, config);

export const apiPost = (endpoint: string, data: any, customHeaders = {}) =>
	apiRequest(endpoint, "POST", data, customHeaders);

export const apiPut = (endpoint: string, data: any, customHeaders = {}) =>
	apiRequest(endpoint, "PUT", data, customHeaders);

export const apiPatch = (endpoint: string, data: any, customHeaders = {}) =>
	apiRequest(endpoint, "PATCH", data, customHeaders);

export const apiDelete = (endpoint: string, customHeaders = {}) =>
	apiRequest(endpoint, "DELETE", null, customHeaders);

export default {
	get: apiGet,
	post: apiPost,
	put: apiPut,
	patch: apiPatch,
	delete: apiDelete,
};
