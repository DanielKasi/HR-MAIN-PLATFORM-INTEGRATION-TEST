let userConfig = undefined;
import path from "path";
import { fileURLToPath } from "url";

// Polyfill __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

try {
	// try to import ESM first
	userConfig = await import("./v0-user-next.config.mjs");
} catch {
	try {
		// fallback to CJS import
		userConfig = await import("./v0-user-next.config");
	} catch {
		// ignore error
	}
}

/** @type {import('next').NextConfig} */
const nextConfig = {
	eslint: {
		ignoreDuringBuilds: true,
	},
	typescript: {
		ignoreBuildErrors: true,
	},
	images: {
		unoptimized: true,
	},
	experimental: {
		webpackBuildWorker: true,
		parallelServerBuildTraces: true,
		parallelServerCompiles: true,
	},
	outputFileTracingRoot: path.join(__dirname, "./")
};

if (userConfig) {
	// ESM imports will have a "default" property
	const config = userConfig.default || userConfig;

	for (const key in config) {
		if (typeof nextConfig[key] === "object" && !Array.isArray(nextConfig[key])) {
			nextConfig[key] = {
				...nextConfig[key],
				...config[key],
			};
		} else {
			nextConfig[key] = config[key];
		}
	}
}

export default nextConfig;
