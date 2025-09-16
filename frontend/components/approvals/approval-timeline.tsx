import React from "react";
import type { Approval } from "@/types/approvals.types";

export type ApprovalTimelineProps = {
	approval?: Approval;
	approvals?: Approval[];
	className?: string;
};

export const ApprovalTimeline: React.FC<ApprovalTimelineProps> = ({
	approval,
	approvals,
	className,
}) => {
	const items: Approval[] = approvals || (approval ? [approval] : []);

	return (
		<div className={className}>
			{items.map((appr) => (
				<div key={appr.id} className="mb-4">
					<div className="text-sm font-semibold mb-2">
						{appr.document.description || `Approval #${appr.public_id}`}
					</div>
					<ol className="relative border-s border-gray-200 ml-2">
						{appr.tasks.map((t) => (
							<li key={t.id} className="mb-4 ms-4">
								<div className="absolute w-3 h-3 bg-gray-300 rounded-full mt-1.5 -start-1.5 border border-white"></div>
								<time className="mb-1 text-xs leading-none text-gray-500">
									Level {t.level.level}
								</time>
								<div className="text-sm font-medium">
									{t.level.name || `Level ${t.level.level}`}
								</div>
								<div className="text-xs text-gray-600">Status: {t.status}</div>
							</li>
						))}
					</ol>
				</div>
			))}
		</div>
	);
};

export default ApprovalTimeline;
