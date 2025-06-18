"use client";

import {useState, useEffect} from "react";
import {useRouter} from "next/navigation";
import {Store} from "lucide-react";

import {Button} from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import apiRequest from "@/lib/apiRequest";
import {getDefaultInstitutionId} from "@/lib/helpers";

type SupplierType = {
  id: number;
  supplier_name: string;
  supplier_email: string;
  supplier_phone_number: string;
  institution: number;
};

interface CreateSupplierFormProps {
  onSuccess?: (supplier: SupplierType) => void;
  onClose?: () => void;
}

export default function CreateSupplierForm({onSuccess, onClose}: CreateSupplierFormProps) {
  const [supplierName, setSupplierName] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [supplierPhoneNumber, setSupplierPhoneNumber] = useState("");
  const [InstitutionId, setInstitutionId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    const defaultInstitutionId = getDefaultInstitutionId();

    if (defaultInstitutionId) {
      setInstitutionId(defaultInstitutionId);
    } else {
      setErrorMessage("No Institution found. Please create a organisation first.");
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!InstitutionId) {
      setErrorMessage("Institution information is missing. Please try again.");

      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiRequest.post("procurement/suppliers/", {
        supplier_name: supplierName,
        supplier_email: supplierEmail,
        supplier_phone_number: supplierPhoneNumber,
        institution: InstitutionId,
      });

      if (response.status === 201) {
        const newSupplier = response.data as SupplierType;

        if (onSuccess) {
          onSuccess(newSupplier); // Callback with supplier data
        } else {
          router.push("/inventory/suppliers"); // Fallback navigation
        }
      }
    } catch (error: any) {
      setErrorMessage(
        error?.response?.data?.detail ||
          error.message ||
          "An error occurred while creating the supplier.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-2">
          <Store className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="text-2xl text-center">Create Supplier</CardTitle>
        <CardDescription className="text-center">
          Add a new supplier to your organisation
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="grid gap-4">
          {errorMessage && <div className="text-red-500 text-center mt-2">{errorMessage}</div>}
          <div className="grid gap-2">
            <Label htmlFor="supplierName">Supplier Name</Label>
            <Input
              required
              id="supplierName"
              placeholder="Supplier Name"
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="supplierEmail">Email (Optional)</Label>
            <Input
              id="supplierEmail"
              placeholder="supplier@example.com"
              type="email"
              value={supplierEmail}
              onChange={(e) => setSupplierEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="supplierPhoneNumber">Phone Number (Optional)</Label>
            <Input
              id="supplierPhoneNumber"
              placeholder="+1 (555) 123-4567"
              type="tel"
              value={supplierPhoneNumber}
              onChange={(e) => setSupplierPhoneNumber(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between gap-2">
          {onClose && (
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          )}
          <Button className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? "Creating..." : "Create Supplier"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
