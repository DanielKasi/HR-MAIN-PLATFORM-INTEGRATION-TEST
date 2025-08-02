"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSelector } from "react-redux"
import {
  Building2,
  Eye,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  RefreshCw,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import { getDepartments, deleteDepartment } from "@/lib/utils"
import { type IDepartment, PERMISSION_CODES } from "@/app/types/types.utils"
import { toast } from "sonner"
import ProtectedComponent from "@/components/ProtectedComponent"
import { useDocumentTitle } from "@/hooks/use-document-title"
import RichTextDisplay from "@/components/common/rich-text-display"

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<IDepartment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState("")
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [departmentToDelete, setDepartmentToDelete] = useState<IDepartment | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useDocumentTitle("DEPARTMENTS")

  const router = useRouter()
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const selectedBranch = useSelector(selectSelectedBranch)

  useEffect(() => {
    if (!selectedInstitution || !selectedBranch) {
      router.push("/dashboard")
      return
    }
    fetchDepartments()
  }, [selectedBranch, selectedInstitution, router])

  const fetchDepartments = async (showRefreshLoader = false) => {
    if (!selectedInstitution) return

    try {
      if (showRefreshLoader) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError("")

      const fetchedDepartments = await getDepartments({ institutionId: selectedInstitution.id })
      if (fetchedDepartments) {
        setDepartments(fetchedDepartments)
      } else {
        setError("Failed to fetch departments. Please try again.")
        toast.error("Failed to load departments")
      }
    } catch (err) {
      setError("Failed to fetch departments. Please try again.")
      toast.error("Failed to load departments")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchDepartments(true)
  }

  const filteredDepartments = Array.isArray(departments)
    ? departments.filter(
      (dept) =>
        dept.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dept?.description?.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    : []

  const handleCreateDepartment = () => {
    router.push("/admin/departments/create")
  }

  const handleEditDepartment = (departmentId: number) => {
    router.push(`/admin/departments/${departmentId}/edit`)
  }

  const handleViewDepartment = (departmentId: number) => {
    router.push(`/admin/departments/${departmentId}/view`)
  }

  const handleDeleteDepartment = (department: IDepartment) => {
    setDepartmentToDelete(department)
    setDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (!departmentToDelete) return

    setIsDeleting(true)
    try {
      await deleteDepartment({ departmentId: departmentToDelete.id })
      setDepartments(departments.filter((dept) => dept.id !== departmentToDelete.id))
      toast.success("Department deleted successfully")
      setDeleteModalOpen(false)
      setDepartmentToDelete(null)
    } catch (error) {
      console.error("Error deleting department:", error)
      toast.error("Failed to delete department")
    } finally {
      setIsDeleting(false)
    }
  }

  const cancelDelete = () => {
    setDeleteModalOpen(false)
    setDepartmentToDelete(null)
  }

  if (!selectedInstitution || !selectedBranch) {
    return <div>Loading...</div>
  }

  return (
    <div className="w-full h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Departments</h1>
          <p className="text-muted-foreground">
            Manage departments for {selectedBranch.branch_name} - {selectedInstitution.institution_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-transparent"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={handleCreateDepartment} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Department
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search departments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="flex items-center gap-2 bg-transparent">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Stats */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{departments.length}</div>
              <p className="text-xs text-muted-foreground">Total Departments</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{filteredDepartments.length}</div>
              <p className="text-xs text-muted-foreground">Filtered Results</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{selectedInstitution.institution_name}</div>
              <p className="text-xs text-muted-foreground">Current Organization</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
          {error}
        </div>
      )}

      {/* Departments Table */}
      {isLoading ? (
        <Table className="rounded-md border bg-gray-50">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[...Array(5)].map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-6 w-3/4" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-full" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-6 w-1/2" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : filteredDepartments.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No departments found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm
              ? "No departments match your search criteria."
              : "Get started by creating your first department."}
          </p>
          {!searchTerm && (
            <Button onClick={handleCreateDepartment} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create First Department
            </Button>
          )}
        </Card>
      ) : (
        <Card className="border rounded-md bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-[50px]"></TableHead>
                <TableHead className="font-semibold">Name</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDepartments.map((department, index) => (
                <TableRow
                  key={department.id}
                  className={`
                    hover:bg-muted/50 transition-colors
                    ${index % 2 === 0 ? 'bg-white' : 'bg-muted/5'}
                  `}
                >
                  <TableCell>
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{department.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>

                    <RichTextDisplay
                      className={"text-sm" + !department.description ? 'text-muted-foreground italic' : ''}
                      htmlContent={department.description || "No description"}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-muted/50"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_DEPARTMENTS}>
                          <DropdownMenuItem
                            onClick={() => handleViewDepartment(department.id)}
                            className="hover:bg-muted/50"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                        </ProtectedComponent>
                        <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_DEPARTMENTS}>
                          <DropdownMenuItem
                            onClick={() => handleEditDepartment(department.id)}
                            className="hover:bg-muted/50"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Department
                          </DropdownMenuItem>
                        </ProtectedComponent>
                        <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_DELETE_DEPARTMENTS}>
                          <DropdownMenuItem
                            onClick={() => handleDeleteDepartment(department)}
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Department
                          </DropdownMenuItem>
                        </ProtectedComponent>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <DialogTitle>Delete Department</DialogTitle>
                <DialogDescription className="mt-1">This action cannot be undone.</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">{departmentToDelete?.name}</span>? This will permanently
              remove the department and all associated data.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={cancelDelete} disabled={isDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="flex items-center gap-2"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Delete Department
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
