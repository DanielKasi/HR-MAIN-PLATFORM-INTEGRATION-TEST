import { PERMISSION_CODES } from "@/app/types/types.utils";
import ProtectedPage from "@/components/ProtectedPage";

export default function JobAdvertsLayout({children}: {children: React.ReactNode}) {
  return (
    <ProtectedPage permissionCode={PERMISSION_CODES.CAN_VIEW_JOB_ADVERTS}>{children}</ProtectedPage>
  );
}