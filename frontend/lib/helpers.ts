import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { toast } from "sonner";

import apiRequest from "./apiRequest";
import { showErrorToast } from "./utils";

import { IPermission, Permission, Role } from "@/types";
import { store } from "@/store";
import { ICountry } from "@/types/types.utils";
import { INotification } from "@/store/notifications/types";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function capitalizeEachWord(str: string) {
	return str
		.split(" ")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(" ");
}

export const formatDate = (dateString: string) => {
	return new Date(dateString).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
};

export const formatNumberByMagnitude = (value: number) => {
	if (value >= 1000000000) {
		return `${(value / 1000000000).toFixed(1)}B`;
	} else if (value >= 1000000) {
		return `${(value / 1000000).toFixed(1)}M`;
	} else if (value >= 1000) {
		return `${(value / 1000).toFixed(1)}K`;
	}

	return `${value}`;
};

export const getInitials = (name: string) => {
	return name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase();
};

export function getDefaultInstitutionId() {
	if (typeof window !== "undefined") {
		// First try to get the selected Institution
		const selectedInstitution = store.getState().auth.selectedInstitution.value;

		if (selectedInstitution) {
			return selectedInstitution.id;
		}
		// Fallback to the first Institution in InstitutionsAttached
		const InstitutionsAttached = store.getState().auth.InstitutionsAttached.value;
		const InstitutionId = InstitutionsAttached.length ? InstitutionsAttached[0].id : null;

		return InstitutionId;
	}
}

export function getCUrrentInstitution() {
	if (typeof window !== "undefined") {
		return store.getState().auth.selectedInstitution.value;
	}

	return null;
}

export const fetchAndSetData = async <T>(
	fetchFn: () => Promise<any>,
	setFn: (data: T) => void,
	setErrorFn?: (msg: string) => void,
	errorMsg = "Failed to fetch data",
	extractData: (res: any) => T = (res) => res.data,
) => {
	try {
		const response = await fetchFn();
		const data = extractData(response);

		setFn(data);
	} catch (error) {
		showErrorToast({ error, defaultMessage: errorMsg });
		if (setErrorFn) {
			setErrorFn(errorMsg);
		}
	}
};

export async function fetchInstitutionBranchesFromAPI() {
	try {
		return await apiRequest.get(`institution/${getDefaultInstitutionId()}/branch`);
	} catch (error) {
		throw error;
	}
}

export async function fetchUserTasks() {
	try {
		return await apiRequest.get("workflow/task/");
	} catch (error) {
		// console.log("Error fetching  user tasks ");
		throw error;
	}
}

export function getCurrentBranchId() {
	const selectedBranch = store.getState().auth.selectedBranch.value;

	if (selectedBranch) {
		return selectedBranch.id;
	}

	return null;
}

export function formatCurrency(amount: number | string): string {
	const numAmount = Number.parseFloat(Number(amount).toString());

	return numAmount % 1 === 0
		? numAmount.toLocaleString("en-US")
		: numAmount.toLocaleString("en-US", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			});
}

export function formatTransactionDate(dateString: any) {
	try {
		const date = new Date(dateString);

		return format(date, "MMMM dd, yyyy h:mm a");
	} catch {
		return dateString;
	}
}

export function hasPermission(permissionCode: string): boolean {
	try {
		const state = store.getState();
		const userData = state.auth.user.value;
		const temporaryPermissions = state.auth.temporaryPermissions;

		if (!userData) return false;
		const userId = userData.id;

		// Check if user is the Institution owner
		const selectedInstitution = state.auth.selectedInstitution.value;

		if (selectedInstitution) {
			// If user is the Institution owner, grant all permissions
			if (selectedInstitution.institution_owner_id === userId) {
				return true;
			}
		}

		// Check temporary permissions first
		const hasTemporaryPermission = temporaryPermissions.some(
			(permission: IPermission) => permission.permission_code === permissionCode,
		);

		if (hasTemporaryPermission) {
			return true;
		}

		// Otherwise, check user's own permissions
		return (
			userData.roles?.some((role: Role) =>
				role.permissions_details?.some(
					(permission: Permission) => permission.permission_code === permissionCode,
				),
			) || false
		);
	} catch (error) {
		console.error("Error checking permission:", error);

		return false;
	}
}

export function extractRequiredPermissions(
	userRoles: Role[],
	requiredPermissionCodes: string[],
): Permission[] {
	// console.log("\n\nEXtracting permission codes : ", requiredPermissionCodes);
	const requiredPermissions: Permission[] = [];

	userRoles.forEach((role) => {
		const matchingPermissions = role.permissions_details?.filter((permission) =>
			requiredPermissionCodes.includes(permission.permission_code),
		);

		if (matchingPermissions && matchingPermissions.length > 0) {
			// Create a new role object with only the required permissions
			requiredPermissions.push(...matchingPermissions);
		}
	});

	return requiredPermissions;
}

export function hasAnyRequiredPermissions(
	userRoles: Role[],
	requiredPermissionCodes: string[],
): boolean {
	return userRoles.some((role) =>
		role.permissions_details?.some((permission: any) =>
			requiredPermissionCodes.includes(permission.permission_code),
		),
	);
}

export const getInstitutionById = async (InstitutionId: number) =>
	await apiRequest.get(`institution/${InstitutionId}/`);

export const downloadFile = (filePath: string, fileName: string) => {
	window.open(`${process.env.NEXT_PUBLIC_BASE_URL}${filePath}`, "_blank");
};

export const getFileUrl = (filePath: string) => {
	if (filePath.startsWith("http")) {
		return filePath;
	}
	const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

	return `${baseUrl}${filePath}`;
};

export const getFileName = (filePath: string) => {
	return filePath.split("/").pop() || "document.pdf";
};

export const handleDownload = async (fileUrl: string, fileName: string) => {
	try {
		const response = await fetch(fileUrl);

		if (!response.ok) throw new Error("Network response was not ok");

		const blob = await response.blob();
		const url = window.URL.createObjectURL(blob);
		const link = document.createElement("a");

		link.href = url;
		link.download = fileName;
		link.target = "_blank";
		document.body.appendChild(link);
		link.click();
		window.URL.revokeObjectURL(url);
		document.body.removeChild(link);

		toast.success("Download started", {
			description: `${fileName} is being downloaded.`,
		});
	} catch (error) {
		toast.error("Download failed", {
			description: "Failed to download the file. Please try again.",
		});
	}
};

export const countryAPI = {
	getAll: async () => {
		const response = await fetch(
			"https://restcountries.com/v3.1/all?fields=name,cca2,currencies,idd",
		);

		if (!response.ok) throw new Error("Failed to fetch countries");

		return (await response.json()) as ICountry[];
	},
};

export const getCurrentUserLocation = async (callback: (position: GeolocationPosition) => void) => {
	if (!navigator.geolocation) {
		toast.warning("Your browser doesn't support geolocation");
	}
	navigator.geolocation.getCurrentPosition(callback);
};

export function maskEmail(email: string): string {
	const [local, domain] = email.split("@");

	if (!domain) {
		throw new Error("Invalid email format");
	}

	// keep first 3 characters (or fewer if local part is short)
	const visible = local.slice(0, 3);
	const hiddenLength = Math.max(0, local.length - visible.length);
	const hidden = "*".repeat(hiddenLength);

	return `${visible}${hidden}@${domain}`;
}

export function forceUrlToHttps(url: string) {
	const FORCE_HTTPS = process.env.NEXT_PUBLIC_FORCE_HTTPS
		? process.env.NEXT_PUBLIC_FORCE_HTTPS === "true"
		: true;

	if (!FORCE_HTTPS) {
		return url;
	}

	return url.replace(/^http:\/\//i, "https://");
}

export const showBrowserNotification = ({ notification }: { notification: INotification }) => {
	if (Notification.permission !== "granted") {
		console.log("\n\n Notification permission not granted. Not showing notification. ");

		return;
	}
	console.log("\n\n Showing browser notification for: ", notification);
	const btn = document.createElement("button");

	btn.style.display = "none";
	btn.onclick = () => {
		console.log("\n\n Click triggered for notification: ", notification);
		new Notification(notification.message, {
			body: `${notification.id}: Received at ${new Date(notification.timestamp).toLocaleString()} `,
			icon: "/icon.png", // Optional: Replace with your app's icon
			tag: notification.id, // Prevents duplicate notifications
		});
	};
	document.body.appendChild(btn);
	btn.click();
	document.body.removeChild(btn);
};
