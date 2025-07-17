"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { useSelector } from "react-redux"
import { Briefcase, ArrowLeft, Check, Upload, X, FileText, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors"
import { getDepartments, getJobPositions, getJobPosition, updateJobPosition } from "@/lib/utils"
import type { JobPositionFormData, IDepartment, IJobPosition, CreateJobPositionData } from "@/app/types/types.utils"
import { toast } from "sonner"

export default function EditJobPositionPage() {
    const [jobPosition, setJobPosition] = useState<IJobPosition | null>(null)
    const [formData, setFormData] = useState<JobPositionFormData>({
        name: "",
        description: "",
        department: null,
        reportsTo: null,
        contractTemplate: null,
        offerLetterTemplate: null,
        salary: "",
    })
    const [departments, setDepartments] = useState<IDepartment[]>([])
    const [jobPositions, setJobPositions] = useState<IJobPosition[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [errors, setErrors] = useState<Partial<Record<keyof JobPositionFormData, string>>>({})

    const router = useRouter()
    const params = useParams()
    const jobPositionId = Number.parseInt(params.id as string)

    const selectedInstitution = useSelector(selectSelectedInstitution)
    const selectedBranch = useSelector(selectSelectedBranch)

    useEffect(() => {
        if (!selectedInstitution || !selectedBranch) {
            router.push("/dashboard")
            return
        }

        if (isNaN(jobPositionId)) {
            toast.error("Invalid job position ID")
            router.push("/job-positions")
            return
        }

        fetchInitialData()
    }, [selectedInstitution, selectedBranch, jobPositionId, router])

    const fetchInitialData = async () => {
        if (!selectedInstitution) return

        try {
            setIsLoading(true)
            const [fetchedJobPosition, fetchedDepartments, fetchedJobPositions] = await Promise.all([
                getJobPosition({ jobPositionId }),
                getDepartments({ institutionId: selectedInstitution.id }),
                getJobPositions({ institutionId: selectedInstitution.id }),
            ])

            if (fetchedJobPosition) {
                setJobPosition(fetchedJobPosition)
                setFormData({
                    name: fetchedJobPosition.name,
                    description: fetchedJobPosition.description || "",
                    department: fetchedJobPosition.department,
                    reportsTo: fetchedJobPosition.reportsTo || null,
                    contractTemplate: null, // Files are not pre-loaded for editing
                    offerLetterTemplate: null,
                    salary: fetchedJobPosition.salary.toString(),
                })
            } else {
                toast.error("Job position not found")
                router.push("/job-positions")
                return
            }

            if (fetchedDepartments) {
                setDepartments(fetchedDepartments)
            }
            if (fetchedJobPositions) {
                // Filter out the current position from the reports-to options
                setJobPositions(fetchedJobPositions.filter((pos) => pos.id !== jobPositionId))
            }
        } catch (error) {
            console.error("Error fetching initial data:", error)
            toast.error("Failed to load job position data")
            router.push("/job-positions")
        } finally {
            setIsLoading(false)
        }
    }

    const updateFormData = (field: keyof JobPositionFormData, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }))
        }
    }

    const handleFileChange = (field: "contractTemplate" | "offerLetterTemplate", file: File | null) => {
        updateFormData(field, file)
    }

    const removeFile = (field: "contractTemplate" | "offerLetterTemplate") => {
        updateFormData(field, null)
    }

    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof JobPositionFormData, string>> = {}

        if (!formData.name.trim()) {
            newErrors.name = "Job position name is required"
        } else if (formData.name.trim().length < 2) {
            newErrors.name = "Job position name must be at least 2 characters"
        }

        if (!formData.description.trim()) {
            newErrors.description = "Job description is required"
        } else if (formData.description.trim().length < 10) {
            newErrors.description = "Description must be at least 10 characters"
        }

        if (!formData.department) {
            newErrors.department = "Please select a department"
        }

        if (!formData.salary.trim()) {
            newErrors.salary = "Salary is required"
        } else if (isNaN(Number(formData.salary)) || Number(formData.salary) <= 0) {
            newErrors.salary = "Please enter a valid salary amount"
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!selectedInstitution || !selectedBranch || !jobPosition) {
            toast.error("Missing required information")
            return
        }

        if (!validateForm()) {
            toast.error("Please fix the form errors before submitting")
            return
        }

        setIsSubmitting(true)

        try {
            const updateData: CreateJobPositionData = {
                name: formData.name.trim(),
                description: formData.description.trim(),
                department: formData.department!,
                salary: Number(formData.salary),
            }

            if (formData.reportsTo) {
                updateData.reports_to = formData.reportsTo
            }

            if (formData.contractTemplate) {
                updateData.contract_template = formData.contractTemplate
            }

            if (formData.offerLetterTemplate) {
                updateData.offer_letter_template = formData.offerLetterTemplate
            }

            const updatedJobPosition = await updateJobPosition({
                jobPositionId,
                jobPositionData: updateData,
            })

            if (updatedJobPosition) {
                toast.success("Job position updated successfully!")
                router.push(`/job-positions/`)
            } else {
                toast.error("Failed to update job position. Please try again.")
            }
        } catch (error) {
            console.error("Error updating job position:", error)
            toast.error("Failed to update job position. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleBack = () => {
        router.back()
    }

    if (!selectedInstitution || !selectedBranch) {
        return <div>Loading...</div>
    }

    if (isLoading) {
        return (
            <div className="w-full h-full p-6">
                <div className="w-full space-y-6">
                    {/* Header Skeleton */}
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-9 w-32" />
                    </div>

                    <Card className="w-full">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className="space-y-2">
                                    <Skeleton className="h-6 w-48" />
                                    <Skeleton className="h-4 w-64" />
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {[...Array(4)].map((_, i) => (
                                    <div key={i} className="space-y-2">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-24 w-full" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full h-full p-6">
            <div className="w-full space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={handleBack} className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Job Position
                    </Button>
                </div>

                <Card className="w-full">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <Briefcase className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Edit Job Position</CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Update job position details for {selectedBranch.branch_name} - {selectedInstitution.institution_name}
                                </p>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Form Fields - Responsive Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Job Position Name */}
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-sm font-medium">
                                        Job Position Name *
                                    </Label>
                                    <Input
                                        id="name"
                                        type="text"
                                        placeholder="e.g., Software Engineer, HR Manager, Sales Representative"
                                        value={formData.name}
                                        onChange={(e) => updateFormData("name", e.target.value)}
                                        className={errors.name ? "border-destructive" : ""}
                                    />
                                    {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                                </div>

                                {/* Salary */}
                                <div className="space-y-2">
                                    <Label htmlFor="salary" className="text-sm font-medium">
                                        Salary *
                                    </Label>
                                    <Input
                                        id="salary"
                                        type="number"
                                        placeholder="50000"
                                        value={formData.salary}
                                        onChange={(e) => updateFormData("salary", e.target.value)}
                                        className={errors.salary ? "border-destructive" : ""}
                                    />
                                    {errors.salary && <p className="text-sm text-destructive">{errors.salary}</p>}
                                </div>

                                {/* Department */}
                                <div className="space-y-2">
                                    <Label htmlFor="department" className="text-sm font-medium">
                                        Department *
                                    </Label>
                                    <Select
                                        value={formData.department?.toString() || ""}
                                        onValueChange={(value) => updateFormData("department", Number(value))}
                                    >
                                        <SelectTrigger className={errors.department ? "border-destructive" : ""}>
                                            <SelectValue placeholder="Select a department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {departments.map((dept) => (
                                                <SelectItem key={dept.id} value={dept.id.toString()}>
                                                    {dept.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {errors.department && <p className="text-sm text-destructive">{errors.department}</p>}
                                </div>

                                {/* Reports To */}
                                <div className="space-y-2">
                                    <Label htmlFor="reportsTo" className="text-sm font-medium">
                                        Reports To (Optional)
                                    </Label>
                                    <Select
                                        value={formData.reportsTo?.toString() || "0"}
                                        onValueChange={(value) => updateFormData("reportsTo", value === "0" ? null : Number(value))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a position (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="0">None</SelectItem>
                                            {jobPositions.map((position) => (
                                                <SelectItem key={position.id} value={position.id.toString()}>
                                                    {position.name} - {position.department_details?.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Job Description - Full Width */}
                            <div className="space-y-2">
                                <Label htmlFor="description" className="text-sm font-medium">
                                    Job Description *
                                </Label>
                                <Textarea
                                    id="description"
                                    placeholder="Describe the job responsibilities, requirements, and qualifications..."
                                    value={formData.description}
                                    onChange={(e) => updateFormData("description", e.target.value)}
                                    rows={4}
                                    className={errors.description ? "border-destructive" : ""}
                                />
                                {errors.description && <p className="text-sm text-destructive">{errors.description}</p>}
                            </div>

                            {/* Current Files Display */}
                            {(jobPosition?.contractTemplate || jobPosition?.offerLetterTemplate) && (
                                <div className="space-y-4">
                                    <h4 className="font-medium text-sm">Current Templates</h4>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                        {jobPosition.contractTemplate && (
                                            <div className="border rounded-lg p-3 bg-muted/30">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-primary" />
                                                    <span className="text-sm font-medium">Current Contract Template</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">Upload a new file to replace</p>
                                            </div>
                                        )}
                                        {jobPosition.offerLetterTemplate && (
                                            <div className="border rounded-lg p-3 bg-muted/30">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-primary" />
                                                    <span className="text-sm font-medium">Current Offer Letter Template</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground mt-1">Upload a new file to replace</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* File Uploads */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Contract Template */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Contract Template (Optional)</Label>
                                    {formData.contractTemplate ? (
                                        <div className="border rounded-lg p-4 bg-muted/50">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-primary" />
                                                    <span className="text-sm font-medium">{formData.contractTemplate.name}</span>
                                                </div>
                                                <Button type="button" variant="ghost" size="sm" onClick={() => removeFile("contractTemplate")}>
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {(formData.contractTemplate.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                                            <div className="text-center">
                                                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                                <Label htmlFor="contractTemplate" className="cursor-pointer">
                                                    <span className="text-sm font-medium text-primary hover:text-primary/80">
                                                        Click to upload new contract template
                                                    </span>
                                                    <Input
                                                        id="contractTemplate"
                                                        type="file"
                                                        accept=".pdf,.doc,.docx"
                                                        onChange={(e) => handleFileChange("contractTemplate", e.target.files?.[0] || null)}
                                                        className="hidden"
                                                    />
                                                </Label>
                                                <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX up to 10MB</p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Offer Letter Template */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Offer Letter Template (Optional)</Label>
                                    {formData.offerLetterTemplate ? (
                                        <div className="border rounded-lg p-4 bg-muted/50">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="h-4 w-4 text-primary" />
                                                    <span className="text-sm font-medium">{formData.offerLetterTemplate.name}</span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeFile("offerLetterTemplate")}
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {(formData.offerLetterTemplate.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                                            <div className="text-center">
                                                <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                                <Label htmlFor="offerLetterTemplate" className="cursor-pointer">
                                                    <span className="text-sm font-medium text-primary hover:text-primary/80">
                                                        Click to upload new offer letter template
                                                    </span>
                                                    <Input
                                                        id="offerLetterTemplate"
                                                        type="file"
                                                        accept=".pdf,.doc,.docx"
                                                        onChange={(e) => handleFileChange("offerLetterTemplate", e.target.files?.[0] || null)}
                                                        className="hidden"
                                                    />
                                                </Label>
                                                <p className="text-xs text-muted-foreground mt-1">PDF, DOC, DOCX up to 10MB</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Job Position Info Display */}
                            <div className="bg-muted/50 p-4 rounded-lg">
                                <h4 className="font-medium text-sm mb-3">Job Position Information:</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                                    <div className="space-y-2">
                                        <p>
                                            <span className="font-medium text-foreground">Position:</span> {jobPosition?.name}
                                        </p>
                                        <p>
                                            <span className="font-medium text-foreground">Institution:</span> {jobPosition?.department_details?.institution_details?.institution_name}
                                        </p>

                                    </div>
                                </div>
                            </div>

                            {/* Form Actions */}
                            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleBack}
                                    disabled={isSubmitting}
                                    className="w-full sm:w-auto"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex items-center justify-center gap-2 w-full sm:w-auto"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="h-4 w-4" />
                                            Update Job Position
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
