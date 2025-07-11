"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Calendar,
  User,
  FileText,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { getDisciplinaryActions, deleteDisciplinaryAction } from "@/lib/utils"
import { transformDisciplinaryActionData } from "@/app/types/types.utils"
import { toast } from "sonner"

interface DisciplinaryAction {
  id: string
  employee_name: string
  employee_department: string
  discipline_type: string
  discipline_severity: "low" | "medium" | "high" | "critical"
  incident_date: string
  reported_date: string
  description: string
  evidence: string
  reported_by: string
  assigned_to: string
  status: "pending" | "in_progress" | "completed" | "dismissed"
  action_taken: string
  resolution_date: string
  follow_up_required: boolean
  follow_up_date: string
  notes: string
}

interface DisciplinaryActionsTableProps {
  formRoute?: string
}

export default function DisciplinaryActionsTable({
  formRoute = "/employees/discipline/create",
}: DisciplinaryActionsTableProps) {
  const router = useRouter()

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [severityFilter, setSeverityFilter] = useState("all")
  const [selectedAction, setSelectedAction] = useState<DisciplinaryAction | null>(null)
  const [disciplinaryActions, setDisciplinaryActions] = useState<DisciplinaryAction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [actionToDelete, setActionToDelete] = useState<string | null>(null)

  const fetchDisciplinaryActions = async () => {
    setIsLoading(true)
    try {
      const fetchedActions = await getDisciplinaryActions()
      const transformedActions = transformDisciplinaryActionData(fetchedActions)
      setDisciplinaryActions(transformedActions)
    } catch (error) {
      toast.error("Failed to load disciplinary actions")
      setDisciplinaryActions([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDisciplinaryActions()
  }, [])

  const handleRefresh = async () => {
    await fetchDisciplinaryActions()
    toast.success("Disciplinary actions refreshed")
  }

  const handleDeleteAction = async () => {
    if (!actionToDelete) return
    setIsLoading(true)
    try {
      const idAsNumber = parseInt(actionToDelete, 10)
      if (isNaN(idAsNumber)) {
        throw new Error("Invalid disciplinary action ID")
      }
      const success = await deleteDisciplinaryAction(idAsNumber)
      if (success) {
        toast.success("Disciplinary action deleted successfully")
        setDisciplinaryActions(prev => prev.filter(action => action.id !== actionToDelete))
      } else {
        toast.error("Failed to delete disciplinary action")
      }
    } catch (error: any) {
      toast.error("Failed to delete disciplinary action")
    } finally {
      setIsLoading(false)
      setIsDeleteDialogOpen(false)
      setActionToDelete(null)
    }
  }

  const openDeleteDialog = (actionId: string) => {
    setActionToDelete(actionId)
    setIsDeleteDialogOpen(true)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low":
        return "bg-green-100 text-green-800 border-green-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "critical":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200"
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "dismissed":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4" />
      case "in_progress":
        return <Clock className="h-4 w-4" />
      case "pending":
        return <AlertCircle className="h-4 w-4" />
      case "dismissed":
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const filteredActions = disciplinaryActions.filter((action) => {
    const matchesSearch =
      action.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      action.discipline_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (action.employee_department &&
        action.employee_department.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesStatus = statusFilter === "all" || action.status === statusFilter
    const matchesSeverity = severityFilter === "all" || action.discipline_severity === severityFilter

    return matchesSearch && matchesStatus && matchesSeverity
  })

  const handleAddNewAction = () => {
    router.push("/employees/discipline/create-disciplinary-action")
  }

  const handleEditAction = (actionId: string) => {
    router.push(`/employees/discipline/update-disciplinary-action/${actionId}/`)
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-[1600px] mx-auto p-6 space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Disciplinary Actions</h1>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading disciplinary actions...
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Disciplinary Actions</h1>
      </div>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Disciplinary Actions ({disciplinaryActions.length})</CardTitle>
              <CardDescription>Complete overview of disciplinary actions across all departments</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button onClick={handleAddNewAction} className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Add New Action
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee or discipline type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="dismissed">Dismissed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-semibold w-48">Employee</TableHead>
                  <TableHead className="font-semibold w-56">Type & Severity</TableHead>
                  <TableHead className="font-semibold w-36">Incident Date</TableHead>
                  <TableHead className="font-semibold w-40">Status</TableHead>
                  <TableHead className="font-semibold w-44">Assigned To</TableHead>
                  <TableHead className="font-semibold w-36">Follow-up</TableHead>
                  <TableHead className="font-semibold text-right w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActions.map((action) => (
                  <TableRow key={action.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <div className="font-medium">{action.employee_name}</div>
                        {action.employee_department && action.employee_department.trim() && (
                          <div className="text-sm text-muted-foreground">{action.employee_department}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{action.discipline_type}</div>
                        <Badge variant="outline" className={getSeverityColor(action.discipline_severity)}>
                          {action.discipline_severity.toUpperCase()}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(action.incident_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`${getStatusColor(action.status)} flex items-center gap-1 w-fit`}
                      >
                        {getStatusIcon(action.status)}
                        {action.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {action.assigned_to}
                      </div>
                    </TableCell>
                    <TableCell>
                      {action.follow_up_required ? (
                        <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
                          {action.follow_up_date ? new Date(action.follow_up_date).toLocaleDateString() : "Required"}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedAction(action)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditAction(action.id)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => openDeleteDialog(action.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
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
          <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => {
            setIsDeleteDialogOpen(open)
            if (!open) setActionToDelete(null)
          }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete the disciplinary action for{" "}
                  {actionToDelete && disciplinaryActions.find(action => action.id === actionToDelete)?.employee_name || "this employee"}
                  {" "}({actionToDelete && disciplinaryActions.find(action => action.id === actionToDelete)?.discipline_type || "this type"})?
                  This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsDeleteDialogOpen(false)
                    setActionToDelete(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAction}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          {filteredActions.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              {disciplinaryActions.length === 0
                ? "No disciplinary actions found. Click 'Add New Action' to create your first one."
                : "No disciplinary actions found matching your criteria."}
            </div>
          )}
        </CardContent>
      </Card>
      {selectedAction && (
        <Dialog open={!!selectedAction} onOpenChange={() => setSelectedAction(null)}>
          <DialogContent className="max-w-6xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Disciplinary Action Details
              </DialogTitle>
              <DialogDescription>
                Complete information for {selectedAction.employee_name}'s disciplinary action
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Employee</Label>
                  <p className="text-lg font-semibold">{selectedAction.employee_name}</p>
                  {selectedAction.employee_department && selectedAction.employee_department.trim() && (
                    <p className="text-sm text-muted-foreground">{selectedAction.employee_department}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Discipline Type</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="font-medium">{selectedAction.discipline_type}</p>
                    <Badge variant="outline" className={getSeverityColor(selectedAction.discipline_severity)}>
                      {selectedAction.discipline_severity.toUpperCase()}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge
                    variant="outline"
                    className={`${getStatusColor(selectedAction.status)} flex items-center gap-1 w-fit mt-1`}
                  >
                    {getStatusIcon(selectedAction.status)}
                    {selectedAction.status.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Incident Date</Label>
                  <p className="font-medium">{new Date(selectedAction.incident_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Reported By</Label>
                  <p className="font-medium">{selectedAction.reported_by}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Assigned To</Label>
                  <p className="font-medium">{selectedAction.assigned_to}</p>
                </div>
              </div>
              <div className="md:col-span-2 space-y-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-md">{selectedAction.description}</p>
                </div>
                {selectedAction.evidence && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Evidence</Label>
                    <p className="mt-1 p-3 bg-gray-50 rounded-md">{selectedAction.evidence}</p>
                  </div>
                )}
                {selectedAction.action_taken && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Action Taken</Label>
                    <p className="mt-1 p-3 bg-green-50 rounded-md border border-green-200">
                      {selectedAction.action_taken}
                    </p>
                  </div>
                )}
                {selectedAction.notes && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Notes</Label>
                    <p className="mt-1 p-3 bg-gray-50 rounded-md">{selectedAction.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}