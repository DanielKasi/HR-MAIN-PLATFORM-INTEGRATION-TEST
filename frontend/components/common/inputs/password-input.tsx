"use client";
import React, { useState, useEffect } from "react";
import { Eye, EyeOff, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PasswordInputProps {
	id: string;
	label: string;
	placeholder?: string;
	value: string;
	onChange: (value: string) => void;
	showValidation?: boolean;
	className?: string;
	required?: boolean;
	disabled?: boolean;
	labelClassName?: string;
	wrapperClassName?: string;
	validationText?: string;
}

export default function PasswordInput({
	id,
	label,
	placeholder = "••••••••",
	value,
	onChange,
	showValidation = false,
	className = "",
	required = true,
	disabled = false,
	labelClassName = "",
	wrapperClassName = "",
	validationText = "",
}: PasswordInputProps) {
	const [showPassword, setShowPassword] = useState(false);
	const [isPasswordValid, setIsPasswordValid] = useState(false);
	const [passwordValidation, setPasswordValidation] = useState({
		minLength: false,
		hasUppercase: false,
		hasLowercase: false,
		hasDigit: false,
		hasSpecialChar: false,
	});

	// Check password strength in real-time when validation is enabled
	useEffect(() => {
		if (!showValidation) return;

		const validation = {
			minLength: value.length >= 8,
			hasUppercase: /[A-Z]/.test(value),
			hasLowercase: /[a-z]/.test(value),
			hasDigit: /\d/.test(value),
			hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(value),
		};

		setPasswordValidation(validation);
		setIsPasswordValid(Object.values(validation).every(Boolean));
	}, [value, showValidation]);

	// Get the first missing password requirement
	const getFirstMissingRequirement = () => {
		if (!passwordValidation.minLength) return "At least 8 characters";
		if (!passwordValidation.hasUppercase) return "At least one uppercase letter (A-Z)";
		if (!passwordValidation.hasLowercase) return "At least one lowercase letter (a-z)";
		if (!passwordValidation.hasDigit) return "At least one number (0-9)";
		if (!passwordValidation.hasSpecialChar) return "At least one special character (!@#$%^&*)";
		return null;
	};

	return (
		<div className={`space-y-0 ${wrapperClassName}`}>
			<Label htmlFor={id} className={`text-sm font-medium ${labelClassName}`}>
				{label}
			</Label>
			<div className="relative">
				<Input
					id={id}
					placeholder={placeholder}
					type={showPassword ? "text" : "password"}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					className={`h-12 pr-12 rounded-2xl ${className}`}
					required={required}
					disabled={disabled}
				/>
				<Button
					className="absolute right-1 top-1 rounded-r-xl w-10 text-slate-400 hover:text-slate-600"
					size="icon"
					type="button"
					variant="ghost"
					onClick={() => setShowPassword(!showPassword)}
					disabled={disabled}
				>
					{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
					<span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
				</Button>
			</div>

			{/* Password validation - only show when enabled and password has content */}
			{showValidation && value.length > 0 && !isPasswordValid && (
				<div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 p-2 rounded-lg">
					<XCircle className="h-4 w-4 flex-shrink-0" />
					<span>{getFirstMissingRequirement()}</span>
				</div>
			)}

			{/* Helper text for validation */}
			{showValidation && validationText && (
				<p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">{validationText}</p>
			)}
		</div>
	);
}
