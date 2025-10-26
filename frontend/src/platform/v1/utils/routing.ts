/**
 * Platform API Routing Utilities
 *
 * This file provides routing utilities for modules in the host platform.
 */

// Module descriptors registry
const moduleDescriptors: Array<{ name: string; mountPath: string }> = [];

/**
 * Register a module descriptor
 * @param name - The name of the module
 * @param mountPath - The mount path of the module
 */
export function registerModuleDescriptor(name: string, mountPath: string) {
	const existing = moduleDescriptors.find((m) => m.name === name);
	if (!existing) {
		moduleDescriptors.push({ name, mountPath });
	} else {
		existing.mountPath = mountPath;
	}
}

/**
 * Get the mount path for a module
 * @param moduleName - The name of the module
 * @returns The mount path or empty string if not found
 */
export function getModuleMountPath(moduleName: string): string {
	const module = moduleDescriptors.find((m) => m.name === moduleName);
	return module?.mountPath || "";
}

/**
 * Build a module-aware path
 * This function is context-aware and automatically uses the current module's mount path
 * @param route - The route within the module (relative)
 * @returns The full path including module mount path
 */
export function buildModulePath(route: string): string {
	// This will be replaced by the sync script to use the actual module mount path
	return route;
}

/**
 * Build a module-aware path for a specific module
 * @param moduleName - The name of the module
 * @param route - The route within the module
 * @returns The full path including module mount path
 */
export function buildModulePathFor(moduleName: string, route: string): string {
	const mountPath = getModuleMountPath(moduleName);
	const cleanRoute = route.startsWith("/") ? route : `/${route}`;
	return mountPath + cleanRoute;
}
