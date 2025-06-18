"use client";
import type React from "react";

import {useState, useEffect} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {Eye, EyeOff, ShoppingCart, CheckCircle2, XCircle} from "lucide-react";
import {toast} from "sonner";

import {Button} from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import apiRequest from "@/lib/apiRequest";
import {handleApiError} from "@/lib/apiErrorHandler";

export default function SignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isPasswordValid, setIsPasswordValid] = useState(true);
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasDigit: false,
    hasSpecialChar: false,
  });
  const router = useRouter();
  const [confirmPassword, setConfirmPassword] = useState("");

  // Check password strength
  useEffect(() => {
    setPasswordValidation({
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasDigit: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    });
  }, [password]);

  const showErrorMessage = (message: string) => {
    toast.error(message);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");

      return;
    }

    setIsPasswordValid(Object.values(passwordValidation).every(Boolean));
    // Validate password before submission
    if (!isPasswordValid) {
      setErrorMessage("Please fix the password requirements");

      return;
    }

    setIsSubmitting(true);

    try {
      // Proceed with API request
      const response = await apiRequest.post("user/", {
        email,
        fullname,
        password,
      });

      if (response.status === 201) {
        const user_id = response.data.id;

        router.push(`verify-otp?user_id=${encodeURIComponent(user_id)}`);
      }
    } catch (error: any) {
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const ValidationItem = ({isValid, text}: {isValid: boolean; text: string}) => (
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
    <div className="flex h-screen w-full items-center justify-center bg-muted/40">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-2">
            <ShoppingCart className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">Create an Account</CardTitle>
          <CardDescription className="text-center">
            Enter your details to sign up for APPLICATION NAME
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="grid gap-4">
            {errorMessage && <div className="text-red-500 text-center mt-2">{errorMessage}</div>}
            <div className="grid gap-2">
              <Label htmlFor="fullname">Full Name</Label>
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
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
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

              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
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
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    <span className="sr-only">
                      {showPassword ? "Hide password" : "Show password"}
                    </span>
                  </Button>
                </div>
              </div>

              {/* Password requirements section */}
              {!isPasswordValid && (
                <div className="mt-2 space-y-2 text-sm">
                  <p className="font-medium text-muted-foreground mb-1 text-red-600">
                    Password must have:
                  </p>
                  <div className="grid gap-2 ml-4">
                    {[
                      {isValid: passwordValidation.minLength, text: "At least 8 characters"},
                      {
                        isValid: passwordValidation.hasUppercase,
                        text: "At least one uppercase letter (A-Z)",
                      },
                      {
                        isValid: passwordValidation.hasLowercase,
                        text: "At least one lowercase letter (a-z)",
                      },
                      {isValid: passwordValidation.hasDigit, text: "At least one number (0-9)"},
                      {
                        isValid: passwordValidation.hasSpecialChar,
                        text: "At least one special character (!@#$%^&*)",
                      },
                    ].map((item, index) => (
                      <ValidationItem key={index} isValid={item.isValid} text={item.text} />
                    ))}
                  </div>
                </div>
              )}

              {/* Password Requirements Helper Text */}
              <p className="text-xs text-muted-foreground mt-1">
                Must be at least 8 characters and include a special character (e.g., !, @, #)
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col">
            <Button className="w-full" disabled={isSubmitting || !isPasswordValid} type="submit">
              {isSubmitting ? "Signing up..." : "Sign Up"}
            </Button>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link className="text-primary underline hover:text-primary/90" href="/login">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
