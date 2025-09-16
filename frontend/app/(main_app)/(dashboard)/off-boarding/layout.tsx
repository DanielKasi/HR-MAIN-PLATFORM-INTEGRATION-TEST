"use client";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function OffBoardingLayout({ children }: { children: React.ReactNode }) {
	useDocumentTitle("OFFBOARDING");

	return <>{children}</>;
}
