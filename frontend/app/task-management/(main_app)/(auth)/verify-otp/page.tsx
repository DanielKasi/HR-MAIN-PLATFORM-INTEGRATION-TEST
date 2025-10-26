"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Icon } from "@iconify/react";

import { Button } from "@/platform/v1/components";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/platform/v1/components";
import { Input } from "@/platform/v1/components";
import apiRequest from "@/lib/apiRequest";
import { showErrorToast } from "@/lib/utils";
import { AUTH_API } from "@/utils/auth-utils";
import { useModuleNavigation } from "@/hooks/use-module-navigation";

export default function VerifyOTPPage() {
	const searchParams = useSearchParams();
	const [emailValue, setEmailValue] = useState<string | null>(null);
	const [newEmail, setNewEmail] = useState<string>("");
	const [isEditingEmail, setIsEditingEmail] = useState<boolean>(false);
	const user_email = searchParams.get("email") || "";
	const [otp, setOTP] = useState<string[]>(Array(6).fill(""));
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [errorMessage, setErrorMessage] = useState<string>("");
	const [resendDisabled, setResendDisabled] = useState<boolean>(false);
	const [resendCountdown, setResendCountdown] = useState<number>(0);
	const router = useModuleNavigation();

	useEffect(() => {
		if (!user_email) {
			setErrorMessage("Oops something went wrong!");
			toast.error("Missing user information. Redirecting to login page.");
			router.push("/login");

			return;
		}
		setEmailValue(decodeURIComponent(user_email));
	}, [user_email, router]);

	useEffect(() => {
		// Countdown timer for resend button
		if (resendCountdown > 0) {
			const timer = setTimeout(() => {
				setResendCountdown(resendCountdown - 1);
			}, 1000);

			return () => clearTimeout(timer);
		} else if (resendCountdown === 0 && resendDisabled) {
			setResendDisabled(false);
		}
	}, [resendCountdown, resendDisabled]);

	const handleVerify = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!emailValue) {
			return;
		}

		// Validate OTP is complete
		if (otp.some((digit) => digit === "")) {
			setErrorMessage("Please enter all 6 digits of the OTP");

			return;
		}

		setIsSubmitting(true);
		setErrorMessage("");

		try {
			const response = await apiRequest.post("user/verify-otp/", {
				email: emailValue,
				otp: otp.join(""),
			});

			if (response.status === 200) {
				toast("Your account has been verified successfully!");
				router.push("/login?verified=true");
			}
		} catch (error: any) {
			showErrorToast({ error, defaultMessage: "Verification failed" });
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleResend = async () => {
		if (resendDisabled || isSubmitting || !emailValue) return;

		setResendDisabled(true);
		setResendCountdown(60);
		try {
			await apiRequest.post("user/resend-otp/", { email: emailValue });
			setErrorMessage("");
			setOTP(Array(6).fill(""));
			toast.success(`A new verification code has been sent to ${emailValue}`);
		} catch (error: any) {
			showErrorToast({ error, defaultMessage: "Failed to resend OTP" });
			setResendDisabled(false);
			setResendCountdown(0);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleChangeEmail = async (e: React.FormEvent) => {
		e.preventDefault();
		e.stopPropagation();
		if (!emailValue || !newEmail) {
			setErrorMessage("Please enter a new email address");

			return;
		}

		setIsSubmitting(true);
		setErrorMessage("");

		try {
			await AUTH_API.changeEmailAndResendOtp({ old_email: emailValue, new_email: newEmail });
			setEmailValue(newEmail);
			setNewEmail("");
			setIsEditingEmail(false);
			setOTP(Array(6).fill(""));
			toast.success(`OTP sent to new email: ${newEmail}`);
			router.push(`/verify-otp?email=${encodeURIComponent(newEmail)}`);
		} catch (error: any) {
			showErrorToast({ error, defaultMessage: "Failed to change email and resend OTP" });
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
		if (e.key === "Backspace" && index > 0 && !otp[index]) {
			document.getElementById(`otp-${index - 1}`)?.focus();
		}
	};

	return (
		<div className="flex h-screen w-full items-center justify-center bg-muted/40">
			<Card className="w-full max-w-md border-none md:border-1 shadow-none md:shadow-none">
				<CardHeader className="space-y-1">
					<div className="flex items-center justify-center mb-2">
						<Icon icon="hugeicons:user-check-01" className="!w-10 !h-10 text-primary" />
					</div>
					<CardTitle className="text-2xl text-center">Verify Your Account</CardTitle>
					<div className="py-4">
						{isEditingEmail ? (
							<form onSubmit={handleChangeEmail} className="flex flex-col gap-4">
								<p className="text-base text-center w-full">Enter new email to receive OTP</p>
								<Input
									className="h-12 rounded-xl"
									placeholder="new@example.com"
									type="email"
									required
									value={newEmail}
									onChange={(e) => setNewEmail(e.target.value)}
								/>
								<div className="flex justify-between gap-4 mt-2">
									<Button
										variant="outline"
										type="button"
										className="h-12 rounded-xl"
										onClick={() => setIsEditingEmail(false)}
										disabled={isSubmitting}
									>
										Cancel
									</Button>
									<Button
										type="submit"
										className="h-12 rounded-xl"
										disabled={isSubmitting || !newEmail}
									>
										{isSubmitting ? "Sending..." : "Send OTP to New Email"}
									</Button>
								</div>
							</form>
						) : (
							<>
								<p className="w-full text-center">
									Enter the 6-digit code sent to{" "}
									{emailValue ? <b className="inline-block">{emailValue}</b> : "your email"}{" "}
								</p>
								<div className="flex items-center justify-center w-full">
									<Button
										className="text-primary text-sm mt-2"
										variant="link"
										onClick={() => setIsEditingEmail(true)}
										disabled={isSubmitting}
									>
										Wrong email? Change it
									</Button>
								</div>
							</>
						)}
					</div>
				</CardHeader>
				{!isEditingEmail && (
					<form onSubmit={handleVerify}>
						<CardContent className="grid gap-4">
							{errorMessage && <div className="text-red-500 text-center mt-2">{errorMessage}</div>}
							<div className="grid grid-cols-6 gap-2">
								{otp.map((digit, index) => (
									<Input
										key={index}
										aria-label={`OTP digit ${index + 1}`}
										autoFocus={index === 0}
										className="text-center font-bold text-lg h-14 w-12"
										id={`otp-${index}`}
										inputMode="numeric"
										maxLength={1}
										pattern="\d*"
										type="text"
										value={digit}
										onChange={(e) => {
											const newOTP = [...otp];

											newOTP[index] = e.target.value.replace(/[^0-9]/g, "");
											setOTP(newOTP);
											if (e.target.value && index < 5) {
												document.getElementById(`otp-${index + 1}`)?.focus();
											}
										}}
										onKeyDown={(e) => handleInputKeyDown(e, index)}
										onPaste={(e) => {
											e.preventDefault();
											const pastedData = e.clipboardData.getData("text/plain").replace(/\D/g, "");

											if (pastedData) {
												const newOTP = [...otp];

												for (let i = 0; i < Math.min(pastedData.length, 6); i++) {
													newOTP[i] = pastedData[i];
												}
												setOTP(newOTP);
											}
										}}
									/>
								))}
							</div>
						</CardContent>
						<CardFooter className="flex flex-col">
							<Button
								className="w-full h-12 rounded-xl"
								disabled={isSubmitting || resendDisabled}
								type="submit"
							>
								{isSubmitting ? "Verifying..." : "Verify"}
							</Button>
							<p className="mt-4 text-center text-sm text-muted-foreground">
								Didn't receive the code?{" "}
								<Button
									className="p-0 text-primary"
									disabled={isSubmitting || resendDisabled}
									type="button"
									variant="link"
									onClick={handleResend}
								>
									{resendDisabled ? `Resend code (${resendCountdown}s)` : "Resend code"}
								</Button>
							</p>
						</CardFooter>
					</form>
				)}
			</Card>
		</div>
	);
}
