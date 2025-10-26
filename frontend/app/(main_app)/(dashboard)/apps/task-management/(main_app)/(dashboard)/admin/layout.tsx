"use client";
import { PERMISSION_CODES } from "@/constants";
import ProtectedPage from "@/components/ProtectedPage";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
	const title = useDocumentTitle("ADMIN");

	return (
		<>
			{title}
			<ProtectedPage permissionCode={PERMISSION_CODES.CAN_VIEW_ADMIN_DASHBOARD}>
				{children}
			</ProtectedPage>
		</>
	);
}
