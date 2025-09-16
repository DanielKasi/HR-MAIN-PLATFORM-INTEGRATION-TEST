import type { ApprovalTask } from "@/types/approvals.types";

import React from "react";

export type ApprovalTasksWidgetProps = {
	tasks: ApprovalTask[];
	title?: string;
	onApprove: (id: number, comment?: string) => void;
	onReject: (id: number, comment?: string) => void;
	className?: string;
};

export const ApprovalTasksWidget: React.FC<ApprovalTasksWidgetProps> = ({
	tasks,
	title,
	onApprove,
	onReject,
	className,
}) => {
	return (
		<div className={className}>
			{title ? <div className="text-sm font-semibold mb-2">{title}</div> : null}
			<div className="border rounded">
				<table className="w-full text-sm">
					<thead className="bg-gray-50">
						<tr>
							<th className="text-left p-2">Level</th>
							<th className="text-left p-2">Name</th>
							<th className="text-left p-2">Status</th>
							<th className="text-left p-2">Updated</th>
							<th className="text-left p-2">Actions</th>
						</tr>
					</thead>
					<tbody>
						{tasks.map((t) => (
							<tr key={t.id} className="border-t">
								<td className="p-2">{t.level.level}</td>
								<td className="p-2">{t.level.name || `Level ${t.level.level}`}</td>
								<td className="p-2">{t.status}</td>
								<td className="p-2">{new Date(t.updated_at).toLocaleString()}</td>
								<td className="p-2 flex gap-2">
									<button
										className="px-2 py-1 text-xs rounded bg-green-600 text-white disabled:opacity-50"
										disabled={t.status !== "pending"}
										onClick={() => onApprove(t.id)}
									>
										Approve
									</button>
									<button
										className="px-2 py-1 text-xs rounded bg-red-600 text-white disabled:opacity-50"
										disabled={t.status !== "pending"}
										onClick={() => onReject(t.id)}
									>
										Reject
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default ApprovalTasksWidget;
