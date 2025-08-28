"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { EmployeesTable } from "./employees-table";
import { BulkUploadEmployeesDialog } from "@/components/dialogs/bulk-upload-employees-dialog";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SelectTrigger, SelectValue, SelectContent, SelectItem } from "@radix-ui/react-select";
import { Plus, UserPlus, ChevronDown, Upload, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useRouter } from "next/navigation";


export default function EmployeesPage() {
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false);
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const refreshFunctionRef = useRef<(() => void) | null>(null);
  const router = useRouter()

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

  const handleDelete = async (id: number, refreshCallback?:()=>void) => {
    if (!selectedInstitution) {
      return;
    }
    try {
      await deleteEmployee({employeeId:id, institutionId: selectedInstitution.id});
      refreshCallback?.();
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

