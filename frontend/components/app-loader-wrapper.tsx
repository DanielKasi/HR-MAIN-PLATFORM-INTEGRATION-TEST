"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

import FixedLoader from "./fixed-loader";

export default function AppLoaderWrapper() {
	const pathname = usePathname();
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		// Trigger loader on route change
		setIsLoading(true);

		// Simulate loading finish after transition
		const timer = setTimeout(() => {
			setIsLoading(false);
		}, 500); // Adjust timing as needed

		return () => clearTimeout(timer);
	}, [pathname]);

	return isLoading ? <FixedLoader className="!bg-white/90 z-[100]" /> : <></>;
}
