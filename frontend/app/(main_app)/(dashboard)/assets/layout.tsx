"use client";
import { PERMISSION_CODES } from "@/constants";
import ProtectedPage from "@/components/ProtectedPage";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function AssetsLayout({ children }: { children: React.ReactNode }) {
	const title = useDocumentTitle("ASSET MANAGEMENT");

	return (
		<>
			{title}
			<ProtectedPage permissionCode={[PERMISSION_CODES.CAN_VIEW_ASSETS]}>{children}</ProtectedPage>
		</>
	);
}
