"use client";

import {useState} from "react";

import {Button} from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {toast} from "@/components/ui/use-toast";
import {getDefaultInstitutionId} from "@/lib/helpers";
import {apiPost} from "@/lib/apiRequest";

interface AddBranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBranchAdded: () => void;
}

export function AddBranchModal({isOpen, onClose, onBranchAdded}: AddBranchModalProps) {
  const [formData, setFormData] = useState({
    branch_name: "",
    branch_phone_number: "",
    branch_location: "",
    branch_email: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const {name, value} = e.target;

    setFormData((prev) => ({...prev, [name]: value}));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const InstitutionId = getDefaultInstitutionId();

      if (!InstitutionId) {
        toast({
          title: "Error",
          description: "No Institution selected. Please select a Institution first.",
          variant: "destructive",
        });
        setIsLoading(false);

        return;
      }

      const response = await apiPost("/institution/branch/", {
        institution: InstitutionId,
        ...formData,
      });

      toast({
        title: "Success",
        description: "Branch added successfully",
      });

      setFormData({
        branch_name: "",
        branch_phone_number: "",
        branch_location: "",
        branch_email: "",
      });

      onBranchAdded();
      onClose();
    } catch (error) {
      console.error("Error adding branch:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add branch",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Branch</DialogTitle>
          <DialogDescription>
            Fill in the details below to add a new branch to your Institution.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="branch_name">
                Name
              </Label>
              <Input
                required
                className="col-span-3"
                id="branch_name"
                name="branch_name"
                value={formData.branch_name}
                onChange={handleChange}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="branch_phone_number">
                Phone
              </Label>
              <Input
                required
                className="col-span-3"
                id="branch_phone_number"
                name="branch_phone_number"
                value={formData.branch_phone_number}
                onChange={handleChange}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="branch_location">
                Location
              </Label>
              <Input
                required
                className="col-span-3"
                id="branch_location"
                name="branch_location"
                value={formData.branch_location}
                onChange={handleChange}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="branch_email">
                Email
              </Label>
              <Input
                required
                className="col-span-3"
                id="branch_email"
                name="branch_email"
                type="email"
                value={formData.branch_email}
                onChange={handleChange}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button disabled={isLoading} type="submit">
              {isLoading ? "Adding..." : "Add Branch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
