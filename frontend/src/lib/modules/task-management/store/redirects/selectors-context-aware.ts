import { createSelector } from "reselect";

import { createContextAwareSelector } from "@/platform-integration/store-adapter";

const redirectsSlice = createContextAwareSelector("redirects", (slice) => slice);

export const selectPendingRedirect = createSelector([redirectsSlice], (slice) => slice.pending);
