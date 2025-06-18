"use client";

import {useState} from "react";
import {useRouter} from "next/navigation";
import {Unlock} from "lucide-react";

import {Button} from "./ui/button";
import UnlockDialog from "./UnlockProtectedPageDialog";

// Update the interface to accept required permission codes
interface PermissionDeniedProps {
  requiredPermissionCodes: string[];
}

export default function PermissionDenied({requiredPermissionCodes}: PermissionDeniedProps) {
  const router = useRouter();
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);

  return (
    <>
      <div className="flex flex-col items-center justify-center h-screen text-center px-4">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Access Denied</h1>
        <p className="text-gray-700 mb-6">
          You do not have permission to view this page.
          <br />
          Please contact the administrator for access.
        </p>

        <div className="flex gap-3">
          <Button className="px-4 py-2" variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>

          <Button className="px-4 py-2" onClick={() => setShowUnlockDialog(true)}>
            <Unlock className="w-4 h-4 mr-2" />
            Unlock Page
          </Button>
        </div>
      </div>

      <UnlockDialog
        isOpen={showUnlockDialog}
        requiredPermissionCodes={requiredPermissionCodes}
        onClose={() => setShowUnlockDialog(false)}
      />
    </>
  );
}
