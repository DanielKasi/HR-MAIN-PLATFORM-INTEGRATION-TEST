"use client";

import type React from "react";

import {useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {forgotPassword} from "@/lib/utils";
import {handleApiError} from "@/lib/apiErrorHandler";

export default function EmailRequest() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Get the current origin (protocol + host)
      const frontendUrl = typeof window !== "undefined" ? window.location.origin : "";

      // Pass the frontend URL along with the email
      await forgotPassword(email, frontendUrl);
      toast.success("Email sent. Check your email for a password reset link");
      router.push("/forgot-password/email-sent");
    } catch (error: any) {
      toast.error("Failed to send reset email. Please try again.");
      handleApiError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="mx-auto w-full max-w-md px-4 py-8">
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <h1 className="text-2xl font-bold">Forgot your password?</h1>
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
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <Button
            className="w-full bg-emerald-500 hover:bg-emerald-600"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? "Submitting..." : "Submit"}
          </Button>

          <div className="text-center">
            <span>Remember your password? </span>
            <Link className="text-emerald-500 hover:underline" href="/login">
              Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
