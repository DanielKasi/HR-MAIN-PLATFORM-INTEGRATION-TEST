"use client";
import type React from "react";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

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
import apiRequest from "@/lib/apiRequest";
import { handleApiError } from "@/lib/apiErrorHandler";
import { USER_GENDER } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";

const GENDER_LABELS: Record<USER_GENDER, string> = {
  [USER_GENDER.MALE]: "Male",
  [USER_GENDER.FEMALE]: "Female",
  [USER_GENDER.OTHER]: "Other",
};

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [gender, setGender] = useState<USER_GENDER | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasDigit: false,
    hasSpecialChar: false,
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordsMatch, setPasswordsMatch] = useState(false);
  const router = useRouter();

  // Check password strength in real-time
  useEffect(() => {
    const validation = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasDigit: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };

    setPasswordValidation(validation);
    setIsPasswordValid(Object.values(validation).every(Boolean));
  }, [password]);

  // Check if passwords match in real-time
  useEffect(() => {
    setPasswordsMatch(password === confirmPassword && confirmPassword.length > 0);
  }, [password, confirmPassword]);

  // Get the first missing password requirement
  const getFirstMissingRequirement = () => {
    if (!passwordValidation.minLength) return "At least 8 characters";
    if (!passwordValidation.hasUppercase) return "At least one uppercase letter (A-Z)";
    if (!passwordValidation.hasLowercase) return "At least one lowercase letter (a-z)";
    if (!passwordValidation.hasDigit) return "At least one number (0-9)";
    if (!passwordValidation.hasSpecialChar) return "At least one special character (!@#$%^&*)";
    return null;
  };

  const showErrorMessage = (message: string) => {
    toast.error(message);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!isPasswordValid) {
      showErrorMessage("Please fix the password requirements");
      return;
    }

    if (!passwordsMatch) {
      showErrorMessage("Passwords do not match");
      return;
    }

    if (!gender) {
      showErrorMessage("Please choose a gender");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiRequest.post("user/", {
        email,
        fullname,
        password,
        gender,
      });

      if (response.status === 201) {
        const user_id = response.data.id;
        router.push(`verify-otp?email=${encodeURIComponent(email)}`);
      }
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const ValidationItem = ({ isValid, text }: { isValid: boolean; text: string }) => (
    <div className="flex items-center gap-2 text-sm">
      {isValid ? (
        <CheckCircle2 className="h-4 w-4 text-green-500" />
      ) : (
        <XCircle className="h-4 w-4 text-red-500" />
      )}
      <span className={isValid ? "text-green-500" : "text-red-500"}>{text}</span>
    </div>
  );

  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Card className="w-full mx-[2rem] max-w-md lg:max-w-lg border-none">
        <CardHeader className="space-y-1 border-none">
          <CardTitle className="text-2xl text-center font-bold">Create an Account</CardTitle>
          <CardDescription className="text-center text-base">
            Enter your details to sign up for PERACOSOFT
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="grid gap-4">
            {errorMessage && <div className="text-red-500 text-center mt-2">{errorMessage}</div>}
            <div className="grid gap-2">
              <Label htmlFor="fullname" className="font-medium text-sm">
                Full Name
              </Label>
              <Input
                required
                id="fullname"
                placeholder="John Doe"
                type="text"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email" className="font-medium text-sm">
                Email
              </Label>
              <Input
                required
                id="email"
                placeholder="name@example.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="gap-2">
              <Label htmlFor="gender" className="font-medium text-sm">
                Gender
              </Label>
              <Select
                value={gender}
                onValueChange={(value) => setGender(value as USER_GENDER)}
                name="gender"
                required
              >
                <SelectTrigger>{gender ? GENDER_LABELS[gender] : "Choose a gender"}</SelectTrigger>
                <SelectContent>
                  <SelectItem value={USER_GENDER.MALE}>Male</SelectItem>
                  <SelectItem value={USER_GENDER.FEMALE}>Female</SelectItem>
                  <SelectItem value={USER_GENDER.OTHER}>Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="font-medium text-sm">
                  Password
                </Label>
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

              {/* Password requirements section - show only the first missing requirement */}
              {password.length > 0 && !isPasswordValid && (
                <div className="mt-2 text-sm">
                  <div className="flex items-center gap-2 text-red-500">
                    <XCircle className="h-4 w-4" />
                    <span>{getFirstMissingRequirement()}</span>
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="confirm-password" className="font-medium text-sm">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    required
                    id="confirm-password"
                    placeholder="••••••••"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <Button
                    className="absolute right-0 top-0 h-full px-3 py-2 text-muted-foreground"
                    size="icon"
                    type="button"
                    variant="ghost"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    <span className="sr-only">
                      {showConfirmPassword ? "Hide password" : "Show password"}
                    </span>
                  </Button>
                </div>

                {/* Password match indicator - only show when passwords don't match */}
                {confirmPassword.length > 0 && !passwordsMatch && (
                  <div className="flex items-center gap-2 text-sm mt-1 text-red-500">
                    <XCircle className="h-4 w-4" />
                    <span>Passwords do not match</span>
                  </div>
                )}
              </div>

              {/* Password Requirements Helper Text */}
              <p className="text-xs text-muted-foreground mt-1">
                Must be at least 8 characters and include a special character (e.g., !, @, #)
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button
              className="w-full h-12 rounded-xl"
              disabled={isSubmitting || !isPasswordValid || !passwordsMatch}
              type="submit"
            >
              {isSubmitting ? "Signing up..." : "Sign Up"}
            </Button>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link
                className="text-primary underline hover:text-primary/90 h-12 rounded-xl"
                href="/login"
              >
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
