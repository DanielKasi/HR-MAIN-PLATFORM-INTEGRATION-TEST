"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useDispatch } from "react-redux";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { Icon } from "@iconify/react";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CUSTOM_CODES } from "@/constants";
import { selectUser, selectAuthError, selectUserLoading } from "@/store/auth/selectors";
import { clearAuthError, loginStart } from "@/store/auth/actions";
import FixedLoader from "@/components/fixed-loader";
import { showErrorToast } from "@/lib/utils";
import { AUTH_API } from "@/utils/auth-utils";
import PhoneNumberInput from "@/components/phone-number-input";
import type { ICountry } from "@/types/types.utils";

type AuthMethod = "email" | "username" | "phone";

export default function LoginPage() {
	const [showPassword, setShowPassword] = useState(false);
	const [authMethod, setAuthMethod] = useState<AuthMethod>("email");
	const [email, setEmail] = useState("");
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");
	const [phoneData, setPhoneData] = useState<{
		country: ICountry | null;
		countryCode: string;
		phoneNumber: string;
		isValid: boolean;
	}>({
		country: null,
		countryCode: "",
		phoneNumber: "",
		isValid: false,
	});
	const router = useRouter();
	const [errorMessage, setErrorMessage] = useState("");
	const [OTPSentMessage, setOTPSentMessage] = useState("");
	const [customErrorCode, setCustomErrorCode] = useState<CUSTOM_CODES | null>(null);
	const [loadingState, setLoadingState] = useState<{ auth: boolean; OTP: boolean }>({
		auth: false,
		OTP: false,
	});
	const currentUser = useSelector(selectUser);
	const authLoading = useSelector(selectUserLoading);
	const authError = useSelector(selectAuthError);
	const dispatch = useDispatch();

	useEffect(() => {
		if (currentUser) {
			router.push("/dashboard");
		}
	}, [currentUser]);

	useEffect(() => {
		return () => {
			dispatch(clearAuthError());
		};
	}, []);

	useEffect(() => {
		setLoadingState((prev) => ({ ...prev, auth: authLoading }));
	}, [authLoading]);

	useEffect(() => {
		if (authError) {
			if (
				[CUSTOM_CODES.ADMIN_CREATED_UNVERIFIED, CUSTOM_CODES.SELF_CREATED_UNVERIFIED].some(
					(code) => code === authError.customCode,
				)
			) {
				setCustomErrorCode(authError.customCode);
			}
			let errorMessage = "";

			// console.log(authError);

			if (authError.customCode === CUSTOM_CODES.SELF_CREATED_UNVERIFIED) {
				errorMessage = "You need to verify your email to login";
			} else if (authError.customCode === CUSTOM_CODES.INVALID_CREDENTIALS) {
				errorMessage = "Invalid Credentials";
			} else {
				errorMessage = "Something went wrong !";
			}
			toast.error(errorMessage);
		}
	}, [authError]);

	useEffect(() => {
		if (OTPSentMessage.trim()) {
			const timer = setTimeout(() => {
				setOTPSentMessage("");
			}, 5000);

			return () => clearTimeout(timer);
		}
	}, [OTPSentMessage]);

	const getUsernameValue = () => {
		return username.trim();
		// switch (authMethod) {
		// 	case "email":
		// 		return email.trim();
		// 	case "username":
		// 		return username.trim();
		// 	case "phone":
		// 		return phoneData.isValid ? `${phoneData.countryCode}${phoneData.phoneNumber}` : "";
		// 	default:
		// 		return "";
		// }
	};

	const isFormValid = () => {
		if (!password.trim()) return false;
		return username.trim() !== "";
		// switch (authMethod) {
		// 	case "email":
		// 		return email.trim() !== "";
		// 	case "username":
		// 		return username.trim() !== "";
		// 	case "phone":
		// 		return phoneData.isValid;
		// 	default:
		// 		return false;
		// }
	};

	const handleLogin = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!isFormValid()) {
			setErrorMessage(`You need to provide valid credentials !`);
			return;
		}

		setErrorMessage("");
		const usernameValue = getUsernameValue();
		dispatch(loginStart(usernameValue, password));
	};

	const handleCustomCodeAction = async (code: CUSTOM_CODES) => {
		if (code === CUSTOM_CODES.BLOCKED_BY_ADMIN) {
			return;
		}

		const usernameValue = getUsernameValue();
		if (!usernameValue) {
			setErrorMessage(`You need to provide your ${authMethod} address`);
			return;
		}

		setLoadingState((prev) => ({ ...prev, OTP: true }));
		if (code == CUSTOM_CODES.SELF_CREATED_UNVERIFIED) {
			try {
				const response = await AUTH_API.resendOtp({ mode: "otp", email: usernameValue });

				router.push(`verify-otp?email=${encodeURIComponent(usernameValue)}`);
			} catch (error: any) {
				showErrorToast({ error, defaultMessage: "Failed to send OTP " });
				// setErrorMessage(error?.message);
			} finally {
				setLoadingState((prev) => ({ ...prev, OTP: false }));
			}
		} else if (code == CUSTOM_CODES.ADMIN_CREATED_UNVERIFIED) {
			try {
				await AUTH_API.resendOtp({ mode: "password_link", email: usernameValue });

				setOTPSentMessage(`We have sent an email to ${usernameValue}, check your inbox`);
			} catch (error: any) {
				setErrorMessage(error.message);
			} finally {
				setLoadingState((prev) => ({ ...prev, OTP: false }));
			}
		}
	};

	return (
		<div className="flex h-screen w-full items-center justify-center bg-muted/40">
			<Card className="w-full max-w-md shadow-none border-none md:shadow-sm md:border px-4">
				<CardHeader className="space-y-1">
					<div className="flex items-center justify-center mb-2">
						<Icon icon="hugeicons:user-group-02" className="!w-10 !h-10 text-primary" />
					</div>
					<CardTitle className="text-2xl text-center">SIGN IN</CardTitle>
					<CardDescription className="text-center">
						Enter your credentials to access your account
					</CardDescription>
				</CardHeader>
				<form className="py-4" onSubmit={handleLogin}>
					<CardContent className="grid gap-4">
						{errorMessage && <div className="text-red-500 text-center mt-2">{errorMessage}</div>}

						{customErrorCode && (
							<p className="text-sm w-full text-center">
								{loadingState.OTP ? (
									<span className=" opacity-80 animate-bounce">Sending...</span>
								) : (
									<span
										className="text-primary font-semibold cursor-pointer underline-offset-2 underline hover:cursor-pointer"
										onClick={(_) => handleCustomCodeAction(customErrorCode)}
									>
										Send{" "}
										{customErrorCode === CUSTOM_CODES.SELF_CREATED_UNVERIFIED
											? "OTP"
											: "Password link"}{" "}
										to this {authMethod}
									</span>
								)}
							</p>
						)}
						{/* 
						<Tabs
							value={authMethod}
							onValueChange={(value) => setAuthMethod(value as AuthMethod)}
							className="w-full"
						>
							<TabsList className="grid w-full grid-cols-3 rounded-xl !mb-8">
								<TabsTrigger className="rounded-xl px-1" value="email">
									Email
								</TabsTrigger>
								<TabsTrigger className="rounded-xl px-1" value="username">
									Username
								</TabsTrigger>
								<TabsTrigger className="rounded-xl px-1" value="phone">
									Phone
								</TabsTrigger>
							</TabsList>

							<TabsContent value="email" className="space-y-2">
								<div className="grid gap-2 space-y-1">
									<Label htmlFor="email">Email</Label>
									<Input
										required
										id="email"
										placeholder="name@example.com"
										type="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
									/>
								</div>
							</TabsContent>

							<TabsContent value="username" className="space-y-2">
								<div className="grid gap-2 space-y-1">
									<Label htmlFor="username">Email, Username or Phone Number</Label>
									<Input
										required
										id="username"
										placeholder="Enter your username, email or Phone number"
										type="text"
										value={username}
										onChange={(e) => setUsername(e.target.value)}
									/>
								</div>
							</TabsContent>

							<TabsContent value="phone" className="space-y-2">
								<PhoneNumberInput
									label="Phone Number"
									required
									value={phoneData.phoneNumber}
									country={phoneData.country}
									onChange={setPhoneData}
								/>
							</TabsContent>
						</Tabs> */}

						<div className="grid gap-2 space-y-1">
							<Label htmlFor="username">Email, Username or Phone Number</Label>
							<Input
								required
								id="username"
								placeholder="Enter your username, email or Phone number"
								type="text"
								value={username}
								onChange={(e) => setUsername(e.target.value)}
							/>
						</div>

						<div className="grid gap-2">
							<div className="flex items-center justify-between">
								<Label htmlFor="password">Password</Label>
								<Button variant={"link"} type="button">
									<Link className="text-sm " href="/forgot-password">
										Forgot password?
									</Link>
								</Button>
							</div>
							<div className="relative">
								<Input
									required
									id="password"
									placeholder="••••••••"
									type={showPassword ? "text" : "password"}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
								/>
								<Button
									className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground"
									size="icon"
									type="button"
									variant="ghost"
									onClick={() => setShowPassword(!showPassword)}
								>
									{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
									<span className="sr-only">
										{showPassword ? "Hide password" : "Show password"}
									</span>
								</Button>
							</div>
						</div>
					</CardContent>
					<CardFooter className="flex flex-col">
						<Button
							className={`${loadingState.auth ? "opacity-80" : "opacity-100"} w-full h-12 rounded-xl`}
							type="submit"
						>
							{loadingState.auth ? "Signing In..." : "Sign In"}
						</Button>
						<span className="text-sm w-fit text-center opacity-70 mx-auto mt-8">
							Already have an account ?{" "}
							<Link className=" text-primary underline-offset-4 hover:underline" href="/signup">
								{" "}
								Signup
							</Link>
						</span>
					</CardFooter>
				</form>
			</Card>

			{loadingState.auth && <FixedLoader />}
		</div>
	);
}
