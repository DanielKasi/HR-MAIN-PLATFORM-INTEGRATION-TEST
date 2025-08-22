"use client"

import { useEffect, useState, useRef } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useRouter } from "next/navigation"
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
import { Plus, FileText, Eye, MoreHorizontal, Pencil, Trash2, MoreVertical, Search } from "lucide-react"
import { useSelector } from "react-redux"
import { selectSelectedInstitution } from "@/store/auth/selectors"
import { TerminationInitiationsAPI } from "@/lib/utils"
import { ITermination } from "@/types/types.utils"
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper"
import { TableSkeleton } from "@/components/common/table-skeleton"

const STATUS_STYLES = {
  submitted: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  under_review: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  approved: "bg-green-100 text-green-800 hover:bg-green-200",
  rejected: "bg-red-100 text-red-800 hover:bg-red-200",
}

const STATUS_LABELS = {
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
}

export default function TerminationInitiationsPage() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [terminationToDelete, setTerminationToDelete] = useState<ITermination | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const refreshTableRef = useRef<(() => void) | null>(null)
  const router = useRouter()
  const selectedInstitution = useSelector(selectSelectedInstitution)

  const handleDeleteSuccess = (deletedId: number) => {
    setDeleteDialogOpen(false)
    setTerminationToDelete(null)
    refreshTableRef.current?.()
  }

  const clearFilters = () => {
    setSearchTerm("")
  }

  const hasFilters = searchTerm

  const handleView = (terminationId: number) => {
    router.push(`/off-boarding/terminations/${terminationId}`)
  }

  const handleEdit = (terminationId: number) => {
    router.push(`/off-boarding/terminations/edit/${terminationId}`)
  }

  const handleDelete = async (termination: ITermination) => {
    setTerminationToDelete(termination)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!terminationToDelete) return

    try {
      await TerminationInitiationsAPI.delete({ terminationId: terminationToDelete.id })
      handleDeleteSuccess(terminationToDelete.id)
      toast.success("Termination deleted successfully")
    } catch (error) {
      toast.error("Failed to delete termination")
    }
  }



  return (
    <div className="flex flex-col w-full h-full sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Termination Initiations</h1>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className=" border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4 justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  placeholder="Search terminations..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              
              <Button onClick={() => router.push("/off-boarding/terminations/create")}>
                <Plus className="h-4 w-4 mr-2" />
                Initiate Termination
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div>
        <CardContent className="p-0 -ml-3">
          <PaginatedTableWrapper<ITermination>
            fetchFirstPage={async () => {
              if (!selectedInstitution) throw new Error("No institution selected")
              return await TerminationInitiationsAPI.getPaginated({
                institutionId: selectedInstitution.id,
                page: 1,
                search: searchTerm || undefined,
              })
            }}
            fetchFromUrl={TerminationInitiationsAPI.getPaginatedFromUrl}
            deps={[selectedInstitution?.id, searchTerm]}
            className="space-y-4"
            footerClassName="pt-4"
          >
            {({data, loading, refresh}) => {
              // Store refresh function in ref when component mounts/updates
              useEffect(() => {
                refreshTableRef.current = refresh
              }, [refresh])

              if (loading) {
                return <TableSkeleton rows={10} columns={6} />
              }

              if (!data || data.results.length === 0) {
                return (
                  <div className="text-center py-8 text-gray-500">
                    {searchTerm ? "No terminations found matching your search criteria" : "No termination initiations found"}
                  </div>
                )
              }

              return (
                <div className="overflow-x-auto mt-10">
            <Table className="min-w-[800px] [&_th]:border-0 [&_td]:border-0">
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Last Working Day</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Initiated By</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                      {data.results.map((termination) => (
                  <TableRow key={termination.id}>
                    <TableCell className="font-medium">
                      {termination.separation.employee.user?.fullname}
                    </TableCell>
                    <TableCell>
                      {new Date(termination.last_working_day).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={STATUS_STYLES[termination.initiation_status]}
                      >
                        {STATUS_LABELS[termination.initiation_status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {termination.separation.initiated_by.user.fullname}
                    </TableCell>
                    <TableCell>
                      {new Date(termination.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleView(termination.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(termination.id)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {termination.termination_letter && (
                            <DropdownMenuItem 
                              onClick={() => window.open(process.env.NEXT_PUBLIC_BASE_URL || 'http://127.0.0.1:8000' +termination.termination_letter!, "_blank")}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              View Letter
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleDelete(termination)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )
            }}
          </PaginatedTableWrapper>
        </CardContent>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Termination</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the termination for{" "}
              {terminationToDelete?.separation.employee.user?.fullname}? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setTerminationToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
