import { PERMISSION_CODES } from "@/constants";
import ProtectedPage from "@/components/ProtectedPage";

export default function JobAdvertsLayout({children}: {children: React.ReactNode}) {
  return (
    <ProtectedPage permissionCode={PERMISSION_CODES.CAN_VIEW_JOB_ADVERTS}>{children}</ProtectedPage>
  );
}