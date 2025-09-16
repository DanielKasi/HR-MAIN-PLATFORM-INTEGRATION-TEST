import { createHash } from "crypto";

import rootReducer from "./rootReducer";

export const PERSIST_KEY = "root";

export type Action<T> = {
	type: T;
};

export type ActionWithPayLoad<T, P> = {
	type: T;
	payload: P;
};

export function createAction<T extends string, P>(type: T, payload: void): Action<T>;
export function createAction<T extends string, P>(type: T, payload: P): ActionWithPayLoad<T, P>;

export function createAction<T extends string, P>(type: T, payload: P) {
	return { type, payload };
}

const getInitialState = () => rootReducer(undefined, { type: "@@redux/INIT" });

const getStateHash = (): string => {
	const initialState = getInitialState();
	const stateString = JSON.stringify(initialState);

	return createHash("sha1").update(stateString).digest("hex");
};

export const clearStateIfStructureChanged = () => {
	if (typeof window === "undefined") return;

	const currentHash = getStateHash();
	const storedHash = localStorage.getItem("stateHash");

	if (storedHash && storedHash !== currentHash) {
		// console.log('State structure changed. Clearing persisted state.');
		localStorage.removeItem(`persist:${PERSIST_KEY}`);
		localStorage.setItem("stateHash", currentHash);
		window.location.reload();
	} else if (!storedHash) {
		localStorage.setItem("stateHash", currentHash);
	}
};

// Utility to parse JWT lifetime
export function parseJwtLifetime(token: string): number {
	try {
		const payload = JSON.parse(atob(token.split(".")[1]));
		const lifetimeMinutes = payload.lifetime || 30;

		return lifetimeMinutes * 60 * 1000;
	} catch {
		return 30 * 60 * 1000;
	}
}
