import { IReportableModels } from "@/types/reports.types";
import apiRequest from "../apiRequest";
import { toast } from "sonner";
import { store } from "@/store";
import { removeTrailingSlash, replaceUnderscore } from "../helpers";
import { showErrorToast } from "../utils";
import { MAIN_DOMAIN_URL } from "@/constants";

export const REPORTS_API = {
	getReportableModels: async ({ app }: { app: string }) => {
		const response = await apiRequest.get(`/reports/reportable-models/?app=${app}`);
		return response.data as IReportableModels;
	},

	downloadReport: async (params: {
		app: string;
		start_date: string;
		end_date: string;
		report_type: string;
		format_type: "excel" | "pdf";
	}) => {
		const accessToken = store.getState().auth.accessToken;
		const urlParams = new URLSearchParams();
		Object.entries(params).forEach(([key, value]) => {
			if (value) {
				urlParams.append(key, value.toString());
			}
		});

		const baseURL = removeTrailingSlash(
			process.env.NEXT_PUBLIC_API_URL || `${MAIN_DOMAIN_URL}/api`,
		);

		// Create a direct fetch request for file download
		const response = await fetch(`${baseURL}/reports/report-generation/?${urlParams.toString()}`, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json",
			},
		});

		if (response.ok) {
			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");

			a.href = url;
			a.download = `report-${replaceUnderscore(params.report_type)}.${params.format_type === "excel" ? "xlsx" : "pdf"}`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);
			toast.success("Download started", {
				description: `Report is being downloaded.`,
			});
		} else {
			const errorText = await response.text();
			showErrorToast({ error: null, defaultMessage: "Failed to download report" });
			throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
		}
	},
};
