import { ThemePalette } from "@/types/other";

export function hexToHSL(hex: string) {
	hex = hex.replace("#", "");
	const r = Number.parseInt(hex.substring(0, 2), 16) / 255;
	const g = Number.parseInt(hex.substring(2, 4), 16) / 255;
	const b = Number.parseInt(hex.substring(4, 6), 16) / 255;

	const max = Math.max(r, g, b),
		min = Math.min(r, g, b);
	let h = 0,
		s,
		l = (max + min) / 2;

	if (max !== min) {
		const d = max - min;

		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}
		h /= 6;
	} else {
		s = 0;
	}

	h = Math.round(h * 360);
	s = Math.round(s * 100);
	l = Math.round(l * 100);
	return { h, s, l };
}

export function hslToHex(h: number, s: number, l: number) {
	let r, g, b;
	if (s === 0) {
		r = g = b = l; // achromatic
	} else {
		const hue2rgb = (p: number, q: number, t: number) => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		};
		let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		let p = 2 * l - q;
		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}
	const toHex = (x: number) => {
		const hex = Math.round(x * 255).toString(16);
		return hex.length === 1 ? "0" + hex : hex;
	};
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export const LIGHTNESS_DELTAS: Record<keyof ThemePalette, number> = {
	COLOR_10: 0.396,
	COLOR_20: 0.329,
	COLOR_30: 0.247,
	COLOR_40: 0.165,
	COLOR_50: 0.082,
	MAIN_THEME_COLOR: 0,
	COLOR_60: -0.082,
	COLOR_70: -0.169,
	COLOR_80: -0.251,
	COLOR_90: -0.337,
	COLOR_100: -0.404,
};

export function generatePalette(mainHex: string): ThemePalette {
	const { h, s, l: baseL } = hexToHSL(mainHex);
	const palette: ThemePalette = {
		COLOR_10: "",
		COLOR_20: "",
		COLOR_30: "",
		COLOR_40: "",
		COLOR_50: "",
		MAIN_THEME_COLOR: "",
		COLOR_60: "",
		COLOR_70: "",
		COLOR_80: "",
		COLOR_90: "",
		COLOR_100: "",
	};

	for (const [key, delta] of Object.entries(LIGHTNESS_DELTAS)) {
		let newL = baseL + delta;
		newL = Math.max(0, Math.min(1, newL));
		palette[key as keyof ThemePalette] = hslToHex(h, s, newL);
	}

	return palette;
}
