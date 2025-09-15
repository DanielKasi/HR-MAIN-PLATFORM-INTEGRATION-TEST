
"use client";


import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X } from 'lucide-react';
import { cn } from "@/lib/utils";

interface PerformanceFormModalProps<T = any> {
    isOpen: boolean
    onClose: () => void
    title: string
    children: React.ReactNode
    onSubmit?: () => void
    submitLabel?: string
    isLoading?: boolean
    size?: "sm" | "md" | "lg" | "xl"
}

export function PerformanceFormModal<T = any>({
    isOpen,
    onClose,
    title,
    children,
    onSubmit,
    submitLabel = "Save",
    isLoading = false,
    size = "md",
}: PerformanceFormModalProps<T>) {
    const sizeClasses = {
        sm: "max-w-md",
        md: "max-w-lg",
        lg: "max-w-2xl",
        xl: "max-w-4xl",
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className={cn("p-0 rounded-xl overflow-y-hidden", sizeClasses[size])}>
                <DialogHeader className="px-6 py-4 border-b">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-xl font-semibold text-slate-900">{title}</DialogTitle>
                    </div>
                </DialogHeader>

                <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">{children}</div>

                {onSubmit && (
                    <DialogFooter className="px-6 py-4 border-t bg-slate-50">
                        <Button onClick={onSubmit} disabled={isLoading} className="w-full rounded-full">
                            {isLoading ? "Saving..." : submitLabel}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}
