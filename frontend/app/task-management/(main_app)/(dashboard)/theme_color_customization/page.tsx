"use client";

import type React from "react";

import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { useSelector } from "react-redux";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { useModuleNavigation } from "@/hooks/use-module-navigation";

import { Button } from "@/platform/v1/components";
import apiRequest from "@/lib/apiRequest";
import { hexToHSL } from "@/app/(main_app)/(dashboard)/layout";
import { selectSelectedInstitution } from "@/store/auth/selectors-context-aware";
import { removeThemeStart, updateThemeStart } from "@/store/auth/actions";
import { getDefaultInstitutionId, getInstitutionById } from "@/lib/helpers";
import { handleApiError } from "@/lib/apiErrorHandler";

// Storage key constant
const STORAGE_KEY = "themeColorData";

interface StoredColorData {
	colors: string[];
	timestamp: number;
}

// Function to convert hex to RGB
const hexToRgb = (hex: string): [number, number, number] => {
	const r = Number.parseInt(hex.slice(1, 3), 16);
	const g = Number.parseInt(hex.slice(3, 5), 16);
	const b = Number.parseInt(hex.slice(5, 7), 16);

	return [r, g, b];
};

// Function to convert RGB to hex
const rgbToHex = (r: number, g: number, b: number): string => {
	return (
		"#" +
		[r, g, b]
			.map((x) => {
				const hex = x.toString(16);

				return hex.length === 1 ? "0" + hex : hex;
			})
			.join("")
	);
};

// Function to calculate text color based on background for contrast
const getTextColor = (bgColor: string): string => {
	const [r, g, b] = hexToRgb(bgColor);
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

	return luminance > 0.5 ? "#000000" : "#ffffff";
};

export default function ThemeColorCustomization() {
	const [themeColor, setThemeColor] = useState("#1708FF");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isResetting, setIsResetting] = useState(false);
	const [recentColors, setRecentColors] = useState<string[]>([
		"#37b9c1", // teal
		"#3b82f6", // blue
		"#f43f5e", // pink
		"#fb6a33", // orange
		"#8b5cf6", // purple
		"#10b981", // green
		"#d97706", // amber
	]);
	const [textColor, setTextColor] = useState("#ffffff");
	const [sliderPosition, setSliderPosition] = useState(66); // Position in percentage (0-100)
	const [pickerPosition, setPickerPosition] = useState({ x: 66, y: 50 }); // Position in percentage (0-100)

	const colorPickerRef = useRef<HTMLDivElement>(null);
	const isDraggingRef = useRef(false);

	const InstitutionId = getDefaultInstitutionId();
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const dispatch = useDispatch();
	const router = useModuleNavigation();

	// Initialize theme color from selected Institution
	useEffect(() => {
		if (selectedInstitution && selectedInstitution.theme_color) {
			setThemeColor(selectedInstitution.theme_color);
			updateColorProperties(selectedInstitution.theme_color);
		}

		fetchInstitutionThemeData(selectedInstitution?.id || (getDefaultInstitutionId() as any));
	}, [selectedInstitution]);

	// Update text color when theme color changes
	useEffect(() => {
		setTextColor(getTextColor(themeColor));
	}, [themeColor]);

	// Add mouse event listeners for dragging
	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (isDraggingRef.current && colorPickerRef.current) {
				const rect = colorPickerRef.current.getBoundingClientRect();
				const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
				const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

				setPickerPosition({ x, y });
				updateColorFromPicker(x, y);
			}
		};

		const handleMouseUp = () => {
			isDraggingRef.current = false;
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, []);

	const getStoredColorData = useCallback((): string[] => {
		try {
			const storedData = localStorage.getItem(STORAGE_KEY);

			if (!storedData) return [];

			const parsedData: StoredColorData = JSON.parse(storedData);
			const currentTime = Date.now();
			const oneDayMs = 24 * 60 * 60 * 1000;

			if (currentTime - parsedData.timestamp > oneDayMs) {
				dispatch(removeThemeStart());
				localStorage.removeItem(STORAGE_KEY);

				return [];
			}

			return parsedData.colors;
		} catch (error) {
			// console.log("Error retrieving color data from local storage:", error);
			return [];
		}
	}, [dispatch]);

	const saveColorData = useCallback(
		(colors: string[]) => {
			try {
				const colorData: StoredColorData = {
					colors,
					timestamp: Date.now(),
				};

				if (colors) {
					dispatch(updateThemeStart(colorData));
					localStorage.setItem(STORAGE_KEY, JSON.stringify(colorData));
				}
			} catch (error) {
				// console.log("Error saving color data to local storage:", error);
			}
		},
		[dispatch],
	);

	const fetchInstitutionThemeData = async (InstitutionId: number) => {
		try {
			const response = await getInstitutionById(InstitutionId);
			const data = response.data;

			if (data.theme_color) {
				setThemeColor(data.theme_color);
				updateColorProperties(data.theme_color);
			}

			const storedColors = getStoredColorData();

			// Set recent colors if available from API or use stored colors
			if (
				data.recent_colors &&
				Array.isArray(data.recent_colors) &&
				data.recent_colors.length > 0
			) {
				setRecentColors(data.recent_colors);
				saveColorData(data.recent_colors);
			} else if (storedColors.length > 0) {
				setRecentColors(storedColors);
			}
		} catch (error: any) {
			// console.log("Error fetching Institution theme data:", error);
			handleApiError(error);
		}
	};

	const updateColorProperties = (color: string) => {
		const hslColor = hexToHSL(color);

		document.documentElement.style.setProperty("--primary", hslColor);
		document.documentElement.style.setProperty("--ring", hslColor);
		document.documentElement.style.setProperty("--sidebar-accent", hslColor);
	};

	const handleResetColorTheme = async () => {
		if (!InstitutionId) return;

		setIsResetting(true);

		try {
			const formData = new FormData();

			formData.append("theme_color", "");

			const response = await apiRequest.patch(`institution/${InstitutionId}/`, formData);

			if (response.status === 200) {
				setRecentColors([]);
				saveColorData([]);
				setThemeColor("#000000");

				// Reset color properties
				document.documentElement.style.setProperty("--primary", "");
				document.documentElement.style.setProperty("--ring", "");
				document.documentElement.style.setProperty("--sidebar-accent", "");

				const event = new CustomEvent("Institution_data_updated");

				toast.info("Theme Color Reset is Successful.");
				window.dispatchEvent(event);
			}
		} catch (error: any) {
			handleApiError(error);
		} finally {
			setIsResetting(false);
		}
	};

	const updateRecentColors = (color: string) => {
		const updatedColors = [color, ...recentColors.filter((c) => c !== color)].slice(0, 7); // Keep max 7 colors

		setRecentColors(updatedColors);
		saveColorData(updatedColors);

		return updatedColors;
	};

	const handleSubmit = async () => {
		setIsSubmitting(true);

		try {
			const formData = new FormData();

			formData.append("theme_color", themeColor);

			const response = await apiRequest.patch(`institution/${InstitutionId}/`, formData);

			if (response.status === 200) {
				updateColorProperties(themeColor);
				updateRecentColors(themeColor);

				const event = new CustomEvent("Institution_data_updated");

				window.dispatchEvent(event);

				toast.success("Theme Color Applied Successfully.");
			}
		} catch (error: any) {
			handleApiError(error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const updateColorFromPicker = (x: number, y: number) => {
		// Map x position to hue (0-360)
		const hue = x * 3.6; // 360 / 100

		// Map y position to lightness (100-0)
		const lightness = 100 - y;

		// Create a color with the selected hue and lightness
		let rgb: [number, number, number] = [0, 0, 0];

		// This is a simplified HSL to RGB conversion
		if (x < 16.7) {
			// Red to Yellow (0-60°)
			rgb = [255, Math.round((x / 16.7) * 255), 0];
		} else if (x < 33.3) {
			// Yellow to Green (60-120°)
			rgb = [Math.round(255 - ((x - 16.7) / 16.7) * 255), 255, 0];
		} else if (x < 50) {
			// Green to Cyan (120-180°)
			rgb = [0, 255, Math.round(((x - 33.3) / 16.7) * 255)];
		} else if (x < 66.7) {
			// Cyan to Blue (180-240°)
			rgb = [0, Math.round(255 - ((x - 50) / 16.7) * 255), 255];
		} else if (x < 83.3) {
			// Blue to Magenta (240-300°)
			rgb = [Math.round(((x - 66.7) / 16.7) * 255), 0, 255];
		} else {
			// Magenta to Red (300-360°)
			rgb = [255, 0, Math.round(255 - ((x - 83.3) / 16.7) * 255)];
		}

		// Adjust for lightness
		const factor = lightness / 100;

		rgb = rgb.map((c) => Math.round(c + (255 - c) * factor)) as [number, number, number];

		const hexColor = rgbToHex(rgb[0], rgb[1], rgb[2]);

		setThemeColor(hexColor);
	};

	const handleSliderChange = (e: React.MouseEvent<HTMLDivElement>) => {
		const slider = e.currentTarget;
		const rect = slider.getBoundingClientRect();
		const position = ((e.clientX - rect.left) / rect.width) * 100;
		const newPosition = Math.max(0, Math.min(100, position));

		setSliderPosition(newPosition);
		setPickerPosition({ ...pickerPosition, x: newPosition });

		// Map position to hue (0-360)
		const hue = newPosition * 3.6; // 360 / 100

		// Create a vibrant color with full saturation and lightness
		let rgb: [number, number, number] = [0, 0, 0];

		if (newPosition < 16.7) {
			// Red to Yellow (0-60°)
			rgb = [255, Math.round((newPosition / 16.7) * 255), 0];
		} else if (newPosition < 33.3) {
			// Yellow to Green (60-120°)
			rgb = [Math.round(255 - ((newPosition - 16.7) / 16.7) * 255), 255, 0];
		} else if (newPosition < 50) {
			// Green to Cyan (120-180°)
			rgb = [0, 255, Math.round(((newPosition - 33.3) / 16.7) * 255)];
		} else if (newPosition < 66.7) {
			// Cyan to Blue (180-240°)
			rgb = [0, Math.round(255 - ((newPosition - 50) / 16.7) * 255), 255];
		} else if (newPosition < 83.3) {
			// Blue to Magenta (240-300°)
			rgb = [Math.round(((newPosition - 66.7) / 16.7) * 255), 0, 255];
		} else {
			// Magenta to Red (300-360°)
			rgb = [255, 0, Math.round(255 - ((newPosition - 83.3) / 16.7) * 255)];
		}

		const hexColor = rgbToHex(rgb[0], rgb[1], rgb[2]);

		setThemeColor(hexColor);
	};

	const handleColorSelect = (color: string) => {
		setThemeColor(color);
	};

	const handlePickerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
		if (colorPickerRef.current) {
			isDraggingRef.current = true;
			const rect = colorPickerRef.current.getBoundingClientRect();
			const x = ((e.clientX - rect.left) / rect.width) * 100;
			const y = ((e.clientY - rect.top) / rect.height) * 100;

			setPickerPosition({ x, y });
			updateColorFromPicker(x, y);
		}
	};

	const hexInput = themeColor.toUpperCase();

	return (
		<div className="p-6 bg-white">
			<div className="flex items-center mb-6">
				<Button
					size="sm"
					className="rounded-full aspect-square"
					variant="outline"
					onClick={() => router.push("/admin")}
				>
					<ArrowLeft />
				</Button>
				<h1 className="text-2xl font-semibold ml-5">Customize theme color</h1>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
				<div className="lg:col-span-3">
					<h2 className="text-lg font-medium mb-4">Custom Color</h2>

					{/* Color Gradient Selector */}
					<div className="mb-4 relative">
						<div
							ref={colorPickerRef}
							className="h-48 w-full rounded-lg overflow-hidden cursor-pointer"
							style={{
								background: `linear-gradient(to bottom, white 0%, transparent 50%, black 100%),
                             linear-gradient(to right,
                               rgba(255,0,0,1) 0%,
                               rgba(255,255,0,1) 16.6%,
                               rgba(0,255,0,1) 33.3%,
                               rgba(0,255,255,1) 50%,
                               rgba(0,0,255,1) 66.6%,
                               rgba(255,0,255,1) 83.3%,
                               rgba(255,0,0,1) 100%)`,
								backgroundBlendMode: "multiply",
							}}
							onMouseDown={handlePickerMouseDown}
						>
							<div
								className="absolute h-8 w-8 rounded-full border-4 border-white transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
								style={{
									top: `${pickerPosition.y}%`,
									left: `${pickerPosition.x}%`,
									backgroundColor: themeColor,
								}}
							/>
						</div>
					</div>

					{/* Color Slider */}
					<div
						className="h-4 w-full rounded-full mb-6 cursor-pointer relative"
						style={{
							backgroundImage: `linear-gradient(to right,
                rgb(255, 0, 0),
                rgb(255, 255, 0),
                rgb(0, 255, 0),
                rgb(0, 255, 255),
                rgb(0, 0, 255),
                rgb(255, 0, 255),
                rgb(255, 0, 0))`,
						}}
						onClick={handleSliderChange}
					>
						<div
							className="absolute h-6 w-6 rounded-full bg-white border shadow-md transform -translate-x-1/2 -translate-y-1/2 cursor-pointer"
							style={{
								top: "50%",
								left: `${sliderPosition}%`,
							}}
						/>
					</div>

					{/* Hex Input Field */}
					<div className="mb-6">
						<div className="flex items-center justify-between">
							<label className="block text-sm font-medium">Hex</label>
							<div className="flex border rounded-md overflow-hidden">
								<div className="h-10 w-10 flex-shrink-0" style={{ backgroundColor: themeColor }} />
								<div className="px-3 py-2 bg-white">
									<span className="text-sm font-medium">{hexInput}</span>
								</div>
							</div>
						</div>
					</div>

					<hr className="my-6 border-gray-200" />

					{/* Recently Used Colors */}
					<div>
						<h2 className="text-lg font-medium mb-4">Recently Used</h2>
						<div className="flex space-x-4 mb-8">
							{recentColors.map((color, index) => (
								<button
									key={index}
									aria-label={`Select color ${color}`}
									className="h-12 w-12 rounded-full cursor-pointer border shadow-sm hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-offset-2"
									style={{ backgroundColor: color }}
									onClick={() => handleColorSelect(color)}
								/>
							))}
						</div>
					</div>

					{/* Action Buttons */}
					<div className="flex space-x-4 mt-8">
						<Button
							className="py-3 text-white rounded-md h-auto w-48"
							disabled={isSubmitting}
							onClick={handleSubmit}
						>
							{isSubmitting ? "Applying..." : "Apply Theme Color"}
						</Button>

						<Button
							className="py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md h-auto w-48"
							disabled={isResetting}
							variant="outline"
							onClick={handleResetColorTheme}
						>
							{isResetting ? "Resetting..." : "Reset To Default"}
						</Button>
					</div>
				</div>

				<div className="lg:col-span-2">
					<h2 className="text-lg font-medium mb-4">Preview</h2>

					{/* Theme Preview Card */}
					<div className="rounded-lg p-6 mb-6" style={{ backgroundColor: themeColor }}>
						<div className="flex flex-col items-center justify-center">
							<h3 className="font-semibold text-xl mb-2" style={{ color: textColor }}>
								Lorem Ipsum
							</h3>
							<p className="text-center text-sm mb-6" style={{ color: textColor }}>
								Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor
								incididunt ut labore et dolore magna aliqua.
							</p>
							<div className="flex space-x-4">
								<button
									className="px-4 py-1.5 rounded-md text-sm font-medium"
									style={{
										backgroundColor: textColor,
										color: themeColor,
									}}
								>
									Sample Button
								</button>
								<button
									className="px-4 py-1.5 rounded-md border text-sm font-medium"
									style={{
										backgroundColor: "transparent",
										borderColor: textColor,
										color: textColor,
									}}
								>
									Sample Button
								</button>
							</div>
						</div>
					</div>

					{/* Color Opacity Preview */}
					<div className="grid grid-cols-4 gap-2">
						<button
							className="p-3 rounded text-center"
							style={{ backgroundColor: themeColor, opacity: 0.2 }}
						>
							<span className="text-sm font-medium">20</span>
						</button>
						<button
							className="p-3 rounded text-center"
							style={{ backgroundColor: themeColor, opacity: 0.5 }}
						>
							<span className="text-sm font-medium">50</span>
						</button>
						<button
							className="p-3 rounded text-center"
							style={{ backgroundColor: themeColor, opacity: 0.75 }}
						>
							<span className="text-sm font-medium">75</span>
						</button>
						<button className="p-3 rounded text-center" style={{ backgroundColor: themeColor }}>
							<span className="text-sm font-medium">100</span>
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
