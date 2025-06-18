"use client";

import type React from "react";
import type {Role, Branch} from "@/app/types";

import {useEffect, useState} from "react";
import {Plus} from "lucide-react";
import {useRouter} from "next/navigation";

import apiRequest, {apiPost} from "@/lib/apiRequest";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Label} from "@/components/ui/label";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {fetchInstitutionBranchesFromAPI, getDefaultInstitutionId} from "@/lib/helpers";
import {Checkbox} from "@/components/ui/checkbox";

interface AddUserFormProps {
  onAddSuccess?: () => void;
}

export function AddUserForm({onAddSuccess}: AddUserFormProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranches, setSelectedBranches] = useState<number[]>([]);
  const [defaultBranchId, setDefaultBranchId] = useState<number | null>(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const fetchRoles = async () => {
    try {
      const response = await apiRequest.get(
        `user/role/?Institution_id=${getDefaultInstitutionId()}`,
      );

      setRoles(response.data.results);
    } catch (error) {
      setErrorMessage("Failed to fetch roles");
      console.error("Error fetching roles:", error);
    }
  };

  const fetchBranches = async () => {
    try {
      const response = await fetchInstitutionBranchesFromAPI();

      setBranches(response.data);
    } catch (error) {
      setErrorMessage("Failed to fetch branches");
      console.error("Error fetching branches:", error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
      fetchBranches();
    }
  }, [isOpen]);

  const handleBranchChange = (branchId: number, checked: boolean) => {
    if (checked) {
      setSelectedBranches((prev) => [...prev, branchId]);
    } else {
      setSelectedBranches((prev) => prev.filter((id) => id !== branchId));
      if (defaultBranchId === branchId) {
        setDefaultBranchId(null);
      }
    }
  };

  const handleDefaultBranchChange = (branchId: number) => {
    if (!selectedBranches.includes(branchId)) {
      setSelectedBranches((prev) => [...prev, branchId]);
    }
    setDefaultBranchId(branchId);
  };

  const attachBranchesToUser = async (userId: number) => {
    try {
      const branchPromises = selectedBranches.map((branchId) => {
        return apiPost("institution/branch/user/", {
          user: userId,
          branch: branchId,
          is_default: branchId === defaultBranchId,
        });
      });

      await Promise.all(branchPromises);
    } catch (error: any) {
      console.error("Error attaching branches:", error);
      throw new Error("Failed to attach branches to user");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    if (!selectedRoleId) {
      setErrorMessage("Please select a role for the user");
      setIsSubmitting(false);

      return;
    }

    const userProfile = {
      user: {
        fullname: fullName,
        email: email,
        roles_ids: [selectedRoleId], // Backend expects an array, so we wrap the single role in an array
      },
      institution: getDefaultInstitutionId(),
      bio: bio,
    };

    try {
      const response = await apiPost("institution/profile/", userProfile);

      if (response.status === 201) {
        // Get the user ID from the response
        const userId = response.data.user.id;

        // If branches are selected, attach them to the user
        if (selectedBranches.length > 0) {
          await attachBranchesToUser(userId);
        }

        setFullName("");
        setEmail("");
        setBio("");
        setSelectedRoleId(null);
        setSelectedBranches([]);
        setDefaultBranchId(null);
        setIsOpen(false);
        if (onAddSuccess) onAddSuccess();
      }
    } catch (error: any) {
      setErrorMessage("Failed to add staff");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Staff
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby="" className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {errorMessage && (
            <div className="mb-4 p-2 text-sm font-medium text-white bg-red-500 rounded">
              {errorMessage}
            </div>
          )}

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="fullName">
                Full Name *
              </Label>
              <Input
                required
                className="col-span-3"
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="email">
                Email *
              </Label>
              <Input
                required
                className="col-span-3"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Role *</Label>
              <div className="col-span-3 border rounded-md p-3">
                <div className="mb-2 text-sm text-muted-foreground">
                  Select a role for this user
                </div>
                <RadioGroup
                  value={selectedRoleId?.toString()}
                  onValueChange={(value) => setSelectedRoleId(Number.parseInt(value))}
                >
                  {roles.map((role) => (
                    <div key={role.id} className="flex items-start space-x-2 mb-2">
                      <RadioGroupItem id={`role-${role.id}`} value={role.id.toString()} />
                      <Label
                        className="text-sm font-normal cursor-pointer"
                        htmlFor={`role-${role.id}`}
                      >
                        {role.name}
                        {role.description && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({role.description})
                          </span>
                        )}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </div>

            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Branches</Label>
              <div className="col-span-3 border rounded-md p-3">
                <div className="mb-2 text-sm text-muted-foreground">
                  Select branches for this user
                </div>
                {branches.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No branches available</div>
                ) : (
                  <div className="space-y-3">
                    {branches.map((branch) => (
                      <div key={branch.id} className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            checked={selectedBranches.includes(branch.id ?? 0)}
                            id={`branch-${branch.id}`}
                            onCheckedChange={(checked) =>
                              handleBranchChange(branch.id ?? 0, !!checked)
                            }
                          />
                          <Label className="text-sm font-medium" htmlFor={`branch-${branch.id}`}>
                            {branch.branch_name}
                          </Label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right" htmlFor="bio">
                Bio
              </Label>
              <Textarea
                className="col-span-3"
                id="bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={isSubmitting}
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Adding..." : "Add Staff"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
