"use client"

import type React from "react"
import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSelector } from "react-redux"
import { Plus, Trash2, ArrowLeft, CalendarDays, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

import { selectSelectedInstitution, selectSelectedBranch, selectUser } from "@/store/auth/selectors"
import {
  getJobPositionAdverts,
  updateJobPositionAdvert,
  getJobPositions,
  createJobPositionAdvert,
  fetchEmployees,
  createInterviewStage,
} from "@/lib/utils"
import type {
  JobPositionAdvert,
  JobAdvertStatus,
  PaginatedResponse,
  JobPositionAdvertFormData,
  IJobPosition,
  JobAdvertTypes,
  IEmployee,
  IInterviewStage,
  IInterviewStageFormData,
} from "@/app/types/types.utils"
import { toast } from "sonner"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { TableSkeleton } from "@/components/common/table-skeleton"
import { CreateJobPositionDialog } from "@/components/dialogs/create-job-position-dialog"
import { SearchableSelect, type SearchableSelectItem } from "@/components/searchable-select"
import { RichEditorField } from "@/components/common/rich-editor"

// Pagination constants
const PAGE_SIZES = [10, 25, 50, 100]
const DEFAULT_PAGE_SIZE = 10

type Interviewer = {
  id: string
  name: string
  role: string
}

type FeedbackField = {
  id: string
  name: string
  type: string
}

type Stage = {
  id: string
  name: string
  interviewers: Interviewer[]
  feedbackFields: FeedbackField[]
}

const getStatusColor = (status: JobAdvertStatus) => {
  switch (status) {
    case "active":
      return "bg-green-100 text-green-800 border-green-200"
    case "archived":
      return "bg-gray-100 text-gray-800 border-gray-200"
    case "expired":
      return "bg-red-100 text-red-800 border-red-200"
    case "closed":
      return "bg-blue-100 text-blue-800 border-blue-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

const getStatusVariant = (status: JobAdvertStatus) => {
  switch (status) {
    case "active":
      return "success"
    case "archived":
      return "secondary"
    case "expired":
      return "destructive"
    case "closed":
      return "outline"
    default:
      return "secondary"
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const isExpired = (expiryDate: string) => {
  return new Date(expiryDate) < new Date()
}

export default function JobAdvertsPage() {
  const [step, setStep] = useState(1) // 1 for General Info, 2 for Interview Stages

  const [formData, setFormData] = useState<JobPositionAdvertFormData>({
    job_position: 0,
    expiry_date: "",
    number_of_employees_expected: 1,
    extra_information: "",
    advert_type: "external" as JobAdvertTypes,
    level: 0,
    interviewers: [],
  })

  // Separate form data for interview stages
  const [stageFormData, setStageFormData] = useState<IInterviewStageFormData>({
    name: "",
    level: 1,
    interviewers: [],
    job_position_advert: 0,
  })

  const [jobPositions, setJobPositions] = useState<IJobPosition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof JobPositionAdvertFormData, string>>>({})

  const [stages, setStages] = useState<Stage[]>([])
  const [interviewStages, setInterviewStages] = useState<IInterviewStage[]>([])

  const [newStageName, setNewStageName] = useState("")
  const [selectedInterviewers, setSelectedInterviewers] = useState<Interviewer[]>([])
  const [newFeedbackFieldName, setNewFeedbackFieldName] = useState("")
  const [newFeedbackFieldType, setNewFeedbackFieldType] = useState("Number")
  const [employees, setEmployees] = useState<IEmployee[]>([])
  const [isCreatingStage, setIsCreatingStage] = useState(false)

  const [stageErrors, setStageErrors] = useState<Partial<Record<keyof IInterviewStageFormData, string>>>({})
  const [isCreateStageDialogOpen, setIsCreateStageDialogOpen] = useState(false)

  const userData = useSelector(selectUser)
  const router = useRouter()
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const selectedBranch = useSelector(selectSelectedBranch)

  useDocumentTitle("JOB OPENINGS")

  useEffect(() => {
    if (!selectedInstitution || !selectedBranch) {
      router.push("/dashboard")
      return
    }
    fetchJobPositions()
  }, [selectedInstitution, selectedBranch, router])

  const fetchJobPositions = async () => {
    if (!selectedInstitution) return

    try {
      setIsLoading(true)
      const [fetchedJobPositions, fetchedEmployees] = await Promise.all([
        getJobPositions({ institutionId: selectedInstitution.id }),
        fetchEmployees({ institutionId: selectedInstitution.id }),
      ])

      if (fetchedJobPositions) {
        setJobPositions(fetchedJobPositions)
      } else {
        toast.error("Failed to load job positions")
      }

      // Handle employees data
      let employeesArray: IEmployee[] = []
      if (fetchedEmployees && "results" in fetchedEmployees && Array.isArray(fetchedEmployees.results)) {
        employeesArray = fetchedEmployees.results
      } else if (Array.isArray(fetchedEmployees)) {
        employeesArray = fetchedEmployees
      }
      setEmployees(employeesArray)

      // Don't load existing interview stages since this is for creating a new job opening
      // Interview stages will be created fresh
    } catch (error) {
      toast.error("Failed to load job positions and employees")
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormData = (
    field: keyof Exclude<JobPositionAdvertFormData, "job_position_advert_status">,
    value: any,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof JobPositionAdvertFormData, string>> = {}

    if (!formData.job_position || formData.job_position === 0) {
      newErrors.job_position = "Please select a job position"
    }

    if (!formData.expiry_date) {
      newErrors.expiry_date = "Expiry date is required"
    } else {
      const expiryDate = new Date(formData.expiry_date)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (expiryDate <= today) {
        newErrors.expiry_date = "Expiry date must be in the future"
      }
    }

    if (formData.number_of_employees_expected && formData.number_of_employees_expected < 1) {
      newErrors.number_of_employees_expected = "Number of employees must be at least 1"
    }

    if (!formData.advert_type) {
      newErrors.advert_type = "Please select an opening type"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedInstitution || !selectedBranch) {
      toast.error("Missing organization or branch information")
      return
    }

    if (!validateForm()) {
      toast.error("Please fix the form errors before submitting")
      return
    }

    // If there are stages, we need to create them via "Add Stage" button
    if (stages.length > 0) {
      toast.error("Please use the 'Add Stage' button to create stages with the job opening")
      return
    }

    setIsSubmitting(true)

    try {
      const createData: JobPositionAdvertFormData = {
        job_position: formData.job_position,
        job_position_advert_status: formData.job_position_advert_status,
        expiry_date: formData.expiry_date,
        number_of_employees_expected: formData.number_of_employees_expected || undefined,
        extra_information: formData.extra_information || undefined,
        advert_type: formData.advert_type,
        level: formData.level,
        interviewers: formData.interviewers,
      }
      await createJobPositionAdvert({
        institutionId: selectedInstitution.id,
        advertData: createData,
      })

      toast.success("Job opening created successfully!")
      router.push("/job-adverts")
    } catch (error: any) {
      const errorMessage = error?.detail || error?.message || "Failed to create job opening. Please try again."
      toast.error(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleBack = () => {
    router.back()
  }

  const handleJobPositionCreated = (newJobPosition: IJobPosition) => {
    setJobPositions((prev) => [...prev, newJobPosition])
    updateFormData("job_position", newJobPosition.id)
  }

  const handleAddStage = async () => {
    if (newStageName.trim() === "") {
      toast.error("Please enter a stage name")
      return
    }
    if (selectedInterviewers.length === 0) {
      toast.error("Please select at least one interviewer")
      return
    }
    if (!selectedInstitution) {
      toast.error("Missing organization information")
      return
    }

    // We need the job position advert ID to create the stage
    // Since we're creating a new job opening, we need to create it first
    if (!formData.job_position || formData.job_position === 0) {
      toast.error("Please select a job position first before adding stages")
      return
    }

    setIsCreatingStage(true)

    try {
      // First, let's create the job opening to get the advert ID
      const createData: JobPositionAdvertFormData = {
        job_position: formData.job_position,
        job_position_advert_status: formData.job_position_advert_status,
        expiry_date: formData.expiry_date,
        number_of_employees_expected: formData.number_of_employees_expected || undefined,
        extra_information: formData.extra_information || undefined,
        advert_type: formData.advert_type,
        level: formData.level,
        interviewers: formData.interviewers,
      }

      const createdJobOpening = await createJobPositionAdvert({
        institutionId: selectedInstitution.id,
        advertData: createData,
      })

      let jobOpeningId
      if (createdJobOpening && typeof createdJobOpening === "object") {
        jobOpeningId = createdJobOpening.id || createdJobOpening.data?.id || createdJobOpening.job_position_details?.id
      }

      if (!jobOpeningId) {
        throw new Error("Failed to get job opening ID")
      }

      // Now create the stage with the actual job opening ID
      const stageData: IInterviewStageFormData = {
        name: newStageName,
        level: stages.length + 1,
        interviewers: selectedInterviewers.map((interviewer) => Number(interviewer.id)),
        job_position_advert: Number(jobOpeningId),
      }

      const newStage = await createInterviewStage({
        institutionId: selectedInstitution.id,
        stageData: stageData,
      })

      if (newStage) {
        // Add to local stages for display
        const localStage: Stage = {
          id: newStage.id.toString(),
          name: newStage.name,
          interviewers: selectedInterviewers,
          feedbackFields: [],
        }

        setStages([...stages, localStage])
        setNewStageName("")
        setSelectedInterviewers([])

        toast.success("Job opening and interview stage created successfully!")

        // Redirect to job adverts since job opening is now created
        setTimeout(() => {
          router.push("/job-adverts")
        }, 2000)
      } else {
        toast.error("Job opening created but failed to create interview stage")
        setTimeout(() => {
          router.push("/job-adverts")
        }, 2000)
      }
    } catch (error: any) {
      const errorMessage = error?.detail || error?.message || "Failed to create job opening and stage"
      toast.error(errorMessage)
    } finally {
      setIsCreatingStage(false)
    }
  }

  const handleDeleteStage = (id: string) => {
    setStages(stages.filter((stage) => stage.id !== id))
    toast.success("Interview stage deleted")
  }

  const handleAddFeedbackField = (stageId: string) => {
    if (newFeedbackFieldName.trim() === "") return
    setStages(
      stages.map((stage) =>
        stage.id === stageId
          ? {
              ...stage,
              feedbackFields: [
                ...stage.feedbackFields,
                { id: `${newFeedbackFieldName}-${Date.now()}`, name: newFeedbackFieldName, type: newFeedbackFieldType },
              ],
            }
          : stage,
      ),
    )
    setNewFeedbackFieldName("")
    setNewFeedbackFieldType("Number")
  }

  const handleDeleteFeedbackField = (stageId: string, fieldId: string) => {
    setStages(
      stages.map((stage) =>
        stage.id === stageId
          ? { ...stage, feedbackFields: stage.feedbackFields.filter((field) => field.id !== fieldId) }
          : stage,
      ),
    )
  }

  const handleSelectInterviewer = (interviewerId: string) => {
    const employee = employees.find((emp) => emp.id.toString() === interviewerId)
    if (employee && !selectedInterviewers.some((i) => i.id === interviewerId)) {
      const interviewer: Interviewer = {
        id: interviewerId,
        name: employee.user?.fullname || `Employee ${employee.id}`,
        role: employee.user?.user_type || "Staff",
      }
      setSelectedInterviewers([...selectedInterviewers, interviewer])
    }
  }

  const handleRemoveSelectedInterviewer = (interviewerId: string) => {
    setSelectedInterviewers(selectedInterviewers.filter((i) => i.id !== interviewerId))
  }

  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!selectedInstitution) {
      toast.error("Missing organization information")
      return
    }

    const newStageErrors: Partial<Record<keyof IInterviewStageFormData, string>> = {}
    if (!stageFormData.name.trim()) {
      newStageErrors.name = "Stage name is required"
    }
    if (!stageFormData.interviewers || stageFormData.interviewers.length === 0) {
      newStageErrors.interviewers = "Please select at least one interviewer"
    }

    if (stageFormData.level < 1) {
      newStageErrors.level = "Level must be at least 1"
    }

    if (Object.keys(newStageErrors).length > 0) {
      setStageErrors(newStageErrors)
      return
    }

    setIsCreatingStage(true)

    try {
      const newStage = await createInterviewStage({
        institutionId: selectedInstitution.id,
        stageData: stageFormData,
      })

      if (newStage) {
        setInterviewStages((prev) => [...prev, newStage])
        const localStage: Stage = {
          id: newStage.id.toString(),
          name: newStage.name,
          interviewers: stageFormData.interviewers.map((empId) => {
            const emp = employees.find((e) => e.id === empId)
            return {
              id: empId.toString(),
              name: emp?.user?.fullname || `Employee ${empId}`,
              role: emp?.user?.user_type || "Staff",
            }
          }),
          feedbackFields: [],
        }

        setStages((prev) => [...prev, localStage])
        setStageFormData({
          name: "",
          level: stageFormData.level + 1,
          interviewers: [],
          job_position_advert: 0,
        })
        setStageErrors({})
        setIsCreateStageDialogOpen(false)
        toast.success("Interview stage created successfully!")
      } else {
        toast.error("Failed to create interview stage")
      }
    } catch (error) {
      toast.error("Failed to create interview stage")
    } finally {
      setIsCreatingStage(false)
    }
  }

  const updateStageFormData = (field: keyof IInterviewStageFormData, value: any) => {
    setStageFormData((prev) => ({ ...prev, [field]: value }))
    if (stageErrors[field]) {
      setStageErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  useEffect(() => {
    if (!formData.expiry_date) {
      const defaultExpiryDate = new Date()
      defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 30)
      setFormData((prev) => ({
        ...prev,
        expiry_date: defaultExpiryDate.toISOString().split("T")[0],
      }))
    }
  }, [formData.expiry_date])

  const jobPositionItems: SearchableSelectItem[] = jobPositions.map((position) => ({
    id: position.id,
    label: `${position.name} - ${position.department_details?.name}`,
    value: `${position.name} ${position.department_details?.name}`.toLowerCase(),
  }))

  const advertTypeItems: SearchableSelectItem[] = [
    { id: "external", label: "External", value: "external" },
    { id: "internal", label: "Internal", value: "internal" },
    { id: "both", label: "Both Internal and External", value: "both internal external" },
  ]

  const fetchJobAdverts = useCallback(
    async (showRefreshLoader = false, page = 1, size = DEFAULT_PAGE_SIZE) => {
      if (!selectedInstitution) return

      try {
        if (showRefreshLoader) {
          setIsRefreshing(true)
        } else {
          setIsLoading(true)
        }
        setError("")

        const response: PaginatedResponse<JobPositionAdvert> = await getJobPositionAdverts({
          institutionId: selectedInstitution.id,
        })

        let advertsArray: JobPositionAdvert[] = []
        let pagination: { count: number; next: string | null; previous: string | null } = {
          count: 0,
          next: null,
          previous: null,
        }

        if (response && "results" in response && Array.isArray(response.results)) {
          advertsArray = response.results
          pagination = {
            count: response.count || 0,
            next: response.next || null,
            previous: response.previous || null,
          }
        } else if (response === null) {
          advertsArray = []
        }

        setJobAdverts(advertsArray)
        setPaginationInfo(pagination)
      } catch (err) {
        setJobAdverts([])
        setError(`Failed to fetch job openings: ${err instanceof Error ? err.message : "Unknown error"}`)
        toast.error("Failed to load job openings")
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [selectedInstitution],
  )

  const [jobAdverts, setJobAdverts] = useState<JobPositionAdvert[]>([])
  const [paginationInfo, setPaginationInfo] = useState<{
    count: number
    next: string | null
    previous: string | null
  }>({ count: 0, next: null, previous: null })
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [dateRange, setDateRange] = useState<{ from: string | null; to: string | null }>({ from: null, to: null })
  const [error, setError] = useState("")
  const [isClosing, setIsClosing] = useState(false)
  const [closingAdvertId, setClosingAdvertId] = useState<number | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  useEffect(() => {
    if (!selectedInstitution || !selectedBranch) {
      router.push("/dashboard")
      return
    }
    fetchJobAdverts(false, currentPage, pageSize)
  }, [selectedInstitution, selectedBranch, currentPage, pageSize])

  const handleRefresh = useCallback(() => {
    fetchJobAdverts(true, 1, pageSize)
    setCurrentPage(1)
  }, [fetchJobAdverts, pageSize])

  const filteredJobAdverts = useMemo(() => {
    if (!Array.isArray(jobAdverts)) {
      return []
    }

    return jobAdverts.filter((advert) => {
      const matchesSearch = !searchTerm.trim()
        ? true
        : advert.job_position_details?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          advert.extra_information?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === "all" || advert.job_position_advert_status === statusFilter

      const matchesDateRange =
        !dateRange.from && !dateRange.to
          ? true
          : (() => {
              const publishedDate = new Date(advert.published_date).getTime()
              const fromDate = dateRange.from ? new Date(dateRange.from).getTime() : Number.NEGATIVE_INFINITY
              const toDate = dateRange.to ? new Date(dateRange.to).getTime() : Number.POSITIVE_INFINITY
              return publishedDate >= fromDate && publishedDate <= toDate
            })()

      return matchesSearch && matchesStatus && matchesDateRange
    })
  }, [jobAdverts, searchTerm, statusFilter, dateRange])

  const publishedAdverts = useMemo(
    () =>
      Array.isArray(jobAdverts) ? jobAdverts.filter((advert) => advert.job_position_advert_status === "active") : [],
    [jobAdverts],
  )

  const draftAdverts = useMemo(
    () =>
      Array.isArray(jobAdverts) ? jobAdverts.filter((advert) => advert.job_position_advert_status === "archived") : [],
    [jobAdverts],
  )

  const expiredAdverts = useMemo(
    () =>
      Array.isArray(jobAdverts)
        ? jobAdverts.filter(
            (advert) => advert.job_position_advert_status === "expired" || isExpired(advert.expiry_date),
          )
        : [],
    [jobAdverts],
  )

  const handleCreateJobAdvert = useCallback(() => {
    router.push("/job-adverts/create")
  }, [router])

  const handleEditJobAdvert = useCallback(
    (advertId: number) => {
      router.push(`/job-adverts/${advertId}/edit`)
    },
    [router],
  )

  const handleArchiveJobAdvert = useCallback((advertId: number) => {
    toast.success("Job advert archiving would be implemented here")
  }, [])

  const handleCloseJobAdvert = useCallback(
    async (advertId: number) => {
      if (!advertId) return

      try {
        setIsClosing(true)
        const updatedAdvert = await updateJobPositionAdvert({
          advertId: advertId,
          advertData: { job_position_advert_status: "closed" },
        })

        if (updatedAdvert) {
          toast.success("Job advert closed successfully!")
          fetchJobAdverts(true, currentPage, pageSize)
        } else {
          toast.error("Failed to close job openings")
        }
      } catch (error) {
        toast.error("Failed to close job openings")
      } finally {
        setIsClosing(false)
        setClosingAdvertId(null) // Reset the closing advert ID
      }
    },
    [fetchJobAdverts, currentPage, pageSize],
  )

  const handleViewJobAdvert = useCallback(
    (advertId: number) => {
      router.push(`/job-adverts/${advertId}`)
    },
    [router],
  )

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handlePageSizeChange = (newPageSize: string) => {
    setPageSize(Number.parseInt(newPageSize))
    setCurrentPage(1)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setStatusFilter("all")
    setDateRange({ from: null, to: null })
    setCurrentPage(1)
  }

  const totalPages = Math.ceil(paginationInfo.count / pageSize)

  if (!selectedInstitution || !selectedBranch) {
    return <div>Loading...</div>
  }

  if (isLoading) {
    return (
      <div className="p-2 space-y-6">
        <Card className="h-[calc(100vh-2rem)] shadow-lg">
          <CardHeader className="border-b">
            <div className="flex justify-between gap-8 items-center">
              <div className="flex items-center justify-start gap-4">
                <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-6 bg-gray-200 rounded w-64 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-10 w-36 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-10 w-28 bg-gray-200 rounded animate-pulse"></div>
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
      <div className="">
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="rounded-full h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
          </Button>
          <h1 className="text-3xl font-semibold text-gray-800">
            Create New Job Opening
          </h1>
        </div>

        {/* Progress Indicator */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4 sm:gap-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className={`flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full font-bold text-xs sm:text-sm ${
                step === 1 ? "border-2 border-[#FF4D4D] text-[#FF4D4D]" : "bg-green-100 text-green-700"
              }`}
            >
              {step === 1 ? "1" : "✓"}
            </div>
            <span className="font-medium text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-gray-800">
              General Job Information
            </span>
          </div>
          <div className="flex-1 h-px bg-gray-300 mx-2 sm:mx-4 hidden sm:block" />
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className={`flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full font-bold text-xs sm:text-sm ${
                step === 2 ? "border-2 border-[#FF4D4D] text-[#FF4D4D]" : "bg-gray-200 text-gray-500"
              }`}
            >
              2
            </div>
            <span className="font-medium text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-gray-800">
              Interview Stages Setup
            </span>
          </div>
        </div>

        {/* Step 1: General Job Information */}
        {step === 1 && (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Job Position */}
              <div>
                <label
                  htmlFor="job_position"
                  className="block text-xs sm:text-sm md:text-base font-normal text-gray-800 mb-2"
                >
                  Job Position / Title *
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex-grow min-w-0">
                    <SearchableSelect
                      items={jobPositionItems}
                      selectedItems={formData.job_position ? [formData.job_position] : []}
                      placeholder="Select Job Position / Title"
                      searchPlaceholder="Search job positions..."
                      emptyMessage="No job positions found."
                      onSelect={(itemId) => updateFormData("job_position", Number(itemId))}
                      multiple={false}
                      triggerClassName={`w-full bg-white border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-xs sm:text-sm ${
                        errors.advert_type ? "border-destructive" : ""
                      }`}
                      popoverClassName="w-[280px] sm:w-[320px] md:w-[380px] lg:w-[420px]"
                    />
                  </div>
                  <CreateJobPositionDialog
                    trigger={
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="border border-gray-300 text-gray-700 bg-transparent h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10"
                      >
                        <Plus className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                      </Button>
                    }
                    onJobPositionCreated={handleJobPositionCreated}
                  />
                </div>
                {errors.job_position && (
                  <p className="text-xs sm:text-sm text-destructive mt-1">{errors.job_position}</p>
                )}
              </div>

              {/* Opening Type */}
              <div>
                <label
                  htmlFor="advert_type"
                  className="block text-xs sm:text-sm md:text-base font-normal text-gray-800 mb-2"
                >
                  Opening Type *
                </label>
                <SearchableSelect
                  items={advertTypeItems}
                  selectedItems={formData.advert_type ? [formData.advert_type] : []}
                  placeholder="Select Opening Type"
                  searchPlaceholder="Search opening types..."
                  emptyMessage="No opening types found."
                  onSelect={(itemId) => updateFormData("advert_type", itemId as JobAdvertTypes)}
                  multiple={false}
                  triggerClassName={`w-full bg-white border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-xs sm:text-sm ${
                    errors.advert_type ? "border-destructive" : ""
                  }`}
                  popoverClassName="w-[280px] sm:w-[320px] md:w-[380px] lg:w-[420px]"
                />
                {errors.advert_type && <p className="text-xs sm:text-sm text-destructive mt-1">{errors.advert_type}</p>}
              </div>

              {/* Number of Employees Required */}
              <div>
                <label
                  htmlFor="number_of_employees_expected"
                  className="block text-xs sm:text-sm md:text-base font-normal text-gray-800 mb-2"
                >
                  Number of Employees Required
                </label>
                <Input
                  id="number_of_employees_expected"
                  placeholder="Required Number"
                  type="number"
                  min="1"
                  max="1000"
                  value={formData.number_of_employees_expected || ""}
                  onChange={(e) => updateFormData("number_of_employees_expected", Number(e.target.value) || undefined)}
                  className={`
                    
                    ${errors.number_of_employees_expected ? "border-destructive" : ""}
                  `}
                />
                {errors.number_of_employees_expected && (
                  <p className="text-xs sm:text-sm text-destructive mt-1">{errors.number_of_employees_expected}</p>
                )}
              </div>

              {/* Expiry Date */}
              <div>
                <label
                  htmlFor="expiry_date"
                  className="block text-xs sm:text-sm md:text-base font-medium text-gray-800 mb-2"
                >
                  Expiry Date *
                </label>
                <div className="relative">
                  <Input
                    id="expiry_date"
                    placeholder="--/--/----"
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={formData.expiry_date}
                    onChange={(e) => updateFormData("expiry_date", e.target.value)}
                    className={`w-full pr-8 sm:pr-10 bg-white border-gray-300 text-xs sm:text-sm ${errors.expiry_date ? "border-destructive" : ""}`}
                  />
                  <CalendarDays className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-500 pointer-events-none" />
                </div>
                {errors.expiry_date && <p className="text-xs sm:text-sm text-destructive mt-1">{errors.expiry_date}</p>}
              </div>
            </div>

            {/* Job Description */}
            <div>
              <label
                htmlFor="extra_information"
                className="block text-xs sm:text-sm md:text-base font-medium text-gray-800 mb-2"
              >
                Job Description
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Provide a concise summary of the role, including key duties and responsibilities.
              </p>
              <RichEditorField
                id="extra_information"
                placeholder="Add job description..."
                value={formData.extra_information || ""}
                onChange={(value) => updateFormData("extra_information", value)}
              />
            </div>

            {/* Next Button */}
            <div className="mt-8 flex justify-start">
              <Button
                className="flex items-center gap-2 px-6 lg:px-8 "
                onClick={() => setStep(2)}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Interview Stages Setup */}
        {step === 2 && (
          <div className="space-y-6 sm:space-y-8">
            <Card className="border-none shadow-none">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="text-base sm:text-lg md:text-xl font-semibold text-gray-800">
                  Interview Stage Name
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                  <Input
                    placeholder="Enter stage name"
                    value={newStageName}
                    onChange={(e) => setNewStageName(e.target.value)}
                    className="bg-white border-gray-300 text-xs sm:text-sm"
                  />
                  <div className="flex flex-col gap-2">
                    <SearchableSelect
                      items={employees.map((employee) => ({
                        id: employee.id.toString(),
                        label: `${employee.user?.fullname || `Employee ${employee.id}`} (${employee.user?.user_type || "Staff"})`,
                        value:
                          `${employee.user?.fullname || `Employee ${employee.id}`} ${employee.user?.user_type || "Staff"}`.toLowerCase(),
                      }))}
                      selectedItems={selectedInterviewers.map((interviewer) => interviewer.id)}
                      placeholder="Select Interviewers"
                      searchPlaceholder="Search employees..."
                      emptyMessage="No employees found."
                      onSelect={(itemId) => handleSelectInterviewer(String(itemId))}
                      multiple={false}
                      triggerClassName="w-full bg-white border-gray-300 text-xs sm:text-sm"
                      popoverClassName="w-[280px] sm:w-[320px] md:w-[380px] lg:w-[420px]"
                    />
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {selectedInterviewers.map((interviewer) => (
                        <Badge
                          key={interviewer.id}
                          className="bg-gray-200 text-gray-700 flex items-center gap-1 text-xs"
                        >
                          <span className="truncate max-w-[120px] sm:max-w-[150px]">{interviewer.name}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-3 w-3 sm:h-4 sm:w-4 p-0 text-gray-500 hover:text-gray-800"
                            onClick={() => handleRemoveSelectedInterviewer(interviewer.id)}
                          >
                            <X className="h-2 w-2 sm:h-3 sm:w-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs sm:text-sm md:text-base font-medium text-gray-800">
                    Feedback Fields (Optional)
                  </p>
                  <p className="text-xs text-gray-500">
                    Add feedback fields specific to this stage. Final comments and overall ratings are already required
                    and will be included automatically.
                  </p>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    <Badge className="bg-gray-200 text-gray-700 flex items-center gap-1 text-xs">
                      Smartness (Number)
                    </Badge>
                    <Badge className="bg-gray-200 text-gray-700 flex items-center gap-1 text-xs">
                      Time Management (Dropdown)
                    </Badge>
                    <Badge className="bg-gray-200 text-gray-700 flex items-center gap-1 text-xs">
                      Candidate's Attitude (Dropdown)
                    </Badge>
                    <Button
                      variant="outline"
                      className="flex items-center gap-1 text-gray-700 border-gray-300 bg-transparent text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-auto"
                    >
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4" /> Add Field
                    </Button>
                  </div>
                </div>
                <Button
                  className="flex items-center gap-2 px-4 sm:px-6 py-2 text-xs sm:text-sm md:text-base"
                  onClick={handleAddStage}
                  disabled={isCreatingStage}
                >
                  {isCreatingStage ? (
                    <>
                      <div className="h-3 w-3 sm:h-4 sm:w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4" /> Add Stage
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800">Stages</h2>
            {stages.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-100 flex items-center justify-center">
                    <Plus className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
                  </div>
                  <p className="text-xs sm:text-sm">No interview stages created yet</p>
                  <p className="text-xs">Use the "Add Stage" button above to create your first interview stage</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 sm:space-y-6">
                {stages.map((stage, index) => (
                  <Card key={stage.id} className="border-gray-200 shadow-sm">
                    <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 gap-2 sm:gap-0">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-purple-100 text-purple-700 font-bold text-xs sm:text-sm">
                          {index + 1}
                        </div>
                        <CardTitle className="text-base sm:text-lg md:text-xl font-semibold text-gray-800">
                          {stage.name}
                        </CardTitle>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-auto"
                        onClick={() => handleDeleteStage(stage.id)}
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        Delete
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4">
                      <div>
                        <p className="text-xs sm:text-sm md:text-base font-medium text-gray-800 mb-2">Interviewers</p>
                        <div className="flex flex-wrap gap-1 sm:gap-2">
                          {stage.interviewers.length > 0 ? (
                            stage.interviewers.map((interviewer) => (
                              <Badge key={interviewer.id} className="bg-gray-200 text-gray-700 text-xs">
                                <span className="truncate max-w-[120px] sm:max-w-[150px]">
                                  {interviewer.name} ({interviewer.role})
                                </span>
                              </Badge>
                            ))
                          ) : (
                            <p className="text-xs sm:text-sm text-muted-foreground">No interviewers assigned</p>
                          )}
                        </div>
                      </div>
                      {stage.feedbackFields.length > 0 && (
                        <div>
                          <p className="text-xs sm:text-sm md:text-base font-medium text-gray-800 mb-2">
                            Feedback Fields
                          </p>
                          <div className="flex flex-wrap gap-1 sm:gap-2">
                            {stage.feedbackFields.map((field) => (
                              <Badge
                                key={field.id}
                                className="bg-gray-200 text-gray-700 flex items-center gap-1 text-xs"
                              >
                                {field.name} ({field.type})
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-3 w-3 sm:h-4 sm:w-4 p-0 text-gray-500 hover:text-gray-800"
                                  onClick={() => handleDeleteFeedbackField(stage.id, field.id)}
                                >
                                  <X className="h-2 w-2 sm:h-3 sm:w-3" />
                                </Button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Previous and Submit Buttons */}
            <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-start gap-2 sm:gap-4">
              <Button
                className="flex items-center gap-2 px-4 sm:px-6 py-2 text-xs sm:text-sm md:text-base"
                onClick={() => setStep(1)}
              >
                Previous
              </Button>
              <Button
                className="flex items-center gap-2 px-4 sm:px-6 py-2 text-xs sm:text-sm md:text-base"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="h-3 w-3 sm:h-4 sm:w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Job Opening"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
