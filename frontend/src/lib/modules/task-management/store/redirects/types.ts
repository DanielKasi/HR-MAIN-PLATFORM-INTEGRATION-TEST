export type RedirectIntent = "spot_check";

export const REDIRECTS_ACTION_TYPES = {
	SET_REDIRECT: "task-managementRedirects/SET_REDIRECT",
	CLEAR_REDIRECT: "task-managementRedirects/CLEAR_REDIRECT",
	TRIGGER_REDIRECT: "task-managementRedirects/TRIGGER_REDIRECT",
};

export type RedirectPayload = {
	intent: RedirectIntent;
	intent_id: string | number;
	// optional extra data
	meta?: Record<string, unknown>;
};
