import { useState, useEffect } from "react";

export function useZoomLevel() {
	const [zoom, setZoom] = useState(100);

	useEffect(() => {
		if (typeof window === "undefined") return;

		const updateZoom = () => {
			const zoomLevel = window.devicePixelRatio * 100;
			setZoom(Math.round(zoomLevel));
		};

		updateZoom();
		window.addEventListener("resize", updateZoom);
		return () => window.removeEventListener("resize", updateZoom);
	}, []);

	return zoom;
}
