"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CustomTabsProps {
	defaultValue?: string;
	value?: string;
	onValueChange?: (value: string) => void;
	children: React.ReactNode;
	className?: string;
}

interface CustomTabsListProps {
	children: React.ReactNode;
	className?: string;
}

interface CustomTabsTriggerProps {
	value: string;
	children: React.ReactNode;
	className?: string;
}

interface CustomTabsContentProps {
	value: string;
	children: React.ReactNode;
	className?: string;
}

const CustomTabsContext = React.createContext<{
	value?: string;
	onValueChange?: (value: string) => void;
}>({});

export function CustomTabs({
	defaultValue,
	value,
	onValueChange,
	children,
	className,
}: CustomTabsProps) {
	const [internalValue, setInternalValue] = React.useState(defaultValue || "");

	const currentValue = value !== undefined ? value : internalValue;
	const handleValueChange = onValueChange || setInternalValue;

	return (
		<CustomTabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
			<div className={cn("w-full", className)}>{children}</div>
		</CustomTabsContext.Provider>
	);
}

export function CustomTabsList({ children, className }: CustomTabsListProps) {
	return (
		<div className={cn("flex items-center border-b border-gray-200 mb-6", className)}>
			{children}
		</div>
	);
}

export function CustomTabsTrigger({ value, children, className }: CustomTabsTriggerProps) {
	const context = React.useContext(CustomTabsContext);
	const isActive = context.value === value;

	return (
		<button
			onClick={() => context.onValueChange?.(value)}
			className={cn(
				"relative px-4 py-3 text-sm font-medium transition-colors duration-200 border-b-2 border-transparent hover:text-primary",
				isActive ? "text-gray-900 border-primary" : "text-gray-500 hover:text-gray-700",
				className,
			)}
		>
			{children}
		</button>
	);
}

export function CustomTabsContent({ value, children, className }: CustomTabsContentProps) {
	const context = React.useContext(CustomTabsContext);

	if (context.value !== value) {
		return null;
	}

	return <div className={cn("mt-6", className)}>{children}</div>;
}
