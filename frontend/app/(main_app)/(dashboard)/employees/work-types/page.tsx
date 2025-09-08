"use client"

import { useState, useEffect } from "react"
import { useSelector } from "react-redux"
import { Button } from "@/components/ui/button"
import { Card, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  AlertCircle,
  Search,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Eye,
  MoreVertical,
} from "lucide-react"
import { toast } from "sonner"


import { getWorkTypes, getPaginatedWorkTypesFromUrl, deleteWorkType, createWorkType } from "@/lib/utils"
import { selectSelectedInstitution } from "@/store/auth/selectors"
import type { IWorkType } from "@/types/types.utils"
import { TableSkeleton } from "@/components/common/table-skeleton"
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import WorkTypeModal from "@/components/dialogs/work-type-dialog"
import { Icon } from "@iconify/react"



// Work Type Details Modal
interface WorkTypeDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  employeeType: IWorkType | null
}

function WorkTypeDetailsModal({ isOpen, onClose, employeeType }: WorkTypeDetailsModalProps) {
  if (!employeeType) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] mx-4 sm:mx-0 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            Work Type Details
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">View the details of this work type</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Name</Label>
              <div className="p-3 bg-gray-50 rounded-md border">
                <span className="font-medium text-sm sm:text-base">{employeeType.name}</span>
              </div>
            </div>


            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Description</Label>
              <div className="p-3 bg-gray-50 rounded-md border min-h-[60px] sm:min-h-[80px]">
                {employeeType.description ? (
                  <span className="text-gray-700 text-sm sm:text-base">{employeeType.description}</span>
                ) : (
                  <span className="text-gray-400 italic text-sm">No description provided</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose} className="text-sm">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Main Component
export default function WorkTypesPage() {
  const [ordering, setOrdering] = useState("");
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const [searchTerm, setSearchTerm] = useState("")
  const [workTypeToDelete, setWorkTypeToDelete] = useState<IWorkType | null>(null)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  const [showFormModal, setShowFormModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [editingType, setEditingType] = useState<IWorkType | null>(null)
  const [viewingType, setViewingType] = useState<IWorkType | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
  }

  const handleCreate = () => {
    setEditingType(null)
    setShowFormModal(true)
  }

  const handleEdit = (type: IWorkType) => {
    setEditingType(type)
    setShowFormModal(true)
  }

  const handleView = (type: IWorkType) => {
    setViewingType(type)
    setShowDetailsModal(true)
  }

  const handleCloseFormModal = () => {
    setShowFormModal(false)
    setEditingType(null)
  }

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false)
    setViewingType(null)
  }

  if (!selectedInstitution) {
    return (
      <div className="flex items-center justify-center h-64 p-4">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-xs sm:text-sm lg:text-base">
            Please select an institution to manage work types.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-full bg-white p-2 md:p-6 rounded-lg py-8 min-h-screen">
      {/* Work Types List */}
      <div className="w-full ">
        <div className="mb-6">
          <div className="mb-6 px-3">
            <div className="flex items-center justify-between">
              <h1 className="text-xl lg:text-2xl font-semibold">Work Types</h1>

              <Button onClick={handleCreate} >
                <Plus className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Add Work Type</span>
              </Button>

            </div>
            <p className="text-sm text-muted-foreground">
              Manage different work types of employees in your organization
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-12">
            <div className="relative w-full max-w-sm md:max-w-md lg:max-w-xl">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search work types..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>

          </div>

          <PaginatedTableWrapper<IWorkType>
            fetchFirstPage={async () => {
              if (!selectedInstitution?.id) throw new Error("No institution selected");
              return await getWorkTypes({ institutionId: selectedInstitution.id, page: 1, search: searchTerm || undefined, ordering });
            }}
            fetchFromUrl={async ({ url }) => await getPaginatedWorkTypesFromUrl({ url })}
            deps={[selectedInstitution?.id, searchTerm, ordering]}
            className="mt-6"
          >
            {({ data, loading, refresh }) => {
              const list = (data?.results || [])

              const handleSave = async (saved: IWorkType) => {
                await refresh()
              }

              const handleDelete = async (workType: IWorkType) => {
                if (!selectedInstitution?.id) return
                try {
                  setIsDeleting(true)
                  await deleteWorkType({
                    institutionId: selectedInstitution.id,
                    workTypeId: workType.id,
                  })
                  await refresh()
                  toast.success("Work type deleted successfully!")
                } catch (error) {
                  toast.error("Failed to delete work type")
                } finally {
                  setIsDeleting(false)
                  setWorkTypeToDelete(null)
                }
              }

              return (
                <div className="overflow-x-auto">
                  <div className="min-w-[600px]">
                    {loading ? (
                      <TableSkeleton rows={5} columns={3} />
                    ) : (
                      <Table className="min-w-[800px] [&_th]:border-0 [&_td]:border-0 mt-12">
                        <TableHeader className="bg-gray-50/50">
                          <TableRow>
                            <TableHead className="font-semibold text-gray-900 py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm lg:text-base">
                              <div className="flex items-center gap-2">
                                <span>Name</span>
                                <Button
                                  onClick={() => setOrdering(ordering === "name" ? "" : "name")}
                                  size="sm"
                                  variant={ordering === "name" ? "default" : "outline"}
                                  type="button"
                                >
                                  <Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
                                </Button>
                              </div>
                            </TableHead>
                            <TableHead className="font-semibold text-gray-900 py-3 sm:py-4 px-4 sm:px-6 text-xs sm:text-sm lg:text-base">
                              Description
                            </TableHead>
                            <TableHead className="font-semibold text-gray-900 py-3 sm:py-4 px-4 sm:px-6 w-[80px] sm:w-[100px] text-center text-xs sm:text-sm lg:text-base">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {list.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center py-8 sm:py-12 text-gray-500 bg-white">
                                <div className="flex flex-col items-center gap-2">
                                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                                    <Search className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                                  </div>
                                  <span className="text-xs sm:text-sm lg:text-base">
                                    {searchTerm ? "No work types found matching your search." : "No work types found."}
                                  </span>
                                  {!searchTerm && (
                                    <Button
                                      onClick={handleCreate}
                                      variant="outline"
                                      size="sm"
                                      className="mt-2 border-orange-300 text-orange-700 hover:bg-orange-50 bg-transparent text-xs sm:text-sm lg:text-base"
                                    >
                                      <Plus className="h-4 w-4 mr-2" />
                                      Add your first work type
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            list.map((type) => (
                              <TableRow
                                key={type.id}
                                className="bg-white hover:bg-gray-50 transition-colors duration-150"
                              >
                                <TableCell className="py-3 sm:py-4 px-4 sm:px-6">
                                  <div className="font-medium text-gray-900 text-xs sm:text-sm lg:text-base">
                                    {type.name}
                                  </div>
                                </TableCell>
                                <TableCell className="py-3 sm:py-4 px-4 sm:px-6 max-w-xs sm:max-w-md">
                                  <div className="text-gray-700 leading-relaxed text-xs sm:text-sm lg:text-base">
                                    {type.description ? (
                                      <span className="line-clamp-2">{type.description}</span>
                                    ) : (
                                      <span className="text-gray-400 italic">No description provided</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="py-3 sm:py-4 px-4 sm:px-6 text-center">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 sm:h-8 sm:w-8 p-0 hover:bg-gray-100 rounded-full"
                                        disabled={workTypeToDelete?.id === type.id}
                                      >
                                        {workTypeToDelete?.id === type.id ? (
                                          <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-gray-600" />
                                        ) : (
                                          <MoreVertical className="h-3 w-3 sm:h-4 sm:w-4 text-gray-600" />
                                        )}
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      className="w-40 sm:w-48 bg-white border border-gray-200 shadow-lg"
                                    >
                                      <DropdownMenuItem
                                        onClick={() => handleView(type)}
                                        className="flex items-center px-2 sm:px-3 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer text-xs sm:text-sm lg:text-base"
                                      >
                                        <Eye className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3 text-gray-500" />
                                        View details
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleEdit(type)}
                                        className="flex items-center px-2 sm:px-3 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer text-xs sm:text-sm lg:text-base"
                                      >
                                        <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3 text-gray-500" />
                                        Edit work type
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => setWorkTypeToDelete(type)}
                                        className="flex items-center px-2 sm:px-3 py-2 text-red-600 hover:bg-red-50 cursor-pointer text-xs sm:text-sm lg:text-base"
                                      >
                                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3 text-red-500" />
                                        Delete work type
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    )}
                  </div>

                  {/* Form Modal within wrapper to access refresh */}
                  <WorkTypeModal
                    isOpen={showFormModal}
                    onClose={handleCloseFormModal}
                    editingType={editingType}
                    onSaveSuccess={handleSave}
                    isSubmitting={isSubmitting}
                  />

                  {/* Details Modal */}
                  <WorkTypeDetailsModal isOpen={showDetailsModal} onClose={handleCloseDetailsModal} employeeType={viewingType} />

                  {workTypeToDelete && (
                    <ConfirmationDialog
                      description="Are you sure you want to delete this work type? This action cannot be undone."
                      disabled={isDeleting}
                      isOpen={!!workTypeToDelete}
                      title={`Delete ${workTypeToDelete.name}`}
                      onConfirm={() => handleDelete(workTypeToDelete)}
                      onClose={() => {
                        setWorkTypeToDelete(null)
                        setIsDeleting(false)
                      }}
                    />
                  )}
                </div>
              )
            }}
          </PaginatedTableWrapper>
        </div>
      </div>
    </div>
  )
}
