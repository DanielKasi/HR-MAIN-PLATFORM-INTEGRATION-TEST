"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSelector } from "react-redux"
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  RefreshCw,
  Users,
  Eye,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import { getJobPositions } from "@/lib/utils"
import type { IJobPosition } from "@/app/types/types.utils"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/helpers"
import ProtectedComponent from "@/components/ProtectedComponent"
import { PERMISSION_CODES } from "@/app/types/types.utils"

export default function JobPositionsPage() {
  const [jobPositions, setJobPositions] = useState<IJobPosition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState("")
  const [selectedSalaryRange, setSelectedSalaryRange] = useState<string>("all")

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
        setError("Failed to fetch job position/titles. Please try again.")
        toast.error("Failed to load job position/titles ")
      }
    } catch (err) {
      setError("Failed to fetch job position/titles . Please try again.")
      toast.error("Failed to load job position/titles ")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    fetchJobPositions(true)
  }

  // Function to generate salary ranges
  const generateSalaryRanges = (positions: IJobPosition[]) => {
    if (!positions.length) return [];

    const salaries = positions.map(pos => Number(pos.salary));
    const minSalary = Math.min(...salaries);
    const maxSalary = Math.max(...salaries);
    
    // Calculate range size to create 4 ranges
    const rangeSize = Math.ceil((maxSalary - minSalary) / 4);
    
    const ranges = [];
    let start = minSalary;
    
    while (start < maxSalary) {
      const end = Math.min(start + rangeSize, maxSalary);
      ranges.push({
        id: `${start}-${end}`,
        label: `UGX ${formatCurrency(start)} - ${formatCurrency(end)}`,
        min: start,
        max: end
      });
      start = end + 1;
    }

    return ranges;
  };

  // Get salary ranges based on available positions
  const salaryRanges = generateSalaryRanges(jobPositions);

  // Update filtered positions to include salary range filter
  const filteredJobPositions = jobPositions.filter(
    (position) => {
      const matchesSearch = position.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        position.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        position.department_details?.name.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      if (selectedSalaryRange === "all") return true;

      const [min, max] = selectedSalaryRange.split("-").map(Number);
      const salary = Number(position.salary);
      return salary >= min && salary <= max;
    }
  );

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

  const handleViewJobPosition = (positionId: number) => {
    router.push(`/job-positions/${positionId}`)
  }

  if (!selectedInstitution || !selectedBranch) {
    return <div>Loading...</div>
  }

  return (
    <div className="w-full h-full p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Job Positions/Titles</h1>
          <p className="text-muted-foreground">
            Manage job positions/titles for {selectedBranch.branch_name} - {selectedInstitution.institution_name}
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
            Create Job Position/ Title 
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 ">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search job position/titles ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 min-w-80">
          <Select
            value={selectedSalaryRange}
            onValueChange={setSelectedSalaryRange}
          >
            <SelectTrigger className="w-full px-6">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Filter by salary" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Salary Ranges</SelectItem>
              {salaryRanges.map((range) => (
                <SelectItem className="!text-xs" key={range.id} value={range.id}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{jobPositions.length}</div>
              <p className="text-xs text-muted-foreground">Total Job Positions/Titles</p>
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
                {formatCurrency(jobPositions.reduce((sum, pos) => Number(sum) + Number(pos.salary), 0))}
              </div>
              <p className="text-xs text-muted-foreground">Total Salary Budget</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {formatCurrency(
                  Math.round(jobPositions.reduce((sum, pos) => Number(sum) + Number(pos.salary), 0) / jobPositions.length) || 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">Average Salary</p>
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

      {/* Job Positions/Titles Grid */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-full h-12 bg-muted/10 rounded-md animate-pulse" />
          ))}
        </div>
      ) : filteredJobPositions.length === 0 ? (
        <Card className="p-12 text-center">
          <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No job positions/titles found</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm
              ? "No job positions/titles match your search criteria."
              : "Get started by creating your first job position."}
          </p>
        </Card>
      ) : (
        <Card className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reports To</TableHead>
                <TableHead>Templates</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobPositions.map((position) => (
                <TableRow key={position.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full ${
                        position.job_position_status === "active" 
                          ? "bg-green-50" 
                          : "bg-red-50"
                      } flex items-center justify-center`}>
                        <Briefcase className={`h-4 w-4 ${
                          position.job_position_status === "active"
                            ? "text-green-600"
                            : "text-red-600"
                        }`} />
                      </div>
                      <span>{position.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{position.department_details?.name}</Badge>
                  </TableCell>
                  <TableCell>
                    UGX {formatCurrency(position?.salary?.toLocaleString()||0)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={position.job_position_status === "active" ? "success" : "destructive"}>
                      {position.job_position_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {position.reports_to_details?.name || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {position.contract_template && (
                        <Badge variant="outline" className="text-xs">
                          Contract
                        </Badge>
                      )}
                      {position.offer_letter_template && (
                        <Badge variant="outline" className="text-xs">
                          Offer Letter
                        </Badge>
                      )}
                      {!position.contract_template && !position.offer_letter_template && "-"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_JOB_POSITIONS}>
                          <DropdownMenuItem onClick={() => handleViewJobPosition(position.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                        </ProtectedComponent>
                        <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_JOB_POSITIONS}>
                          <DropdownMenuItem onClick={() => handleEditJobPosition(position.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        </ProtectedComponent>
                        <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_DELETE_JOB_POSITIONS}>
                          <DropdownMenuItem
                            onClick={() => handleDeleteJobPosition(position.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
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
    </div>
  )
}
