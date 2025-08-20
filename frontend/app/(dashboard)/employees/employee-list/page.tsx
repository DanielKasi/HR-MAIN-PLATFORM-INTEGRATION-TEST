"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { EmployeesTable } from "./employees-table";
import { deleteEmployee, showErrorToast } from "@/lib/utils";

export default function EmployeesPage() {
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false);
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const [error, setError] = useState<string | null>(null);

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const handleDelete = async (id: number) => {
    try {
      await deleteEmployee({employeeId:id})
    } catch (err:unknown) {
      showErrorToast({error, defaultMessage: "Failed to delete employee"});
    }
  };

  return (
    <EmployeesTable
      isBulkUploadDialogOpen={isBulkUploadDialogOpen}
      setIsBulkUploadDialogOpen={setIsBulkUploadDialogOpen}
      onDelete={handleDelete}
      selectedInstitution={selectedInstitution}
    />
  );
}

