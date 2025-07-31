"use client"

import { useEffect, useState } from "react"
import { Download, Upload, FileText, Calendar, User, Building, CheckCircle2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { IContract } from "@/app/types/types.utils"
import { getContracts, updateContract, approveContract } from "@/lib/utils"
import { useSelector } from "react-redux"
import { selectSelectedInstitution } from "@/store/auth/selectors"


export default function ContractsPage() {
  const [contracts, setContracts] = useState<IContract[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingId, setUploadingId] = useState<number | null>(null)
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const selectedInstitution = useSelector(selectSelectedInstitution);

  const institutionId = selectedInstitution?.id;

  useEffect(() => {
    fetchContracts()
  }, [])

  const fetchContracts = async () => {
    setLoading(true)
    const data = await getContracts({ institutionId: Number(institutionId) }) // Replace with actual institution ID
    if (data) {
      setContracts(data)
    }
    setLoading(false)
  }

  const handleDownload = async (fileUrl: string, fileName: string) => {
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      toast.success("Download started", {
        description: `${fileName} is being downloaded.`,
      })
    } catch (error) {
      toast.error("Download failed", {
        description: "Failed to download the file. Please try again.",
      })
    }
  }

  const handleFileUpload = async (contractId: number, file: File) => {
    setUploadingId(contractId)
    try {
      const result = await updateContract({
        contractId,
        contractData: { signed_contract: file },
      })

      if (result) {
        // Update the local state
        setContracts((prev) =>
          prev.map((contract) =>
            contract.id === contractId ? { ...contract, signed_contract: result.signed_contract } : contract,
          ),
        )

        toast.success("Upload successful", {
          description: "Signed contract has been uploaded successfully.",
        })
      } else {
        throw new Error("Upload failed")
      }
    } catch (error) {
      toast.error("Upload failed", {
        description: "Failed to upload the signed contract. Please try again.",
      })
    } finally {
      setUploadingId(null)
    }
  }

  const handleApproval = async (contractId: number) => {
    setApprovingId(contractId)
    try {
      const result = await approveContract({ contractId })

      if (result) {
        // Update the local state
        setContracts((prev) =>
          prev.map((contract) => (contract.id === contractId ? { ...contract, is_active: true } : contract)),
        )

        toast.success("Contract approved", {
          description: "Contract has been approved and marked as active.",
        })
      } else {
        throw new Error("Approval failed")
      }
    } catch (error) {
      toast.error("Approval failed", {
        description: "Failed to approve the contract. Please try again.",
      })
    } finally {
      setApprovingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getFileUrl = (filePath: string) => {
    if (filePath.startsWith("http")) {
      return filePath;
    }
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://127.0.0.1:8000";
    return `${baseUrl}${filePath}`;
  }

  const getFileName = (filePath: string) => {
    return filePath.split("/").pop() || "document.pdf";
  }

  const getContractName = (contract: IContract) => {
    if (contract.employee) {
      return contract.employee.user?.fullname || "—"
    }
    if (contract.applicant) {
      return contract.applicant.applicant_name || "—"
    }
    return "—"
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading contracts...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Contract Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage employee contracts, download documents, and upload signed contracts.
        </p>
      </div>

      {contracts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No contracts found</h3>
            <p className="text-muted-foreground text-center">There are no contracts available at the moment.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground tracking-wider whitespace-nowrap">Contract Reference</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground tracking-wider whitespace-nowrap">Name</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground tracking-wider whitespace-nowrap">Status</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground tracking-wider whitespace-nowrap">Created</th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground tracking-wider whitespace-nowrap">
                    Original Contract
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground tracking-wider whitespace-nowrap">
                    Signed Contract
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground tracking-wider whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.id} className="border-b transition-colors hover:bg-muted/50">
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{contract.contract_reference}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{getContractName(contract)}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-2">
                        {contract.is_active ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-200">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{formatDate(contract.created_at)}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      {contract.original_contract ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(
                            getFileUrl(contract.original_contract as string),
                            getFileName(contract.original_contract as string)
                          )}
                          className="h-8 !text-xs"
                        >
                          <Download className="h-3 w-3 mr-1" />
                          <span> {getFileName(contract.original_contract as string)}</span>
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">Not available</span>
                      )}
                    </td>
                    <td className="p-4 align-middle">
                      {contract.signed_contract ? (
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            
                            onClick={() => handleDownload(
                              getFileUrl(contract.signed_contract as string),
                              getFileName(contract.signed_contract as string)
                            )}
                            className="h-8 !text-xs"
                          >
                            <Download className="h-3 w-3 mr-1" />
                          <span>{getFileName(contract.signed_contract as string)}</span>
                          </Button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2 min-w-[140px]">
                          <Input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) {
                                handleFileUpload(contract.id, file)
                              }
                            }}
                            disabled={uploadingId === contract.id}
                            id={`file-upload-${contract.id}`}
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={uploadingId === contract.id}
                              className="h-8"
                              onClick={() => {
                                const input = document.getElementById(`file-upload-${contract.id}`) as HTMLInputElement
                                input?.click()
                              }}
                            >
                              <Upload className="h-3 w-3 mr-1" />
                              {uploadingId === contract.id ? (
                                <>
                                  <span className="animate-spin mr-1">⌛</span>
                                  Uploading...
                                </>
                              ) : (
                                "Choose & Upload"
                              )}
                            </Button>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Accepts PDF, DOC, or DOCX
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="p-4 align-middle">
                      {!contract.is_active ? (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleApproval(contract.id)}
                          disabled={approvingId === contract.id}
                          className="h-8"
                        >
                          {approvingId === contract.id ? "Approving..." : "Approve"}
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Approved
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
