"use client";

import React, {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import {Eye, EyeOff, ShoppingCart} from "lucide-react";
import Link from "next/link";
import {useDispatch} from "react-redux";
import {useSelector} from "react-redux";
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
import {CUSTOM_CODES} from "@/app/types/types.utils";
import {selectUser, selectAuthError, selectUserLoading} from "@/store/auth/selectors";
import {clearAuthError, loginStart} from "@/store/auth/actions";
import FixedLoader from "@/components/fixed-loader";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState("");
  const [OTPSentMessage, setOTPSentMessage] = useState("");
  const [customErrorCode, setCustomErrorCode] = useState<CUSTOM_CODES | null>(null);
  const [loadingState, setLoadingState] = useState<{auth: boolean; OTP: boolean}>({
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
    if (authError) {
      dispatch(clearAuthError());
    }
  }, [dispatch]);

  useEffect(() => {
    setLoadingState((prev) => ({...prev, auth: authLoading}));
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

      console.log(authError);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password.trim()) {
      setErrorMessage("You need to provide a password and email !");

      return;
    } else {
      setErrorMessage("");
      dispatch(loginStart(email, password));
    }
  };

  const handleCustomCodeAction = async (code: CUSTOM_CODES) => {
    setLoadingState((prev) => ({...prev, OTP: true}));
    if (code === CUSTOM_CODES.BLOCKED_BY_ADMIN) {
      return;
    }
    if (!email.trim()) {
      setErrorMessage("You need to provide your email address");

      return;
    }

    if (code == CUSTOM_CODES.SELF_CREATED_UNVERIFIED) {
      try {
        const response = await apiRequest.post("user/resend-otp/?mode=otp", {
          email,
        });
        const user_id = response.data.id;

        router.push(`verify-otp?user_id=${encodeURIComponent(user_id)}`);
      } catch (error: any) {
        setErrorMessage(error.message);
      }
    } else if (code == CUSTOM_CODES.ADMIN_CREATED_UNVERIFIED) {
      try {
        await apiRequest.post("user/resend-otp/?mode=password_link", {
          email,
        });

        setOTPSentMessage(`We have sent an email to ${email}, check your inbox`);
      } catch (error: any) {
        setErrorMessage(error.message);
      }
    }
    setLoadingState((prev) => ({...prev, OTP: false}));
  };

  // const showErrorToast = (message:string) =>{
  //   toast.error(message)
  // }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-muted/40">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-2">
            <ShoppingCart className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">APPLICATION NAME</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <form className="py-4" onSubmit={handleLogin}>
          <CardContent className="grid gap-4">
            {errorMessage && <div className="text-red-500 text-center mt-2">{errorMessage}</div>}

            {customErrorCode && customErrorCode && (
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
                    to this email
                  </span>
                )}
              </p>
            )}
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
                <a
                  className="text-sm text-primary underline-offset-4 hover:underline"
                  href="/forgot-password"
                >
                  Forgot password?
                </a>
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
              className={`${loadingState.auth ? "opacity-80" : "opacity-100"} w-full`}
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
