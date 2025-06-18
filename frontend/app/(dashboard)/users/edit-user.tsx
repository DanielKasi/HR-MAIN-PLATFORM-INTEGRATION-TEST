"use client";

import type {Role, UserProfile} from "@/app/types";

import {useState, useEffect} from "react";
import {Pencil} from "lucide-react";
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
import {Label} from "@/components/ui/label";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import apiRequest, {apiPost} from "@/lib/apiRequest";
import {getDefaultInstitutionId} from "@/lib/helpers";

interface EditUserFormProps {
  user: UserProfile;
}

export function EditUserForm({user}: EditUserFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const fetchRoles = async () => {
    try {
      const response = await apiRequest.get(`user/role/?Institution_id=${getDefaultInstitutionId()}`);

      setRoles(response.data);
    } catch (error: any) {
      setError(error.message || "Failed to fetch roles");
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchRoles();
      // Set initially selected role (first one if multiple exist). This is because we previously had a many to many on roles and users and later changed to one
      if (user.user.roles && user.user.roles.length > 0) {
        setSelectedRole(user.user.roles[0].id || null);
      }
    }
  }, [isOpen, user]);

  const handleSubmit = async () => {
    setIsLoading(true);
    setError("");

    try {
      const roleIds = selectedRole ? [selectedRole] : [];

      await apiPost(`user/${user.user.id}/roles/`, roleIds);

      setIsOpen(false);
      router.refresh();
    } catch (error: any) {
      setError(error.message || "Failed to update user");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost">
          <Pencil className="h-4 w-4" />
          <span className="sr-only">Edit User</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit User: {user.user.fullname}</DialogTitle>
        </DialogHeader>

        {error && (
          <Alert className="mb-4" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Assign Role</h3>
            <RadioGroup
              value={selectedRole?.toString()}
              onValueChange={(value) => setSelectedRole(Number.parseInt(value))}
            >
              {roles.map((role) => (
                <div key={role.id} className="flex items-start space-x-3 py-2">
                  <RadioGroupItem id={`role-${role.id}`} value={role.id.toString()} />
                  <div className="grid gap-0.5">
                    <Label className="font-medium" htmlFor={`role-${role.id}`}>
                      {role.name}
                    </Label>
                    {role.description && (
                      <p className="text-sm text-muted-foreground">{role.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button disabled={isLoading} variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button disabled={isLoading} onClick={handleSubmit}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
