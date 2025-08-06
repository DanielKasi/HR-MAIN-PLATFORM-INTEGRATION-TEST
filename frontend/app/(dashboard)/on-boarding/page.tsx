"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSelector } from "react-redux"
import {
  Users,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  RefreshCw,
  Calendar,
  Eye,
  Phone,
  MapPin,
  Briefcase,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  MessageSquare,
  FileText,
  UserCheck,
  UserX,
  GraduationCap,
  ChevronDown,
  Users2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import { getOnBoardings, updateOnBoarding } from "@/lib/utils"
import type { IOnBoarding, IOnBoardingFormData } from "@/app/types/types.utils"
import { toast } from "sonner"
import { TableSkeleton } from "@/components/common/table-skeleton"

// Constants matching your exact interface
const ONBOARDING_STAGES = [
  { value: "initial", label: "Initial", icon: AlertTriangle, color: "text-gray-500" },
  { value: "issued_contract", label: "Contract Issued", icon: FileText, color: "text-purple-500" },
  { value: "training", label: "Training", icon: GraduationCap, color: "text-blue-500" },
  { value: "accepted_offer", label: "Offer Accepted", icon: UserCheck, color: "text-orange-500" },
  { value: "declined_offer", label: "Offer Declined", icon: UserX, color: "text-red-500" },
] as const

const NEXT_STAGE_MAP: Record<IOnBoarding["status"], IOnBoarding["status"][]> = {
  initial: ["issued_contract"],
  issued_contract: ["training", "declined_offer"],
  training: ["accepted_offer", "declined_offer"],
  accepted_offer: [],
  declined_offer: [],
}

// Types
interface UpdateDialogState {
  open: boolean
  onboarding: IOnBoarding | null
  newStatus: IOnBoarding["status"]
  attended: boolean
  remarks: string
  isSubmitting: boolean
}

interface BulkUpdateDialogState {
  open: boolean
  newStatus: IOnBoarding["status"]
  attended: boolean
  remarks: string
  isSubmitting: boolean
}

type BadgeVariant = "default" | "secondary" | "outline" | "destructive"

export default function OnboardPage() {
  const [onboardings, setOnboardings] = useState<IOnBoarding[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [error, setError] = useState("")
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const [updateDialog, setUpdateDialog] = useState<UpdateDialogState>({
    open: false,
    onboarding: null,
    newStatus: "initial",
    attended: false,
    remarks: "",
    isSubmitting: false,
  })

  const [bulkUpdateDialog, setBulkUpdateDialog] = useState<BulkUpdateDialogState>({
    open: false,
    newStatus: "initial",
    attended: false,
    remarks: "",
    isSubmitting: false,
  })

  // Selectors
  const router = useRouter()
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const selectedBranch = useSelector(selectSelectedBranch)

  const handleSmartSelectAll = () => {
    const selectableOnboardings = filteredOnboardings.filter((o) => o.status !== "accepted_offer")

    if (selectedIds.size === selectableOnboardings.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(selectableOnboardings.map((o) => o.id)))
    }
  }

  // 2. Select by Status Function
  const handleSelectByStatus = (statuses: IOnBoarding["status"][]) => {
    const candidatesWithStatus = filteredOnboardings.filter((o) => statuses.includes(o.status))
    setSelectedIds(new Set(candidatesWithStatus.map((o) => o.id)))
  }

  // 3. Quick selection helpers
  const selectActiveCandidates = () => {
    handleSelectByStatus(["initial", "issued_contract", "training"])
  }

  const selectPendingContract = () => {
    handleSelectByStatus(["initial"])
  }

  const selectContractIssued = () => {
    handleSelectByStatus(["issued_contract"])
  }

  const selectTraining = () => {
    handleSelectByStatus(["training"])
  }

  // 4. Enhanced Select All component with dropdown options
  const SmartSelectAllDropdown = () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center">
          <Checkbox
            checked={selectedIds.size === filteredOnboardings.length && filteredOnboardings.length > 0}
            onCheckedChange={handleSelectAll}
            aria-label="Select all"
          />
          <ChevronDown className="h-3 w-3 ml-1 text-muted-foreground" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={handleSelectAll}>Select All ({filteredOnboardings.length})</DropdownMenuItem>
        {ONBOARDING_STAGES.map((stage) => (
          <DropdownMenuItem key={stage.value} onClick={() => handleSelectByStatus([stage.value])}>
            Select {stage.label} ({filteredOnboardings.filter((o) => o.status === stage.value).length})
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem onClick={() => handleSelectByStatus(["initial", "issued_contract", "training"])}>
          Select Active Candidates (
          {filteredOnboardings.filter((o) => ["initial", "issued_contract", "training"].includes(o.status)).length})
        </DropdownMenuItem>
        <DropdownMenuItem onClick={clearSelection}>Clear Selection</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

  useEffect(() => {
    if (!selectedInstitution || !selectedBranch) {
      router.push("/dashboard")
      return
    }
    fetchOnboardings()
  }, [selectedBranch, selectedInstitution, router])

  const fetchOnboardings = async (showRefreshLoader = false) => {
    if (!selectedInstitution) {
      return
    }

    try {
      setIsRefreshing(showRefreshLoader)
      setIsLoading(!showRefreshLoader)
      setError("")

      const fetchedOnboardings = await getOnBoardings({ institutionId: selectedInstitution.id })

      if (fetchedOnboardings) {
        setOnboardings(fetchedOnboardings)
      } else {
        setError("Failed to fetch onboarding records. Please try again.")
        toast.error("Failed to load onboarding records")
      }
    } catch (err) {
      setError("Failed to fetch onboarding records. Please try again.")
      toast.error("Failed to load onboarding records")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const getApplicationData = (onboarding: IOnBoarding) => {
    const applicationData = onboarding.application_details

    if (!applicationData) {
      return {
        applicantName: "N/A",
        applicantEmail: "N/A",
        jobDesc: "N/A",
        applicantPhone: "N/A",
        applicantAddress: "N/A",
        applicantPositions: "N/A",
      }
    }

    const jobDetails = applicationData.job_position_advert_job_details
    const jobName = jobDetails?.name || "N/A"
    const jobDescription = jobDetails?.description || "N/A"

    const result = {
      applicantName: applicationData.applicant_name || "N/A",
      applicantEmail: applicationData.applicant_email || "N/A",
      jobDesc: jobName !== "N/A" ? jobName : jobDescription,
      applicantPhone: applicationData.applicant_phone || "N/A",
      applicantAddress: applicationData.address || "N/A",
      applicantPositions: applicationData.positions?.toString() || "N/A",
    }

    return result
  }

  const getStatusIcon = (status: IOnBoarding["status"]) => {
    const stage = ONBOARDING_STAGES.find((s) => s.value === status)
    if (stage) {
      const IconComponent = stage.icon
      return <IconComponent className={`h-4 w-4 ${stage.color}`} />
    }
    return <AlertTriangle className="h-4 w-4 text-gray-500" />
  }

  const getStatusBadgeVariant = (status: IOnBoarding["status"]): BadgeVariant => {
    switch (status) {
      case "accepted_offer":
        return "default"
      case "issued_contract":
        return "secondary"
      case "training":
        return "outline"
      case "declined_offer":
        return "destructive"
      case "initial":
        return "outline"
      default:
        return "outline"
    }
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    } catch {
      return "N/A"
    }
  }

  const getInitials = (name: string) => {
    if (!name || name === "N/A") return "NA"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatStatus = (status: IOnBoarding["status"]) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const getNextStages = (currentStatus: IOnBoarding["status"]): IOnBoarding["status"][] => {
    return NEXT_STAGE_MAP[currentStatus] || []
  }

  // Filtering
  const filteredOnboardings = onboardings.filter((onboarding) => {
    const { applicantName, applicantEmail, jobDesc } = getApplicationData(onboarding)
    const status = onboarding.status
    const searchLower = searchTerm.toLowerCase()

    const matchesSearch =
      applicantName.toLowerCase().includes(searchLower) ||
      applicantEmail.toLowerCase().includes(searchLower) ||
      (typeof jobDesc === "string" ? jobDesc : "").toLowerCase().includes(searchLower) ||
      status.includes(searchLower)

    const matchesStatus = statusFilter === "all" || onboarding.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Selection Handlers
  const handleSelectAll = () => {
    if (selectedIds.size === filteredOnboardings.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredOnboardings.map((o) => o.id)))
    }
  }

  const handleSelectOne = (id: number) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const getSelectedOnboardings = () => {
    return onboardings.filter((o) => selectedIds.has(o.id))
  }

  const getCommonNextStages = (selectedOnboardings: IOnBoarding[]): IOnBoarding["status"][] => {
    if (selectedOnboardings.length === 0) return []

    const firstStatus = selectedOnboardings[0].status
    const allSameStatus = selectedOnboardings.every((o) => o.status === firstStatus)

    if (!allSameStatus) return []

    return getNextStages(firstStatus)
  }

  const handleUpdateOnboarding = (onboarding: IOnBoarding, newStatus: IOnBoarding["status"]) => {
    const isTrainingOrBeyond = ["training", "issued_contract", "accepted_offer"].includes(newStatus)
    const defaultAttended = isTrainingOrBeyond || onboarding.attended

    setUpdateDialog({
      open: true,
      onboarding,
      newStatus,
      attended: defaultAttended,
      remarks: onboarding.remarks || "",
      isSubmitting: false,
    })
  }

  const submitOnboardingUpdate = async () => {
    if (!updateDialog.onboarding) return

    setUpdateDialog((prev) => ({ ...prev, isSubmitting: true }))

    try {
      const updateData: Partial<IOnBoardingFormData> = {
        status: updateDialog.newStatus,
        attended: updateDialog.attended,
        remarks: updateDialog.remarks,
      }

      const result = await updateOnBoarding({
        onboardingId: updateDialog.onboarding.id,
        onboardingData: updateData,
      })

      if (result) {
        setOnboardings((prev) =>
          prev.map((onboarding) => (onboarding.id === updateDialog.onboarding!.id ? result : onboarding)),
        )

        const stageName = ONBOARDING_STAGES.find((s) => s.value === updateDialog.newStatus)?.label
        toast.success(`Successfully moved candidate to ${stageName} stage`)

        setUpdateDialog({
          open: false,
          onboarding: null,
          newStatus: "initial",
          attended: false,
          remarks: "",
          isSubmitting: false,
        })
      } else {
        toast.error("Failed to update onboarding status")
      }
    } catch (error) {
      toast.error("Failed to update onboarding status")
    } finally {
      setUpdateDialog((prev) => ({ ...prev, isSubmitting: false }))
    }
  }

  const handleBulkUpdate = (newStatus: IOnBoarding["status"]) => {
    const defaultAttended = true

    setBulkUpdateDialog({
      open: true,
      newStatus,
      attended: defaultAttended,
      remarks: "",
      isSubmitting: false,
    })
  }

  const submitBulkUpdate = async () => {
    const selectedOnboardings = getSelectedOnboardings()
    if (selectedOnboardings.length === 0) return

    setBulkUpdateDialog((prev) => ({ ...prev, isSubmitting: true }))

    try {
      const updateData: Partial<IOnBoardingFormData> = {
        status: bulkUpdateDialog.newStatus,
        attended: bulkUpdateDialog.attended,
        remarks: bulkUpdateDialog.remarks,
      }

      const updatePromises = Array.from(selectedIds).map(async (onboardingId) => {
        try {
          const result = await updateOnBoarding({
            onboardingId,
            onboardingData: updateData,
          })
          return { id: onboardingId, success: true, data: result }
        } catch (error) {
          return { id: onboardingId, success: false, error }
        }
      })

      const results = await Promise.allSettled(updatePromises)

      const successful = results.filter(
        (result) => result.status === "fulfilled" && result.value.success,
      ) as PromiseFulfilledResult<{ id: number; success: true; data: IOnBoarding | null }>[]

      const failed = results.filter(
        (result) => result.status === "rejected" || (result.status === "fulfilled" && !result.value.success),
      )

      // Update local state for successful updates
      if (successful.length > 0) {
        setOnboardings((prev) =>
          prev.map((onboarding) => {
            const successfulUpdate = successful.find((s) => s.value.id === onboarding.id)
            if (successfulUpdate && successfulUpdate.value.data) {
              return successfulUpdate.value.data
            }
            return onboarding
          }),
        )
      }

      // Show toast messages
      if (successful.length === selectedIds.size) {
        const stageName = ONBOARDING_STAGES.find((s) => s.value === bulkUpdateDialog.newStatus)?.label
        toast.success(
          `Successfully moved ${successful.length} candidate${successful.length > 1 ? "s" : ""} to ${stageName} stage`,
        )
      } else if (successful.length > 0) {
        toast.success(`Updated ${successful.length} of ${selectedIds.size} candidates`)
        if (failed.length > 0) {
          toast.error(`Failed to update ${failed.length} candidate${failed.length > 1 ? "s" : ""}`)
        }
      } else {
        toast.error("Failed to update any candidates")
      }

      setBulkUpdateDialog({
        open: false,
        newStatus: "initial",
        attended: false,
        remarks: "",
        isSubmitting: false,
      })

      setSelectedIds(new Set())
    } catch (error) {
      toast.error("Failed to update onboarding statuses")
    } finally {
      setBulkUpdateDialog((prev) => ({ ...prev, isSubmitting: false }))
    }
  }

  const handleRefresh = () => {
    fetchOnboardings(true)
    setSelectedIds(new Set())
  }

  const handleBulkDelete = async () => {
    try {
      setOnboardings((prev) => prev.filter((o) => !selectedIds.has(o.id)))
      toast.success(`Successfully deleted ${selectedIds.size} onboarding records`)
      setSelectedIds(new Set())
    } catch (error) {
      toast.error("Failed to delete onboarding records")
    }
  }

  const handleDeleteOnboarding = async (onboardingId: number) => {
    setDeletingId(onboardingId)
    try {
      setOnboardings((prev) => prev.filter((o) => o.id !== onboardingId))
      toast.success("Onboarding record deleted successfully")
    } catch (error) {
      toast.error("Failed to delete onboarding record")
    } finally {
      setDeletingId(null)
    }
  }

  const handleViewOnboarding = (onboardingId: number) => {
    router.push(`/on-boarding/${onboardingId}/view`)
  }

  // Stats calculations - Fixed to match interface
  const stats = {
    total: onboardings.length,
    initial: onboardings.filter((o) => o.status === "initial").length,
    training: onboardings.filter((o) => o.status === "training").length,
    contractIssued: onboardings.filter((o) => o.status === "issued_contract").length,
    accepted: onboardings.filter((o) => o.status === "accepted_offer").length,
    declined: onboardings.filter((o) => o.status === "declined_offer").length,
  }

  const selectedOnboardings = getSelectedOnboardings()
  const commonNextStages = getCommonNextStages(selectedOnboardings)

  if (!selectedInstitution || !selectedBranch) {
    return <div>Loading...</div>
  }

  if (isLoading) {
    return (
      <div className="p-2 sm:p-4 lg:p-6 space-y-4 sm:space-y-6">
        <Card className="h-[calc(100vh-2rem)] shadow-lg">
          <CardHeader className="border-b">
            <div className="flex flex-col sm:flex-row justify-between gap-4 sm:gap-8 items-start sm:items-center">
              <div className="flex items-center justify-start gap-4">
                <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-6 bg-gray-200 rounded w-48 sm:w-64 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-32 sm:w-48 animate-pulse"></div>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="h-10 w-24 sm:w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-10 w-28 sm:w-36 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-10 w-20 sm:w-28 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </CardHeader>
          <TableSkeleton rows={10} columns={8} />
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full sm:w-auto">
          <h1 className="text-xl sm:text-2xl font-bold">Onboarding Workflow</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Manage candidate onboarding process for {selectedBranch.branch_name} -{" "}
            {selectedInstitution.institution_name}
          </p>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Users2 className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    {selectedIds.size} candidate{selectedIds.size > 1 ? "s" : ""} selected
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  className="border-blue-300 text-blue-700 hover:bg-blue-100 bg-transparent"
                >
                  Clear Selection
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {/* Bulk Progress Actions */}
                {commonNextStages.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="default" size="sm" className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                        <ArrowRight className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Bulk Progress</span>
                        <span className="sm:hidden">Progress</span>
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {commonNextStages.map((stageValue) => {
                        const stage = ONBOARDING_STAGES.find((s) => s.value === stageValue)
                        if (!stage) return null
                        const IconComponent = stage.icon
                        return (
                          <DropdownMenuItem key={stageValue} onClick={() => handleBulkUpdate(stageValue)}>
                            <IconComponent className={`h-4 w-4 mr-2 ${stage.color}`} />
                            Mark as {stage.label}
                          </DropdownMenuItem>
                        )
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Bulk Delete */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="w-full sm:w-auto">
                      <Trash2 className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Delete Selected</span>
                      <span className="sm:hidden">Delete</span>
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="w-[95vw] max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Selected Records</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {selectedIds.size} onboarding record
                        {selectedIds.size > 1 ? "s" : ""}? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                      <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleBulkDelete}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
                      >
                        Delete {selectedIds.size} Record{selectedIds.size > 1 ? "s" : ""}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-20 items-start sm:items-center mt-8">
          <div className="relative flex-1 sm:flex-[0.9]">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search onboarding records by name, email, or position..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm sm:text-base"
            />
          </div>
          <div className="w-full sm:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px] gap-6" >
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {ONBOARDING_STAGES.map((stage) => (
                  <SelectItem key={stage.value} value={stage.value}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
      </div>

      {/* Stats */}
      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 mt-10">
          <Card className="p-3 sm:p-4">
            <CardContent className="p-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
              <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="p-3 sm:p-4">
            <CardContent className="p-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.initial}</div>
              <p className="text-xs sm:text-sm text-muted-foreground">Initial</p>
            </CardContent>
          </Card>
          <Card className="p-3 sm:p-4">
            <CardContent className="p-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.training}</div>
              <p className="text-xs sm:text-sm text-muted-foreground">Training</p>
            </CardContent>
          </Card>
          <Card className="p-3 sm:p-4">
            <CardContent className="p-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.contractIssued}</div>
              <p className="text-xs sm:text-sm text-muted-foreground">Contracts</p>
            </CardContent>
          </Card>
          <Card className="p-3 sm:p-4">
            <CardContent className="p-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.accepted}</div>
              <p className="text-xs sm:text-sm text-muted-foreground">Accepted</p>
            </CardContent>
          </Card>
          <Card className="p-3 sm:p-4">
            <CardContent className="p-0">
              <div className="text-xl sm:text-2xl font-bold">{stats.declined}</div>
              <p className="text-xs sm:text-sm text-muted-foreground">Declined</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Onboarding Table */}
      <div>
        {isLoading ? (
          <div className="p-6">
            <div className="space-y-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                  <Skeleton className="h-6 w-[80px]" />
                  <Skeleton className="h-4 w-[120px]" />
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          </div>
        ) : filteredOnboardings.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No onboarding records found</h3>
            <p className="text-sm sm:text-base text-muted-foreground mb-4">
              {searchTerm || statusFilter !== "all"
                ? `No onboarding records match your current filters.`
                : onboardings.length === 0
                  ? "No candidates have been onboarded yet. Use the candidate interview stages to onboard qualified candidates."
                  : "All records are filtered out by your current search."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-10">
            <Table className="min-w-[800px] [&_th]:border-0 [&_td]:border-0">
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="w-[60px] sm:w-[80px]">
                    <SmartSelectAllDropdown />
                  </TableHead>
                  <TableHead className="min-w-[200px]">Candidate</TableHead>
                  <TableHead className="min-w-[180px]">Position</TableHead>
                  <TableHead className="min-w-[140px]">Current Stage</TableHead>
                  <TableHead className="min-w-[100px]">Attended</TableHead>
                  <TableHead className="min-w-[150px]">Remarks</TableHead>
                  <TableHead className="min-w-[120px]">Created Date</TableHead>
                  <TableHead className="min-w-[150px]">Contact</TableHead>
                  <TableHead className="min-w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOnboardings.map((onboarding) => {
                  const {
                    applicantName,
                    applicantEmail,
                    jobDesc,
                    applicantPhone,
                    applicantAddress,
                    applicantPositions,
                  } = getApplicationData(onboarding)

                  const nextStages = getNextStages(onboarding.status)
                  const isSelected = selectedIds.has(onboarding.id)

                  return (
                    <TableRow
                      key={onboarding.id}
                      className={`cursor-pointer hover:bg-muted/50 ${isSelected ? "bg-blue-50" : ""}`}
                      onClick={() => handleViewOnboarding(onboarding.id)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleSelectOne(onboarding.id)}
                          aria-label={`Select ${applicantName}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">{getInitials(applicantName)}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{applicantName}</div>
                            <div className="text-xs sm:text-sm text-muted-foreground truncate">{applicantEmail}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{jobDesc}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              Positions: {applicantPositions}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(onboarding.status)}
                          <Badge variant={getStatusBadgeVariant(onboarding.status)} className="text-xs">
                            {formatStatus(onboarding.status)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {onboarding.attended ? (
                            <CheckCircle className="h-4 w-4 text-orange-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className="text-sm">{onboarding.attended ? "Yes" : "No"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm max-w-[120px] sm:max-w-[150px] truncate">
                          {onboarding.remarks || "No remarks"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs sm:text-sm">{formatDate(onboarding.created_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground">
                          <div className="flex items-center gap-1 mb-1">
                            <Phone className="h-3 w-3" />
                            <span className="truncate max-w-[100px]">{applicantPhone}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate max-w-[100px]">{applicantAddress}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {/* Progress Actions */}
                          {nextStages.length > 0 && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="outline" size="sm" className="h-8 px-2 text-xs bg-transparent">
                                  <ArrowRight className="h-3 w-3 mr-1" />
                                  <span className="hidden sm:inline">Progress</span>
                                  <span className="sm:hidden">Go</span>
                                  <ChevronDown className="h-3 w-3 ml-1" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {nextStages.map((stageValue) => {
                                  const stage = ONBOARDING_STAGES.find((s) => s.value === stageValue)
                                  if (!stage) return null
                                  const IconComponent = stage.icon
                                  return (
                                    <DropdownMenuItem
                                      key={stageValue}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleUpdateOnboarding(onboarding, stageValue)
                                      }}
                                    >
                                      <IconComponent className={`h-4 w-4 mr-2 ${stage.color}`} />
                                      Mark as {stage.label}
                                    </DropdownMenuItem>
                                  )
                                })}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}

                          {/* More Actions */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleViewOnboarding(onboarding.id)
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleUpdateOnboarding(onboarding, onboarding.status)
                                }}
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Update Feedback
                              </DropdownMenuItem>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <DropdownMenuItem
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-destructive"
                                    onSelect={(e) => e.preventDefault()}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="w-[95vw] max-w-md">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete the onboarding record
                                      for {applicantName}.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                                    <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteOnboarding(onboarding.id)}
                                      disabled={deletingId === onboarding.id}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto"
                                    >
                                      {deletingId === onboarding.id ? "Deleting..." : "Delete"}
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Update Dialog */}
      <Dialog
        open={updateDialog.open}
        onOpenChange={(open) => !updateDialog.isSubmitting && setUpdateDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="w-[95vw] max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Update Onboarding Status</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              {updateDialog.onboarding && (
                <>
                  Update the onboarding status and feedback for{" "}
                  <strong>{getApplicationData(updateDialog.onboarding).applicantName}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm sm:text-base">New Status</Label>
              <Select
                value={updateDialog.newStatus}
                onValueChange={(value) =>
                  setUpdateDialog((prev) => ({ ...prev, newStatus: value as IOnBoarding["status"] }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {ONBOARDING_STAGES.map((stage) => {
                    const IconComponent = stage.icon
                    return (
                      <SelectItem key={stage.value} value={stage.value}>
                        <div className="flex items-center gap-2">
                          <IconComponent className={`h-4 w-4 ${stage.color}`} />
                          {stage.label}
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="attended"
                checked={updateDialog.attended}
                onCheckedChange={(checked) => setUpdateDialog((prev) => ({ ...prev, attended: checked as boolean }))}
              />
              <Label htmlFor="attended" className="text-sm sm:text-base">
                Attended training/session
                {updateDialog.newStatus === "training" && (
                  <span className="text-xs text-muted-foreground ml-1">(recommended for training stage)</span>
                )}
              </Label>
            </div>

            <div>
              <Label htmlFor="remarks" className="text-sm sm:text-base">
                Remarks
              </Label>
              <Textarea
                id="remarks"
                placeholder="Add any relevant feedback or notes..."
                value={updateDialog.remarks}
                onChange={(e) => setUpdateDialog((prev) => ({ ...prev, remarks: e.target.value }))}
                rows={3}
                className="text-sm sm:text-base"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setUpdateDialog((prev) => ({ ...prev, open: false }))}
              disabled={updateDialog.isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={submitOnboardingUpdate}
              disabled={updateDialog.isSubmitting || !updateDialog.newStatus}
              className="w-full sm:w-auto"
            >
              {updateDialog.isSubmitting ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Update Dialog */}
      <Dialog
        open={bulkUpdateDialog.open}
        onOpenChange={(open) => !bulkUpdateDialog.isSubmitting && setBulkUpdateDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="w-[95vw] max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Bulk Update Onboarding Status</DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Move {selectedIds.size} selected candidate{selectedIds.size > 1 ? "s" : ""} to{" "}
              <strong>{ONBOARDING_STAGES.find((s) => s.value === bulkUpdateDialog.newStatus)?.label}</strong> stage and
              update their feedback.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="text-sm sm:text-base">New Status</Label>
              <div className="flex items-center gap-3 p-3 border rounded-md bg-gray-50">
                {(() => {
                  const stage = ONBOARDING_STAGES.find((s) => s.value === bulkUpdateDialog.newStatus)
                  if (!stage) return null
                  const IconComponent = stage.icon
                  return (
                    <>
                      <IconComponent className={`h-5 w-5 ${stage.color}`} />
                      <span className="font-medium text-sm sm:text-base">{stage.label}</span>
                    </>
                  )
                })()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">All selected candidates will be moved to this stage</p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="bulk-attended"
                checked={bulkUpdateDialog.attended}
                onCheckedChange={(checked) =>
                  setBulkUpdateDialog((prev) => ({ ...prev, attended: checked as boolean }))
                }
              />
              <Label htmlFor="bulk-attended" className="text-sm sm:text-base">
                Mark as attended training/session
                {bulkUpdateDialog.newStatus === "training" && (
                  <span className="text-xs text-muted-foreground ml-1">(recommended for training stage)</span>
                )}
              </Label>
            </div>

            <div>
              <Label htmlFor="bulk-remarks" className="text-sm sm:text-base">
                Remarks
              </Label>
              <Textarea
                id="bulk-remarks"
                placeholder="Add any relevant feedback or notes for all selected candidates..."
                value={bulkUpdateDialog.remarks}
                onChange={(e) => setBulkUpdateDialog((prev) => ({ ...prev, remarks: e.target.value }))}
                rows={3}
                className="text-sm sm:text-base"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setBulkUpdateDialog((prev) => ({ ...prev, open: false }))}
              disabled={bulkUpdateDialog.isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={submitBulkUpdate}
              disabled={bulkUpdateDialog.isSubmitting || !bulkUpdateDialog.newStatus}
              className="w-full sm:w-auto"
            >
              {bulkUpdateDialog.isSubmitting
                ? `Moving ${selectedIds.size} candidates...`
                : `Move to ${ONBOARDING_STAGES.find((s) => s.value === bulkUpdateDialog.newStatus)?.label}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
