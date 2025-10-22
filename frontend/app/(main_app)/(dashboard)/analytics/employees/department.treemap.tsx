"use client";
import { Treemap } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSelector } from "react-redux";
import { selectThemePalette } from "@/store/miscellaneous/selectors";

interface DepartmentData {
	department: string;
	count: number;
}

interface DepartmentTreeMapProps {
	title: string;
	data: DepartmentData[];
	chartConfig?: any;
}

const CustomTreemapContent = (props: any) => {
	const { children, onHover, hoveredIndex, isMobile } = props;
	const themePalette = useSelector(selectThemePalette);

	if (!children || children.length === 0) return null;

	return (
		<g>
			{children.map((child: any, index: number) => {
				const { x, y, width, height, department, count } = child;

				// const colors = [
				// 	themePalette.MAIN_THEME_COLOR,
				// 	themePalette.COLOR_20,
				// 	themePalette.COLOR_30,
				// 	themePalette.COLOR_40,
				// 	themePalette.COLOR_50,
				// ];

				const colors = ["#FF3403", "#FF9479", "#FF7957", "#FF5D35", "#FF8668"];
				const fillColor = colors[index % colors.length];
				const isHovered = hoveredIndex === index;

				// Adjust font sizes based on screen size
				const departmentFontSize = isMobile ? "8" : "9";
				const countFontSize = isMobile ? "8" : "10";
				const minWidthForText = isMobile ? 60 : 80; // Minimum width to show text

				return (
					<g
						key={index}
						onMouseEnter={() => onHover(index)}
						onMouseLeave={() => onHover(null)}
						onTouchStart={() => onHover(index)}
						onTouchEnd={() => onHover(null)}
						style={{ cursor: "pointer" }}
					>
						<rect
							x={x}
							y={y}
							width={width}
							height={height}
							fill={fillColor}
							stroke="white"
							strokeWidth={isMobile ? 2 : 3}
							opacity={isHovered ? 0.8 : 1}
						/>
						{/* Only show text if the rectangle is large enough */}
						{width > minWidthForText && height > 20 && (
							<>
								<text
									x={x + width / 2}
									y={y + height / 2 - (isMobile ? 6 : 8)}
									textAnchor="middle"
									fill="white"
									fontSize={departmentFontSize}
									fontWeight="bold"
									pointerEvents="none"
								>
									{department.length > 12 ? department.substring(0, 10) + "..." : department}
								</text>
								<text
									x={x + width / 2}
									y={y + height / 2 + (isMobile ? 6 : 8)}
									textAnchor="middle"
									fill="white"
									fontSize={countFontSize}
									pointerEvents="none"
								>
									{count}
								</text>
							</>
						)}
					</g>
				);
			})}
		</g>
	);
};

export default function DepartmentTreeMap({ data, chartConfig, title }: DepartmentTreeMapProps) {
	const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
	const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 });
	const [isMobile, setIsMobile] = React.useState(false);
	const themePalette = useSelector(selectThemePalette);

	// Check for mobile screen size
	React.useEffect(() => {
		const checkScreenSize = () => {
			setIsMobile(window.innerWidth < 768);
		};

		checkScreenSize();
		window.addEventListener("resize", checkScreenSize);

		return () => {
			window.removeEventListener("resize", checkScreenSize);
		};
	}, []);

	const departmentConfig = React.useMemo(() => {
		const config: Record<string, { label: string; color: string }> = {};
		const colors = [
			"#FF3403",
			"#FF5D35",
			"#FF7957",
			"#FF9479",
			"#FFAF9B",
			"#E02D00",
			"#FF4E22",
			"#FF6A45",
			"#FF8668",
			"#F03000",
		];
		// const colors = [
		// 	themePalette.MAIN_THEME_COLOR,
		// 	themePalette.COLOR_40,
		// 	themePalette.COLOR_30,
		// 	themePalette.COLOR_20,
		// 	themePalette.COLOR_10,
		// 	themePalette.COLOR_80,
		// 	themePalette.COLOR_70,
		// 	themePalette.COLOR_60,
		// 	themePalette.COLOR_50,
		// 	themePalette.COLOR_90,
		// ];
		if (Array.isArray(data)) {
			data.forEach((item, index) => {
				config[item.department] = {
					label: item.department,
					color: colors[index % colors.length],
				};
			});
		}

		return config;
	}, [data, themePalette]);

	const handleHover = (index: number | null) => {
		setHoveredIndex(index);
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		setTooltipPos({ x: e.clientX, y: e.clientY });
	};

	const handleTouchMove = (e: React.TouchEvent) => {
		if (e.touches.length > 0) {
			setTooltipPos({ x: e.touches[0].clientX, y: e.touches[0].clientY });
		}
	};

	return (
		<Card className="shadow-none border rounded-xl">
			<CardHeader className="flex flex-row items-center justify-between pb-0 px-4 sm:px-6 pt-4 sm:pt-6">
				<CardTitle className="text-base sm:text-lg font-semibold text-slate-900 text-center sm:text-left">
					{title}
				</CardTitle>
			</CardHeader>
			<CardContent
				className="relative p-2 sm:p-6"
				onMouseMove={handleMouseMove}
				onTouchMove={handleTouchMove}
			>
				<ChartContainer
					config={departmentConfig}
					className="w-full h-full max-h-[300px] sm:max-h-[350px] md:max-h-[400px] min-h-[200px]"
				>
					<Treemap
						data={data}
						dataKey="count"
						nameKey="department"
						content={
							<CustomTreemapContent
								onHover={handleHover}
								hoveredIndex={hoveredIndex}
								isMobile={isMobile}
							/>
						}
					/>
				</ChartContainer>
				{hoveredIndex !== null && data[hoveredIndex] && (
					<div
						className={`fixed bg-white text-black px-2 sm:px-3 py-1 sm:py-2 rounded-md shadow-lg z-50 pointer-events-none whitespace-nowrap ${
							isMobile ? "text-xs" : "text-sm"
						}`}
						style={{
							left: `${tooltipPos.x + (isMobile ? 5 : 10)}px`,
							top: `${tooltipPos.y + (isMobile ? 5 : 10)}px`,
							maxWidth: isMobile ? "150px" : "none",
						}}
					>
						<p className={`${isMobile ? "text-xs" : "text-sm"} text-slate-500`}>
							{data[hoveredIndex].department}{" "}
							<span className="font-semibold"> {data[hoveredIndex].count}</span>
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
