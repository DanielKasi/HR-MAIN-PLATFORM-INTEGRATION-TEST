"use client";

import type React from "react";

import { useState } from "react";
import Link from "next/link";
import { useModuleNavigation } from "@/hooks/use-module-navigation";
import { toast } from "sonner";

import { Button } from "@/platform/v1/components";
import { Input } from "@/platform/v1/components";
import { Label } from "@/platform/v1/components";
import { forgotPassword } from "@/lib/utils";
import { handleApiError } from "@/lib/apiErrorHandler";
import { Card } from "@/platform/v1/components";

export default function EmailRequest() {
	const [email, setEmail] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const router = useModuleNavigation();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);

		try {
			// Get the current origin (protocol + host)
			const frontendUrl = typeof window !== "undefined" ? window.location.origin : "";

			// Pass the frontend URL along with the email
			await forgotPassword(email, frontendUrl);
			toast.success("Email sent. Check your email for a password reset link");
			router.push(`/forgot-password/email-sent?email=${encodeURIComponent(email)}`);
		} catch (error: any) {
			toast.error("Failed to send reset email. Please try again.");
			handleApiError(error);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-muted/40">
			<Card className=" shadow-none border-none bg-white md:shadow-sm md:border mx-auto w-full max-w-md px-4 py-8">
				<div className="flex flex-col items-center justify-center space-y-2 text-center">
					<h1 className="text-2xl font-bold uppercase">Forgot your password?</h1>
					<p className="text-muted-foreground">
						Enter the email address linked to your account. We&apos;ll send you a link to reset your
						password.
					</p>
				</div>

				<form className="mt-8 space-y-6" onSubmit={handleSubmit}>
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input
							required
							id="email"
							placeholder="name@example.com"
							type="email"
							value={email}
							className="rounded-xl h-12"
							onChange={(e) => setEmail(e.target.value)}
						/>
					</div>

					<Button className="w-full rounded-xl h-12" disabled={isLoading} type="submit">
						{isLoading ? "Submitting..." : "Submit"}
					</Button>

					<div className="text-center">
						<span>Remember your password? </span>
						<Button type="button" variant={"link"}>
							<Link className="" href="/login">
								Login
							</Link>
						</Button>
					</div>
				</form>
			</Card>
		</div>
	);
}
