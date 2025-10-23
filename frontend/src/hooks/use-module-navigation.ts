import { useRouter } from "next/navigation";
import { useMemo } from "react";

export function buildModulePath(route: string): string {
	// In standalone mode, return route as-is
	// In integrated mode, this will be overridden by the host
	return route;
}

export function useModuleNavigation() {
	const router = useRouter();

	const navigation = useMemo(
		() => ({
			push: (route: string) => {
				router.push(buildModulePath(route));
			},
			replace: (route: string) => {
				router.replace(buildModulePath(route));
			},
		}),
		[router],
	);

	return navigation;
}
