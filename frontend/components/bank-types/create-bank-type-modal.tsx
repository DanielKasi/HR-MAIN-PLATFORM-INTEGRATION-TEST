import { IBankType, IBankTypeFormData } from "@/types/types.utils"
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { useState, useEffect } from "react"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { Button } from "../ui/button"

interface BankTypeModalProps {
    isOpen: boolean
    onClose: () => void
    editingType: IBankType | null
    onSave: (data: IBankTypeFormData) => Promise<void>
    isSubmitting: boolean
    existingTypes: IBankType[]
}


export function BankTypeModal({ isOpen, onClose, editingType, onSave, isSubmitting, existingTypes }: BankTypeModalProps) {
    const [formData, setFormData] = useState<IBankTypeFormData>({
        bank_fullname: "",
        bank_code: "",
        br_code: "",
    })
    const [errors, setErrors] = useState<Partial<Record<keyof IBankTypeFormData, string>>>({})

    // Reset form when modal opens/closes or editing type changes
    useEffect(() => {
        if (isOpen) {
            if (editingType) {
                setFormData({
                    bank_fullname: editingType.bank_fullname,
                    bank_code: editingType.bank_code,
                    br_code: editingType.br_code,
                })
            } else {
                setFormData({ bank_fullname: "", bank_code: "", br_code: "" })
            }
            setErrors({})
        }
    }, [isOpen, editingType])

    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof IBankTypeFormData, string>> = {}

        if (!formData.bank_fullname?.trim()) {
            newErrors.bank_fullname = "Bank full name is required"
        } else if (formData.bank_fullname.length > 200) {
            newErrors.bank_fullname = "Bank full name must be 200 characters or less"
        }

        if (!formData.bank_code?.trim()) {
            newErrors.bank_code = "Bank code is required"
        } else if (formData.bank_code.length > 10) {
            newErrors.bank_code = "Bank code must be 10 characters or less"
        }

        if (!formData.br_code?.trim()) {
            newErrors.br_code = "BR code is required"
        } else if (formData.br_code.length > 10) {
            newErrors.br_code = "BR code must be 10 characters or less"
        }

        // Check for duplicate bank codes (excluding current editing item)
        const duplicateBankCode = existingTypes.find(
            (type) => type.bank_code.toLowerCase() === formData.bank_code?.toLowerCase() && type.id !== editingType?.id,
        )
        if (duplicateBankCode) {
            newErrors.bank_code = "A bank type with this bank code already exists"
        }

        // Check for duplicate BR codes (excluding current editing item)
        const duplicateBrCode = existingTypes.find(
            (type) => type.br_code.toLowerCase() === formData.br_code?.toLowerCase() && type.id !== editingType?.id,
        )
        if (duplicateBrCode) {
            newErrors.br_code = "A bank type with this BR code already exists"
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }



    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!validateForm()) {
            return
        }

        try {
            await onSave(formData)
            onClose()
        } catch (error) {
            // Error is handled in parent component
        }
    }

    const handleInputChange = (field: keyof IBankTypeFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }))

        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }))
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{editingType ? "Edit Bank Type" : "Create Bank Type"}</DialogTitle>
                    <DialogDescription>
                        {editingType ? "Update the bank type information below." : "Add a new bank type to your organization."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="bank_fullname">
                                Bank Full Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="bank_fullname"
                                value={formData.bank_fullname || ""}
                                onChange={(e) => handleInputChange("bank_fullname", e.target.value)}
                                placeholder="e.g.National Bank of Uganda"
                                maxLength={200}
                                className={errors.bank_fullname ? "border-red-500" : ""}
                            />
                            {errors.bank_fullname && <p className="text-sm text-red-500">{errors.bank_fullname}</p>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="bank_code">
                                    Bank Code <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="bank_code"
                                    value={formData.bank_code || ""}
                                    onChange={(e) => handleInputChange("bank_code", e.target.value.toUpperCase())}
                                    placeholder="e.g., FNB"
                                    maxLength={10}
                                    className={errors.bank_code ? "border-red-500" : ""}
                                />
                                {errors.bank_code && <p className="text-sm text-red-500">{errors.bank_code}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="br_code">
                                    BR Code <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="br_code"
                                    value={formData.br_code || ""}
                                    onChange={(e) => handleInputChange("br_code", e.target.value.toUpperCase())}
                                    placeholder="e.g., 001"
                                    maxLength={10}
                                    className={errors.br_code ? "border-red-500" : ""}
                                />
                                {errors.br_code && <p className="text-sm text-red-500">{errors.br_code}</p>}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-4 pt-4">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {isSubmitting ? "Saving..." : editingType ? "Update Bank Type" : "Create Bank Type"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}