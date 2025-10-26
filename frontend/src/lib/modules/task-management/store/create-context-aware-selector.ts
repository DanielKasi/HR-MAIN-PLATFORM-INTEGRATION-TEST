import { createSelector } from "reselect";
import type { RootState } from "@/store";

/**
 * Creates a context-aware slice selector for module integration
 *
 * @param sliceName - The name of the slice (e.g., 'auth', 'miscellaneous')
 * @param selector - Optional selector function to apply to the slice
 * @returns A selector that retrieves the slice from the module's namespaced location
 */
export function createContextAwareSelector<T>(sliceName: string, selector?: (slice: any) => T) {
	return createSelector([(state: RootState) => state], (state: any) => {
		// Try to find the slice in module-namespaced locations
		// First try taskManagement prefix (for task-management module)
		let slice = state[`taskManagement${sliceName.charAt(0).toUpperCase() + sliceName.slice(1)}`];

		if (!slice) {
			// Fallback to direct slice name (for standalone mode)
			slice = state[sliceName];
		}

		if (selector) {
			return selector(slice);
		}

		return slice;
	});
}
