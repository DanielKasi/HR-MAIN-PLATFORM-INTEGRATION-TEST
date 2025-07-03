"use client";

import type {Role, IUser} from "@/app/types";

import {useState, useEffect} from "react";
import {PencilLine} from "lucide-react";
import {useRouter} from "next/navigation";

import {Button} from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {Label} from "@/components/ui/label";
import apiRequest, {apiPatch} from "@/lib/apiRequest";
import {getDefaultInstitutionId} from "@/lib/helpers";

interface EditUserRolesProps {
  user: IUser;
}

export function EditUserRoles({user}: EditUserRolesProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  // Fetch all roles
  const fetchRoles = async () => {
    try {
      const response = await apiRequest.get(`user/role/?Institution_id=${getDefaultInstitutionId()}`);

      setRoles(response.data.results);
    } catch (error: any) {
      setError(error.message || "Failed to fetch roles");
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
      // Set initially selected role (first one if user has roles)
      if (user.roles && user.roles.length > 0) {
        setSelectedRole(user.roles[0].id);
      }
    }
  }, [isOpen, user]);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Update user with single role
      const roleIds = selectedRole ? [selectedRole] : [];

      await apiPatch(`user/${user.id}/`, {
        roles_ids: roleIds,
      });

      setIsOpen(false);
      router.refresh();
    } catch (error: any) {
      setError(error.message || "Failed to update user role");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          className="border-[#e5e7eb] bg-white text-[#666] hover:bg-[#f9f9f9] hover:text-[#333]"
          size="sm"
          variant="outline"
        >
          <PencilLine className="mr-2 h-4 w-4" />
          Edit Role
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-white">
        <DialogHeader>
          <DialogTitle>Assign Role for {user.fullname}</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert className="mb-4" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Select Role</h3>
            <RadioGroup
              className="space-y-2"
              value={selectedRole?.toString()}
              onValueChange={(value) => setSelectedRole(Number.parseInt(value))}
            >
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-start space-x-3 p-3 border rounded-md border-[#e5e7eb] bg-white"
                >
                  <RadioGroupItem
                    className="mt-1"
                    id={`role-${role.id}`}
                    value={role.id.toString()}
                  />
                  <div className="grid gap-0.5">
                    <Label className="font-medium" htmlFor={`role-${role.id}`}>
                      {role.name}
                    </Label>
                    {role.description && <p className="text-sm text-[#666]">{role.description}</p>}
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button
            className="border-[#e5e7eb] bg-white text-[#666] hover:bg-[#f9f9f9]"
            disabled={isLoading}
            variant="outline"
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            className="bg-[#10b981] hover:bg-[#0d9668]"
            disabled={isLoading}
            onClick={handleSubmit}
          >
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
