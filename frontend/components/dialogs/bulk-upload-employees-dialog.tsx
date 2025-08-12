"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, Download, Upload } from "lucide-react"
import { downloadEmployeesTemplate, bulkCreateEmployees } from "@/lib/utils"
import { selectAccessToken, selectSelectedInstitution } from "@/store/auth/selectors"
import { useSelector } from "react-redux"

interface BulkUploadEmployeesDialogProps {
  isOpen: boolean
  onClose: () => void
  onUploadSuccess: () => void
}

export function BulkUploadEmployeesDialog({
  isOpen,
  onClose,
  onUploadSuccess,
}: BulkUploadEmployeesDialogProps) {
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const currentInstitution = useSelector(selectSelectedInstitution);
  const accessToken = useSelector(selectAccessToken);
  const [uploadResults, setUploadResults] = useState<{
    created_count: number
    error_count: number
    created_employees?: Array<{
      id: number
      fullname: string
      email: string
    }>
    errors?: string[]
  } | null>(null)

  const handleDownloadTemplate = async () => {
    setIsDownloading(true)
    if(!currentInstitution || !accessToken){return}
    try {
      await downloadEmployeesTemplate({accessToken})
      toast.success("Template downloaded successfully")
    } catch (error) {
      console.error("Error downloading template:", error)
      toast.error("Failed to download template")
    } finally {
      setIsDownloading(false)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = [".csv", ".xlsx", ".xls"]
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."))

      if (!allowedTypes.includes(fileExtension)) {
        toast.error("Invalid file type. Please upload a CSV or Excel file (.csv, .xlsx, .xls)")
        return
      }

      setUploadFile(file)
      setUploadResults(null) // Clear previous results
    }
  }

  const handleBulkUpload = async () => {
    if (!uploadFile) {
      toast.error("Please select a file to upload")
      return
    }
    if(!currentInstitution){return}

    setIsUploading(true)
    try {
      const results = await bulkCreateEmployees({
        institutionId:currentInstitution.id,
        file: uploadFile,
      })

      setUploadResults(results)


        toast.success(`Successfully created ${results.created_count} employees`)
        onUploadSuccess()
        handleClose()
    } catch (error: any) {
      toast.error(error.message || "Failed to upload employees")
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    setUploadFile(null)
    setUploadResults(null)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Employees</DialogTitle>
          <DialogDescription>
            Download the template, fill it with employee information, and upload it to create multiple employees at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Step 1: Download Template */}
          <div className="space-y-2">
            <Label>Step 1: Download Template</Label>
            <Button
              onClick={handleDownloadTemplate}
              disabled={isDownloading}
              variant="outline"
              className="w-full bg-transparent"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download Excel Template
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              Download the template file, fill it with employee information, and save it.
            </p>
          </div>

          {/* Step 2: Upload File */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Step 2: Upload Completed File</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            {uploadFile && (
              <div className="text-sm text-muted-foreground">
                Selected file: <Badge variant="secondary">{uploadFile.name}</Badge>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Supported formats: CSV (.csv), Excel (.xlsx, .xls)</p>
          </div>


        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
          <Button onClick={handleBulkUpload} disabled={!uploadFile || isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Employees
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
