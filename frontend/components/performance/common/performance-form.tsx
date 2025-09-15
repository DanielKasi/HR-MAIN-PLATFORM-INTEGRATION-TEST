"use client"

import type React from "react"

import { useState, useEffect, forwardRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export interface FormField {
    name: string
    label: string
    type: "text" | "textarea" | "select" | "date" | "number" | "switch" | "multiselect"
    placeholder?: string
    required?: boolean
    options?: { value: string | number; label: string }[]
    validation?: (value: any) => string | null
    disabled?: boolean
    description?: string
}

interface PerformanceFormProps {
    fields: FormField[]
    initialData?: Record<string, any>
    onSubmit: (data: Record<string, any>) => void
    onCancel?: () => void
    isLoading?: boolean
    submitLabel?: string
    showCancel?: boolean
    showSubmit?: boolean // Added showSubmit prop to control submit button visibility
    className?: string
}

export const PerformanceForm = forwardRef<HTMLFormElement, PerformanceFormProps>(
    (
        {
            fields,
            initialData = {},
            onSubmit,
            onCancel,
            isLoading = false,
            submitLabel = "Save",
            showCancel = true,
            showSubmit = true, // Default to true for backward compatibility
            className,
        },
        ref,
    ) => {
        const [formData, setFormData] = useState<Record<string, any>>(initialData)
        const [errors, setErrors] = useState<Record<string, string>>({})

        useEffect(() => {
            setFormData(initialData)
        }, [initialData])

        const handleChange = (name: string, value: any) => {
            setFormData((prev) => ({ ...prev, [name]: value }))

            // Clear error when user starts typing
            if (errors[name]) {
                setErrors((prev) => ({ ...prev, [name]: "" }))
            }
        }

        const validateForm = () => {
            const newErrors: Record<string, string> = {}

            fields.forEach((field) => {
                const value = formData[field.name]

                // Required field validation
                if (field.required && (!value || (typeof value === "string" && !value.trim()))) {
                    newErrors[field.name] = `${field.label} is required`
                    return
                }

                // Custom validation
                if (field.validation && value) {
                    const error = field.validation(value)
                    if (error) {
                        newErrors[field.name] = error
                    }
                }
            })

            setErrors(newErrors)
            return Object.keys(newErrors).length === 0
        }

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault()

            if (validateForm()) {
                onSubmit(formData)
            }
        }

        const renderField = (field: FormField) => {
            const value = formData[field.name]
            const error = errors[field.name]

            switch (field.type) {
                case "text":
                case "number":
                    return (
                        <Input
                            type={field.type}
                            value={value || ""}
                            onChange={(e) => handleChange(field.name, e.target.value)}
                            placeholder={field.placeholder}
                            disabled={field.disabled || isLoading}
                            className={cn(error && "border-red-500")}
                        />
                    )

                case "textarea":
                    return (
                        <Textarea
                            value={value || ""}
                            onChange={(e) => handleChange(field.name, e.target.value)}
                            placeholder={field.placeholder}
                            disabled={field.disabled || isLoading}
                            className={cn("min-h-[100px]", error && "border-red-500")}
                        />
                    )

                case "select":
                    return (
                        <Select
                            value={value || ""}
                            onValueChange={(val) => handleChange(field.name, val)}
                            disabled={field.disabled || isLoading}
                        >
                            <SelectTrigger className={cn(error && "border-red-500")}>
                                <SelectValue placeholder={field.placeholder || `Select ${field.label}`} />
                            </SelectTrigger>
                            <SelectContent>
                                {field.options?.map((option) => (
                                    <SelectItem key={String(option.value)} value={String(option.value)}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )

                case "date":
                    return (
                        // <Popover>
                        //     <PopoverTrigger asChild>
                        //         <Button
                        //             variant="outline"
                        //             className={cn(
                        //                 "w-full justify-start text-left font-normal",
                        //                 !value && "text-muted-foreground",
                        //                 error && "border-red-500",
                        //             )}
                        //             disabled={field.disabled || isLoading}
                        //         >
                        //             <CalendarIcon className="mr-2 h-4 w-4" />
                        //             {value ? format(new Date(value), "PPP") : field.placeholder || "Pick a date"}
                        //         </Button>
                        //     </PopoverTrigger>
                        //     <PopoverContent className="w-auto p-0">
                        //         <Calendar
                        //         classNames={{
                        //             weekdays:"flex items-center justify-center gap-3",
                        //         }}
                        //             mode="single"
                        //             selected={value ? new Date(value) : undefined}
                        //             onSelect={(date) =>{ 
                        //                 date?.setDate(date.getDate() + 1)
                        //                 console.log("Selected date : ", date?.toISOString().split("T")[0])
                        //                 handleChange(field.name, date?.toISOString().split("T")[0])}}
                        //             autoFocus
                        //         />
                        //     </PopoverContent>
                        // </Popover>
                                            
                        <Input
                            type={"date"}
                            value={value || ""}
                            onChange={(e) => handleChange(field.name, e.target.value)}
                            placeholder={field.placeholder}
                            disabled={field.disabled || isLoading}
                            className={cn(error && "border-red-500")}
                        />
                    
                    )

                case "switch":
                    return (
                        <div className="flex items-center space-x-2">
                            <Switch
                                checked={Boolean(value)}
                                onCheckedChange={(checked) => handleChange(field.name, checked)}
                                disabled={field.disabled || isLoading}
                            />
                            <Label className="text-sm text-slate-600">{field.description || "Enable this option"}</Label>
                        </div>
                    )

                default:
                    return null
            }
        }

        return (
            <form ref={ref} onSubmit={handleSubmit} className={cn("space-y-6", className)}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {fields.map((field) => (
                        <div key={field.name} className={cn("space-y-2", field.type === "textarea" && "md:col-span-2")}>
                            <Label htmlFor={field.name} className="text-sm font-medium text-slate-700">
                                {field.label}
                                {field.required && <span className="text-red-500 ml-1">*</span>}
                            </Label>

                            {renderField(field)}

                            {errors[field.name] && <p className="text-sm text-red-600">{errors[field.name]}</p>}

                            {field.description && field.type !== "switch" && (
                                <p className="text-xs text-slate-500">{field.description}</p>
                            )}
                        </div>
                    ))}
                </div>

                {(showSubmit || (showCancel && onCancel)) && (
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        {showCancel && onCancel && (
                            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                                Cancel
                            </Button>
                        )}
                        {showSubmit && (
                            <Button type="submit" disabled={isLoading} className="px-8">
                                {isLoading ? "Saving..." : submitLabel}
                            </Button>
                        )}
                    </div>
                )}
            </form>
        )
    },
)

PerformanceForm.displayName = "PerformanceForm"
