import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";
import { Outfit } from "next/font/google";

const font = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Job Portal",
  description: "Job Opportunities Available",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${font.className} antialiased`}
      >
        {children}
        <Toaster duration={10000} position={"top-right"} />
      </body>
    </html>
  );
}
