import React, { useState } from "react";
import type { ApprovalTask } from "@/types/approvals.types";

export type ApprovalActionBarProps = {
  currentTask?: ApprovalTask;
  canApprove: boolean;
  canOverride: boolean;
  onApprove: (comment?: string) => void;
  onReject: (comment?: string) => void;
  onOverride?: (comment?: string) => void;
  className?: string;
};

export const ApprovalActionBar: React.FC<ApprovalActionBarProps> = ({
  currentTask,
  canApprove,
  canOverride,
  onApprove,
  onReject,
  onOverride,
  className,
}) => {
  const [comment, setComment] = useState<string>("");

  const disabled = !currentTask || currentTask.status !== "pending";

  return (
    <div className={`flex flex-col gap-2 ${className || ""}`}>
      <textarea
        className="w-full border rounded p-2 text-sm"
        placeholder="Optional comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <div className="flex gap-2">
        <button
          className="px-3 py-1.5 text-sm rounded bg-green-600 text-white disabled:opacity-50"
          disabled={disabled || !canApprove}
          onClick={() => onApprove(comment || undefined)}
        >
          Approve
        </button>
        <button
          className="px-3 py-1.5 text-sm rounded bg-red-600 text-white disabled:opacity-50"
          disabled={disabled || !canApprove}
          onClick={() => onReject(comment || undefined)}
        >
          Reject
        </button>
        <button
          className="px-3 py-1.5 text-sm rounded bg-amber-600 text-white disabled:opacity-50"
          disabled={disabled || !canOverride}
          onClick={() => onOverride && onOverride(comment || undefined)}
          title={!onOverride ? "Override not available" : undefined}
        >
          Override
        </button>
      </div>
    </div>
  );
};

export default ApprovalActionBar; 