import { IPaginatedResponse } from "@/types/types.utils";
import apiRequest from "../apiRequest";

export async function getPaginatedFromUrl<T>({ url }: { url: string }) {
	const response = await apiRequest.get(url);
	return response.data as IPaginatedResponse<T>;
}
