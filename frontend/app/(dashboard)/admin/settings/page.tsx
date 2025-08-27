"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Icon } from "@iconify/react"
import { toast } from "sonner"
import { ConfirmationDialog } from "@/components/confirmation-dialog"
import { useSelector } from "react-redux"
import { selectAttachedInstitutions, selectSelectedInstitution } from "@/store/auth/selectors"
import { IUserInstitutionFormData } from "@/types"
import { institutionAPI, showErrorToast } from "@/lib/utils"
import { useDispatch } from "react-redux"
import { setAttachedInstitutions, setSelectedInstitution } from "@/store/auth/actions"
import { Upload, FileText, X, Check } from "lucide-react"

interface DocumentFile {
    id: string;
    title: string;
    file: File | null;
    fileName: string;
}

export default function SettingsPage() {
    const institution = useSelector(selectSelectedInstitution);
    const attachedInstitutions = useSelector(selectAttachedInstitutions);
    const [formData, setFormData] = useState({
        institution_name: "",
        institution_email: "",
        first_phone_number: "",
        location: "",
        user_inactivity_time: 30,
        is_attendance_penalties_enabled: false,
        latitude: 0,
        longitude: 0,
    })
    const [logoFile, setLogoFile] = useState<File | null>(null)
    const [documents, setDocuments] = useState<DocumentFile[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isEditing, setIsEditing] = useState({
        institution_name: false,
        institution_email: false,
        first_phone_number: false,
        location: false,
        user_inactivity_time: false,
        is_attendance_penalties_enabled: false,
        logo: false,
        documents: false,
    })
    const [confirmationDialog, setConfirmationDialog] = useState({
        isOpen: false,
        title: "",
        description: "",
        onConfirm: () => { },
    })

    const dispatch = useDispatch();

    useEffect(() => {
        if (institution) {
            setFormData({
                institution_name: institution.institution_name,
                institution_email: institution.institution_email,
                first_phone_number: institution.first_phone_number,
                location: institution.location,
                user_inactivity_time: institution.user_inactivity_time,
                is_attendance_penalties_enabled: institution.is_attendance_penalties_enabled,
                latitude: institution.latitude,
                longitude: institution.longitude,
            })
        }
    }, [institution])

    const handleInputChange = (field: string, value: string | number | boolean) => {
        setFormData((prev) => ({ ...prev, [field]: value }))
    }

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("Logo file size must be less than 5MB")
                return
            }
            if (!file.type.startsWith("image/")) {
                toast.error("Please select a valid image file")
                return
            }
            setLogoFile(file)
        }
    }

    const toggleEdit = (field: keyof typeof isEditing) => {
        setIsEditing((prev) => ({ ...prev, [field]: !prev[field] }))
    }

    const handleUseCurrentLocation = () => {
        setConfirmationDialog({
            isOpen: true,
            title: "Use Current Location",
            description:
                "This will set your current location as the institution's location. Make sure you are at the institution premises before proceeding.",
            onConfirm: () => {
                if ("geolocation" in navigator) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            handleInputChange("latitude", position.coords.latitude)
                            handleInputChange("longitude", position.coords.longitude)
                        },
                        (error) => {
                            toast.error("Failed to get current location. Please check your location permissions.")
                        },
                    )
                } else {
                    toast.error("Geolocation is not supported by this browser")
                }
                setConfirmationDialog((prev) => ({ ...prev, isOpen: false }))
            },
        })
    }

    const handleSubmit = async () => {
        if (!institution) { return };
        setIsLoading(true)
        try {
            const updateData: Partial<IUserInstitutionFormData> & {
                institution_logo?: File;
                document_files?: File[];
                document_titles?: string[];
            } = {
                institution_name: formData.institution_name,
                institution_email: formData.institution_email,
                first_phone_number: formData.first_phone_number,
                location: formData.location,
                user_inactivity_time: formData.user_inactivity_time,
                is_attendance_penalties_enabled: formData.is_attendance_penalties_enabled,
                latitude: formData.latitude,
                longitude: formData.longitude,
            }

            if (logoFile) {
                updateData.institution_logo = logoFile
            }

            // Handle documents if any are added
            const validDocuments = documents.filter(doc => doc.file && doc.title.trim())
            if (validDocuments.length > 0) {
                updateData.document_files = validDocuments.map(doc => doc.file!)
                updateData.document_titles = validDocuments.map(doc => doc.title.trim())
            }

            const updatedInstitution = await institutionAPI.updateInstitution({
                institutionId: institution.id,
                data: updateData,
            })

            dispatch(setSelectedInstitution(updatedInstitution));
            dispatch(setAttachedInstitutions([...attachedInstitutions.map((inst) => inst.id === updatedInstitution.id ? updatedInstitution : inst)]))

            setLogoFile(null)
            setDocuments([]) // Clear documents after successful submission
            setIsEditing(prev => ({ ...prev, documents: false })) // Close document editing mode
            toast.success("Settings updated successfully")

        } catch (error) {
            showErrorToast({ error, defaultMessage: "Failed to update settings" })
        } finally {
            setIsLoading(false)
        }
        setConfirmationDialog((prev) => ({ ...prev, isOpen: false }))
    }

    const handleSave = () => {
        if (formData.user_inactivity_time > 180) {
            toast.error("User inactivity time cannot exceed 3 hours (180 minutes)")
            return
        }

        if (formData.user_inactivity_time < 1) {
            toast.error("User inactivity time must be at least 1 minute")
            return
        }

        // Validate documents if any are being added
        const invalidDocuments = documents.filter(doc => doc.file && !doc.title.trim())
        if (invalidDocuments.length > 0) {
            toast.error("Please provide titles for all uploaded documents")
            return
        }

        setConfirmationDialog({
            isOpen: true,
            title: "Update Institution Settings",
            description:
                "Are you sure you want to update these institution settings? This will affect all users in your institution.",
            onConfirm: handleSubmit
        })
    }

    const formatTimeout = (minutes: number) => {
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        if (hours > 0) {
            return `${hours}h ${mins}m`
        }
        return `${mins}m`
    }

    // Document management functions
    const addDocument = () => {
        const newDoc: DocumentFile = {
            id: Date.now().toString(),
            title: "",
            file: null,
            fileName: "",
        }
        setDocuments((prev) => [...prev, newDoc])
    }

    const updateDocument = (id: string, field: keyof DocumentFile, value: any) => {
        setDocuments((prev) =>
            prev.map((doc) => (doc.id === id ? { ...doc, [field]: value } : doc))
        )
    }

    const removeDocument = (id: string) => {
        setDocuments((prev) => prev.filter((doc) => doc.id !== id))
    }

    const handleFileChange = (id: string, file: File | null) => {
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                toast.error("File size must be less than 10MB")
                return
            }
            const allowedTypes = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"]
            const fileExtension = file.name.split(".").pop()?.toLowerCase()
            if (!fileExtension || !allowedTypes.includes(`.${fileExtension}`)) {
                toast.error("File type not allowed. Allowed types: PDF, DOC, DOCX, JPG, PNG")
                return
            }
        }
        updateDocument(id, "file", file)
        updateDocument(id, "fileName", file ? file.name : "")
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="">
                <h1 className="inline-block text-black px-4 py-2 rounded-xl font-semibold text-xl md:text-3xl">
                    Settings
                </h1>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <Card className="lg:col-span-1 rounded-2xl border-0 shadow-sm">
                        <CardContent className="p-8">
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className="relative">
                                    {institution?.institution_logo || logoFile ? (
                                        <img
                                            src={logoFile ? URL.createObjectURL(logoFile) : institution?.institution_logo!}
                                            alt="Institution Logo"
                                            className="w-20 h-20 rounded-2xl object-cover"
                                        />
                                    ) : (
                                        <div className="w-20 h-20 bg-gradient-to-br from-primary/30 to-primary/50 rounded-2xl flex items-center justify-center">
                                            <Icon icon="hugeicons:building-04" className="w-10 h-10 text-white" />
                                        </div>
                                    )}
                                    {isEditing.logo && (
                                        <div className="absolute -bottom-2 -right-2">
                                            <label htmlFor="logo-upload" className="cursor-pointer">
                                                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                                                    <Icon icon="hugeicons:camera-01" className="w-4 h-4 text-white" />
                                                </div>
                                            </label>
                                            <input
                                                id="logo-upload"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleLogoChange}
                                                className="hidden"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg text-gray-900">{formData.institution_name}</h3>
                                    <p className="text-gray-600 text-sm">{formData.institution_email}</p>
                                    <p className="text-gray-500 text-sm mt-1">{formData.first_phone_number}</p>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleEdit("logo")}
                                    className="rounded-xl border-gray-200 hover:bg-gray-50"
                                >
                                    {isEditing.logo ? "Cancel" : "Change Logo"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="lg:col-span-2 rounded-2xl border-0 shadow-sm">
                        <CardContent className="p-8">
                            <div className="border-b border-gray-200 mb-8">
                                <div className="flex items-center space-x-2 pb-4">
                                    <Icon icon="hugeicons:settings-02" className="w-5 h-5 text-gray-600" />
                                    <h2 className="text-lg font-semibold text-gray-900">Institution Settings</h2>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="space-y-2">
                                    <Label htmlFor="institution_name" className="text-sm font-medium text-gray-700">
                                        Institution Name
                                    </Label>
                                    <div className="flex items-center space-x-3">
                                        {isEditing.institution_name ? (
                                            <Input
                                                id="institution_name"
                                                value={formData.institution_name}
                                                onChange={(e) => handleInputChange("institution_name", e.target.value)}
                                                className="flex-1 rounded-xl border-gray-200 focus:border-orange-400 focus:ring-orange-400"
                                            />
                                        ) : (
                                            <div className="flex-1 px-4 py-3 bg-gray-50 rounded-xl text-gray-900">
                                                {formData.institution_name}
                                            </div>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => toggleEdit("institution_name")}
                                            className="rounded-xl border-gray-200 hover:bg-gray-50"
                                        >
                                            {isEditing.institution_name ? "Cancel" : "Change"}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="institution_email" className="text-sm font-medium text-gray-700">
                                        Email Address
                                    </Label>
                                    <div className="flex items-center space-x-3">
                                        {isEditing.institution_email ? (
                                            <Input
                                                id="institution_email"
                                                type="email"
                                                disabled
                                                value={formData.institution_email}
                                                onChange={(e) => handleInputChange("institution_email", e.target.value)}
                                                className="flex-1 rounded-xl border-gray-200 focus:border-orange-400 focus:ring-orange-400"
                                            />
                                        ) : (
                                            <div className="flex-1 px-4 py-3 bg-gray-50 rounded-xl text-gray-900">
                                                {formData.institution_email}
                                            </div>
                                        )}
                                        {/* <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => toggleEdit("institution_email")}
                                            className="rounded-xl border-gray-200 hover:bg-gray-50"
                                        >
                                            {isEditing.institution_email ? "Cancel" : "Change"}
                                        </Button> */}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="first_phone_number" className="text-sm font-medium text-gray-700">
                                        Phone Number
                                    </Label>
                                    <div className="flex items-center space-x-3">
                                        {isEditing.first_phone_number ? (
                                            <Input
                                                id="first_phone_number"
                                                value={formData.first_phone_number}
                                                onChange={(e) => handleInputChange("first_phone_number", e.target.value)}
                                                className="flex-1 rounded-xl border-gray-200 focus:border-orange-400 focus:ring-orange-400"
                                            />
                                        ) : (
                                            <div className="flex-1 px-4 py-3 bg-gray-50 rounded-xl text-gray-900">
                                                {formData.first_phone_number || "Not set"}
                                            </div>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => toggleEdit("first_phone_number")}
                                            className="rounded-xl border-gray-200 hover:bg-gray-50"
                                        >
                                            {isEditing.first_phone_number ? "Cancel" : "Change"}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="location" className="text-sm font-medium text-gray-700">
                                        Institution Location
                                    </Label>
                                    <div className="flex items-center space-x-3">
                                        {isEditing.location ? (
                                            <div className="flex-1 space-y-2">
                                                <Input
                                                    id="location"
                                                    value={formData.location}
                                                    onChange={(e) => handleInputChange("location", e.target.value)}
                                                    className="rounded-xl border-gray-200 focus:border-orange-400 focus:ring-orange-400"
                                                    placeholder="Enter institution address"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={handleUseCurrentLocation}
                                                    className="rounded-xl border-gray-200 hover:bg-gray-50 flex items-center space-x-2 bg-transparent"
                                                >
                                                    <Icon icon="hugeicons:location-01" className="w-4 h-4" />
                                                    <span>Use Current Location</span>
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex-1 px-4 py-3 bg-gray-50 rounded-xl text-gray-900">
                                                {formData.location || "Not set"}
                                            </div>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => toggleEdit("location")}
                                            className="rounded-xl border-gray-200 hover:bg-gray-50"
                                        >
                                            {isEditing.location ? "Cancel" : "Change"}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">Attendance Penalties</Label>
                                    <p className="text-xs text-gray-500 mb-2">Enable penalties for late arrivals and early departures</p>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                        <span className="text-gray-900">
                                            {formData.is_attendance_penalties_enabled ? "Enabled" : "Disabled"}
                                        </span>
                                        <Switch
                                            checked={formData.is_attendance_penalties_enabled}
                                            onCheckedChange={(checked) => handleInputChange("is_attendance_penalties_enabled", checked)}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="user_inactivity_time" className="text-sm font-medium text-gray-700">
                                        Auto Logout Timer
                                    </Label>
                                    <p className="text-xs text-gray-500 mb-2">
                                        Users will be automatically logged out after this period of inactivity (max 3 hours)
                                    </p>
                                    <div className="flex items-center space-x-3">
                                        {isEditing.user_inactivity_time ? (
                                            <div className="flex-1 flex items-center space-x-2">
                                                <Input
                                                    id="user_inactivity_time"
                                                    type="number"
                                                    min="1"
                                                    max="180"
                                                    value={formData.user_inactivity_time}
                                                    onChange={(e) =>
                                                        handleInputChange("user_inactivity_time", Number.parseInt(e.target.value) || 1)
                                                    }
                                                    className="w-24 rounded-xl border-gray-200 focus:border-orange-400 focus:ring-orange-400"
                                                />
                                                <span className="text-sm text-gray-600">minutes</span>
                                                <span className="text-xs text-gray-500">({formatTimeout(formData.user_inactivity_time)})</span>
                                            </div>
                                        ) : (
                                            <div className="flex-1 px-4 py-3 bg-gray-50 rounded-xl text-gray-900">
                                                {formData.user_inactivity_time} minutes ({formatTimeout(formData.user_inactivity_time)})
                                            </div>
                                        )}
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => toggleEdit("user_inactivity_time")}
                                            className="rounded-xl border-gray-200 hover:bg-gray-50"
                                        >
                                            {isEditing.user_inactivity_time ? "Cancel" : "Change"}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium text-gray-700">Documents (Optional)</Label>
                                    <p className="text-xs text-gray-500 mb-2">Upload any required documents for your organisation registration</p>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                        <span className="text-gray-900">
                                            {documents.length} document{documents.length !== 1 ? 's' : ''} uploaded
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => toggleEdit("documents")}
                                            className="rounded-xl border-gray-200 hover:bg-gray-50"
                                        >
                                            {isEditing.documents ? "Cancel" : "Manage Documents"}
                                        </Button>
                                    </div>

                                    {isEditing.documents && (
                                        <div className="w-full space-y-4 p-4 border border-gray-200 rounded-xl bg-white">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <Label className="text-sm font-medium">Documents (Optional)</Label>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Upload any required documents for your organisation registration
                                                    </p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={addDocument}
                                                    className="flex items-center gap-2"
                                                >
                                                    <Upload className="h-4 w-4" />
                                                    Add Document
                                                </Button>
                                            </div>

                                            {documents.length === 0 ? (
                                                <div className="w-full border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
                                                    <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                                                    <h3 className="text-base font-medium mb-2">No documents added</h3>
                                                    <p className="text-sm text-muted-foreground mb-3">Documents are optional. You can add them later from your dashboard.</p>
                                                    <div>
                                                        <Button type="button" onClick={addDocument} className="mt-4">
                                                            Add Document
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="w-full space-y-3">
                                                    {documents.map((doc, index) => (
                                                        <div key={doc.id} className="w-full border rounded-lg p-4 space-y-3 bg-card">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                                        <FileText className="h-4 w-4 text-primary" />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs text-muted-foreground">
                                                                            {doc.fileName || "No file selected"}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    type="button"
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => removeDocument(doc.id)}
                                                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                                                                >
                                                                    <X className="h-4 w-4" />
                                                                </Button>
                                                            </div>

                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                <div className="space-y-1">
                                                                    <Label className="text-sm font-medium">Document Title *</Label>
                                                                    <Input
                                                                        placeholder="e.g., Business License, Tax Certificate"
                                                                        value={doc.title}
                                                                        onChange={(e) => updateDocument(doc.id, "title", e.target.value)}
                                                                        className="w-full"
                                                                    />
                                                                </div>

                                                                <div className="space-y-1">
                                                                    <Label className="text-sm font-medium">Upload File *</Label>
                                                                    <div className="relative">
                                                                        <Input
                                                                            type="file"
                                                                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                                            onChange={(e) => handleFileChange(doc.id, e.target.files?.[0] || null)}
                                                                            className="w-full file:mr-4 file:py-1 file:px-3 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {doc.file && (
                                                                <div className="w-full p-2 bg-muted/50 rounded-md">
                                                                    <div className="flex items-center gap-2 text-xs">
                                                                        <Check className="h-3 w-3 text-green-600" />
                                                                        <span className="font-medium">File uploaded:</span>
                                                                        <span className="text-muted-foreground">{doc.fileName}</span>
                                                                        <span className="text-xs text-muted-foreground">
                                                                            ({(doc.file.size / 1024 / 1024).toFixed(2)} MB)
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}

                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        onClick={addDocument}
                                                        className="w-full h-10 border-dashed border-2 flex items-center gap-2 hover:bg-muted/50"
                                                    >
                                                        <Upload className="h-4 w-4" />
                                                        Add Another Document
                                                    </Button>
                                                </div>
                                            )}

                                            <div className="w-full bg-muted/50 p-3 rounded-lg">
                                                <div className="flex items-start gap-2">
                                                    <FileText className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                                    <div className="w-full">
                                                        <h4 className="font-medium text-xs mb-1">Document Guidelines</h4>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                                                            <ul className="space-y-0.5">
                                                                <li>• Accepted formats: PDF, DOC, DOCX, JPG, PNG</li>
                                                                <li>• Maximum file size: 10MB per document</li>
                                                            </ul>
                                                            <ul className="space-y-0.5">
                                                                <li>• Business license or registration</li>
                                                                <li>• Tax identification documents</li>
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-6">
                                    <Button
                                        onClick={handleSave}
                                        disabled={isLoading}
                                        className="w-full  text-white rounded-xl py-3 font-medium"
                                    >
                                        {isLoading ? (
                                            <div className="flex items-center space-x-2">
                                                <Icon icon="hugeicons:loading-03" className="w-4 h-4 animate-spin" />
                                                <span>Updating Changes...</span>
                                            </div>
                                        ) : (
                                            "Update Changes"
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <ConfirmationDialog
                isOpen={confirmationDialog.isOpen}
                onClose={() => setConfirmationDialog((prev) => ({ ...prev, isOpen: false }))}
                onConfirm={confirmationDialog.onConfirm}
                title={confirmationDialog.title}
                description={confirmationDialog.description}
                confirmText="Confirm"
                cancelText="Cancel"
            />
        </div>
    )
}


