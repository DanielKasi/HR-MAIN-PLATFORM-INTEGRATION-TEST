import type React from "react";
import type { Metadata } from "next";

import { Outfit } from "next/font/google";

import "./globals.css";
import { Toaster } from "sonner";

import { Providers } from "./providers";

import { ThemeProvider } from "@/components/theme-provider";
// import { WebSocketProvider } from "@/lib/WebSocketProvider";
import { cn } from "@/lib/utils";
import LogoutWarningPopup from "@/components/inactivity/logout-warning-popup";

// const Outfit = Outfit({subsets: ["latin"], weight:['100', '200', '300', '400', '500', '600', '700', '800', '900']});
const font = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TASK MANAGEMENT",
  description: "A comprehensive SaaS solution for organisation management",
  // icons: {
  // 	icon: "/icon.png",
  // },
};




export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en">
      <body
        suppressHydrationWarning
        className={cn(font.className, "min-h-screen bg-background antialiased")}
      >
        <ThemeProvider
          disableTransitionOnChange
          enableSystem
          attribute="class"
          defaultTheme="light"
        >
          <Providers>
            <LogoutWarningPopup />
            <>{children}</>
            <Toaster duration={10000} position={"top-right"} closeButton />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
