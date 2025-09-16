"use client";
import { PERMISSION_CODES } from "@/constants";
import ProtectedPage from "@/components/ProtectedPage";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function JobPositionsLayout({ children }: { children: React.ReactNode }) {
	useDocumentTitle("LEAVE MANAGEMENT");

	return (
		<ProtectedPage permissionCode={PERMISSION_CODES.CAN_MANAGE_LEAVE_TYPES}>
			{children}
		</ProtectedPage>
	);
}
