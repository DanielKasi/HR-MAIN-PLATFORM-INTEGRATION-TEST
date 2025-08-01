"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
import { Plus, FileText, Eye, MoreHorizontal, Pencil, Trash2, MoreVertical } from "lucide-react"
import { useSelector } from "react-redux"
import { selectSelectedInstitution } from "@/store/auth/selectors"
import { TerminationInitiationsAPI } from "@/lib/utils"
import { ITermination } from "@/app/types/types.utils"

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
  const [terminations, setTerminations] = useState<ITermination[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [terminationToDelete, setTerminationToDelete] = useState<ITermination | null>(null)
  const pageSize = 10
  const router = useRouter()
  const selectedInstitution = useSelector(selectSelectedInstitution)

  const fetchTerminations = async (page = currentPage) => {
    setLoading(true)
    const paginationParams = new URLSearchParams();
    paginationParams.append("page", page.toString())
    try {
      const data = await TerminationInitiationsAPI.getAll({ 
        searchParams: paginationParams
      })
      setTerminations(data.results)
      setTotalItems(data.count)
      setTotalPages(Math.ceil(data.count / pageSize))
    } catch (error) {
      console.error("Failed to fetch termination initiations:", error)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTerminations(1)
  }, [])
  
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    fetchTerminations(newPage)
  }

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
      toast.success("Termination deleted successfully")
      setDeleteDialogOpen(false)
      setTerminationToDelete(null)
      fetchTerminations(currentPage)
    } catch (error) {
      toast.error("Failed to delete termination")
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading termination initiations...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Termination Initiations</h1>
          <p className="text-muted-foreground mt-2">Manage employee termination initiations</p>
        </div>
        <Button onClick={() => router.push("/off-boarding/terminations/create")}>
          <Plus className="h-4 w-4 mr-2" />
          Initiate Termination
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
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
                {terminations.map((termination) => (
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
                {terminations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No termination initiations found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * pageSize) + 1}-
                {Math.min(currentPage * pageSize, totalItems)} of {totalItems} initiations
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
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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
