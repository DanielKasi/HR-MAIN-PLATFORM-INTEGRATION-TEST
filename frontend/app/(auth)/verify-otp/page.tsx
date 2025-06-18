"use client";

import type React from "react";

import {useState, useEffect} from "react";
import {useRouter, useSearchParams} from "next/navigation";
import {ShoppingCart} from "lucide-react";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardFooter, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import apiRequest from "@/lib/apiRequest";
import {handleApiError} from "@/lib/apiErrorHandler";

export default function VerifyOTPPage() {
  const searchParams = useSearchParams();
  const user_id = searchParams.get("user_id") || "";
  const [otp, setOTP] = useState<string[]>(Array(6).fill(""));
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [resendDisabled, setResendDisabled] = useState<boolean>(false);
  const [resendCountdown, setResendCountdown] = useState<number>(0);
  const router = useRouter();

  useEffect(() => {
    if (!user_id) {
      setErrorMessage("Oops something went wrong!");
      toast("Missing user information. Redirecting to login page.");
      router.push("/login");
    }
  }, [user_id, router]);

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

    // Validate OTP is complete
    if (otp.some((digit) => digit === "")) {
      setErrorMessage("Please enter all 6 digits of the OTP");

      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await apiRequest.post("user/verify-otp/", {
        user_id,
        otp: otp.join(""),
      });

      if (response.status === 200) {
        toast("Your account has been verified successfully!");
        router.push("/login?verified=true");
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      setErrorMessage(error.response?.data?.message || "Verification failed");
      toast.error("Verification failed. Please check your OTP and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendDisabled) return;

    setIsSubmitting(true);
    setResendDisabled(true);
    setResendCountdown(60);
    try {
      await apiRequest.post("user/resend-otp/", {user_id});
      setErrorMessage("");
      setOTP(Array(6).fill(""));
      toast.success("A new verification code has been sent to your email.");
    } catch (error: any) {
      handleApiError(error);
      setResendDisabled(false);
      setResendCountdown(0);
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
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-2">
            <ShoppingCart className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">Verify Your Account</CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            Enter the 6-digit code sent to your email
          </p>
        </CardHeader>
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
            <Button className="w-full" disabled={isSubmitting} type="submit">
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
      </Card>
    </div>
  );
}
