"use client"

import { useEffect, useState } from "react"
import { useSelector } from "react-redux"
import { Download, FileText, Calendar, User, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { selectSelectedInstitution } from "@/store/auth/selectors"
import { getContracts, downloadContract } from "@/lib/utils"
import type { IContract, ContractStatus } from "@/app/types/types.utils"

const statusColors: Record<ContractStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  active: "bg-green-100 text-green-800",
  expired: "bg-red-100 text-red-800",
  terminated: "bg-orange-100 text-orange-800",
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<IContract[]>([])
  const [filteredContracts, setFilteredContracts] = useState<IContract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "all">("all")
  const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set())

  const selectedInstitution = useSelector(selectSelectedInstitution)

  useEffect(() => {
    fetchContracts()
  }, [selectedInstitution])

  useEffect(() => {
    filterContracts()
  }, [contracts, searchTerm, statusFilter])

  const fetchContracts = async () => {
    if (!selectedInstitution?.id) {
      setError("No institution selected")
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await getContracts({ institutionId: selectedInstitution.id })

      if (data) {
        setContracts(data)
      } else {
        setError("Failed to fetch contracts")
      }
    } catch (err) {
      setError("An error occurred while fetching contracts")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filterContracts = () => {
    let filtered = contracts

    if (searchTerm) {
      filtered = filtered.filter(
        (contract) =>
          contract.contract_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contract.employee?.user?.fullname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          contract.notes?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((contract) => contract.status === statusFilter)
    }

    setFilteredContracts(filtered)
  }

  const handleDownload = async (contractId: number, contractIdString: string) => {
    setDownloadingIds((prev) => new Set(prev).add(contractId))

    try {
      const blob = await downloadContract({ contractId })

      if (blob && blob instanceof Blob) {
        // Check if the blob is actually a valid file
        if (blob.size === 0) {
          alert("Contract file is empty or not available")
          return
        }

        // Create download URL
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url

        // Try to get the file extension from the blob type or default to pdf
        const fileExtension = blob.type.includes("pdf")
          ? "pdf"
          : blob.type.includes("doc")
            ? "doc"
            : blob.type.includes("docx")
              ? "docx"
              : "pdf"

        link.download = `contract-${contractIdString}.${fileExtension}`
        link.style.display = "none"

        document.body.appendChild(link)
        link.click()

        // Cleanup
        setTimeout(() => {
          document.body.removeChild(link)
          window.URL.revokeObjectURL(url)
        }, 100)
      } else {
        console.error("Invalid blob received:", blob)
        alert("Failed to download contract - invalid file received")
      }
    } catch (err) {
      console.error("Download error:", err)
      // More specific error message
      if (err instanceof Error) {
        alert(`Download failed: ${err.message}`)
      } else {
        alert("An error occurred while downloading the contract")
      }
    } finally {
      setDownloadingIds((prev) => {
        const newSet = new Set(prev)
        newSet.delete(contractId)
        return newSet
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getStatusBadge = (status: ContractStatus) => (
    <Badge className={statusColors[status]} variant="secondary">
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  )

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchContracts} className="mt-4">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contracts</h1>
          <p className="text-muted-foreground">Manage and download employee contracts</p>
        </div>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {filteredContracts.length} contract{filteredContracts.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search contracts by ID, employee name, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={(value: ContractStatus | "all") => setStatusFilter(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards - Move this section here */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{contracts.length}</p>
              </div>
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        {(["active", "draft", "expired", "terminated"] as ContractStatus[]).map((status) => {
          const count = contracts.filter((c) => c.status === status).length
          return (
            <Card key={status}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                  {getStatusBadge(status)}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Contracts Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Contracts</CardTitle>
          <CardDescription>View and download employee contracts</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredContracts.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No contracts found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all"
                  ? "Try adjusting your search or filter criteria"
                  : "No contracts have been created yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract ID</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">{contract.contract_id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>
                            {contract.employee
                              ? `${contract.employee.user?.fullname}`
                              : `Employee #${contract.employee}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {
                          typeof contract.employee?.position === 'object'
                            ? contract.employee.position.name
                            : null
                        }
                      </TableCell>
                      <TableCell>{getStatusBadge(contract.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(contract.start_date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {contract.end_date ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {formatDate(contract.end_date)}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No end date</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(contract.id, contract.contract_id)}
                          disabled={!contract.contract_file || downloadingIds.has(contract.id)}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          {downloadingIds.has(contract.id) ? "Downloading..." : "Download"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
