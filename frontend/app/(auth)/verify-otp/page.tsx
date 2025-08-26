"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import apiRequest from "@/lib/apiRequest";
import { handleApiError } from "@/lib/apiErrorHandler";
import { showErrorToast } from "@/lib/utils";

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
  const [isResendModalOpen, setIsResendModalOpen] = useState<boolean>(false);
  const [editedEmail, setEditedEmail] = useState<string>("");
  const router = useRouter();

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

  const openResendModal = () => {
    if (resendDisabled || !emailValue) return;
    setEditedEmail(emailValue);
    setIsResendModalOpen(true);
  };

  const handleConfirmResend = async () => {
    setIsResendModalOpen(false);

    if (!editedEmail) {
      setErrorMessage("Email address is required");
      return;
    }

    setIsSubmitting(true);
    setResendDisabled(true);
    setResendCountdown(60);

    try {
      if (editedEmail !== emailValue) {
        const response = await apiRequest.post("user/change-email-and-resend-otp/", {
          old_email: emailValue,
          new_email: editedEmail,
        });

        if (response.status === 200) {
          setEmailValue(editedEmail);
          toast.success(`OTP sent to new email: ${editedEmail}`);
        }
      } else {
        await apiRequest.post("user/resend-otp/", { email: emailValue });
        toast.success(`A new verification code has been sent to ${emailValue}`);
      }

      setErrorMessage("");
      setOTP(Array(6).fill(""));
    } catch (error: any) {
      showErrorToast({ error, defaultMessage: "Failed to resend OTP" });
      setResendDisabled(false);
      setResendCountdown(0);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!emailValue || !newEmail) {
      setErrorMessage("Please enter a new email address");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await apiRequest.post("user/change-email-and-resend-otp/", {
        old_email: emailValue,
        new_email: newEmail,
      });

      if (response.status === 200) {
        setEmailValue(newEmail);
        setNewEmail("");
        setIsEditingEmail(false);
        setOTP(Array(6).fill(""));
        toast.success(`OTP sent to new email: ${newEmail}`);
      }
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
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-2">
            <ShoppingCart className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">Verify Your Account</CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            {isEditingEmail ? (
              <>
                Enter new email to receive OTP
                <Input
                  className="mt-2 w-3/4 mx-auto"
                  placeholder="new@example.com"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <div className="flex justify-center gap-2 mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingEmail(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleChangeEmail}
                    disabled={isSubmitting || !newEmail}
                  >
                    {isSubmitting ? "Sending..." : "Send OTP to New Email"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                Enter the 6-digit code sent to <b>{emailValue}</b>
                <Button
                  className="text-primary text-sm mt-2"
                  variant="link"
                  onClick={() => setIsEditingEmail(true)}
                  disabled={isSubmitting}
                >
                  Wrong email? Change it
                </Button>
              </>
            )}
          </p>
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
                  onClick={openResendModal}
                >
                  {resendDisabled ? `Resend code (${resendCountdown}s)` : "Resend code"}
                </Button>
              </p>
            </CardFooter>
          </form>
        )}
      </Card>

      <Dialog open={isResendModalOpen} onOpenChange={setIsResendModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm or Edit Email</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Label htmlFor="edited-email">Email Address</Label>
            <Input
              id="edited-email"
              type="email"
              value={editedEmail}
              onChange={(e) => setEditedEmail(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              Confirm your email or edit if incorrect. Resending multiple times may be limited to prevent abuse.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsResendModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmResend} disabled={isSubmitting || !editedEmail}>
              {isSubmitting ? "Sending..." : "Resend"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}