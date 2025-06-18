import type React from "react";
import type {Metadata} from "next";

import {Inter} from "next/font/google";

import "./globals.css";
import {Toaster} from "sonner";

import {Providers} from "./providers";

import {ThemeProvider} from "@/components/theme-provider";
import AppLoaderWrapper from "@/components/app-loader-wrapper";
import {WebSocketProvider} from "@/lib/WebSocketProvider";
import {cn} from "@/lib/utils";

const inter = Inter({subsets: ["latin"]});

export const metadata: Metadata = {
  title: "APPLICATION NAME",
  description: "A comprehensive SaaS solution for organisation management",
  generator: "v0.dev",
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html suppressHydrationWarning lang="en">
      <body
        suppressHydrationWarning
        className={cn(inter.className, "min-h-screen bg-background antialiased")}
      >
        <ThemeProvider
          disableTransitionOnChange
          enableSystem
          attribute="class"
          defaultTheme="light"
        >
          <Providers>
            <AppLoaderWrapper />
            <WebSocketProvider>{children}</WebSocketProvider>
            <Toaster />
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
