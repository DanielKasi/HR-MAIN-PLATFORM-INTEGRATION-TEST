"use client";

import type {Branch} from "@/app/types";

import {useEffect, useState} from "react";
import {Edit, MapPin, Plus, Search, Trash, Loader2, Eye} from "lucide-react";
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
import {ScrollArea} from "@/components/ui/scroll-area";
import apiRequest from "@/lib/apiRequest";
import {
  fetchAndSetData,
  fetchInstitutionBranchesFromAPI,
  getDefaultInstitutionId,
} from "@/lib/helpers";
import ProtectedComponent from "@/components/ProtectedComponent";
import {LocationAutocomplete} from "@/components/location-autocomplete";
import {PERMISSION_CODES} from "@/app/types/types.utils";
import {fetchUpToDateInstitution} from "@/store/auth/actions";
import {useRouter} from "next/navigation";

export default function BranchesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newBranch, setNewBranch] = useState<Branch>({
    id: 0,
    branch_name: "",
    branch_location: "",
    branch_latitude: "",
    branch_longitude: "",
    branch_phone_number: "",
    branch_email: "",
    branch_opening_time: "",
    branch_closing_time: "",
    institution: getDefaultInstitutionId() ?? 0,
    tills: [],
  });
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [gettingCurrentLocation, setGettingCurrentLocation] = useState(false);
  const router = useRouter();

  const dispatch = useDispatch();

  const fetchBranches = async () => {
    setIsLoading(true);
    await fetchAndSetData(
      fetchInstitutionBranchesFromAPI,
      setBranches,
      setErrorMessage,
      "Failed to fetch branches",
    );
    setIsLoading(false);
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const filteredBranches = branches.filter(
    (branch) =>
      searchQuery === "" ||
      branch.branch_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      branch.branch_location.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleAddBranch = async () => {
    try {
      const response = await apiRequest.post("institution/branch/", newBranch);

      if (response.status === 201) {
        setIsAddDialogOpen(false);
        setNewBranch({
          id: 0,
          branch_name: "",
          branch_location: "",
          branch_latitude: "",
          branch_longitude: "",
          branch_phone_number: "",
          branch_email: "",
          branch_opening_time: "",
          branch_closing_time: "",
          institution: getDefaultInstitutionId() ?? 0,
          tills: [],
        });
        toast.success("The branch has been successfully added.");
        fetchBranches();
        dispatch(fetchUpToDateInstitution());
      } else {
        setErrorMessage("Failed to add branch");
      }
    } catch (error: any) {
      toast.error("An unexpected error occurred while adding the branch.");
    }
  };

  const handleEditBranch = async () => {
    if (!editBranch) return;
    try {
      const response = await apiRequest.patch(`institution/branch/${editBranch.id}/`, editBranch);

      if (response.status === 200) {
        setIsEditDialogOpen(false);
        toast.success("The branch has been successfully updated.");

        fetchBranches();
      } else {
        setErrorMessage("Failed to update branch");
      }
    } catch (error) {
      toast.error("Error updating branch");
    }
  };

  const handleDeleteBranch = async (id: number) => {
    try {
      const response = await apiRequest.delete(`institution/branch/${id}/`);

      if (response.status === 204) {
        setBranches((prev) => prev.filter((b) => b.id !== id));
        toast.success("The branch has been successfully deleted.");
      } else {
        toast.info("Failed to delete Branch");
      }
    } catch (error) {
      toast.error("An unexpected error occurred while deleting the branch.");
    }
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

          console.log("Current location Coordinates:", latitude, longitude);

          // Use Geoapify reverse geocoding API
          const response = await fetch(
            `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=12a8608da7914f4c96cbbc76c7ca954c`,
          );

          if (!response.ok) {
            throw new Error("Failed to reverse geocode location");
          }

          const data = await response.json();

          if (data.features && data.features.length > 0) {
            const address = data.features[0].properties.formatted;

            if (editBranch) {
              setEditBranch({
                ...editBranch,
                branch_location: address,
                branch_latitude: latitude.toString(),
                branch_longitude: longitude.toString(),
              });
            } else {
              setNewBranch((prev) => ({
                ...prev,
                branch_location: address,
                branch_latitude: latitude.toString(),
                branch_longitude: longitude.toString(),
              }));
            }
            toast.info("Your current location has been set.");
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

        toast.error("Location error:" + errorMessage);

        setGettingCurrentLocation(false);
      },
      {enableHighAccuracy: true, timeout: 10000, maximumAge: 0},
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Branches</h1>
          <p className="text-muted-foreground">Manage your business locations</p>
        </div>
        <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_ADD_BRANCH}>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Branch
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Add New Branch</DialogTitle>
                <DialogDescription>Create a new branch record.</DialogDescription>
              </DialogHeader>
              <ScrollArea className="flex-1 pr-4">
                <div className="grid gap-4 py-4">
                  {[
                    "branch_name",
                    "branch_phone_number",
                    "branch_email",
                    "branch_opening_time",
                    "branch_closing_time",
                  ].map((field) => (
                    <div key={field} className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right" htmlFor={field}>
                        {field
                          .split("_")
                          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(" ")}
                      </Label>
                      <Input
                        className="col-span-3"
                        id={field}
                        value={(newBranch as any)[field]}
                        onChange={(e) =>
                          setNewBranch({
                            ...newBranch,
                            [field]: e.target.value,
                          })
                        }
                      />
                    </div>
                  ))}
                  <div key="branch_location" className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right pt-2" htmlFor="branch_location">
                      Location
                    </Label>
                    <div className="col-span-3 flex flex-col gap-2">
                      <LocationAutocomplete
                        placeholder="Search for a location..."
                        value={newBranch.branch_location}
                        onChange={(location) =>
                          setNewBranch((prev) => ({
                            ...prev,
                            branch_location: location,
                          }))
                        }
                        onCoordinatesChange={(lat, lon) =>
                          setNewBranch((prev) => ({
                            ...prev,
                            branch_latitude: lat,
                            branch_longitude: lon,
                          }))
                        }
                      />
                      {newBranch.branch_location && (
                        <div className="text-sm text-muted-foreground break-words border rounded-md p-2 bg-muted/30">
                          {newBranch.branch_location}
                        </div>
                      )}
                      <Button
                        className="self-start mt-1 flex items-center"
                        disabled={gettingCurrentLocation}
                        size="sm"
                        type="button"
                        variant="outline"
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
              </ScrollArea>
              <DialogFooter className="pt-4">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddBranch}>Save Branch</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </ProtectedComponent>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 text-sm font-medium text-white bg-red-500 rounded-md flex items-center">
          <span className="mr-2">⚠️</span> {errorMessage}
        </div>
      )}

      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle>Branch Management</CardTitle>
          <CardDescription>Manage your organisation branches</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="w-full pl-8"
                  placeholder="Search branches..."
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Badge className="ml-2" variant="outline">
                {filteredBranches.length} {filteredBranches.length === 1 ? "branch" : "branches"}
              </Badge>
            </div>
          </div>

          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Branch</TableHead>
                  <TableHead className="hidden md:table-cell">Location</TableHead>
                  <TableHead className="text-right">Phone Number</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Operating Time</TableHead>
                  <TableHead>Tills</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell className="h-24 text-center" colSpan={5}>
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span>Loading branches...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredBranches.length === 0 ? (
                  <TableRow>
                    <TableCell className="h-24 text-center" colSpan={5}>
                      {searchQuery ? (
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Search className="h-8 w-8 mb-2" />
                          <p>No branches found matching "{searchQuery}"</p>
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
                          <p>No branches found</p>
                          <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_ADD_BRANCH}>
                            <Button
                              className="mt-2"
                              variant="link"
                              onClick={() => setIsAddDialogOpen(true)}
                            >
                              Add your first branch
                            </Button>
                          </ProtectedComponent>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBranches.map((branch) => (
                    <TableRow key={branch.id} className="group">
                      <TableCell className="font-medium">{branch.branch_name}</TableCell>
                      <TableCell className="hidden md:table-cell max-w-xs">
                        <div className="flex items-start">
                          <MapPin className="mr-2 h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />
                          <span className="truncate" title={branch.branch_location}>
                            {branch.branch_location}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{branch.branch_phone_number}</TableCell>
                      <TableCell>{branch.branch_email}</TableCell>
                      <TableCell>
                        Opens: {branch.branch_opening_time}, Closes: {branch.branch_closing_time}
                      </TableCell>
                      <TableCell>{branch.tills.length}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2 opacity-70 group-hover:opacity-100">
                          <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_BRANCH}>
                            <Button
                              className="h-8 w-8"
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                router.push(`/branches/${branch.id}`);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                              <span className="sr-only">View</span>
                            </Button>
                          </ProtectedComponent>
                          <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_BRANCH}>
                            <Button
                              className="h-8 w-8"
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditBranch(branch);
                                setIsEditDialogOpen(true);
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
                              onClick={() => handleDeleteBranch(branch.id)}
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

      {/* Edit Branch Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Branch</DialogTitle>
            <DialogDescription>Edit branch details.</DialogDescription>
          </DialogHeader>
          {editBranch && (
            <ScrollArea className="flex-1 pr-4">
              <div className="grid gap-4 py-4">
                {[
                  "branch_name",
                  "branch_phone_number",
                  "branch_email",
                  "branch_opening_time",
                  "branch_closing_time",
                ].map((field) => (
                  <div key={field} className="grid grid-cols-4 items-center gap-4">
                    <Label className="text-right" htmlFor={`edit-${field}`}>
                      {field
                        .split("_")
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(" ")}
                    </Label>
                    <Input
                      className="col-span-3"
                      id={`edit-${field}`}
                      value={(editBranch as any)[field]}
                      onChange={(e) =>
                        setEditBranch({
                          ...editBranch,
                          [field]: e.target.value,
                        })
                      }
                    />
                  </div>
                ))}
                <div key="branch_location" className="grid grid-cols-4 items-start gap-4">
                  <Label className="text-right pt-2" htmlFor="edit-branch_location">
                    Location
                  </Label>
                  <div className="col-span-3 flex flex-col gap-2">
                    <LocationAutocomplete
                      value={editBranch?.branch_location || ""}
                      onChange={(location) =>
                        setEditBranch((prev) =>
                          prev ? {...prev, branch_location: location} : prev,
                        )
                      }
                      onCoordinatesChange={(lat, lon) =>
                        setEditBranch((prev) =>
                          prev
                            ? {
                                ...prev,
                                branch_latitude: lat,
                                branch_longitude: lon,
                              }
                            : prev,
                        )
                      }
                      placeholder="Search for a location..."
                    />

                    {editBranch.branch_location && (
                      <div className="text-sm text-muted-foreground break-words border rounded-md p-2 bg-muted/30">
                        {editBranch.branch_location}
                      </div>
                    )}
                    <Button
                      className="self-start mt-1 flex items-center"
                      disabled={gettingCurrentLocation}
                      size="sm"
                      type="button"
                      variant="outline"
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
            </ScrollArea>
          )}
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditBranch}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
