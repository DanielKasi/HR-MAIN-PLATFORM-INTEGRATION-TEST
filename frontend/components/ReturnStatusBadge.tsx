"use client";

import { CheckCircle, XCircle, Clock } from "lucide-react";
import React from "react";

interface ReturnStatusBadgeProps {
	status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
}

export default function ReturnStatusBadge({ status }: ReturnStatusBadgeProps) {
	let badgeText: string;
	let badgeColor: string;
	let IconComponent: React.ElementType | null;

	switch (status) {
		case "PENDING":
			badgeText = "Pending";
			badgeColor = "bg-yellow-100 text-yellow-800";
			IconComponent = Clock;
			break;
		case "APPROVED":
			badgeText = "Approved";
			badgeColor = "bg-green-100 text-green-800";
			IconComponent = CheckCircle;
			break;
		case "REJECTED":
			badgeText = "Rejected";
			badgeColor = "bg-red-100 text-red-800";
			IconComponent = XCircle;
			break;
		case "CANCELLED":
			badgeText = "Canceled";
			badgeColor = "bg-gray-100 text-gray-800";
			IconComponent = XCircle;
			break;
		default:
			badgeText = "Unknown";
			badgeColor = "bg-gray-100 text-gray-800";
			IconComponent = null;
	}

	return (
		<span
			className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeColor}`}
		>
			{IconComponent && <IconComponent className="mr-1.5 h-4 w-4" />}
			{badgeText}
		</span>
	);
}

// "use client"

// import { CheckCircle, XCircle, Clock } from "lucide-react"

// interface ReturnStatusBadgeProps {
//   status: "PENDING" | "APPROVED" | "REJECTED"
// }

// export default function ReturnStatusBadge({ status }: ReturnStatusBadgeProps) {
//   let badgeText: string
//   let badgeColor: string
//   let icon

//   switch (status) {
//     case "PENDING":
//       badgeText = "Pending"
//       badgeColor = "bg-yellow-100 text-yellow-800"
//       icon = Clock
//       break
//     case "APPROVED":
//       badgeText = "Approved"
//       badgeColor = "bg-green-100 text-green-800"
//       icon = CheckCircle
//       break
//     case "REJECTED":
//       badgeText = "Rejected"
//       badgeColor = "bg-red-100 text-red-800"
//       icon = XCircle
//       break
//     default:
//       badgeText = "Unknown"
//       badgeColor = "bg-gray-100 text-gray-800"
//       icon = null
//   }

//   return (
//     <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeColor}`}>
//       {icon && <icon className="mr-1.5 h-4 w-4" />}
//       {badgeText}
//     </span>
//   )
// }
