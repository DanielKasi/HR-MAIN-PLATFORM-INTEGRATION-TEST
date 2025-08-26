"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, RefreshCw, Package, User, History, CheckCircle, Clock, ArrowDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import { assetsAPI } from "@/lib/utils"
import type { IAsset } from "@/types/types.utils"
import { EditAssetDialog } from "@/components/assets/edit-asset-dialog"
import { DeleteAssetDialog } from "@/components/assets/delete-asset-dialog"
import { CreateAssetAllocationDialog } from "@/components/asset-allocations/create-asset-allocation-dialog"
import { Icon } from "@iconify/react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

const getStatusColor = (status: string) => {
  switch (status) {
    case "available":
      return "bg-green-100 text-green-800 border-green-200"
    case "allocated":
      return "bg-blue-100 text-blue-800 border-blue-200"
    case "maintenance":
      return "bg-yellow-100 text-yellow-800 border-yellow-200"
    case "decommissioned":
      return "bg-red-100 text-red-800 border-red-200"
    default:
      return "bg-gray-100 text-gray-800 border-gray-200"
  }
}

const getStatusDisplay = (status: string) => {
  switch (status) {
    case "available":
      return "Available"
    case "allocated":
      return "Allocated"
    case "maintenance":
      return "Under Maintenance"
    case "decommissioned":
      return "Decommissioned"
    default:
      return status
  }
}

const formatDate = (dateString: string) => {
  if (!dateString) return "-"

  try {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch (error) {
    return dateString // Return original string if parsing fails
  }
}

const AssetDetailPage = () => {
  const params = useParams()
  const router = useRouter()

  const [asset, setAsset] = useState<IAsset | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState("assignment-history")
  const [isRetireConfirmOpen, setIsRetireConfirmOpen] = useState(false)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [isReturnConfirmOpen, setIsReturnConfirmOpen] = useState(false)

  console.log("Asset", asset)

  const assetId = params.id as string

  // Fetch asset details
  const fetchAssetDetails = async () => {
    try {
      setIsLoading(true)
      const response = await assetsAPI.getById(Number.parseInt(assetId))
      setAsset(response)
    } catch (error) {
      console.warn("Error fetching asset details:", error)
      toast.error("Failed to load asset details")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (assetId) {
      fetchAssetDetails()
    }
  }, [assetId])

  const handleEditSuccess = (updatedAsset: IAsset) => {
    setAsset(updatedAsset)
    setIsEditDialogOpen(false)
    toast.success("Asset updated successfully")
  }

  const handleDeleteSuccess = () => {
    toast.success("Asset deleted successfully")
    router.push("/assests/assets")
  }

  const handleAssetReturn = () => {
    // Refresh asset details after return
    fetchAssetDetails()
    toast.success("Asset returned successfully")
  }

  const handleEditAsset = () => {
    setIsEditDialogOpen(true)
  }

  const handleDeleteAsset = () => {
    setIsDeleteDialogOpen(true)
  }

  const handleAssignAsset = () => {
    if (!asset) {
      toast.error("Asset not found")
      return
    }
    setIsAssignDialogOpen(true)
  }

  const handleReturnAsset = () => {
    if (!asset) {
      toast.error("Asset not found")
      return
    }

    // Check if asset is currently allocated
    if (asset.status !== "allocated") {
      toast.error("Only allocated assets can be returned")
      return
    }

    setIsReturnConfirmOpen(true)
  }

  const confirmReturnAsset = async () => {
    if (!asset) {
      toast.error("Asset not found")
      return
    }

    try {
      // Update asset status to available
      const updatedAsset = await assetsAPI.update(asset.id, {
        status: "available",
      })

      // Update local asset state
      setAsset(updatedAsset)

      // Show success message
      toast.success("Asset has been successfully returned and is now available")

      // Close the modal
      setIsReturnConfirmOpen(false)

      // Refresh asset details to get updated data
      fetchAssetDetails()
    } catch (error: any) {
      console.warn("Error returning asset:", error)
      toast.error(error.message || "Failed to return asset. Please try again.")
    }
  }

  const handleRetireAsset = () => {
    if (!asset) {
      toast.error("Asset not found")
      return
    }
    setIsRetireConfirmOpen(true)
  }

  const confirmRetireAsset = async () => {
    if (!asset) {
      toast.error("Asset not found")
      return
    }

    try {
      // Update asset status to decommissioned
      const updatedAsset = await assetsAPI.update(asset.id, {
        status: "decommissioned",
      })

      // Update local asset state
      setAsset(updatedAsset)

      // Show success message
      toast.success("Asset has been successfully retired (decommissioned)")

      // Close the modal
      setIsRetireConfirmOpen(false)

      // Refresh asset details to get updated data
      fetchAssetDetails()
    } catch (error: any) {
      console.warn("Error retiring asset:", error)
      toast.error(error.message || "Failed to retire asset. Please try again.")
    }
  }

  // Get the transformed asset history data
  const assignmentHistory = asset ? asset.asset_histories || [] : []

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
          <span className="text-lg text-gray-600">Loading asset details...</span>
        </div>
      </div>
    )
  }

  if (!asset) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Asset Not Found</h2>
          <p className="text-gray-600 mb-4">The asset you're looking for doesn't exist or has been removed.</p>
          <Button onClick={() => router.push("/assests/assets")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assets
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/assests/assets")}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">ALLOC-00001-20001</h1>
              <div className="flex items-center gap-3 mt-2">
                <Badge className="bg-blue-100 text-blue-800 border-blue-200 px-3 py-1 text-sm font-medium">
                  Pending
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Asset Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Asset Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Asset</h3>
                <Badge className="bg-green-100 text-green-800 border-green-200">
                  Available
                </Badge>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Dell Latitude 5420</p>
                  <p className="text-sm text-gray-500">Serial: 8721638716389</p>
                </div>
              </div>
            </div>

            {/* Connection Line - Dotted with Arrow */}
            <div className="flex justify-center">
              <div className="w-0.5 h-8 bg-gray-300 relative" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #d1d5db 2px, #d1d5db 4px)' }}>
                <ArrowDown className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Allocate to Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Allocate to</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Muwanguzi David</p>
                  <p className="text-sm text-gray-500">EMP-2109838203</p>
                  <p className="text-sm text-gray-500">Position: Sales Representative</p>
                  <p className="text-sm text-gray-500">Department: Sales</p>
                </div>
              </div>
            </div>

            {/* Created By Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Created By</h3>
              <div>
                <p className="font-medium text-gray-900">Mugisha John</p>
                <p className="text-sm text-gray-500">Head Human Resource</p>
              </div>
            </div>

            {/* Assignment History Section */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab("assignment-history")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "assignment-history"
                        ? "border-orange-500 text-myOrange"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Assignment History
                  </button>
                </nav>
              </div>

              <div className="overflow-x-auto">
                {assignmentHistory.length > 0 ? (
                  <div className="min-w-full">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="font-medium text-gray-900 min-w-[150px]">Employee</TableHead>
                          <TableHead className="font-medium text-gray-900 min-w-[120px]">Assigned Date</TableHead>
                          <TableHead className="font-medium text-gray-900 min-w-[120px]">Date Returned</TableHead>
                          <TableHead className="font-medium text-gray-900 min-w-[120px]">Assigned By</TableHead>
                          <TableHead className="font-medium text-gray-900 min-w-[100px]">Condition</TableHead>
                          <TableHead className="font-medium text-gray-900 min-w-[100px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {assignmentHistory.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="min-w-[150px]">
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                  <User className="h-4 w-4 text-gray-600" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {typeof item.affected_user === "object"
                                      ? item.affected_user?.user?.fullname
                                      : item.affected_user}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {typeof item.affected_user === "object"
                                      ? item.affected_user?.user?.roles?.map((role: any) => role.role_name).join(", ")
                                      : item.affected_user}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-900 min-w-[120px]">
                              {formatDate(item.created_at)}
                            </TableCell>
                            <TableCell className="text-sm text-gray-900 min-w-[120px]">
                              {formatDate(item.updated_at)}
                            </TableCell>
                            <TableCell className="min-w-[120px]">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {typeof item.performed_by === "object"
                                    ? item.performed_by?.user?.fullname
                                    : item.performed_by}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                  {typeof item.performed_by === "object"
                                    ? item.performed_by?.user?.roles?.map((role: any) => role.role_name).join(", ")
                                    : item.performed_by}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-gray-900 min-w-[100px]"></TableCell>
                            <TableCell className="min-w-[100px]">
                              <Badge className={getStatusColor(item.event_type)}>{item.event_type}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">No assignment history available for this asset</p>
                    <p className="text-gray-400 text-xs mt-1">
                      Assignment history will appear here when the asset is allocated or returned
                    </p>
                  </div>
                )}
              </div>

              {assignmentHistory.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between mt-6 space-y-4 sm:space-y-0">
                  <div className="text-sm text-gray-700">
                    Showing 1-{assignmentHistory.length} of {assignmentHistory.length}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" disabled>
                      &lt; Previous
                    </Button>
                    <Button variant="outline" size="sm" className="bg-orange-500 text-white border-orange-500">
                      1
                    </Button>
                    <Button variant="outline" size="sm" disabled>
                      Next &gt;
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Approvals */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm sticky top-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Approvals</h3>
              
              {/* Approval Steps */}
              <div className="space-y-6">
                {/* Step 1 - Approved */}
                <div className="relative">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-green-100 border-2 border-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-green-700">1</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900">Approval Step Name</h4>
                      <Badge className="bg-green-100 text-green-800 border-green-200 text-xs mt-1">
                        Approved
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">Approved - Feb 12, 2025</p>
                    </div>
                  </div>
                  {/* Connection Line - Dotted */}
                  <div className="absolute left-4 top-8 w-0.5 h-8 ml-1" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #d1d5db 2px, #d1d5db 4px)' }}></div>
                </div>

                {/* Step 2 - Approved */}
                <div className="relative">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-green-100 border-2 border-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-green-700">2</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900">Approval Step Name</h4>
                      <Badge className="bg-green-100 text-green-800 border-green-200 text-xs mt-1">
                        Approved
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">Approved - Feb 18, 2025</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Vestibulum luctus eros consectetur libero maximus aliquet.
                      </p>
                    </div>
                  </div>
                  {/* Connection Line - Dotted */}
                  <div className="absolute left-4 top-8 w-0.5 h-8 ml-1" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #d1d5db 2px, #d1d5db 4px)' }}></div>
                </div>

                {/* Step 3 - Pending */}
                <div className="relative">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-blue-100 border-2 border-blue-400 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-blue-700">3</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900">Approval Step Name</h4>
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs mt-1">
                        Pending
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">Pending Approval</p>
                      <div className="flex gap-2 mt-3">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1">
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 border-red-300 text-xs px-3 py-1">
                          Reject
                        </Button>
                      </div>
                    </div>
                  </div>
                  {/* Connection Line - Dotted */}
                  <div className="absolute left-4 top-8 w-0.5 h-8 ml-1" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #d1d5db 2px, #d1d5db 4px)' }}></div>
                </div>

                {/* Step 4 - Pending */}
                <div className="relative">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-blue-100 border-2 border-blue-400 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-blue-700">4</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900">Approval Step Name</h4>
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs mt-1">
                        Pending
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">Pending Approval</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-6 space-y-3">
              <Button
                onClick={handleAssignAsset}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={asset.status !== "available"}
              >
                Assign Asset
              </Button>
              <Button
                onClick={handleReturnAsset}
                variant="outline"
                className="w-full"
                disabled={asset.status !== "allocated"}
              >
                Return Asset
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={handleEditAsset}
                  variant="outline"
                  className="w-full"
                >
                  Edit
                </Button>
                <Button
                  onClick={handleDeleteAsset}
                  variant="outline"
                  className="w-full text-red-600 border-red-300 hover:bg-red-50"
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      {asset && (
        <>
          <EditAssetDialog
            asset={asset}
            isOpen={isEditDialogOpen}
            onClose={() => setIsEditDialogOpen(false)}
            onSuccess={handleEditSuccess}
          />
          <DeleteAssetDialog
            asset={asset}
            isOpen={isDeleteDialogOpen}
            onClose={() => setIsDeleteDialogOpen(false)}
            onSuccess={handleDeleteSuccess}
          />
          <CreateAssetAllocationDialog
            isOpen={isAssignDialogOpen}
            onClose={() => setIsAssignDialogOpen(false)}
            onSuccess={(allocation) => {
              toast.success("Asset allocated successfully")
              setIsAssignDialogOpen(false)
              fetchAssetDetails() // Refresh to show updated status
            }}
            preSelectedAsset={asset}
          />
        </>
      )}

      {/* Return Asset Confirmation Modal */}
      <Dialog open={isReturnConfirmOpen} onOpenChange={setIsReturnConfirmOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl border-0 shadow-2xl">
          <DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
            <DialogTitle className="text-2xl font-bold text-gray-900">Return Asset</DialogTitle>
            <DialogDescription className="text-gray-600 text-base">
              Are you sure you want to return this asset? This action will make the asset available for allocation
              again.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex space-x-3">
            <Button onClick={confirmReturnAsset} className="flex-1 bg-primary rounded-lg">
              Return Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Retire Asset Confirmation Modal */}
      <Dialog open={isRetireConfirmOpen} onOpenChange={setIsRetireConfirmOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl border-0 shadow-2xl">
          <DialogHeader className="space-y-3 pb-6 border-b border-gray-100">
            <DialogTitle className="text-2xl font-bold text-gray-900">Retire Asset</DialogTitle>
            <DialogDescription className="text-gray-600 text-base">
              Are you sure you want to retire this asset? This action will decommission the asset and will not be
              available for allocation.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex space-x-3">
            <Button onClick={confirmRetireAsset} className="flex-1 bg-red-600 hover:bg-red-700 rounded-lg">
              Retire Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AssetDetailPage
