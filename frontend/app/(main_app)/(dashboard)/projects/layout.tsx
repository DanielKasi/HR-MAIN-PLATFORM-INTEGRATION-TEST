"use client";
import { PERMISSION_CODES } from "@/constants";
import ProtectedPage from "@/components/ProtectedPage";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
	useDocumentTitle("PROJECTS");

	return (
		<ProtectedPage permissionCode={PERMISSION_CODES.CAN_VIEW_PAYROLL_DATA}>
			{children}
		</ProtectedPage>
	);
}
