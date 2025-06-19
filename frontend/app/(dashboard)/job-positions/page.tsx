"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSelector } from "react-redux"
import { Briefcase, Plus, Search, Filter, MoreVertical, Edit, Trash2, RefreshCw, DollarSign, Users } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"

import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import { getJobPositions } from "@/lib/utils"
import { IJobPosition } from "@/app/types/types.utils"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/helpers"

export default function JobPositionsPage() {
  const [jobPositions, setJobPositions] = useState<IJobPosition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState("")

  const router = useRouter()
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const selectedBranch = useSelector(selectSelectedBranch)

  useEffect(() => {
    if (!selectedInstitution || !selectedBranch) {
      router.push("/dashboard")
      return
    }

    fetchJobPositions()
  }, [selectedBranch, selectedInstitution, router])

  const fetchJobPositions = async (showRefreshLoader = false) => {
    if (!selectedInstitution) return

    try {
      if (showRefreshLoader) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError("")

      const fetchedJobPositions = await getJobPositions({ institutionId: selectedInstitution.id })

      if (fetchedJobPositions) {
        setJobPositions(fetchedJobPositions)
      } else {
        setError("Failed to fetch job positions. Please try again.")
        toast.error("Failed to load job positions")
      }
    } catch (err) {
      setError("Failed to fetch job positions. Please try again.")
      toast.error("Failed to load job positions")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchJobPositions(true)
  }

  const filteredJobPositions = jobPositions.filter(
    (position) =>
      position.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      position.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      position.departmentDetails?.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleCreateJobPosition = () => {
    router.push("/job-positions/create")
  }

  const handleEditJobPosition = (positionId: number) => {
    router.push(`/job-positions/${positionId}/edit`)
  }

  const handleDeleteJobPosition = (positionId: number) => {
    // TODO: Implement delete functionality
    toast.success("Job position deletion would be implemented here")
  }

  if (!selectedInstitution || !selectedBranch) {
    return <div>Loading...</div>
  }

  return (
    <div className="w-full h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Job Positions</h1>
          <p className="text-muted-foreground">
            Manage job positions for {selectedBranch.branch_name} - {selectedInstitution.Institution_name}
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
          <Button onClick={handleCreateJobPosition} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Job Position
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search job positions..."
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{jobPositions.length}</div>
              <p className="text-xs text-muted-foreground">Total Job Positions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{filteredJobPositions.length}</div>
              <p className="text-xs text-muted-foreground">Filtered Results</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                ${formatCurrency(jobPositions.reduce((sum, pos) => Number(sum) + Number(pos.salary), 0))}
              </div>
              <p className="text-xs text-muted-foreground">Total Salary Budget</p>
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

      {/* Job Positions Grid */}
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
      ) : filteredJobPositions.length === 0 ? (
        <Card className="p-12 text-center">
          <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No job positions found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm
              ? "No job positions match your search criteria."
              : "Get started by creating your first job position."}
          </p>
          {!searchTerm && (
            <Button onClick={handleCreateJobPosition} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create First Job Position
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredJobPositions.map((position) => (
            <Card key={position.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{position.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        ID: {position.id}
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
                      <DropdownMenuItem onClick={() => handleEditJobPosition(position.id)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {/* <DropdownMenuItem
                        onClick={() => handleDeleteJobPosition(position.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem> */}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">{position.description}</p>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Department:</span>
                    <Badge variant="outline">{position.departmentDetails?.name}</Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Salary:
                    </span>
                    <span className="font-medium">${position.salary.toLocaleString()}</span>
                  </div>

                  {position.reportsToDetails && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Reports to:
                      </span>
                      <span className="font-medium text-xs">{position.reportsToDetails.name}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t">
                  <div className="flex gap-2">
                    {position.contractTemplate && (
                      <Badge variant="outline" className="text-xs">
                        Contract
                      </Badge>
                    )}
                    {position.offerLetterTemplate && (
                      <Badge variant="outline" className="text-xs">
                        Offer Letter
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
