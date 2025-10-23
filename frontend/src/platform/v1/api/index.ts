// Re-export your existing API client
export { default as apiRequest } from "@/lib/apiRequest";

export const buildApiUrl = (endpoint: string, baseUrl?: string): string => {
	const base = baseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
	return `${base}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
};

export const createApiHeaders = (token?: string) => ({
	"Content-Type": "application/json",
	...(token && { Authorization: `Bearer ${token}` }),
});
