"use client";

import type React from "react";

import {useEffect, useState, useCallback, useRef} from "react";
import {useRouter, usePathname} from "next/navigation";
import {ShieldAlert, LogOut} from "lucide-react";
import {useDispatch} from "react-redux";

import {Button} from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {logoutStart} from "@/store/auth/actions";

interface InactivityLogoutProps {
  inactivityDuration?: number; // Time in ms before showing warning
  countdownDuration?: number; // Time in ms for countdown before logout
  redirectUrl?: string; // URL to redirect to after logout
  publicRoutes?: string[]; // Routes that don't trigger inactivity logout
  children: React.ReactNode;
  onLogout?: () => void; // Optional callback when logging out
}

export default function InactivityLogout({
  inactivityDuration = 5 * 60 * 1000, // Default: 5 minutes
  countdownDuration = 60 * 1000, // Default: 1 minute
  redirectUrl = "/",
  publicRoutes = ["/login", "/signup", "/forgot-password", "/reset-password", "/"],
  children,
  onLogout,
}: InactivityLogoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(countdownDuration);
  const [isPublicPage, setIsPublicPage] = useState(true);

  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownStartTimeRef = useRef<number>(0);
  const dispatch = useDispatch();

  const isPublicRoute = useCallback(() => {
    if (!pathname) return true;
    const isPublic = publicRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    );

    return isPublic;
  }, [pathname, publicRoutes]);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const calculateProgress = useCallback((current: number, total: number) => {
    return Math.max(0, Math.min(100, (current / total) * 100));
  }, []);

  const clearAllTimers = useCallback(() => {
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
      activityTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const resetInactivityTimer = useCallback(() => {
    if (isPublicPage) return;

    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }

    activityTimeoutRef.current = setTimeout(() => {
      countdownStartTimeRef.current = Date.now();
      setCountdown(countdownDuration);
      setShowWarning(true);
    }, inactivityDuration);
  }, [inactivityDuration, countdownDuration, isPublicPage]);

  const handleUserActivity = useCallback(() => {
    if (isPublicPage || showWarning) return;
    resetInactivityTimer();
  }, [showWarning, resetInactivityTimer, isPublicPage]);

  const handleLogout = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);

    try {
      dispatch(logoutStart());
      // localStorage.clear()
    } catch (error) {
      console.error("Error logging out :", error);
    }

    if (onLogout) {
      onLogout();
    }

    router.push(redirectUrl);
  }, [clearAllTimers, onLogout, redirectUrl, router]);

  const handleContinue = useCallback(() => {
    setShowWarning(false);

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    resetInactivityTimer();
  }, [resetInactivityTimer]);

  // Effect for countdown timer
  useEffect(() => {
    if (!showWarning) return;

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    countdownStartTimeRef.current = Date.now();

    countdownIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - countdownStartTimeRef.current;
      const remaining = countdownDuration - elapsed;

      setCountdown(remaining);

      if (remaining <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        handleLogout();
      }
    }, 250);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    };
  }, [showWarning, countdownDuration, handleLogout]);

  // Effect for inactivity tracking
  useEffect(() => {
    const isPublic = isPublicRoute();

    setIsPublicPage(isPublic);

    if (isPublic) {
      clearAllTimers();
      setShowWarning(false);

      return;
    }

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];

    const activityHandler = () => handleUserActivity();

    events.forEach((event) => window.addEventListener(event, activityHandler, {passive: true}));

    resetInactivityTimer();

    return () => {
      events.forEach((event) => window.removeEventListener(event, activityHandler));
      clearAllTimers();
    };
  }, [isPublicRoute, handleUserActivity, resetInactivityTimer, clearAllTimers]);

  // Separate cleanup effect
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  if (isPublicPage) {
    return <>{children}</>;
  }

  const progressPercentage = calculateProgress(countdown, countdownDuration);

  return (
    <>
      {children}

      <Dialog
        open={showWarning}
        onOpenChange={(open) => {
          if (!open) {
            handleContinue();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Session timeout warning
            </DialogTitle>
            <DialogDescription>
              Your session is about to expire due to inactivity.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col md:flex-row items-center gap-6 py-4">
            <div className="relative h-24 w-24 flex-shrink-0">
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="h-full w-full" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" fill="none" r="45" stroke="#e5e7eb" strokeWidth="10" />
                  <circle
                    cx="50"
                    cy="50"
                    fill="none"
                    r="45"
                    stroke="#0ea5e9"
                    strokeDasharray="283"
                    strokeDashoffset={283 - (283 * progressPercentage) / 100}
                    strokeLinecap="round"
                    strokeWidth="10"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-medium">{formatTime(countdown)}</span>
                </div>
              </div>
            </div>

            <div className="text-center md:text-left">
              <p className="text-base text-gray-700 dark:text-gray-300">
                You will be automatically logged out in {formatTime(countdown)}.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button className="flex items-center gap-2" variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Log out now
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleContinue}>
              Continue session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
