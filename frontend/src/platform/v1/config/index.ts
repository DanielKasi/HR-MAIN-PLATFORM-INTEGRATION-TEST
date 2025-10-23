export type PlatformConfig = {
	apiBaseUrl: string;
	locale: string;
	timezone: string;
	environment: "development" | "staging" | "production";
};

export const getServerConfig = (): PlatformConfig => ({
	apiBaseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
	locale: process.env.NEXT_PUBLIC_LOCALE ?? "en-US",
	timezone: process.env.NEXT_PUBLIC_TIMEZONE ?? "UTC",
	environment: (process.env.NODE_ENV as any) ?? "development",
});

export const getClientConfig = (): PlatformConfig => {
	if (typeof window === "undefined") {
		return getServerConfig();
	}

	return {
		apiBaseUrl: window.location.origin,
		locale: navigator.language,
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
		environment: (process.env.NODE_ENV as any) ?? "development",
	};
};
