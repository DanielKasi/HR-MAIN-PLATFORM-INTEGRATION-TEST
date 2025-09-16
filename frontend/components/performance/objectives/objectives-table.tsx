"use client"

import { PerformanceTable, type TableColumn, type TableAction } from "../common/performance-table"
import { StatusBadge } from "../common/status-badge"
import type { IObjective } from "@/types/types.utils"
import { Edit, Trash2, Target, User, Clock } from "lucide-react"

interface ObjectivesTableProps {
    objectives: IObjective[]
    onEdit: (objective: IObjective) => void
    onDelete: (objective: IObjective) => void
    onAdd: () => void
    onSearch?: (query: string) => void
    isLoading?: boolean
}

export function ObjectivesTable({ objectives, onEdit, onDelete, onAdd, onSearch, isLoading }: ObjectivesTableProps) {
    const columns: TableColumn<IObjective>[] = [
        {
            key: "name",
            label: "Objective",
            render: (objective) => (
                <div>
                    <div className="font-medium text-slate-900 mb-1">{objective.name}</div>
                    <div className="text-sm text-slate-500 line-clamp-2">{objective.description}</div>
                </div>
            ),
            className: "max-w-xs",
        },
        {
            key: "duration",
            label: "Duration",
            render: (objective) => (
                <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="h-4 w-4" />
                    <span>
                        {objective.duration} {objective.duration_unit}
                    </span>
                </div>
            ),
        },
        {
            key: "managers",
            label: "Manager",
            render: (objective) => (
                <div className="flex items-center gap-2">
                    {objective.managers ? (
                        <>
                            <User className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-600">{objective.managers.user?.fullname || "Unknown"}</span>
                        </>
                    ) : (
                        <span className="text-slate-400 italic">No manager</span>
                    )}
                </div>
            ),
        },
        {
            key: "assignees",
            label: "Assignee",
            render: (objective) => (
                <div className="flex items-center gap-2">
                    {objective.assignees ? (
                        <>
                            <User className="h-4 w-4 text-slate-400" />
                            <span className="text-slate-600">{objective.assignees.length || 0}</span>
                        </>
                    ) : (
                        <span className="text-slate-400 italic">No assignee</span>
                    )}
                </div>
            ),
        },
        {
            key: "key_result",
            label: "Key Result",
            render: (objective) => (
                <div>
                    {objective.key_result ? (
                        <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-blue-500" />
                            <div>
                                <div className="text-sm font-medium text-slate-900">{objective.key_result.title}</div>
                                <StatusBadge status={objective.key_result.progress_type} />
                            </div>
                        </div>
                    ) : (
                        <span className="text-slate-400 italic">No key result</span>
                    )}
                </div>
            ),
        },
        {
            key: "self_employee_progress_update",
            label: "Self Updates",
            render: (objective) => <StatusBadge status={objective.self_employee_progress_update ? "enabled" : "disabled"} />,
        },
    ]

    const actions: TableAction<IObjective>[] = [
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
            data={objectives}
            columns={columns}
            actions={actions}
            onAdd={onAdd}
            addLabel="Create Objective"
            searchPlaceholder="Search objectives..."
            onSearch={onSearch}
            isLoading={isLoading}
            emptyMessage="No objectives found"
        />
    )
}
