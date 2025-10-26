"use client";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

import { RedirectIntent } from "@/store/redirects/types";
import { clearRedirect, setRedirect } from "@/store/redirects/actions";

export default function MainLayout({ children }: { children: React.ReactNode }) {
	const params = useSearchParams();
	const dispatch = useDispatch();

	// On mount: pick up redirect intent params from URL, store them in redux and remove them from URL
	useEffect(() => {
		try {
			const intent = params.get("intent");
			const intent_id = params.get("intent_id");

			if (intent && intent_id) {
				dispatch(setRedirect({ intent: intent as RedirectIntent, intent_id }));

				// params.delete('intent');
				// params.delete('intent_id');
				// const newSearch = params.toString();
				// const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}${window.location.hash || ''}`;
				// window.history.replaceState({}, document.title, newUrl);
			}
		} catch (e) {
			// console.log("Error setting redirect from URL params");
		}

		return () => {
			dispatch(clearRedirect());
		};
	}, []);

	return <>{children}</>;
}
