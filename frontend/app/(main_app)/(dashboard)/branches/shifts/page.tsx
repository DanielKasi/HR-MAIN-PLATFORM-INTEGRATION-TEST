"use client";

import {useEffect} from "react";

import apiRequest from "@/lib/apiRequest";
import {selectSelectedBranch} from "@/store/auth/selectors";
import {Icon} from "@iconify/react";
import {useRef, useState} from "react";
import {useSelector} from "react-redux";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {PaginatedTableWrapper} from "@/components/common/tables/paginated-table-wrapper";
import {TableSkeleton} from "@/components/common/table-skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {Badge} from "@/components/ui/badge";
import {Edit, MoreVertical, Trash2} from "lucide-react";
import type {IBranchShift, IBranchWorkingDays, IShiftFormData} from "@/types/types.utils";
import {shiftsAPI} from "@/lib/utils";
import {showErrorToast} from "@/lib/utils";

const BranchShiftsPage = () => {
  const selectedBranch = useSelector(selectSelectedBranch);
  const [branchWorkingDays, setBranchWorkingDays] = useState<IBranchWorkingDays | null>(null);
  const [editingShift, setEditingShift] = useState<IBranchShift | null>(null);
  const [shiftToDelete, setShiftToDelete] = useState<IBranchShift | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const tableRefreshRef = useRef<(() => void) | null>(null);

  const [formData, setFormData] = useState<IShiftFormData>({
    name: "",
    shift_day: 0,
    start_time: "",
    end_time: "",
    description: "",
  });

  const fetchBranchWorkingDays = async () => {
    try {
      const response = await apiRequest.get(
        `/institution/branch-working-days/?branch_id=${selectedBranch?.id}`,
      );
      const data = await response.data;
      setBranchWorkingDays(data);
    } catch (error) {
      console.error("Error fetching branch working days:", error);
    }
  };

  const handleAddShift = async () => {
    console.log("Adding shift with data:", {...formData, branch: selectedBranch?.id});
    try {
      setLoading(true);
      const response = await apiRequest.post(`/institution/branch-shifts/${selectedBranch?.id}/`, {
        ...formData,
        branch: selectedBranch?.id,
      });

      if (response.status === 201) {
        setIsAddDialogOpen(false);
        resetForm();
        tableRefreshRef.current?.();
      }
    } catch (error) {
      console.error("Error adding shift:", error);
      showErrorToast({error: error, defaultMessage: "Failed to add shift."});
    } finally {
      setLoading(false);
    }
  };

  const handleEditShift = async () => {
    if (!editingShift) return;

    try {
      setLoading(true);
      const response = await apiRequest.patch(
        `/institution/branch-shifts/detail/${editingShift.id}/`,
        {
          ...formData,
          branch: selectedBranch?.id,
        },
      );

      if (response.status === 200) {
        setIsEditDialogOpen(false);
        setEditingShift(null);
        resetForm();
        tableRefreshRef.current?.();
      }
    } catch (error) {
      console.error("Error updating shift:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteShift = async () => {
    if (!shiftToDelete) return;

    try {
      setLoading(true);
      const response = await apiRequest.delete(
        `/institution/branch-shifts/detail/${shiftToDelete.id}/`,
      );

      if (response.status === 204) {
        tableRefreshRef.current?.();
      }
    } catch (error) {
      console.error("Error deleting shift:", error);
    } finally {
      setLoading(false);
      setShiftToDelete(null);
    }
  };

  const openEditDialog = (shift: IBranchShift) => {
    setEditingShift(shift);
    setFormData({
      name: shift.name,
      shift_day: shift.shift_day?.id || 0,
      start_time: shift.start_time,
      end_time: shift.end_time,
      description: shift.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      shift_day: 0,
      start_time: "",
      end_time: "",
      description: "",
    });
  };

  const getAvailableWorkingDays = () => {
    return branchWorkingDays?.branch_days || [];
  };

  const getDayTypeBadge = (dayType: "PHYSICAL" | "REMOTE") => {
    return dayType === "PHYSICAL" ? (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Physical</Badge>
    ) : (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Remote</Badge>
    );
  };

  useEffect(() => {
    if (selectedBranch?.id) {
      fetchBranchWorkingDays();
    }
  }, [selectedBranch]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Branch Shifts Management</h1>
          <p className="text-muted-foreground">
            Manage shifts for {selectedBranch?.branch_name || "selected branch"}
          </p>
        </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Icon icon="mdi:plus" className="w-4 h-4 mr-2" />
              Add New Shift
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Shift</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Shift Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Enter shift name"
                />
              </div>

              <div>
                <Label htmlFor="day">Working Day</Label>
                <Select
                  value={formData.shift_day.toString()}
                  onValueChange={(value) =>
                    setFormData({...formData, shift_day: Number.parseInt(value)})
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select working day" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableWorkingDays().map((day) => (
                      <SelectItem key={day.id} value={day.id.toString()}>
                        {day.day_name} ({day.day_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="start_time">Start Time</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="end_time">End Time</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Enter shift description"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddShift} disabled={loading}>
                  {loading ? "Adding..." : "Add Shift"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Shifts</CardTitle>
        </CardHeader>
        <CardContent>
          <PaginatedTableWrapper<IBranchShift>
            fetchFirstPage={async () => {
              if (!selectedBranch) {
                throw new Error("No branch selected");
              }
              return await shiftsAPI.BRANCH.getAll({branch_id: selectedBranch.id});
            }}
            fetchFromUrl={async (args: {url: string}) =>
              shiftsAPI.BRANCH.getPaginatedFromUrl({url: args.url})
            }
            deps={[selectedBranch?.id]}
            className="space-y-4"
            footerClassName="pt-4"
          >
            {({data, loading, refresh}) => {
              tableRefreshRef.current = refresh;

              if (loading) {
                return <TableSkeleton rows={data?.results.length || 5} columns={7} />;
              }

              return (
                <div className="w-full max-w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Shift Name</TableHead>
                        {/* <TableHead>Day</TableHead>
                        <TableHead>Type</TableHead> */}
                        <TableHead>Start Time</TableHead>
                        <TableHead>End Time</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.results.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
                            <Icon
                              icon="mdi:calendar-clock"
                              className="w-12 h-12 mx-auto mb-4 opacity-50"
                            />
                            <p className="text-muted-foreground mb-4">
                              No shifts found for this branch
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Click "Add New Shift" to create your first shift
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        data?.results.map((shift) => (
                          <TableRow key={shift.id}>
                            <TableCell className="font-medium">{shift.name}</TableCell>
                            {/* <TableCell>{shift.shift_day}</TableCell> */}
                            {/* <TableCell>{getDayTypeBadge(shift.shift_day.)}</TableCell> */}
                            <TableCell>{shift.start_time}</TableCell>
                            <TableCell>{shift.end_time}</TableCell>
                            <TableCell className="max-w-xs truncate">{shift.description}</TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                  <DropdownMenuItem onClick={() => openEditDialog(shift)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => setShiftToDelete(shift)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              );
            }}
          </PaginatedTableWrapper>
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit_name">Shift Name</Label>
              <Input
                id="edit_name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter shift name"
              />
            </div>

            <div>
              <Label htmlFor="edit_day">Working Day</Label>
              <Select
                value={formData.shift_day.toString()}
                onValueChange={(value) =>
                  setFormData({...formData, shift_day: Number.parseInt(value)})
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select working day" />
                </SelectTrigger>
                <SelectContent>
                  {getAvailableWorkingDays().map((day) => (
                    <SelectItem key={day.id} value={day.id.toString()}>
                      {day.day_name} ({day.day_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_start_time">Start Time</Label>
                <Input
                  id="edit_start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                />
              </div>
              <div>
                <Label htmlFor="edit_end_time">End Time</Label>
                <Input
                  id="edit_end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="Enter shift description"
                rows={3}
              />
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditShift} disabled={loading}>
                {loading ? "Updating..." : "Update Shift"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {shiftToDelete && (
        <AlertDialog
          open={!!shiftToDelete}
          onOpenChange={(open) => {
            if (!open) setShiftToDelete(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Shift</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <b>{shiftToDelete.name}</b>? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setShiftToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteShift}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default BranchShiftsPage;
