/**
 * Module Navigation Hook
 *
 * This hook provides navigation utilities for modules in the host platform.
 * It handles module-aware navigation and path building.
 */

import { useRouter } from "next/navigation";

/**
 * Build a module-aware path
 * @param moduleName - The name of the module
 * @param path - The path within the module
 * @returns The full path including module prefix
 */
export const buildModulePath = (moduleName: string, path: string = ""): string => {
	const cleanPath = path.startsWith("/") ? path.slice(1) : path;
	return `/${moduleName}${cleanPath ? `/${cleanPath}` : ""}`;
};

/**
 * Hook for module-aware navigation
 * @param moduleName - The name of the module
 * @returns Navigation utilities
 */
export const useModuleNavigation = (moduleName: string) => {
	const router = useRouter();

	const push = (path: string) => {
		const fullPath = buildModulePath(moduleName, path);
		router.push(fullPath);
	};

	const replace = (path: string) => {
		const fullPath = buildModulePath(moduleName, path);
		router.replace(fullPath);
	};

	const back = () => {
		router.back();
	};

	const forward = () => {
		router.forward();
	};

	return {
		push,
		replace,
		back,
		forward,
		buildPath: (path: string) => buildModulePath(moduleName, path),
	};
};

export default useModuleNavigation;
