"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useModuleNavigation } from "@/hooks/use-module-navigation";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/platform/v1/components";
import { Input } from "@/platform/v1/components";
import { Label } from "@/platform/v1/components";
import { resetPassword, verifyResetToken, validatePasswordStrength } from "@/lib/utils";
import { handleApiError } from "@/lib/apiErrorHandler";

export default function ChangePassword({ params }: { params: { token: string } }) {
	const [password, setPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [isTokenValid, setIsTokenValid] = useState(false);
	const [isValidating, setIsValidating] = useState(true);
	const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
	const router = useModuleNavigation();
	const { token } = params;

	useEffect(() => {
		const validateToken = async () => {
			try {
				await verifyResetToken(token);

				setIsTokenValid(true);
			} catch {
				setIsTokenValid(false);
			} finally {
				setIsValidating(false);
			}
		};

		validateToken();
	}, [token]);

	const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newPassword = e.target.value;

		setPassword(newPassword);
		const validation = validatePasswordStrength(newPassword);

		setPasswordErrors(validation.errors);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		// Validate password
		const validation = validatePasswordStrength(password);

		setPasswordErrors(validation.errors);

		if (!validation.valid) {
			return;
		}

		if (password !== confirmPassword) {
			toast.error("Passwords don't match...");

			return;
		}

		setIsLoading(true);

		try {
			await resetPassword(token, password);
			router.push("/forgot-password/success");
		} catch (error: any) {
			handleApiError(error);
		} finally {
			setIsLoading(false);
		}
	};

	if (isValidating) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<p>Validating your reset link...</p>
			</div>
		);
	}

	if (!isTokenValid) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="mx-auto w-full max-w-md px-4 py-8 text-center">
					<h1 className="text-2xl font-bold">Invalid or Expired Link</h1>
					<p className="mt-2 text-muted-foreground">
						This password reset link is invalid or has expired. Please request a new one.
					</p>
					<Button
						className="mt-6 bg-emerald-500 hover:bg-emerald-600"
						onClick={() => router.push("/forgot-password")}
					>
						Request New Link
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="mx-auto w-full max-w-md px-4 py-8">
				<div className="flex flex-col items-center justify-center space-y-2 text-center">
					<h1 className="text-2xl font-bold">Create a new password</h1>
					<p className="text-muted-foreground">Enter new password below to change your password</p>
				</div>

				<form className="mt-8 space-y-6" onSubmit={handleSubmit}>
					<div className="space-y-2">
						<Label htmlFor="password">New Password</Label>
						<div className="relative">
							<Input
								required
								id="password"
								type={showPassword ? "text" : "password"}
								value={password}
								onChange={handlePasswordChange}
							/>
							<Button
								className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
								size="icon"
								type="button"
								variant="ghost"
								onClick={() => setShowPassword(!showPassword)}
							>
								{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
								<span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
							</Button>
						</div>
						{passwordErrors.length > 0 && (
							<ul className="mt-2 space-y-1 text-sm text-red-500">
								{passwordErrors.map((error, index) => (
									<li key={index}>{error}</li>
								))}
							</ul>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="confirmPassword">Confirm New Password</Label>
						<div className="relative">
							<Input
								required
								id="confirmPassword"
								type={showConfirmPassword ? "text" : "password"}
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
							/>
							<Button
								className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
								size="icon"
								type="button"
								variant="ghost"
								onClick={() => setShowConfirmPassword(!showConfirmPassword)}
							>
								{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
								<span className="sr-only">
									{showConfirmPassword ? "Hide password" : "Show password"}
								</span>
							</Button>
						</div>
						{password && confirmPassword && password !== confirmPassword && (
							<p className="mt-1 text-sm text-red-500">Passwords don't match</p>
						)}
					</div>

					<Button
						className="w-full bg-emerald-500 hover:bg-emerald-600"
						disabled={isLoading || passwordErrors.length > 0 || password !== confirmPassword}
						type="submit"
					>
						{isLoading ? "Resetting..." : "Reset Password"}
					</Button>
				</form>
			</div>
		</div>
	);
}
