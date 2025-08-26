"use client"

import { useState, useEffect, useRef } from "react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import { deleteJobPosition, getJobPositions, getPaginatedJobPositions, getPaginatedJobPositionsFromUrl, showErrorToast } from "@/lib/utils"
import type { IJobPosition } from "@/types/types.utils"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/helpers"
import ProtectedComponent from "@/components/ProtectedComponent"
import { PERMISSION_CODES } from "@/types/types.utils"
import { useDocumentTitle } from "@/hooks/use-document-title"
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper"

export default function JobPositionsPage() {
  const [jobPositions, setJobPositions] = useState<IJobPosition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState("")
  const [selectedSalaryRange, setSelectedSalaryRange] = useState<string>("all")
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [positionToDelete, setPositionToDelete] = useState<number | null>(null)

  const router = useRouter()
  const selectedInstitution = useSelector(selectSelectedInstitution)
  const selectedBranch = useSelector(selectSelectedBranch);
  const refreshFunctionRef = useRef<(()=>Promise<void>|null)>(null);

  useDocumentTitle("JOB POSITIONS / TITLES")



  const generateSalaryRanges = (positions: IJobPosition[]) => {
    if (!positions.length) return [];

    const allSalaries = positions.flatMap(pos => [
      Number(pos.salary_min || 0),
      Number(pos.salary_max || 0)
    ]).filter(salary => salary > 0);
    
    if (allSalaries.length === 0) return [];

    const minSalary = Math.min(...allSalaries);
    const maxSalary = Math.max(...allSalaries);

    // Calculate range size to create 4 ranges
    const rangeSize = Math.ceil((maxSalary - minSalary) / 4);

    const ranges = [];
    let start = minSalary;

    while (start < maxSalary) {
      const end = Math.min(start + rangeSize, maxSalary);
      ranges.push({
        id: `${start}-${end}`,
        label: ` ${formatCurrency(start)} - ${formatCurrency(end)}`,
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
      const positionMin = Number(position.salary_min || 0);
      const positionMax = Number(position.salary_max || 0);
      // Check if the position's salary range overlaps with the filter range
      return positionMin <= max && positionMax >= min;
    }
  );

  const handleCreateJobPosition = () => {
    router.push("/job-positions/create")
  }

  const handleEditJobPosition = (positionId: number) => {
    router.push(`/job-positions/${positionId}/edit`)
  }

  const handleDeleteJobPosition = (positionId: number) => {
    setPositionToDelete(positionId)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!positionToDelete) return

    try {
      await deleteJobPosition({ jobPositionId: positionToDelete })
      toast.success("Job position deleted successfully")
      if(refreshFunctionRef.current){refreshFunctionRef.current()}
    } catch (error) {
      showErrorToast({error, defaultMessage:"Failed to delete job position"})
    } finally {
      setIsDeleteDialogOpen(false)
      setPositionToDelete(null)
    }
  }

  const handleViewJobPosition = (positionId: number) => {
    router.push(`/job-positions/${positionId}`)
  }

  if (!selectedInstitution || !selectedBranch) {
    return <div>Loading...</div>
  }

  return (
    <div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Job Positions / Titles</h1>
          <p className="text-muted-foreground">
            Manage job positions / titles for {selectedBranch.branch_name} - {selectedInstitution.institution_name}
          </p>
        </div>
      </div>

       {/* Stats */}
      {!isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6 mt-10">
          {/* <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{jobPositions.length}</div>
              <p className="text-xs text-muted-foreground">Total Job Positions / Titles</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{filteredJobPositions.length}</div>
              <p className="text-xs text-muted-foreground">Filtered Results</p>
            </CardContent>
          </Card> */}
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {formatCurrency(
                  jobPositions.reduce((sum, pos) => {
                    const min = Number(pos.salary_min || 0);
                    const max = Number(pos.salary_max || 0);
                    return sum + (min + max) / 2; // Use average of min/max for budget calculation
                  }, 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground">Total Salary Budget</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                {formatCurrency(
                  Math.round(
                    jobPositions.reduce((sum, pos) => {
                      const min = Number(pos.salary_min || 0);
                      const max = Number(pos.salary_max || 0);
                      return sum + (min + max) / 2;
                    }, 0) / jobPositions.length
                  ) || 0
                )}
              </div>
              <p className="text-xs text-muted-foreground">Average Salary</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center mb-6 mt-8">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search job position/titles ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={selectedSalaryRange}
            onValueChange={setSelectedSalaryRange}
          >
            <SelectTrigger className="w-[280px]">
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
        
        <Button onClick={handleCreateJobPosition} className="flex items-center gap-2 flex-shrink-0">
          <Plus className="h-4 w-4" />
          Create Job Position / Title
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20 mb-6">
          {error}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this job position? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setPositionToDelete(null)
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


        <PaginatedTableWrapper<IJobPosition>
          fetchFirstPage={async() => {
            if(!selectedInstitution){throw new Error("No institution found !")}
            return await getPaginatedJobPositions({institutionId:selectedInstitution.id, search:searchTerm})
          }}

          fetchFromUrl={async(args:{url:string}) => getPaginatedJobPositionsFromUrl(args.url)}
          deps={[selectedInstitution?.id, searchTerm]}
            className="space-y-4"
            footerClassName="pt-4"

          >


          {({data, loading, refresh}) => {

            useEffect(()=>{
              setJobPositions(data?.results || [])
            }, [data])

            refreshFunctionRef.current = refresh


            if(loading){

              return (
                          <Table className="min-w-[800px] mt-10">
            <TableHeader>
              <TableRow className="border-b">
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Salary Range</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reports To</TableHead>
                <TableHead>Templates</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(5)].map((_, i) => (
                <TableRow key={i} className="border-b">
                  <TableCell><Skeleton className="h-6 w-3/4" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-1/2" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
              )
            }


            return (
                        <div className="overflow-x-auto">
          <Table className="min-w-[800px]">
            <TableHeader>
              <TableRow className="border-b bg-muted/30">
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Salary Range</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reports To</TableHead>
                <TableHead>Templates</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.results.map((position) => (
                <TableRow key={position.id} className="hover:bg-muted/50 transition-colors border-b">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <span>{position.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{position.department_details?.name}</Badge>
                  </TableCell>
                  <TableCell>
                    {position?.salary_min && position?.salary_max ? (
                      <span>
                         {formatCurrency(position.salary_min)} - {formatCurrency(position.salary_max)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Not set</span>
                    )}
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
        </div>
            )
          }}

        </PaginatedTableWrapper>
    </div>
  )
}