"use client";

import type {Branch, ITill} from "@/app/types";

import {useEffect, useState} from "react";
import {useParams, useRouter} from "next/navigation";
import {
  Edit,
  MapPin,
  Plus,
  Search,
  Trash,
  Loader2,
  ArrowLeft,
  Clock,
  Phone,
  Mail,
  Save,
  X,
} from "lucide-react";
import {toast} from "sonner";
import {useDispatch} from "react-redux";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {Label} from "@/components/ui/label";
import {Badge} from "@/components/ui/badge";
import {Separator} from "@/components/ui/separator";
import apiRequest from "@/lib/apiRequest";
import ProtectedComponent from "@/components/ProtectedComponent";
import {LocationAutocomplete} from "@/components/location-autocomplete";
import {PERMISSION_CODES} from "@/app/types/types.utils";
import {fetchUpToDateInstitution} from "@/store/auth/actions";

export default function BranchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const branchId = params.id as string;

  const [branch, setBranch] = useState<Branch | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditingBranch, setIsEditingBranch] = useState(false);
  const [editedBranch, setEditedBranch] = useState<Branch | null>(null);
  const [gettingCurrentLocation, setGettingCurrentLocation] = useState(false);

  // Till management states
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddTillDialogOpen, setIsAddTillDialogOpen] = useState(false);
  const [isEditTillDialogOpen, setIsEditTillDialogOpen] = useState(false);
  const [newTill, setNewTill] = useState<ITill>({
    name: "",
    branch: Number.parseInt(branchId),
    id: 0,
  });
  const [editTill, setEditTill] = useState<ITill | null>(null);
  const [editTillIndex, setEditTillIndex] = useState<number | null>(null);

  const fetchBranch = async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest.get(`institution/branch/${branchId}/`);
      if (response.status === 200) {
        setBranch(response.data);
        setEditedBranch(response.data);
      } else {
        toast.error("Failed to fetch branch details");
        router.push("/branches");
      }
    } catch (error) {
      toast.error("Error fetching branch details");
      router.push("/branches");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (branchId) {
      fetchBranch();
    }
  }, [branchId]);

  const handleSaveBranch = async () => {
    if (!editedBranch) return;

    try {
      const response = await apiRequest.patch(`institution/branch/${branchId}/`, editedBranch);
      if (response.status === 200) {
        setBranch(editedBranch);
        setIsEditingBranch(false);
        toast.success("Branch updated successfully");
        dispatch(fetchUpToDateInstitution());
      } else {
        toast.error("Failed to update branch");
      }
    } catch (error) {
      toast.error("Error updating branch");
    }
  };

  const handleCancelEdit = () => {
    setEditedBranch(branch);
    setIsEditingBranch(false);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.info("Your browser does not support geolocation.");
      return;
    }

    setGettingCurrentLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const {latitude, longitude} = position.coords;

          const response = await fetch(
            `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=12a8608da7914f4c96cbbc76c7ca954c`,
          );

          if (!response.ok) {
            throw new Error("Failed to reverse geocode location");
          }

          const data = await response.json();

          if (data.features && data.features.length > 0) {
            const address = data.features[0].properties.formatted;

            setEditedBranch((prev) =>
              prev
                ? {
                    ...prev,
                    branch_location: address,
                    branch_latitude: latitude.toString(),
                    branch_longitude: longitude.toString(),
                  }
                : null,
            );

            toast.info("Current location has been set.");
          } else {
            toast.error("No address found for your location");
          }
        } catch (error) {
          toast.error("Failed to get your current location");
        } finally {
          setGettingCurrentLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        let errorMessage = "Failed to get your location";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied. Please enable location services.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out.";
            break;
        }

        toast.error("Location error: " + errorMessage);
        setGettingCurrentLocation(false);
      },
      {enableHighAccuracy: true, timeout: 10000, maximumAge: 0},
    );
  };

  const handleAddTill = async () => {
    try {
      const response = await apiRequest.post(`institution/branch/${branchId}/tills/`, newTill);
      if (response.status === 201) {
        setIsAddTillDialogOpen(false);
        setNewTill((prev) => ({...prev, branch: Number.parseInt(branchId)}));
        toast.success("Till added successfully");
        fetchBranch(); // Refresh branch data to get updated tills
      } else {
        toast.error("Failed to add till");
      }
    } catch (error) {
      toast.error("Error adding till");
    }
  };

  const handleEditTillSave = async () => {
    if (!editTill || editTillIndex === null) return;

    try {
      const response = await apiRequest.patch(
        `institution/branch/${branchId}/till/${editTillIndex}/`,
        editTill,
      );
      if (response.status === 200) {
        setIsEditTillDialogOpen(false);
        setEditTill(null);
        setEditTillIndex(null);
        toast.success("Till updated successfully");
        fetchBranch(); // Refresh branch data
      } else {
        toast.error("Failed to update till");
      }
    } catch (error) {
      toast.error("Error updating till");
    }
  };

  const handleDeleteTill = async (tillId: number) => {
    try {
      const response = await apiRequest.delete(`institution/branch/${branchId}/till/${tillId}/`);
      if (response.status === 204) {
        toast.success("Till deleted successfully");
        fetchBranch(); // Refresh branch data
      } else {
        toast.error("Failed to delete till");
      }
    } catch (error) {
      toast.error("Error deleting till");
    }
  };

  const filteredTills =
    branch?.tills.filter(
      (till) => searchQuery === "" || till.name.toLowerCase().includes(searchQuery.toLowerCase()),
    ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading branch details...</span>
        </div>
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-muted-foreground">Branch not found</p>
          <Button className="mt-2" onClick={() => router.push("/branches")}>
            Back to Branches
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/branches")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{branch.branch_name}</h1>
            <p className="text-muted-foreground">Branch details and till management</p>
          </div>
        </div>
        <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_BRANCH}>
          {!isEditingBranch ? (
            <Button onClick={() => setIsEditingBranch(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Branch
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancelEdit}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSaveBranch}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          )}
        </ProtectedComponent>
      </div>

      {/* Branch Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Branch Information</CardTitle>
          <CardDescription>
            {isEditingBranch ? "Edit branch details below" : "View branch details"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isEditingBranch && editedBranch ? (
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="branch_name">Branch Name</Label>
                  <Input
                    id="branch_name"
                    value={editedBranch.branch_name}
                    onChange={(e) =>
                      setEditedBranch({
                        ...editedBranch,
                        branch_name: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch_phone_number">Phone Number</Label>
                  <Input
                    id="branch_phone_number"
                    value={editedBranch.branch_phone_number || ""}
                    onChange={(e) =>
                      setEditedBranch({
                        ...editedBranch,
                        branch_phone_number: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch_email">Email</Label>
                <Input
                  id="branch_email"
                  type="email"
                  value={editedBranch.branch_email || ""}
                  onChange={(e) =>
                    setEditedBranch({
                      ...editedBranch,
                      branch_email: e.target.value,
                    })
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="branch_opening_time">Opening Time</Label>
                  <Input
                    id="branch_opening_time"
                    type="time"
                    value={editedBranch.branch_opening_time || ""}
                    onChange={(e) =>
                      setEditedBranch({
                        ...editedBranch,
                        branch_opening_time: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="branch_closing_time">Closing Time</Label>
                  <Input
                    id="branch_closing_time"
                    type="time"
                    value={editedBranch.branch_closing_time || ""}
                    onChange={(e) =>
                      setEditedBranch({
                        ...editedBranch,
                        branch_closing_time: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch_location">Location</Label>
                <div className="space-y-2">
                  <LocationAutocomplete
                    placeholder="Search for a location..."
                    value={editedBranch.branch_location}
                    onChange={(location) =>
                      setEditedBranch({
                        ...editedBranch,
                        branch_location: location,
                      })
                    }
                    onCoordinatesChange={(lat, lon) =>
                      setEditedBranch({
                        ...editedBranch,
                        branch_latitude: lat,
                        branch_longitude: lon,
                      })
                    }
                  />
                  {editedBranch.branch_location && (
                    <div className="text-sm text-muted-foreground break-words border rounded-md p-2 bg-muted/30">
                      {editedBranch.branch_location}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={gettingCurrentLocation}
                    onClick={getCurrentLocation}
                  >
                    {gettingCurrentLocation ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <MapPin className="mr-2 h-4 w-4" />
                    )}
                    Get Current Location
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Phone:</span>
                <span>{branch.branch_phone_number || "Not provided"}</span>
              </div>

              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Email:</span>
                <span>{branch.branch_email || "Not provided"}</span>
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Operating Hours:</span>
                <span>
                  {branch.branch_opening_time && branch.branch_closing_time
                    ? `${branch.branch_opening_time} - ${branch.branch_closing_time}`
                    : "Not specified"}
                </span>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <span className="font-medium">Location:</span>
                  <p className="text-sm text-muted-foreground mt-1">{branch.branch_location}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* Tills Management */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Tills Management</h2>
            <p className="text-muted-foreground">Manage tills for this branch</p>
          </div>
          <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_ADD_BRANCH}>
            <Dialog open={isAddTillDialogOpen} onOpenChange={setIsAddTillDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Till
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Till</DialogTitle>
                  <DialogDescription>Create a new till for this branch.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="till_name">Till Name</Label>
                    <Input
                      id="till_name"
                      value={newTill.name}
                      onChange={(e) => setNewTill({...newTill, name: e.target.value})}
                      placeholder="Enter till name"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddTillDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddTill}>Add Till</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </ProtectedComponent>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Tills</CardTitle>
                <CardDescription>Manage tills for {branch.branch_name}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-8 w-64"
                    placeholder="Search tills..."
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Badge variant="outline">
                  {filteredTills.length} {filteredTills.length === 1 ? "till" : "tills"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Till Name</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTills.length === 0 ? (
                    <TableRow>
                      <TableCell className="h-24 text-center" colSpan={3}>
                        {searchQuery ? (
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <Search className="h-8 w-8 mb-2" />
                            <p>No tills found matching "{searchQuery}"</p>
                            <Button
                              className="mt-2"
                              variant="link"
                              onClick={() => setSearchQuery("")}
                            >
                              Clear search
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <p>No tills found for this branch</p>
                            <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_ADD_BRANCH}>
                              <Button
                                className="mt-2"
                                variant="link"
                                onClick={() => setIsAddTillDialogOpen(true)}
                              >
                                Add your first till
                              </Button>
                            </ProtectedComponent>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTills.map((till, index) => (
                      <TableRow key={index} className="group">
                        <TableCell className="font-medium">Till -- {till.name}</TableCell>
                        <TableCell>{branch.branch_name}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2 opacity-70 group-hover:opacity-100">
                            <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_BRANCH}>
                              <Button
                                className="h-8 w-8"
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditTill(till);
                                  setEditTillIndex(index);
                                  setIsEditTillDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Edit</span>
                              </Button>
                            </ProtectedComponent>
                            <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_DELETE_BRANCH}>
                              <Button
                                className="h-8 w-8 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDeleteTill(till.id)}
                              >
                                <Trash className="h-4 w-4" />
                                <span className="sr-only">Delete</span>
                              </Button>
                            </ProtectedComponent>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Till Dialog */}
      <Dialog open={isEditTillDialogOpen} onOpenChange={setIsEditTillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Till</DialogTitle>
            <DialogDescription>Edit till details.</DialogDescription>
          </DialogHeader>
          {editTill && (
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_till_name">Till Name</Label>
                <Input
                  id="edit_till_name"
                  value={editTill.name}
                  onChange={(e) => setEditTill({...editTill, name: e.target.value})}
                  placeholder="Enter till name"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditTillDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditTillSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
