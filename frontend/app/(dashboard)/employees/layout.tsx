import { PERMISSION_CODES } from "@/app/types/types.utils";
import ProtectedPage from "@/components/ProtectedPage";

export default function EmployeesLayout({children}: {children: React.ReactNode}) {
  return (
    <ProtectedPage permissionCode={PERMISSION_CODES.CAN_VIEW_EMPLOYEES}>{children}</ProtectedPage>
  );
}