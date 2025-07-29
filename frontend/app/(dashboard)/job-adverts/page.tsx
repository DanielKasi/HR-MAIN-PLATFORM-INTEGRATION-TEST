"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useSelector } from "react-redux"
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  RefreshCw,
  Eye,
  Calendar,
  Users,
  Briefcase,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"

import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import { getJobPositionAdverts, updateJobPositionAdvert } from "@/lib/utils"
import type { JobPositionAdvert, JobAdvertStatus, PaginatedResponse } from "@/app/types/types.utils"
import { toast } from "sonner"
import ProtectedComponent from "@/components/ProtectedComponent"
import { PERMISSION_CODES } from "@/app/types/types.utils"


type ApiResponse = PaginatedResponse<JobPositionAdvert> | null

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
  const [jobAdverts, setJobAdverts] = useState<JobPositionAdvert[]>([])
  const [paginationInfo, setPaginationInfo] = useState<{
    count: number
    next: string | null
    previous: string | null
  }>({ count: 0, next: null, previous: null })
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState("")
  const [isClosing, setIsClosing] = useState(false)

  const router = useRouter()
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const selectedBranch = useSelector(selectSelectedBranch)

  const fetchJobAdverts = useCallback(async (showRefreshLoader = false) => {
    if (!selectedInstitution) return

    try {
      if (showRefreshLoader) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError("")

      const response: ApiResponse = await getJobPositionAdverts({ institutionId: selectedInstitution.id })

      // Handle paginated response structure
      let advertsArray: JobPositionAdvert[] = []
      let pagination: {
        count: number
        next: string | null
        previous: string | null
      } = { count: 0, next: null, previous: null }

      if (response && 'results' in response && Array.isArray(response.results)) {
        // Paginated response structure (which is what your API returns)
        advertsArray = response.results
        pagination = {
          count: response.count || 0,
          next: response.next || null,
          previous: response.previous || null
        }
      } else if (response === null) {
        // Handle null response from helper function
        advertsArray = []
      }

      setJobAdverts(advertsArray)
      setPaginationInfo(pagination)

    } catch (err) {

      setJobAdverts([])
      setError(`Failed to fetch job adverts: ${err instanceof Error ? err.message : 'Unknown error'}`)
      toast.error("Failed to load job adverts")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [selectedInstitution?.id])

  useEffect(() => {
    if (!selectedInstitution || !selectedBranch) {
      router.push("/dashboard")
      return
    }
    fetchJobAdverts()
  }, [selectedInstitution?.id, selectedBranch?.id, fetchJobAdverts])

  const handleRefresh = useCallback(() => {
    fetchJobAdverts(true)
  }, [fetchJobAdverts])

  const filteredJobAdverts = useMemo(() => {
    // Additional safety check to ensure jobAdverts is an array
    if (!Array.isArray(jobAdverts)) {
      return []
    }

    return jobAdverts.filter((advert) => {
      if (!searchTerm.trim()) return true

      return (
        advert.extra_information?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        advert.job_position_details?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })
  }, [jobAdverts, searchTerm])

  const publishedAdverts = useMemo(() =>
    Array.isArray(jobAdverts) ? jobAdverts.filter((advert) => advert.job_position_advert_status === "active") : [],
    [jobAdverts]
  )

  const draftAdverts = useMemo(() =>
    Array.isArray(jobAdverts) ? jobAdverts.filter((advert) => advert.job_position_advert_status === "archived") : [],
    [jobAdverts]
  )

  const expiredAdverts = useMemo(() =>
    Array.isArray(jobAdverts) ? jobAdverts.filter((advert) => advert.job_position_advert_status === "expired" || isExpired(advert.expiry_date)) : [],
    [jobAdverts]
  )

  const handleCreateJobAdvert = useCallback(() => {
    router.push("/job-adverts/create")
  }, [router])

  const handleEditJobAdvert = useCallback((advertId: number) => {
    router.push(`/job-adverts/${advertId}/edit`)
  }, [router])

  const handleArchiveJobAdvert = useCallback((advertId: number) => {
    toast.success("Job advert archiving would be implemented here")
  }, [])

  const handleCloseJobAdvert = useCallback(async (advertId: number) => {
    if (!advertId) return

    try {
      setIsClosing(true)

      const updatedAdvert = await updateJobPositionAdvert({
        advertId: advertId,
        advertData: { job_position_advert_status: "closed" },
      })

      if (updatedAdvert) {
        toast.success("Job advert closed successfully!")
        fetchJobAdverts(true)
      } else {
        toast.error("Failed to close job advert")
      }
    } catch (error) {
      toast.error("Failed to close job advert")
    } finally {
      setIsClosing(false)
    }
  }, [fetchJobAdverts])

  const handleViewJobAdvert = useCallback((advertId: number) => {
    router.push(`/job-adverts/${advertId}`)
  }, [router])

  if (!selectedInstitution || !selectedBranch) {
    return <div>Loading...</div>
  }

  return (
    <div className="w-full h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Job Openings</h1>
          <p className="text-muted-foreground">
            Manage job advertisements for {selectedBranch.branch_name} - {selectedInstitution.institution_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={handleCreateJobAdvert} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Job Opening
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search job adverts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Stats */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{paginationInfo.count}</div>
              <p className="text-xs text-muted-foreground">Total Adverts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{publishedAdverts.length}</div>
              <p className="text-xs text-muted-foreground">Published</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-600">{draftAdverts.length}</div>
              <p className="text-xs text-muted-foreground">Drafts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{expiredAdverts.length}</div>
              <p className="text-xs text-muted-foreground">Expired</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="text-sm font-medium text-destructive bg-destructive/10 p-4 rounded-md border border-destructive/20">
          <div className="font-semibold mb-2">Error Loading Job Openings</div>
          <div className="text-sm">{error}</div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="mt-3"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Try Again
          </Button>
        </div>
      )}

      {/* Job Adverts Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredJobAdverts.length === 0 ? (
        <Card className="p-12 text-center">
          <Megaphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No job adverts found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm
              ? "No job adverts match your search criteria."
              : "Get started by creating your first job advertisement."}
          </p>
          {!searchTerm && (
            <Button onClick={handleCreateJobAdvert} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create First Job Openings
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredJobAdverts.map((advert) => (
            <Card key={advert.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Megaphone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Job Opening</CardTitle>
                      <Badge className={`text-xs ${getStatusColor(advert.job_position_advert_status)}`}>
                        {advert.job_position_advert_status.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_JOB_ADVERTS}>
                          <DropdownMenuItem onClick={() => handleViewJobAdvert(advert.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                        </ProtectedComponent>
                        <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_JOB_ADVERTS}>
                          <DropdownMenuItem onClick={() => handleEditJobAdvert(advert.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        </ProtectedComponent>
                        <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_DELETE_JOB_ADVERTS}>
                          <DropdownMenuItem
                            onClick={() => handleCloseJobAdvert(advert.id)}
                            className="text-destructive"
                            disabled={isClosing}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Close
                          </DropdownMenuItem>
                        </ProtectedComponent>
                      </DropdownMenuContent>
                    </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3" onClick={() => handleViewJobAdvert(advert.id)}>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Briefcase className="h-3 w-3" />
                      Position:
                    </span>
                    <span className="font-medium">{advert.job_position_details?.name || 'N/A'}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Expires:
                    </span>
                    <span className={`font-medium ${isExpired(advert.expiry_date) ? "text-red-600" : ""}`}>
                      {formatDate(advert.expiry_date)}
                    </span>
                  </div>

                  {advert.number_of_employees_expected && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Expected:
                      </span>
                      <span className="font-medium">{advert.number_of_employees_expected} employees</span>
                    </div>
                  )}
                </div>

                {advert.extra_information && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground line-clamp-2">{advert.extra_information}</p>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <div className="text-xs text-muted-foreground">Published: {formatDate(advert.published_date)}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
