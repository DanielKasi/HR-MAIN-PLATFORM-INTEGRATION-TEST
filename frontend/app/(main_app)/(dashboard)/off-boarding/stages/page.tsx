"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Plus, Pencil, Trash2, CheckCircle2, XCircle, MoreHorizontal, MoreVertical, Search } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useSelector } from "react-redux"
import { selectSelectedInstitution } from "@/store/auth/selectors"
import { cn, OffboardingStagesAPI } from "@/lib/utils"
import { IOffboardingStage } from "@/types/types.utils"
import { PERMISSION_CODES } from "@/constants";
import ProtectedComponent from "@/components/ProtectedComponent"
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper"
import { TableSkeleton } from "@/components/common/table-skeleton"
import { Icon } from "@iconify/react";

const formSchema = z.object({
  stage_name: z.string().min(2, "Stage name must be at least 2 characters"),
  stage_description: z.string().min(2, "Description must be at least 2 characters"),
  is_active: z.boolean().optional(),
})

export default function OffboardingStagesPage() {
  const [editingStage, setEditingStage] = useState<IOffboardingStage | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [stageToDelete, setStageToDelete] = useState<IOffboardingStage | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const refreshTableRef = useRef<(() => void) | null>(null)
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const [ordering, setOrdering] = useState("")
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      stage_name: "",
      stage_description: "",
      is_active: true,
    },
  })

  const handleCreateSuccess = (newStage: IOffboardingStage) => {
    toast.success("Stage created successfully")
    refreshTableRef.current?.()
  }

  const handleUpdateSuccess = (updatedStage: IOffboardingStage) => {
    setIsEditDialogOpen(false)
    setEditingStage(null)
    toast.success("Stage updated successfully")
    refreshTableRef.current?.()
  }

  const handleDeleteSuccess = (deletedId: number) => {
    setStageToDelete(null)
    toast.success("Stage deleted successfully")
    refreshTableRef.current?.()
  }

  const handleEdit = (stage: IOffboardingStage) => {
    setEditingStage(stage)
    form.reset({
      stage_name: stage.stage_name,
      stage_description: stage.stage_description,
      is_active: stage.is_active,
    })
    setIsEditDialogOpen(true)
  }

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!selectedInstitution) { return }
    try {
      if (editingStage) {
        await OffboardingStagesAPI.update({
          stageId: editingStage.id,
          stageData: values,
        })
        handleUpdateSuccess(editingStage)
      } else {
        await OffboardingStagesAPI.create({
          stageData: { ...values, institution: selectedInstitution.id },
        })
        handleCreateSuccess({} as IOffboardingStage) // We don't have the created stage here, but the refresh will show it
      }
      form.reset()
      setEditingStage(null)
      setIsEditDialogOpen(false)
    } catch (error) {
      toast.error(editingStage ? "Failed to update stage" : "Failed to create stage")
    }
  }

  const handleDelete = async (stage: IOffboardingStage) => {
    try {
      await OffboardingStagesAPI.delete(stage.id)
      handleDeleteSuccess(stage.id)
    } catch (error) {
      toast.error("Failed to delete stage")
    }
  }

  const clearFilters = () => {
    setSearchTerm("")
  }

  const hasFilters = searchTerm

  return (
    <div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Offboarding Stages</h1>

        </div>

      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg mb-6">
        <div className="border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4 justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search stages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              )}
            </div>
            <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_OFFBOARDING_STAGES}>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Stage
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Stage</DialogTitle>
                    <DialogDescription>
                      Create a new stage for the offboarding process
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="stage_name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stage Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter stage name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="stage_description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Enter stage description" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter >
                        <Button type="submit" className="w-full">Create Stage</Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </ProtectedComponent>
          </div>
        </div>
      </div>


      {/* Table */}
      <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_OFFBOARDING_STAGES}>
        <div className="-ml-2 mt-4">
          <CardContent className="p-0">
            <PaginatedTableWrapper<IOffboardingStage>
              fetchFirstPage={async () => {
                if (!selectedInstitution) return await Promise.resolve({ results: [], count: 0, next: null, previous: null })
                return await OffboardingStagesAPI.getPaginated({
                  institutionId: selectedInstitution.id,
                  page: 1,
                  search: searchTerm || undefined,
                  ordering: ordering || undefined, // <-- pass ordering
                })
              }}
              fetchFromUrl={OffboardingStagesAPI.getPaginatedFromUrl}
              deps={[selectedInstitution?.id, searchTerm, ordering]}
              className="space-y-4"
              footerClassName="pt-4"
            >
              {({ data, loading, refresh }) => {
                // Store refresh function in ref when component mounts/updates
                useEffect(() => {
                  refreshTableRef.current = refresh
                }, [refresh])

                if (loading) {
                  return <TableSkeleton rows={8} columns={4} />
                }

                if (!data || data.results.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      {searchTerm ? "No stages found matching your search criteria" : "No offboarding stages found"}
                    </div>
                  )
                }
                return (
                  <div className="overflow-x-auto">
                    <Table className="min-w-[700px] [&_th]:border-0 [&_td]:border-0">
                      <TableHeader className="bg-gray-50/50">
                        <TableRow>
                          <TableHead>
                            <div className="flex items-center gap-2">
                              <span>Stage Name</span>
                              <Button
                                size="sm"
                                variant={ordering === "stage_name" ? "default" : "outline"}
                                onClick={() => setOrdering(ordering === "stage_name" ? "" : "stage_name")}
                              >
                                <Icon icon="hugeicons:sorting-02" className="!h-5 !w-5" />
                              </Button>
                            </div>
                          </TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Active</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.results.map((stage) => (
                          <TableRow key={stage.id}>
                            <TableCell className="font-medium">{stage.stage_name}</TableCell>
                            <TableCell>{stage.stage_description}</TableCell>
                            <TableCell>
                              <Badge className={stage.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                                {stage.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button size="sm" onClick={() => handleEdit(stage)}>Edit</Button>
                                <Button size="sm" variant="destructive" onClick={() => setStageToDelete(stage)}>Delete</Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )
              }
              }
            </PaginatedTableWrapper>
          </CardContent>
        </div>
      </ProtectedComponent>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setEditingStage(null)
          setIsEditDialogOpen(false)
          form.reset()
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Stage</DialogTitle>
            <DialogDescription>
              Update the details of this offboarding stage
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="stage_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter stage name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stage_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter stage description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>
                        Determine if this stage is currently active in the offboarding process
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="submit">Update Stage</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!stageToDelete} onOpenChange={(open) => !open && setStageToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Stage</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this stage? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setStageToDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => stageToDelete && handleDelete(stageToDelete)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
