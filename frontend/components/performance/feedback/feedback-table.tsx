"use client"

import { PerformanceTable, type TableColumn, type TableAction } from "../common/performance-table"
import { StatusBadge } from "../common/status-badge"
import type { IFeedback360 } from "@/types/types.utils"
import { Edit, Trash2, User, Star, Calendar, Eye, EyeOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface FeedbackTableProps {
    feedback: IFeedback360[]
    onEdit: (feedback: IFeedback360) => void
    onDelete: (feedback: IFeedback360) => void
    onAdd: () => void
    onSearch?: (query: string) => void
    isLoading?: boolean
}

export function FeedbackTable({ feedback, onEdit, onDelete, onAdd, onSearch, isLoading }: FeedbackTableProps) {
    const columns: TableColumn<IFeedback360>[] = [
        {
            key: "given_by",
            label: "Reviewee",
            render: (item) => (
                <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-slate-400" />
                    <div>
                        <div className="font-medium text-slate-900">{item.given_by.user?.fullname || "Unknown"}</div>
                        <div className="text-sm text-slate-500">{item.given_by.department?.name || "No department"}</div>
                    </div>
                </div>
            ),
        },
        {
            key: "reviewer",
            label: "Reviewer",
            render: (item) => (
                <div className="flex items-center gap-2">
                    {item.is_anonymous ? (
                        <>
                            <EyeOff className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-500 italic">Anonymous</span>
                        </>
                    ) : (
                        <>
                            <User className="h-4 w-4 text-slate-400" />
                            <div>
                                <div className="font-medium text-slate-900">{item.reviewer.user?.fullname || "Unknown"}</div>
                                <div className="text-sm text-slate-500">{item.reviewer.department?.name || "No department"}</div>
                            </div>
                        </>
                    )}
                </div>
            ),
        },
        {
            key: "rating",
            label: "Rating",
            render: (item) => (
                <div className="flex items-center gap-2">
                    {item.rating ? (
                        <>
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="font-medium text-slate-900">{item.rating}/10</span>
                            <div className="w-16 bg-slate-200 rounded-full h-2">
                                <div
                                    className="bg-yellow-500 h-2 rounded-full transition-all"
                                    style={{ width: `${(item.rating / 10) * 100}%` }}
                                />
                            </div>
                        </>
                    ) : (
                        <span className="text-slate-400 italic">No rating</span>
                    )}
                </div>
            ),
        },
        {
            key: "period",
            label: "Period",
            render: (item) => (
                <div>
                    {item.period ? (
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <span className="text-slate-600">{item.period.name}</span>
                        </div>
                    ) : (
                        <span className="text-slate-400 italic">No period</span>
                    )}
                </div>
            ),
        },
        {
            key: "submission_date",
            label: "Submitted",
            render: (item) => (
                <div className="flex items-center gap-2 text-slate-600">
                    <Calendar className="h-4 w-4" />
                    {new Date(item.submission_date).toLocaleDateString()}
                </div>
            ),
        },
        {
            key: "feedback_preview",
            label: "Feedback Preview",
            render: (item) => (
                <div className="max-w-xs">
                    <div className="text-sm text-slate-600 line-clamp-2">{item.feedback_text || "No feedback text"}</div>
                    <div className="flex gap-1 mt-1">
                        {item.strengths && (
                            <Badge variant="outline" className="text-xs">
                                Strengths
                            </Badge>
                        )}
                        {item.areas_for_improvement && (
                            <Badge variant="outline" className="text-xs">
                                Improvements
                            </Badge>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: "is_anonymous",
            label: "Type",
            render: (item) => (
                <div className="flex items-center gap-2">
                    {item.is_anonymous ? (
                        <>
                            <EyeOff className="h-4 w-4 text-slate-400" />
                            <StatusBadge status="anonymous" />
                        </>
                    ) : (
                        <>
                            <Eye className="h-4 w-4 text-slate-400" />
                            <StatusBadge status="public" />
                        </>
                    )}
                </div>
            ),
        },
    ]

    const actions: TableAction<IFeedback360>[] = [
        {
            label: "Edit",
            icon: <Edit className="h-4 w-4" />,
            onClick: onEdit,
        },
        {
            label: "Delete",
            icon: <Trash2 className="h-4 w-4" />,
            onClick: onDelete,
            variant: "destructive",
        },
    ]

    return (
        <PerformanceTable
            data={feedback}
            columns={columns}
            actions={actions}
            onAdd={onAdd}
            addLabel="Give Feedback"
            searchPlaceholder="Search by given_by or reviewer..."
            onSearch={onSearch}
            isLoading={isLoading}
            emptyMessage="No feedback found"
        />
    )
}
