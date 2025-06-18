import Link from "next/link";
import {CheckCircle} from "lucide-react";

import {Button} from "@/components/ui/button";

export default function EmailSent() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto w-full max-w-md px-4 py-8">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <CheckCircle className="h-16 w-16 text-emerald-500" />
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="text-muted-foreground">
            We&apos;ve sent a password reset link to your email address. Please check your inbox and
            follow the instructions to reset your password.
          </p>
          <p className="text-sm text-muted-foreground">
            If you don&apos;t see the email, check your spam folder or try again.
          </p>

          <div className="mt-6 flex w-full flex-col space-y-4">
            <Link className="w-full" href="/forgot-password">
              <Button className="w-full" variant="outline">
                Try again
              </Button>
            </Link>
            <Link className="w-full" href="/login">
              <Button className="w-full bg-emerald-500 hover:bg-emerald-600">Back to login</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
