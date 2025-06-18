"use client";

import {AlertTriangle} from "lucide-react";
import {useEffect, useState} from "react";
import {useSelector} from "react-redux";

import {Alert, AlertDescription, AlertTitle} from "@/components/ui/alert";
import {selectSelectedBranch, selectSelectedInstitution} from "@/store/auth/selectors";

export function NoBranchWarning() {
  const [showWarning, setShowWarning] = useState(false);
  const selectedBranch = useSelector(selectSelectedBranch);
  const selectedInstitution = useSelector(selectSelectedInstitution);

  useEffect(() => {
    if (!selectedBranch || !selectedInstitution) {
      setShowWarning(true);
    } else {
      try {
        const InstitutionData = selectedInstitution;

        if (!InstitutionData.branches || InstitutionData.branches.length === 0) {
          setShowWarning(true);
        }
      } catch (error) {
        console.error("Error parsing Institution data:", error);
        setShowWarning(true);
      }
    }
  }, [selectSelectedInstitution, selectSelectedBranch]);

  if (!showWarning) return null;

  return (
    <Alert className="mb-4" variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Warning</AlertTitle>
      <AlertDescription>
        You don't have any branches assigned to your account. Please contact your administrator for
        access.
      </AlertDescription>
    </Alert>
  );
}
