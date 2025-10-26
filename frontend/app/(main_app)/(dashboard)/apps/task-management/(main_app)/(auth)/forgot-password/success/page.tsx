import Link from "next/link";
import { CheckCircle } from "lucide-react";

import { Button } from "@/platform/v1/components";

export default function PasswordResetSuccessful() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="mx-auto w-full max-w-md px-4 py-8">
				<div className="flex flex-col items-center justify-center space-y-4 text-center">
					<CheckCircle className="h-16 w-16 text-emerald-500" />
					<h1 className="text-2xl font-bold">Password successfully updated</h1>
					<p className="text-muted-foreground">
						Your password has been changed. You can now login with your new password.
					</p>

					<Link className="mt-6 w-full" href="/login">
						<Button className="w-full bg-emerald-500 hover:bg-emerald-600">Login Now</Button>
					</Link>
				</div>
			</div>
		</div>
	);
}
