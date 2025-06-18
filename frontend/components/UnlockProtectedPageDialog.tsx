"use client";

import {useEffect, useState} from "react";
import {useSelector, useDispatch} from "react-redux";
import {Eye, EyeOff} from "lucide-react";

import {Button} from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {Card, CardContent} from "@/components/ui/card";
import apiRequest from "@/lib/apiRequest";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import {extractRequiredPermissions, hasAnyRequiredPermissions} from "@/lib/helpers";
import {loginWithEmailAndPassword, setTemporaryPermissionsWithTimeout} from "@/utils/authUtils";

interface UserProfile {
  id: number;
  user: IUser;
  institution: number;
  bio: string | null;
}

interface IUser {
  id: number;
  fullname: string;
  email: string;
  is_active: boolean;
  is_staff: boolean;
  roles: Role[];
  branches: Branch[];
}

interface Role {
  id: number;
  name: string;
  description: string;
}

interface Branch {
  id: number;
  institution: number;
  branch_name: string;
  branch_phone_number?: string;
  branch_location: string;
  branch_email?: string;
  branch_opening_time?: string;
  branch_closing_time?: string;
}

interface UnlockDialogProps {
  isOpen: boolean;
  onClose: () => void;
  requiredPermissionCodes: string[]; // Add this new prop
}

export default function UnlockDialog({
  isOpen,
  onClose,
  requiredPermissionCodes,
}: UnlockDialogProps) {
  const dispatch = useDispatch();
  const [step, setStep] = useState<"loading" | "select-user" | "enter-password">("loading");
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<IUser | null>(null);
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const selectedInstitution = useSelector(selectSelectedInstitution);

  useEffect(() => {
    handleDialogOpen();
  }, [step, isOpen]);

  const fetchUsers = async () => {
    if (!selectedInstitution) {
      setError("No Institution selected");

      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const response = await apiRequest.get(`institution/profile/${selectedInstitution.id}/`);
      const data = response.data;

      if (data.results && data.count !== undefined) {
        setUserProfiles(data.results);
        setStep("select-user");
      } else {
        setError("Failed to load users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      setError("Failed to load users. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserSelect = (userId: string) => {
    const userProfile = userProfiles.find((profile) => profile.user.id.toString() === userId);

    if (userProfile) {
      const user = userProfile.user;

      // Check if this user has any of the required permissions
      if (!hasAnyRequiredPermissions(user.roles, requiredPermissionCodes)) {
        setError(`${user.fullname} does not have the required permissions for this page.`);

        return;
      }

      setSelectedUser(user);
      setStep("enter-password");
      setError(""); // Clear any previous errors
    }
  };

  const handleUnlock = async () => {
    if (!selectedUser || !password) {
      setError("Please enter the password");

      return;
    }

    try {
      setIsLoading(true);
      setError("");

      const loginResponse = await loginWithEmailAndPassword(selectedUser.email, password);

      if (loginResponse.tokens) {
        // Extract only the required permissions from the authorized user
        const requiredPermissions = extractRequiredPermissions(
          loginResponse.user.roles,
          requiredPermissionCodes,
        );

        console.log("Dispatching temporary permissions : ", requiredPermissions);

        // Store the temporary permissions in Redux
        setTemporaryPermissionsWithTimeout(requiredPermissions);
        onClose();

        // Reset state
        setStep("loading");
        setSelectedUser(null);
        setPassword("");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("Invalid password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDialogOpen = () => {
    // Trigger fetch when dialog opens
    if (isOpen && step === "loading" && !isLoading && userProfiles.length === 0) {
      fetchUsers();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Unlock Page Access</DialogTitle>
          <DialogDescription>
            Select a user with appropriate permissions and enter their password to unlock this page.
          </DialogDescription>
        </DialogHeader>

        {step === "loading" && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading users...</p>
            </div>
          </div>
        )}

        {step === "select-user" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="user-select">Select User</Label>
              <Select onValueChange={handleUserSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a user..." />
                </SelectTrigger>
                <SelectContent>
                  {userProfiles.map((profile) => (
                    <SelectItem key={profile.user.id} value={profile.user.id.toString()}>
                      <div className="flex flex-col">
                        <span className="font-medium">{profile.user.fullname}</span>
                        <span className="text-xs text-muted-foreground">{profile.user.email}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === "enter-password" && selectedUser && (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm">
                  <p className="font-medium">{selectedUser.fullname}</p>
                  <p className="text-muted-foreground">{selectedUser.email}</p>
                </div>
              </CardContent>
            </Card>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="h-fit relative">
                <Input
                  id="password"
                  placeholder="Enter password..."
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleUnlock();
                    }
                  }}
                />

                <Button
                  className="absolute right-0 top-1/2 -translate-y-1/2  px-3 py-2 text-muted-foreground"
                  size="icon"
                  type="button"
                  variant="ghost"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span className="sr-only">
                    {showPassword ? "Hide password" : "Show password"}
                  </span>
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => {
                  setStep("select-user");
                  setSelectedUser(null);
                  setPassword("");
                  setError("");
                }}
              >
                Back
              </Button>
              <Button className="flex-1" disabled={isLoading || !password} onClick={handleUnlock}>
                {isLoading ? "Unlocking..." : "Unlock"}
              </Button>
            </div>
          </div>
        )}

        {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}
      </DialogContent>
    </Dialog>
  );
}
