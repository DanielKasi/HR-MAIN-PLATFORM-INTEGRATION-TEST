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
import { downloadEmployeesTemplate, bulkCreateEmployees, showErrorToast } from "@/lib/utils"
import { selectAccessToken, selectSelectedInstitution } from "@/store/auth/selectors"
import { useSelector } from "react-redux"
import { BulkEmployeeUploadResult } from "@/types"

interface BulkUploadEmployeesDialogProps {
  isOpen: boolean
  onClose: () => void
  onUploadSuccess: () => void
}

interface RowError {
  row: number
  errors: any
}

interface RowWarning {
  row: number
  warnings: { field: string; message: string }[]
}

interface UploadResult extends BulkEmployeeUploadResult {
  errors?: RowError[]
  warnings?: RowWarning[]
}

export function BulkUploadEmployeesDialog({
  isOpen,
  onClose,
  onUploadSuccess,
}: BulkUploadEmployeesDialogProps) {
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const currentInstitution = useSelector(selectSelectedInstitution)
  const accessToken = useSelector(selectAccessToken)
  const [uploadResults, setUploadResults] = useState<UploadResult | null>(null)

  const formatRowErrors = (rowErrors: any): string[] => {
    const messages: string[] = []

    const parseErrors = (errors: any, prefix: string = ''): string[] => {
      const result: string[] = []
      Object.entries(errors).forEach(([key, value]) => {

        if (key === 'non_field_errors' || key === 'error') {
          if (Array.isArray(value)) {
            result.push(...value.map((msg: string) => `${prefix}${msg}`))
          } else {
            result.push(`${prefix}${value}`)
          }
        } else if (Array.isArray(value)) {
          if(value.length === 1 && typeof value[0] === "string" ){
            result.push(`${key}: ${value[0]}`)
          }else{
            value.forEach((sub: any) => {
              Object.entries(sub).forEach(([subkey, subvalue]) => {
                let formattedMessage: string
                if (Array.isArray(subvalue)) {
                  formattedMessage = `${prefix}${key}.${subkey}: ${subvalue.join(', ')}`
                } else {
                  formattedMessage = `${prefix}${key}.${subkey}: ${subvalue}`
                }
                result.push(formattedMessage)
              })
            })
          }
        } else if (typeof value === 'object' && value !== null) {
          // Handle nested objects (e.g., user: {password: [...]})
          result.push(...parseErrors(value, `${prefix}${key}.`))
        } else {
          result.push(`${prefix}${key}: ${value}`)
        }
      })
      return result
    }

    return parseErrors(rowErrors)
  }

  const formatRowWarnings = (rowWarnings: { field: string; message: string }[]): string[] => {
    return rowWarnings.map(warning => `${warning.field}: ${warning.message}`)
  }

  const handleDownloadTemplate = async () => {
    setIsDownloading(true)
    if (!currentInstitution || !accessToken) {
      return
    }
    try {
      await downloadEmployeesTemplate({ accessToken })
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
      const allowedTypes = [".csv", ".xlsx", ".xls"]
      const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf("."))

      if (!allowedTypes.includes(fileExtension)) {
        toast.error("Invalid file type. Please upload a CSV or Excel file (.csv, .xlsx, .xls)")
        return
      }

      setUploadFile(file)
      setUploadResults(null)
    }
  }

  const handleBulkUpload = async () => {
    if (!uploadFile) {
      toast.error("Please select a file to upload")
      return
    }
    if (!currentInstitution) {
      return
    }

    setIsUploading(true)
    try {
      const results = await bulkCreateEmployees({
        institutionId: currentInstitution.id,
        file: uploadFile,
      })

      setUploadResults(results)

      const errorCount = results.errors?.length || 0
      const warningCount = results.warnings?.length || 0
      if (errorCount > 0 || warningCount > 0) {
        toast.warning(
          `Upload completed with ${errorCount} errors and ${warningCount} warnings. ` +
          `Created ${results.created_count}, Updated ${results.updated_count}. ` +
          `Please review details below.`
        )
      } else {
        toast.success(
          `Successfully created ${results.created_count} employees and updated ${results.updated_count}`
        )
        onUploadSuccess()
        handleClose()
      }
    } catch (error: any) {
      showErrorToast({ error, defaultMessage: "Failed to upload employees" })
      setUploadResults(error as UploadResult)
    // console.log("\n\n Setting upload results to : ", error)
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
      <DialogContent className="max-w-2xl py-8">
        <DialogHeader>
          <DialogTitle>Bulk Upload Employees</DialogTitle>
          <DialogDescription>
            Download the template, fill it with employee information, and upload it to create
            multiple employees at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 max-h-[80vh] md:max-h-[65svh] overflow-y-auto">
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
            <p className="text-xs text-muted-foreground">
              Supported formats: CSV (.csv), Excel (.xlsx, .xls)
            </p>
          </div>

          {/* Upload Results: Success Summary */}
          {uploadResults && uploadResults.errors?.length === 0 && uploadResults.warnings?.length === 0 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm font-medium text-green-800">
                Successfully Created {uploadResults.created_count} and updated{" "}
                {uploadResults.updated_count} employees
              </p>
            </div>
          )}

          {/* Upload Results: Warnings */}
          {uploadResults?.warnings?.length && uploadResults.warnings.length > 0 && (
            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <h3 className="font-semibold text-yellow-800 mb-2">
                Upload Warnings ({uploadResults.warnings.length} rows with warnings)
                {uploadResults.created_count > 0 && (
                  <span className="ml-2 text-green-600">
                    (Created {uploadResults.created_count}, Updated {uploadResults.updated_count})
                  </span>
                )}
              </h3>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {uploadResults.warnings.map((warn, idx) => (
                  <div key={idx} className="border-l-4 border-yellow-400 pl-3">
                    <strong className="text-yellow-700 block mb-1">Row {warn.row}:</strong>
                    <ul className="ml-4 list-disc space-y-1 text-sm text-yellow-600">
                      {formatRowWarnings(warn.warnings).map((msg, msgIdx) => (
                        <li key={msgIdx} className="list-item">{msg}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Results: Errors */}
          {uploadResults?.errors?.length && uploadResults.errors.length > 0 && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <h3 className="font-semibold text-red-800 mb-2">
                Upload Errors ({uploadResults.errors.length} rows failed)
                {uploadResults.created_count > 0 && (
                  <span className="ml-2 text-green-600">
                    (Created {uploadResults.created_count}, Updated {uploadResults.updated_count})
                  </span>
                )}
              </h3>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {uploadResults.errors.map((err, idx) => (
                  <div key={idx} className="border-l-4 border-red-400 pl-3">
                    <strong className="text-red-700 block mb-1">Row {err.row}:</strong>
                    <ul className="ml-4 list-disc space-y-1 text-sm text-red-600">
                      {formatRowErrors(err.errors).map((msg, msgIdx) => (
                        <li key={msgIdx} className="list-item">{msg}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-8">
          <Button
            className="w-full rounded-full"
            onClick={handleBulkUpload}
            disabled={!uploadFile || isUploading}
          >
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