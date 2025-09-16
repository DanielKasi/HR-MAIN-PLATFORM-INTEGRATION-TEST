"use client";

// import { PERMISSION_CODES } from "@/app/constants";
// import ProtectedPage from "@/components/ProtectedPage";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function EmployeesLayout({ children }: { children: React.ReactNode }) {
	useDocumentTitle("EMPLOYEES");

	return <>{children}</>;
}
