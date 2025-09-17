export type RedirectIntent = "spot_check";

export const REDIRECTS_ACTION_TYPES = {
	SET_REDIRECT: "redirects/SET_REDIRECT",
	CLEAR_REDIRECT: "redirects/CLEAR_REDIRECT",
	TRIGGER_REDIRECT: "redirects/TRIGGER_REDIRECT",
};

export type RedirectPayload = {
	intent: RedirectIntent;
	intent_id: string | number;
	// optional extra data
	meta?: Record<string, unknown>;
};
