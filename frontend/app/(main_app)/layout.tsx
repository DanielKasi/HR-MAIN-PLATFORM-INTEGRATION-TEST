"use client";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { RedirectIntent } from "@/store/redirects/types";
import { clearRedirect, setRedirect } from "@/store/redirects/actions";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";

export default function MainLayout({ children }: { children: React.ReactNode }) {
	const params = useSearchParams();
	const dispatch = useDispatch();
	const selectedInstitution = useSelector(selectSelectedInstitution);

	// useEffect(() => {
	// 	const themeColor = selectedInstitution?.theme_color || "#ff3403";
	// 	dispatch(setThemeColor({color:themeColor, palette:generatePalette(themeColor)}));
	// }, [selectedInstitution]);

	// On mount: pick up redirect intent params from URL, store them in redux and remove them from URL
	useEffect(() => {
		try {
			const intent = params.get("intent");
			const intent_id = params.get("intent_id");

			if (intent && intent_id) {
				dispatch(setRedirect({ intent: intent as RedirectIntent, intent_id }));
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
