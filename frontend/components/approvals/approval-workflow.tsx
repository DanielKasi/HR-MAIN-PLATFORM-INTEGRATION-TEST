"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { CheckCircle, Clock, FileCheck, RefreshCw, MessageSquare } from "lucide-react"
import { approveApprovalTask, rejectApprovalTask } from "@/lib/api/approvals/utils"
import type { ApprovalTask } from "@/types/approvals.types"
import { formatDate } from "@/lib/helpers"

interface ApprovalWorkflowProps {
    approvalTasks: ApprovalTask[]
    onTaskUpdate?: (updatedTask: ApprovalTask) => void
    triggerText?: string
    triggerVariant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive"
    className?: string
}

export function ApprovalWorkflow({
    approvalTasks,
    onTaskUpdate,
    triggerText = "View Approvals",
    triggerVariant = "outline",
    className = "",
}: ApprovalWorkflowProps) {
    const [isProcessing, setIsProcessing] = useState(false)
    const [showCommentFor, setShowCommentFor] = useState<{ taskId: number; action: "approve" | "reject" } | null>(null)
    const [comment, setComment] = useState("")
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    const handleActionClick = (taskId: number, action: "approve" | "reject") => {
        setShowCommentFor({ taskId, action })
        setComment("")
    }

    const handleSubmitAction = async () => {
        if (!showCommentFor) return

        setIsProcessing(true)
        try {
            let updatedTask: ApprovalTask
            if (showCommentFor.action === "approve") {
                updatedTask = await approveApprovalTask(showCommentFor.taskId, comment || undefined)
            } else {
                updatedTask = await rejectApprovalTask(showCommentFor.taskId, comment || undefined)
            }

            if (onTaskUpdate) {
                onTaskUpdate(updatedTask)
            }

            setShowCommentFor(null)
            setComment("")
        } catch (error) {
            console.error(`Failed to ${showCommentFor.action} task:`, error)
        } finally {
            setIsProcessing(false)
        }
    }

    const handleCancelAction = () => {
        setShowCommentFor(null)
        setComment("")
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case "approved":
                return "bg-green-100 text-green-800 border-green-200"
            case "rejected":
                return "bg-red-100 text-red-800 border-red-200"
            case "pending":
                return "bg-blue-100 text-blue-800 border-blue-200"
            default:
                return "bg-gray-100 text-gray-800 border-gray-200"
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "approved":
                return <CheckCircle className="h-4 w-4 text-green-600" />
            case "rejected":
                return <CheckCircle className="h-4 w-4 text-red-600" />
            case "pending":
                return <Clock className="h-4 w-4 text-blue-600" />
            default:
                return <Clock className="h-4 w-4 text-gray-600" />
        }
    }

    const getStatusText = (status: string) => {
        switch (status) {
            case "approved":
                return "Approved"
            case "rejected":
                return "Rejected"
            case "pending":
                return "Pending"
            default:
                return "Not Started"
        }
    }

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button variant={triggerVariant} className={`gap-2 ${className}`}>
                    <FileCheck className="h-4 w-4" />
                    {triggerText}
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileCheck className="h-5 w-5" />
                        Approval Steps
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {approvalTasks.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">No approval tasks found for this record.</div>
                    ) : (
                        approvalTasks.map((task, index) => (
                            <div key={task.id} className="relative">
                                <div className="flex items-start gap-3 lg:gap-4">
                                    <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${task.status === "approved"
                                            ? "bg-green-100 border-green-500"
                                            : task.status === "rejected"
                                                ? "bg-red-100 border-red-500"
                                                : "bg-blue-100 border-blue-400"
                                            }`}
                                    >
                                        <span
                                            className={`text-sm font-semibold ${task.status === "approved"
                                                ? "text-green-700"
                                                : task.status === "rejected"
                                                    ? "text-red-700"
                                                    : "text-blue-700"
                                                }`}
                                        >
                                            {index + 1}
                                        </span>
                                    </div>

                                    <div className="flex flex-col bg-gray-50 rounded-lg p-4 flex-1">
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 justify-between">
                                            <h4 className="text-sm font-medium text-gray-900">
                                                {task.level?.name || `Approval Step ${index + 1}`}
                                            </h4>

                                            <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                                                <span className="flex items-center gap-1">
                                                    {getStatusIcon(task.status)}
                                                    {getStatusText(task.status)}
                                                </span>
                                            </Badge>
                                        </div>

                                        <p className="text-xs text-gray-500 mt-1">
                                            {task.status === "approved" || task.status === "rejected"
                                                ? `${getStatusText(task.status)} - ${formatDate(task.updated_at)}`
                                                : "Pending Approval"}
                                            {task.approved_by_fullname && <span className="ml-1">by {task.approved_by_fullname}</span>}
                                        </p>

                                        {task.comment && (
                                            <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
                                                <MessageSquare className="h-3 w-3 inline mr-1" />
                                                {task.comment}
                                            </div>
                                        )}

                                        {task.status === "pending" && !showCommentFor && (
                                            <div className="flex flex-col sm:flex-row gap-2 mt-3">
                                                <Button
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700 text-white text-xs h-8 rounded-full"
                                                    onClick={() => handleActionClick(task.id, "approve")}
                                                    disabled={isProcessing}
                                                >
                                                    Approve
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-red-600 border-red-300 hover:bg-red-50 text-xs h-8 rounded-full bg-transparent"
                                                    onClick={() => handleActionClick(task.id, "reject")}
                                                    disabled={isProcessing}
                                                >
                                                    Reject
                                                </Button>
                                            </div>
                                        )}

                                        {showCommentFor?.taskId === task.id && (
                                            <div className="mt-3 space-y-3 border-t pt-3">
                                                <div>
                                                    <Label htmlFor="comment" className="text-xs font-medium">
                                                        Comment (Optional)
                                                    </Label>
                                                    <Textarea
                                                        id="comment"
                                                        placeholder={`Add a comment for ${showCommentFor.action}ing this step...`}
                                                        value={comment}
                                                        onChange={(e) => setComment(e.target.value)}
                                                        className="mt-1 text-sm"
                                                        rows={3}
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        onClick={handleSubmitAction}
                                                        disabled={isProcessing}
                                                        className={`text-xs h-8 ${showCommentFor.action === "approve"
                                                            ? "bg-green-600 hover:bg-green-700"
                                                            : "bg-red-600 hover:bg-red-700"
                                                            }`}
                                                    >
                                                        {isProcessing ? (
                                                            <>
                                                                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                                                {showCommentFor.action === "approve" ? "Approving..." : "Rejecting..."}
                                                            </>
                                                        ) : (
                                                            `Confirm ${showCommentFor.action === "approve" ? "Approval" : "Rejection"}`
                                                        )}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={handleCancelAction}
                                                        disabled={isProcessing}
                                                        className="text-xs h-8 bg-transparent"
                                                    >
                                                        Cancel
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {index < approvalTasks.length - 1 && (
                                    <div
                                        className="absolute left-4 top-8 w-0.5 h-8 ml-1"
                                        style={{
                                            backgroundImage:
                                                "repeating-linear-gradient(0deg, transparent, transparent 2px, #d1d5db 2px, #d1d5db 4px)",
                                        }}
                                    />
                                )}
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
