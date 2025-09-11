"use client"

import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { selectSelectedInstitution } from "@/store/auth/selectors"
import {
  fetchApproverGroups,
  createApproverGroup,
  updateApproverGroup,
  deleteApproverGroup,
} from "@/lib/api/approvals/utils"
import type { ApproverGroup, ApproverGroupFormData } from "@/types/approvals.types"
import type { Role, UserProfile } from "@/types"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { MultiSelectPopover } from "@/components/common/multi-select-popover"
import FixedLoader from "@/components/fixed-loader"
import { getRoles, PROFILES_API, showErrorToast, showSuccessToast, usersAPI } from "@/lib/utils"
import { Plus, Users, Shield, Edit, Trash2, Search, MoreVertical, Eye } from "lucide-react"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function ApproverGroupsPage() {
  const currentInstitution = useSelector(selectSelectedInstitution)

  // Data states
  const [approverGroups, setApproverGroups] = useState<ApproverGroup[]>([])
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([])
  const [searchTerm, setSearchTerm] = useState("")

  // Loading states
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Dialog states
  const [openDialog, setOpenDialog] = useState(false)
  const [editingGroup, setEditingGroup] = useState<ApproverGroup | null>(null)
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false)
  const [viewingGroup, setViewingGroup] = useState<ApproverGroup | null>(null)
  const [groupName, setGroupName] = useState("")
  const [groupDescription, setGroupDescription] = useState("")
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([])
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([])

  // Delete confirmation states
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<ApproverGroup | null>(null)

  useEffect(() => {
    loadData()
  }, [currentInstitution])

  const loadData = async () => {
    if (!currentInstitution) return

    try {
      setLoading(true)
      const [groupsRes, userProfiles, roles] = await Promise.all([
        fetchApproverGroups(),
        PROFILES_API.getPaginatedUserProfiles({}),

        getRoles({ institutionId: currentInstitution.id }),
      ])

      setApproverGroups(groupsRes.results)
      if (userProfiles) {
        setAvailableUsers(userProfiles.results)
      }
      if (roles) {
        setAvailableRoles(roles)
      }
    } catch (e: any) {
      showErrorToast({ error: e, defaultMessage: "Failed to load approver groups" })
    } finally {
      setLoading(false)
    }
  }

  const openCreateDialog = () => {
    setEditingGroup(null)
    resetForm()
    setOpenDialog(true)
  }

  const openEditDialog = (group: ApproverGroup) => {
    setEditingGroup(group)
    setGroupName(group.name)
    setGroupDescription(group.description || "")
    setSelectedUserIds(group.users_display.map((u) => u.id))
    setSelectedRoleIds(group.roles_display.map((r) => r.id))
    setOpenDialog(true)
  }

  const openViewDetails = (group: ApproverGroup) => {
    setViewingGroup(group)
    setViewDetailsOpen(true)
  }

  const resetForm = () => {
    setGroupName("")
    setGroupDescription("")
    setSelectedUserIds([])
    setSelectedRoleIds([])
  }

  const closeDialog = () => {
    setOpenDialog(false)
    setEditingGroup(null)
    resetForm()
  }

  const handleSave = async () => {
    if (!currentInstitution) {
      showErrorToast({ error: null, defaultMessage: "Missing institution" })
      return
    }

    if (!groupName.trim()) {
      showErrorToast({ error: null, defaultMessage: "Group name is required" })
      return
    }

    if (selectedUserIds.length === 0 && selectedRoleIds.length === 0) {
      showErrorToast({ error: null, defaultMessage: "Please select at least one user or role" })
      return
    }

    try {
      setSaving(true)

      const groupData: ApproverGroupFormData = {
        institution: currentInstitution.id,
        name: groupName,
        description: groupDescription,
        users: selectedUserIds,
        roles: selectedRoleIds,
      }

      if (editingGroup) {
        const updatedGroup = await updateApproverGroup(editingGroup.id, groupData)
        setApproverGroups((prev) => prev.map((g) => (g.id === editingGroup.id ? updatedGroup : g)))
        showSuccessToast("Approver group updated successfully!")
      } else {
        const newGroup = await createApproverGroup(groupData)
        setApproverGroups((prev) => [...prev, newGroup])
        showSuccessToast("Approver group created successfully!")
      }

      closeDialog()
    } catch (e: any) {
      showErrorToast({ error: e, defaultMessage: "Failed to save approver group" })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteClick = (group: ApproverGroup) => {
    setGroupToDelete(group)
    setDeleteConfirmOpen(true)
  }

  const confirmDelete = async () => {
    if (!groupToDelete) return

    try {
      setDeleting(true)
      await deleteApproverGroup(groupToDelete.id)
      setApproverGroups((prev) => prev.filter((g) => g.id !== groupToDelete.id))
      showSuccessToast("Approver group deleted successfully!")
    } catch (e: any) {
      showErrorToast({ error: e, defaultMessage: "Failed to delete approver group" })
    } finally {
      setDeleting(false)
      setDeleteConfirmOpen(false)
      setGroupToDelete(null)
    }
  }

  const cancelDelete = () => {
    setDeleteConfirmOpen(false)
    setGroupToDelete(null)
  }

  const filteredGroups = approverGroups.filter(
    (group) =>
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return <FixedLoader />
  }

  return (
    <div className="p-6 bg-white rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h1 className="text-xl lg:text-2xl font-bold">Approver Groups</h1>
          <p className="text-muted-foreground">Manage groups of users and roles for approval workflows</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Create Group
        </Button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search approver groups..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Groups Table */}
      {filteredGroups.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{searchTerm ? "No groups found" : "No approver groups yet"}</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? "Try adjusting your search terms" : "Create your first approver group to get started"}
          </p>
          {!searchTerm && (
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          )}
        </div>
      ) : (
        <div className="w-full max-w-full overflow-x-auto bg-white">
          <Table className="min-w-[800px] [&_th]:border-0 [&_td]:border-0">
            <TableHeader>
              <TableRow>
                <TableHead>Name & Description</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="w-[50px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGroups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{group.name}</div>
                      {group.description && (
                        <div className="text-sm text-muted-foreground mt-1">{group.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <Badge variant="secondary" className="text-xs">
                          {group.users_display.length}
                        </Badge>
                      </div>
                      {group.users_display.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {group.users_display.slice(0, 2).map((user) => (
                            <Badge key={user.id} variant="outline" className="text-xs">
                              {user.user?.fullname || `User ${user.id}`}
                            </Badge>
                          ))}
                          {group.users_display.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{group.users_display.length - 2} more
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No users assigned</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-orange-600" />
                        <Badge variant="secondary" className="text-xs">
                          {group.roles_display.length}
                        </Badge>
                      </div>
                      {group.roles_display.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {group.roles_display.slice(0, 2).map((role) => (
                            <Badge key={role.id} variant="outline" className="text-xs">
                              {role.name}
                            </Badge>
                          ))}
                          {group.roles_display.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{group.roles_display.length - 2} more
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No roles assigned</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openViewDetails(group)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(group)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteClick(group)}
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
            </TableBody>
          </Table>
        </div>
      )}

      {/* View Details Dialog */}
      <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Approver Group Details</DialogTitle>
          </DialogHeader>

          {viewingGroup && (
            <div className="space-y-6 py-4">
              <div>
                <h3 className="text-lg font-semibold">{viewingGroup.name}</h3>
                {viewingGroup.description && <p className="text-muted-foreground mt-1">{viewingGroup.description}</p>}
              </div>

              <Separator />

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-5 w-5 text-blue-600" />
                    <h4 className="font-medium">Users</h4>
                    <Badge variant="secondary">{viewingGroup.users_display.length}</Badge>
                  </div>
                  {viewingGroup.users_display.length > 0 ? (
                    <div className="space-y-2">
                      {viewingGroup.users_display.map((user) => (
                        <div key={user.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="text-sm">{user.user?.fullname || `User ${user.id}`}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No users assigned</p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="h-5 w-5 text-orange-600" />
                    <h4 className="font-medium">Roles</h4>
                    <Badge variant="secondary">{viewingGroup.roles_display.length}</Badge>
                  </div>
                  {viewingGroup.roles_display.length > 0 ? (
                    <div className="space-y-2">
                      {viewingGroup.roles_display.map((role) => (
                        <div key={role.id} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                            <Shield className="h-4 w-4 text-orange-600" />
                          </div>
                          <span className="text-sm">{role.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No roles assigned</p>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Edit Approver Group" : "Create Approver Group"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Group Name <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g., Finance Team, HR Managers..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Description</label>
                <Textarea
                  placeholder="Optional description of this approver group..."
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <Separator />

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Roles</label>
                <MultiSelectPopover
                  items={availableRoles.map((role) => ({
                    id: role.id,
                    name: role.name,
                    label: role.name,
                  }))}
                  selectedIds={selectedRoleIds}
                  onSelectionChange={setSelectedRoleIds}
                  placeholder="Select roles..."
                  emptyMessage="No roles available"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Users</label>
                <MultiSelectPopover
                  items={availableUsers.map((user) => ({
                    id: user.id,
                    name: user.user?.fullname || `User ${user.id}`,
                    label: user.user?.fullname || `User ${user.id}`,
                  }))}
                  selectedIds={selectedUserIds}
                  onSelectionChange={setSelectedUserIds}
                  placeholder="Select users..."
                  emptyMessage="No users available"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingGroup ? "Update Group" : "Create Group"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete Approver Group"
        description={`Are you sure you want to delete "${groupToDelete?.name}"? This action cannot be undone and may affect existing approval workflows.`}
        confirmText="Delete"
        cancelText="Cancel"
        disabled={deleting}
      />
    </div>
  )
}
