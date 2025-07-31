"use client";

import {useEffect, useState} from "react";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Badge} from "@/components/ui/badge";
import {toast} from "sonner";
import {Plus, Pencil, Trash2, CheckCircle2, XCircle, MoreHorizontal} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Switch} from "@/components/ui/switch";
import {zodResolver} from "@hookform/resolvers/zod";
import {useForm} from "react-hook-form";
import * as z from "zod";
import {useSelector} from "react-redux";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import {cn, OffboardingStagesAPI, SeparationPolicyTypesAPI} from "@/lib/utils";
import {ISeparationType, IOffboardingStage, SeparationCategory} from "@/app/types/types.utils";

const SEPARATION_CATEGORIES = [
  {value: "resignation", label: "Resignation"},
  {value: "termination", label: "Termination"},
  {value: "retirement", label: "Retirement"},
  {value: "contract_end", label: "Contract End"},
  {value: "other", label: "Other"},
] as const;

const formSchema = z.object({
  separation_type: z.string().min(2, "Type name must be at least 2 characters"),
  description: z.string().min(2, "Description must be at least 2 characters"),
  supported_stages: z.array(z.number()),
  category: z.enum(["resignation", "termination", "retirement", "contract_end", "other"]),
  is_active: z.boolean().optional(),
});

export default function SeparationPolicyTypesPage() {
  const [policyTypes, setPolicyTypes] = useState<ISeparationType[]>([]);
  const [stages, setStages] = useState<IOffboardingStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPolicyType, setEditingPolicyType] = useState<ISeparationType | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [policyTypeToDelete, setPolicyTypeToDelete] = useState<ISeparationType | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const pageSize = 10;
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const institutionId = selectedInstitution?.id;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      separation_type: "",
      description: "",
      supported_stages: [],
      category: "resignation",
      is_active: true,
    },
  });

  const fetchPolicyTypes = async (page = currentPage) => {
    if (!institutionId) return;
    setLoading(true);
    const paginationParams = new URLSearchParams();
    paginationParams.append("page", page.toString());
    try {
      const data = await SeparationPolicyTypesAPI.getAll({
        institutionId,
        searchParams: paginationParams,
      });
      setPolicyTypes(data.results);
      setTotalItems(data.count);
      setTotalPages(Math.ceil(data.count / pageSize));
    } catch (error) {
      toast.error("Failed to fetch separation policy types");
    }
    setLoading(false);
  };

  const fetchStages = async () => {
    if (!institutionId) return;
    try {
      const data = await OffboardingStagesAPI.getAll({institutionId});
      setStages(data.results);
    } catch (error) {
      toast.error("Failed to fetch offboarding stages");
    }
  };

  useEffect(() => {
    fetchPolicyTypes(1);
    fetchStages();
  }, [institutionId]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchPolicyTypes(newPage);
  };

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!selectedInstitution) {
      return;
    }
    try {
      if (editingPolicyType) {
        await SeparationPolicyTypesAPI.update({
          policyTypeId: editingPolicyType.id,
          policyTypeData: values,
        });
        toast.success("Policy type updated successfully");
        // Stay on current page when editing
        fetchPolicyTypes(currentPage);
      } else {
        await SeparationPolicyTypesAPI.create({
          policyTypeData: {...values},
        });
        toast.success("Policy type created successfully");
        // Go to first page when creating new policy type
        setCurrentPage(1);
        fetchPolicyTypes(1);
      }
      form.reset();
      setEditingPolicyType(null);
      setIsEditDialogOpen(false);
    } catch (error) {
      toast.error(
        editingPolicyType ? "Failed to update policy type" : "Failed to create policy type",
      );
    }
  };

  const handleDelete = async (policyType: ISeparationType) => {
    try {
      await SeparationPolicyTypesAPI.delete(policyType.id);
      toast.success("Policy type deleted successfully");
      setPolicyTypeToDelete(null);

      // If we're on the last page and it's now empty, go to previous page
      if (policyTypes.length === 1 && currentPage > 1) {
        const newPage = currentPage - 1;
        setCurrentPage(newPage);
        fetchPolicyTypes(newPage);
      } else {
        // Stay on current page
        fetchPolicyTypes(currentPage);
      }
    } catch (error) {
      toast.error("Failed to delete policy type");
    }
  };

  const handleEdit = (policyType: ISeparationType) => {
    setEditingPolicyType(policyType);
    form.reset({
      separation_type: policyType.separation_type,
      description: policyType.description,
      supported_stages: Array.isArray(policyType.supported_stages)
        ? policyType.supported_stages.map((stage) => (typeof stage === "number" ? stage : stage.id))
        : [],
      category: policyType.category,
      is_active: policyType.is_active,
    });
    setIsEditDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading separation policy types...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Separation Policy Types</h1>
          <p className="text-muted-foreground mt-2">
            Manage separation policy types for employee exits
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Policy Type
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Policy Type</DialogTitle>
              <DialogDescription>Create a new separation policy type</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="separation_type"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>Type Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter policy type name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {SEPARATION_CATEGORIES.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="supported_stages"
                  render={({field}) => (
                    <FormItem>
                      <FormLabel>Supported Stages</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          const currentValues = field.value || [];
                          const numValue = parseInt(value);
                          const index = currentValues.indexOf(numValue);
                          if (index === -1) {
                            field.onChange([...currentValues, numValue]);
                          } else {
                            field.onChange(currentValues.filter((v) => v !== numValue));
                          }
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select stages" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {stages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id.toString()}>
                              {stage.stage_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>Selected stages: {field.value?.length || 0}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit">Create Policy Type</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditingPolicyType(null);
            setIsEditDialogOpen(false);
            form.reset();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Policy Type</DialogTitle>
            <DialogDescription>Update the details of this separation policy type</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="separation_type"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Type Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter policy type name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SEPARATION_CATEGORIES.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supported_stages"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>Supported Stages</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        const currentValues = field.value || [];
                        const numValue = parseInt(value);
                        const index = currentValues.indexOf(numValue);
                        if (index === -1) {
                          field.onChange([...currentValues, numValue]);
                        } else {
                          field.onChange(currentValues.filter((v) => v !== numValue));
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select stages" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stages.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id.toString()}>
                            {stage.stage_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Selected stages: {field.value?.length || 0}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_active"
                render={({field}) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>
                        Determine if this policy type is currently active
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">Update Policy Type</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policyTypes.map((policyType) => (
                  <TableRow key={policyType.id}>
                    <TableCell className="font-medium">{policyType.separation_type}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {policyType.description}
                    </TableCell>
                    <TableCell>
                      {
                        SEPARATION_CATEGORIES.find((cat) => cat.value === policyType.category)
                          ?.label
                      }
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={policyType.is_active ? "default" : "secondary"}
                        className={cn(
                          "flex w-fit items-center gap-1",
                          policyType.is_active
                            ? "bg-green-100 text-green-800 hover:bg-green-200"
                            : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
                        )}
                      >
                        {policyType.is_active ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {policyType.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(policyType.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(policyType)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setPolicyTypeToDelete(policyType)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {policyTypes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No separation policy types found. Create one to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1}-
                {Math.min(currentPage * pageSize, totalItems)} of {totalItems} policy types
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                {Array.from({length: totalPages}, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={currentPage === page ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                  >
                    {page}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!policyTypeToDelete}
        onOpenChange={(open) => !open && setPolicyTypeToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Policy Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this separation policy type? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPolicyTypeToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => policyTypeToDelete && handleDelete(policyTypeToDelete)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
