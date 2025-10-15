import axios from "axios";

import { Permission, IUser } from "@/types/user.types";
import { IUserInstitution } from "@/types/other";
import apiRequest from "@/lib/apiRequest";
import { getInstitutionById } from "@/lib/helpers";
import { store } from "@/store";
import { clearTemporaryPermissions, setTemporaryPermissions } from "@/store/auth/actions";
import { MAIN_DOMAIN_URL } from "@/constants";

export type LoginResponse = {
	tokens: {
		access: string;
		refresh: string;
	};
	user: IUser;
	institution_attached: IUserInstitution[];
};

/**
 *
 * @param username  This username can be either an email, a user name or a phone number , it's done this way just for convenience
 * @param password
 * @returns
 */

export const loginWithEmailAndPassword = async (username: string, password: string) => {
	const response = await apiRequest.post("user/login/", { username: username, password: password });
	const responseData = response.data;

	return {
		...responseData,
		InstitutionsAttached: response.data.institution_attached,
	} as LoginResponse;
};

export const fetchUserById = async (userId: number): Promise<IUser | null> => {
	try {
		const response = await apiRequest.get(`user/${userId}/`);

		return response.data as IUser;
	} catch {
		return null;
	}
};

export const fetchUserAttachedInstitutions = async (): Promise<IUserInstitution[] | null> => {
	try {
		const response = await apiRequest.get("user/institutions/");

		return response.data as IUserInstitution[];
	} catch {
		return null;
	}
};

export const fetchRemoteInstitutionById = async (
	InstitutionId: number,
): Promise<IUserInstitution | null> => {
	try {
		const response = await getInstitutionById(InstitutionId);

		return response.data as IUserInstitution;
	} catch {
		return null;
	}
};

export const AUTH_API = {
	refreshTokens: async ({ refreshToken }: { refreshToken: string }) => {
		const response = await axios.post(
			`${process.env.NEXT_PUBLIC_API_URL || `${MAIN_DOMAIN_URL}/api`}/user/token/refresh/`,
			{ refresh: refreshToken },
			{
				headers: {
					"Content-Type": "application/json",
				},
			},
		);

		return response.data as LoginResponse;
	},

	changeEmailAndResendOtp: async ({
		old_email,
		new_email,
	}: {
		old_email: string;
		new_email: string;
	}) => {
		if (!old_email || !new_email) {
			throw new Error("Both the old and new emails are required !");
		}
		const response = await apiRequest.post("user/change-email-and-resend-otp/", {
			old_email,
			new_email,
		});

		return response;
	},
	resendOtp: async ({ email, mode }: { email: string; mode: "otp" | "password_link" }) => {
		const response = await apiRequest.post(`user/resend-otp/?mode=${mode}`, {
			email,
		});

		return response;
	},
};

export function hasTemporaryPermissions(): boolean {
	const state = store.getState();

	return state.auth.temporaryPermissions.length > 0;
}

export function setTemporaryPermissionsWithTimeout(
	permissions: Permission[],
	timeoutMs: number = 30 * 60 * 1000, // 30 minutes default
) {
	store.dispatch(setTemporaryPermissions(permissions));

	setTimeout(() => {
		store.dispatch(clearTemporaryPermissions());
	}, timeoutMs);
}
