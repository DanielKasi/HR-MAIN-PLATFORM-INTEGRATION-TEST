"use client";

import type * as React from "react";

// ChartContainer
interface ChartContainerProps {
	children: React.ReactNode;
	className?: string;
	config?: Record<string, { label: string; color: string }>;
}

export const ChartContainer = ({ children, className, config }: ChartContainerProps) => {
	// you can even inject config into CSS variables here if needed
	return <div className={`relative ${className ?? ""}`}>{children}</div>;
};

// ChartTooltip
interface ChartTooltipProps {
	children?: React.ReactNode;
	content?: React.ReactNode;
	cursor?: boolean;
}

export const ChartTooltip = ({ children, content }: ChartTooltipProps) => {
	return <>{content ?? children}</>;
};

// ChartTooltipContent
type ChartTooltipContentProps = {
	hideLabel?: boolean;
	// also include payload, label, active if you are using them
	payload?: any;
	label?: string;
	active?: boolean;
};

export function ChartTooltipContent({
	hideLabel,
	payload,
	label,
	active,
}: ChartTooltipContentProps) {
	if (!active || !payload?.length) return null;

	return (
		<div className="custom-tooltip">
			{!hideLabel && <p className="label">{label}</p>}
			<p className="value">{payload[0].value}</p>
		</div>
	);
}
