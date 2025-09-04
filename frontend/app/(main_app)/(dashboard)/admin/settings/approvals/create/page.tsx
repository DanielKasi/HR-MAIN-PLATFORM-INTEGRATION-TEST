"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  fetchActions,
  fetchApprovableModels,
  createApprovalDocument,
  createApprovalDocumentLevel,
  deleteApprovalDocumentLevel,
  fetchApprovalDocumentLevels,
  fetchApproverGroups,
  createApproverGroup,
  fetchApprovalDocuments, // Added fetchApprovalDocuments import
} from "@/lib/api/approvals/utils"
import type {
  Action,
  ContentTypeLite,
  ApprovalDocumentLevel,
  ApprovalDocumentFormData,
  ApprovalDocument,
  ApprovalDocumentLevelFormData,
  ApproverGroup,
  ApproverGroupFormData,
} from "@/types/approvals.types"
import { useSelector } from "react-redux"
import { selectSelectedInstitution } from "@/store/auth/selectors"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { MultiSelectPopover } from "@/components/common/multi-select-popover"
import FixedLoader from "@/components/fixed-loader"
import { getRoles, showErrorToast, showSuccessToast, usersAPI } from "@/lib/utils"
import { ArrowLeft, Plus, CheckCircle2, Users, Shield, FileText, Trash2 } from "lucide-react"
import type { Role, UserProfile } from "@/types"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ConfirmationDialog } from "@/components/confirmation-dialog"

export default function ApprovalCreatePage() {
  const searchParams = useSearchParams()
  const contentTypeId = searchParams.get("content") as unknown as number
  const router = useRouter()
  const currentInstitution = useSelector(selectSelectedInstitution)

  // Data states
  const [createdApprovalDocument, setCreatedApprovalDocument] = useState<ApprovalDocument | null>(null)
  const [models, setModels] = useState<ContentTypeLite[]>([])
  const [actions, setActions] = useState<Action[]>([])
  const [selectedActionIds, setSelectedActionIds] = useState<number[]>([])
  const [createdLevels, setCreatedLevels] = useState<ApprovalDocumentLevel[]>([])
  const [approverGroups, setApproverGroups] = useState<ApproverGroup[]>([])

  // Form states
  const [documentDescription, setDocumentDescription] = useState("")

  // Loading states
  const [loading, setLoading] = useState(true)
  const [savingDocument, setSavingDocument] = useState(false)
  const [savingLevel, setSavingLevel] = useState(false)
  const [savingApproverGroup, setSavingApproverGroup] = useState(false)

  // Error state
  const [error, setError] = useState<string>("")

  // Level dialog states
  const [openLevelDialog, setOpenLevelDialog] = useState(false)
  const [newLevelName, setNewLevelName] = useState("")
  const [newLevelDescription, setNewLevelDescription] = useState("")
  const [selectedApproverGroupIds, setSelectedApproverGroupIds] = useState<number[]>([])
  const [selectedOverriderGroupIds, setSelectedOverriderGroupIds] = useState<number[]>([])
  const [availableRoles, setAvailableRoles] = useState<Role[]>([])
  const [availableUsers, setAvailableUsers] = useState<UserProfile[]>([])

  // ApproverGroup creation dialog states
  const [openApproverGroupDialog, setOpenApproverGroupDialog] = useState(false)
  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupDescription, setNewGroupDescription] = useState("")
  const [selectedGroupUserIds, setSelectedGroupUserIds] = useState<number[]>([])
  const [selectedGroupRoleIds, setSelectedGroupRoleIds] = useState<number[]>([])

  // Confirmation dialog states for delete level
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [levelToDelete, setLevelToDelete] = useState<number | null>(null)
  const [deletingLevel, setDeletingLevel] = useState(false)

  useEffect(() => {
    loadData()
  }, [contentTypeId, currentInstitution])

  useEffect(() => {
    const checkExistingApprovalDocument = async () => {
      if (!contentTypeId || !currentInstitution) return

      try {
        const response = await fetchApprovalDocuments({
          content_type_id: Number(contentTypeId),
        })

        if (response.results && response.results.length > 0) {
          const existingApprovalDoc = response.results[0]
          router.push(`/admin/settings/approvals/${existingApprovalDoc.id}/edit`)
        }
      } catch (error) {
        // If there's an error or no existing document, continue with creation flow
        console.log("No existing approval document found, continuing with creation")
      }
    }

    checkExistingApprovalDocument()
  }, [contentTypeId, currentInstitution, router])

  const loadData = async () => {
    if (!currentInstitution) {
      return
    }
    try {
      setLoading(true)
      const [modelsRes, actionsRes, userProfiles, roles, approverGroupsRes] = await Promise.all([
        fetchApprovableModels(),
        fetchActions(),
        usersAPI.getProfilesByInstitutionId({ institutionId: currentInstitution.id }),
        getRoles({ institutionId: currentInstitution.id }),
        fetchApproverGroups(),
      ])

      const normalizedActions = Array.isArray(actionsRes)
        ? actionsRes
        : Array.isArray((actionsRes as any).results)
          ? (actionsRes as any).results
          : []

      setModels(modelsRes)
      setActions(normalizedActions)
      if (userProfiles) {
        setAvailableUsers(userProfiles.results)
      }
      if (roles) {
        setAvailableRoles(roles)
      }
      setApproverGroups(approverGroupsRes.results)
    } catch (e: any) {
      showErrorToast({ error: e, defaultMessage: "Failed to load approval data" })
      setError(e?.message || "Failed to load approval data")
    } finally {
      setLoading(false)
    }
  }

  const model = useMemo(() => models.find((m) => m.id === contentTypeId), [models, contentTypeId])

  const toggleAction = (id: number) => {
    setSelectedActionIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const createApprovalDocumentWithLevels = async () => {
    if (createdApprovalDocument) {
      toast.error("Another approval already exists for this instance");
      return
    }
    if (!currentInstitution) {
      setError("Missing institution")
      return
    }

    if (selectedActionIds.length === 0) {
      setError("Please select at least one action that requires approval")
      return
    }

    try {
      setSavingDocument(true)

      const documentData: ApprovalDocumentFormData = {
        institution: currentInstitution.id,
        content_type: contentTypeId,
        description: documentDescription || null,
        actions: selectedActionIds,
      }

      const createdDoc = await createApprovalDocument(documentData)
      setCreatedApprovalDocument(createdDoc)
      showSuccessToast("Approval document created successfully!")
    } catch (e: any) {
      showErrorToast({ error: e, defaultMessage: "Failed to create approval document" })
      setError(e?.message || "Failed to create approval document")
    } finally {
      setSavingDocument(false)
    }
  }

  const createNewApproverGroup = async () => {
    if (!currentInstitution) {
      toast.error("Missing institution")
      return
    }

    if (!newGroupName.trim()) {
      toast.error("Group name is required")
      return
    }

    if (selectedGroupUserIds.length === 0 && selectedGroupRoleIds.length === 0) {
      toast.error("Please select at least one user or role for the approver group")
      return
    }

    try {
      setSavingApproverGroup(true)

      const groupData: ApproverGroupFormData = {
        institution: currentInstitution.id,
        name: newGroupName,
        description: newGroupDescription,
        users: selectedGroupUserIds,
        roles: selectedGroupRoleIds,
      }

      const createdGroup = await createApproverGroup(groupData)
      setApproverGroups((prev) => [...prev, createdGroup])
      resetApproverGroupDialog()
      showSuccessToast("Approver group created successfully!")
    } catch (e: any) {
      showErrorToast({ error: e, defaultMessage: "Failed to create approver group" })
    } finally {
      setSavingApproverGroup(false)
    }
  }

  const resetApproverGroupDialog = () => {
    setOpenApproverGroupDialog(false)
    setNewGroupName("")
    setNewGroupDescription("")
    setSelectedGroupUserIds([])
    setSelectedGroupRoleIds([])
  }

  const addLevel = async () => {
    if (!createdApprovalDocument) {
      toast.error("No approval has been created yet !")
      return
    }

    if (!newLevelName.trim()) {
      toast.error("Level name is required")
      return
    }

    if (selectedApproverGroupIds.length === 0) {
      toast.error("Please select at least one approver group")
      return
    }

    try {
      setSavingLevel(true)

      const levelData: ApprovalDocumentLevelFormData = {
        name: newLevelName,
        description: newLevelDescription,
        approvers: selectedApproverGroupIds,
        overriders: selectedOverriderGroupIds,
        approval_document: createdApprovalDocument?.id,
      }

      const created = await createApprovalDocumentLevel(levelData)

      setCreatedLevels((prev) => [...prev, created])
      resetLevelDialog()
      showSuccessToast("Approval level created successfully!")
    } catch (e: any) {
      showErrorToast({ error: e, defaultMessage: "Failed to create approval level" })
      setError(e?.message || "Failed to create approval level")
    } finally {
      setSavingLevel(false)
    }
  }

  const resetLevelDialog = () => {
    setOpenLevelDialog(false)
    setNewLevelName("")
    setNewLevelDescription("")
    setSelectedApproverGroupIds([])
    setSelectedOverriderGroupIds([])
  }

  const removeLevelFromList = async (levelId: number) => {
    try {
      setDeletingLevel(true)
      await deleteApprovalDocumentLevel(levelId)

      // Refetch levels to ensure data consistency
      if (createdApprovalDocument) {
        const levelsResponse = await fetchApprovalDocumentLevels({
          approval_document: createdApprovalDocument.id,
        })
        setCreatedLevels(levelsResponse.results)
      }

      showSuccessToast("Approval level deleted successfully!")
    } catch (e: any) {
      showErrorToast({ error: e, defaultMessage: "Failed to delete approval level" })
    } finally {
      setDeletingLevel(false)
      setDeleteConfirmOpen(false)
      setLevelToDelete(null)
    }
  }

  const handleDeleteLevel = (levelId: number) => {
    setLevelToDelete(levelId)
    setDeleteConfirmOpen(true)
  }

  const confirmDeleteLevel = () => {
    if (levelToDelete) {
      removeLevelFromList(levelToDelete)
    }
  }

  const cancelDeleteLevel = () => {
    setDeleteConfirmOpen(false)
    setLevelToDelete(null)
  }

  if (loading) {
    return <FixedLoader />
  }

  if (!contentTypeId) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Content Type Selected</h3>
          <p className="text-muted-foreground mb-4">Please select a content type to configure approvals.</p>
          <Link href="/admin/settings/approvals">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Approvals
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <Link href="/admin/settings/approvals">
              <Button variant="ghost" className="rounded-full aspect-square" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
              </Button>
            </Link>
            <h1 className="text-xl lg:text-2xl font-bold">Configure Approvals</h1>
          </div>
          <p className="text-muted-foreground">
            Define approval workflows for {model?.name || "selected model"} actions
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
          <p className="text-destructive text-sm">{error}</p>
        </div>
      )}

      {/* Target Model Info */}
      {model && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Target Model
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div>
                <p className="font-medium">{model.name}</p>
                <p className="text-sm text-muted-foreground">
                  {model.app_label}.{model.model}
                </p>
              </div>
              <Badge variant="secondary">{model.plural_name}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actions Configuration */}
        <Card className="border-none shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Actions Requiring Approval
            </CardTitle>
            <p className="text-sm text-muted-foreground">Select which actions should trigger the approval workflow</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {actions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No actions available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {actions.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{action.name}</div>
                      {action.description && (
                        <div className="text-sm text-muted-foreground mt-1">{action.description}</div>
                      )}
                    </div>
                    <Label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        className="rounded"
                        checked={selectedActionIds.includes(action.id)}
                        onCheckedChange={() => toggleAction(action.id)}
                      />
                      <span className="text-sm">Require</span>
                    </Label>
                  </div>
                ))}
              </div>
            )}

            {/* Document Description */}
            <div className="pt-4 border-t">
              <label className="block text-sm font-medium mb-2">Approval Document Description</label>
              <Textarea
                placeholder="Optional description for this approval workflow..."
                value={documentDescription}
                className="resize-none"
                onChange={(e) => setDocumentDescription(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
          <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
            <Button
              onClick={createApprovalDocumentWithLevels}
              disabled={savingDocument || selectedActionIds.length === 0 || !!createdApprovalDocument}
            >
              {savingDocument ? "Creating..." : "Create Approval"}
            </Button>
          </div>
        </Card>

        {/* Approval Levels - Only show after approval document is created */}
        {createdApprovalDocument && (
          <Card className="border-none shadow-none">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Approval Levels
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create sequential approval levels with approver groups
                  </p>
                </div>
                <Dialog open={openLevelDialog} onOpenChange={setOpenLevelDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Level
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Approval Level</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                      {/* Basic Info */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2">
                            Level Name <span className="text-destructive">*</span>
                          </label>
                          <Input
                            placeholder="e.g., Manager Approval, HR Review..."
                            value={newLevelName}
                            onChange={(e) => setNewLevelName(e.target.value)}
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Description</label>
                          <Textarea
                            placeholder="Optional description of this approval level..."
                            value={newLevelDescription}
                            onChange={(e) => setNewLevelDescription(e.target.value)}
                            rows={2}
                          />
                        </div>
                      </div>

                      <Separator />

                      {/* Approver Groups Section */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                            <h4 className="font-medium">Approver Groups</h4>
                            <Badge variant="secondary" className="text-xs">
                              Required
                            </Badge>
                          </div>
                          <Dialog open={openApproverGroupDialog} onOpenChange={setOpenApproverGroupDialog}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Plus className="h-4 w-4 mr-2" />
                                Create Group
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-xl">
                              <DialogHeader>
                                <DialogTitle>Create Approver Group</DialogTitle>
                              </DialogHeader>

                              <div className="space-y-4 py-4">
                                <div>
                                  <label className="block text-sm font-medium mb-2">
                                    Group Name <span className="text-destructive">*</span>
                                  </label>
                                  <Input
                                    placeholder="e.g., Finance Team, HR Managers..."
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                  />
                                </div>

                                <div>
                                  <label className="block text-sm font-medium mb-2">Description</label>
                                  <Textarea
                                    placeholder="Optional description of this approver group..."
                                    value={newGroupDescription}
                                    onChange={(e) => setNewGroupDescription(e.target.value)}
                                    rows={2}
                                  />
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
                                      selectedIds={selectedGroupRoleIds}
                                      onSelectionChange={setSelectedGroupRoleIds}
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
                                      selectedIds={selectedGroupUserIds}
                                      onSelectionChange={setSelectedGroupUserIds}
                                      placeholder="Select users..."
                                      emptyMessage="No users available"
                                    />
                                  </div>
                                </div>
                              </div>

                              <DialogFooter>
                                <Button variant="outline" onClick={resetApproverGroupDialog}>
                                  Cancel
                                </Button>
                                <Button onClick={createNewApproverGroup} disabled={savingApproverGroup}>
                                  {savingApproverGroup ? "Creating..." : "Create Group"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">Select Approver Groups</label>
                          <MultiSelectPopover
                            items={approverGroups.map((group) => ({
                              id: group.id,
                              name: group.name,
                              label: `${group.name} (${group.users.length} users, ${group.roles.length} roles)`,
                            }))}
                            selectedIds={selectedApproverGroupIds}
                            onSelectionChange={setSelectedApproverGroupIds}
                            placeholder="Select approver groups..."
                            emptyMessage="No approver groups available. Create one first."
                          />
                        </div>
                      </div>

                      <Separator />

                      {/* Overrider Groups Section */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-orange-600" />
                          <h4 className="font-medium">Overrider Groups</h4>
                          <Badge variant="outline" className="text-xs">
                            Optional
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Approver groups that can override this approval level
                        </p>

                        <div>
                          <label className="block text-sm font-medium mb-2">Select Overrider Groups</label>
                          <MultiSelectPopover
                            items={approverGroups.map((group) => ({
                              id: group.id,
                              name: group.name,
                              label: `${group.name} (${group.users.length} users, ${group.roles.length} roles)`,
                            }))}
                            selectedIds={selectedOverriderGroupIds}
                            onSelectionChange={setSelectedOverriderGroupIds}
                            placeholder="Select overrider groups..."
                            emptyMessage="No approver groups available. Create one first."
                          />
                        </div>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={resetLevelDialog}>
                        Cancel
                      </Button>
                      <Button onClick={addLevel} disabled={savingLevel}>
                        {savingLevel ? "Creating..." : "Create Level"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>

            <CardContent>
              {createdLevels.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="mb-2">No approval levels created yet</p>
                  <p className="text-sm">Create levels to define your approval workflow</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {createdLevels.map((level, index) => (
                    <div key={level.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Level {index + 1}
                            </Badge>
                            <span className="font-medium">{level.name}</span>
                          </div>
                          {level.description && (
                            <p className="text-sm text-muted-foreground mt-1">{level.description}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLevel(level.id)}
                          className="text-destructive hover:text-destructive"
                          disabled={deletingLevel}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                            <span className="font-medium">Approver Groups</span>
                          </div>
                          <div className="text-muted-foreground">{level.approvers_detail?.length || 0} groups assigned</div>
                          {level.approvers_detail && level.approvers_detail.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {level.approvers_detail.map((approver) => (
                                <Badge key={approver.id} variant="secondary" className="text-xs">
                                  {approver.approver_group.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <Shield className="h-3 w-3 text-orange-600" />
                            <span className="font-medium">Overrider Groups</span>
                          </div>
                          <div className="text-muted-foreground">{level.overriders_detail?.length || 0} groups assigned</div>
                          {level.overriders_detail && level.overriders_detail.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {level.overriders_detail.map((overrider) => (
                                <Badge key={overrider.id} variant="outline" className="text-xs">
                                  {overrider.approver_group.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex justify-end gap-4 mt-8 pt-6 border-t">
        <Button disabled={!createdApprovalDocument} onClick={() => router.push("/admin/settings/approvals")}>
          Finish
        </Button>
      </div>

      {/* Confirmation dialog for delete level */}
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={cancelDeleteLevel}
        onConfirm={confirmDeleteLevel}
        title="Delete Approval Level"
        description="Are you sure you want to delete this approval level? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        disabled={deletingLevel}
      />
    </div>
  )
}
