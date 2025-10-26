"use client";

import { PERMISSION_CODES } from "@/constants";
import ProtectedPage from "@/components/ProtectedPage";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<ProtectedPage permissionCode={PERMISSION_CODES.CAN_VIEW_ADMIN_DASHBOARD}>
			{children}
		</ProtectedPage>
	);
}
