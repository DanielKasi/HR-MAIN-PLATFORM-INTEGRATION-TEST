"use client";

import Link from "next/link";
import { Icon } from "@iconify/react";
import { useSearchParams } from "next/navigation";

import { Button } from "@/platform/v1/components";
import { Card } from "@/platform/v1/components";

export default function EmailSent() {
	const search_params = useSearchParams();
	const email = search_params.get("email") || "";
	const decodedEmail = decodeURIComponent(email);

	return (
		<div className="flex min-h-screen items-center justify-center bg-muted/40">
			<Card className="shadow-none border-none bg-white md:shadow-sm md:border mx-auto w-full max-w-md px-4 py-8">
				<div className="flex flex-col items-center justify-center space-y-4 text-center">
					<Icon icon="hugeicons:checkmark-circle-03" className="!w-16 !h-16 text-primary" />
					<h1 className="text-2xl font-bold uppercase">Email Sent</h1>
					<p className="text-muted-foreground">
						We&apos;ve sent a password reset link to{" "}
						{decodedEmail ? <b className="inline-block">{decodedEmail}</b> : "your email address"} .
						Please check your inbox and follow the instructions to reset your password.
					</p>
					<p className="text-sm text-muted-foreground">
						If you don&apos;t see the email, check your spam folder or try again.
					</p>

					<div className="mt-6 flex w-full flex-col space-y-4">
						<Link className="w-full" href="/forgot-password">
							<Button className="w-full h-12 rounded-xl" variant="outline">
								Try again
							</Button>
						</Link>
						<Link className="w-full" href="/login">
							<Button className="w-full h-12 rounded-xl">Back to login</Button>
						</Link>
					</div>
				</div>
			</Card>
		</div>
	);
}
