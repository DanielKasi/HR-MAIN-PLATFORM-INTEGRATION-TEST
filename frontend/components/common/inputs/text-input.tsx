"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TextInputProps {
	id: string;
	label: string;
	placeholder?: string;
	value: string;
	onChange: (value: string) => void;
	type?: "text" | "email" | "tel" | "url";
	className?: string;
	required?: boolean;
	disabled?: boolean;
	readOnly?: boolean;
	labelClassName?: string;
	wrapperClassName?: string;
	helperText?: string;
	errorText?: string;
}

export default function TextInput({
	id,
	label,
	placeholder = "",
	value,
	onChange,
	type = "text",
	className = "",
	required = false,
	disabled = false,
	readOnly = false,
	labelClassName = "",
	wrapperClassName = "",
	helperText = "",
	errorText = "",
}: TextInputProps) {
	return (
		<div className={`space-y-0 ${wrapperClassName}`}>
			<Label htmlFor={id} className={`text-sm font-medium ${labelClassName}`}>
				{label}
			</Label>
			<Input
				id={id}
				type={type}
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className={`h-12 rounded-2xl ${className}`}
				required={required}
				disabled={disabled}
				readOnly={readOnly}
			/>

			{/* Error text */}
			{errorText && (
				<p className="text-xs text-red-500 bg-red-50 p-2 rounded-lg mt-1">{errorText}</p>
			)}

			{/* Helper text */}
			{helperText && !errorText && (
				<p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg mt-1">{helperText}</p>
			)}
		</div>
	);
}
