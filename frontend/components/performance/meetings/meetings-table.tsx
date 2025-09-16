"use client";

import { PerformanceTable, type TableColumn, type TableAction } from "../common/performance-table";
import { StatusBadge } from "../common/status-badge";
import type { IMeeting } from "@/types/types.utils";
import { Edit, Trash2, Calendar, Users, MapPin, Video, Repeat } from "lucide-react";

interface MeetingsTableProps {
	meetings: IMeeting[];
	onEdit: (meeting: IMeeting) => void;
	onDelete: (meeting: IMeeting) => void;
	onAdd: () => void;
	onSearch?: (query: string) => void;
	isLoading?: boolean;
}

export function MeetingsTable({
	meetings,
	onEdit,
	onDelete,
	onAdd,
	onSearch,
	isLoading,
}: MeetingsTableProps) {
	const columns: TableColumn<IMeeting>[] = [
		{
			key: "title",
			label: "Meeting",
			render: (meeting) => (
				<div>
					<div className="font-medium text-slate-900 mb-1">
						{meeting.title}
						{meeting.is_recurring && <Repeat className="inline-block h-4 w-4 ml-2 text-blue-500" />}
					</div>
					{meeting.description && (
						<div className="text-sm text-slate-500 line-clamp-2">{meeting.description}</div>
					)}
				</div>
			),
			className: "max-w-xs",
		},
		{
			key: "start_time",
			label: "Start Time",
			render: (meeting) => (
				<div className="flex items-center gap-2 text-slate-600">
					<Calendar className="h-4 w-4" />
					<div>
						<div>{new Date(meeting.start_time).toLocaleDateString()}</div>
						<div className="text-sm text-slate-500">
							{new Date(meeting.start_time).toLocaleTimeString([], {
								hour: "2-digit",
								minute: "2-digit",
							})}
						</div>
					</div>
				</div>
			),
		},
		{
			key: "end_time",
			label: "End Time",
			render: (meeting) => (
				<div className="flex items-center gap-2 text-slate-600">
					<Calendar className="h-4 w-4" />
					<div>
						<div>{new Date(meeting.end_time).toLocaleDateString()}</div>
						<div className="text-sm text-slate-500">
							{new Date(meeting.end_time).toLocaleTimeString([], {
								hour: "2-digit",
								minute: "2-digit",
							})}
						</div>
					</div>
				</div>
			),
		},
		{
			key: "mode",
			label: "Mode",
			render: (meeting) => <StatusBadge status={meeting.mode} />,
		},
		{
			key: "location_info",
			label: "Location/Link",
			render: (meeting) => (
				<div className="max-w-xs">
					{meeting.mode === "physical" && meeting.location && (
						<div className="flex items-center gap-2 text-slate-600">
							<MapPin className="h-4 w-4" />
							<span className="truncate">{meeting.location}</span>
						</div>
					)}
					{(meeting.mode === "online" || meeting.mode === "hybrid") && meeting.online_link && (
						<div className="flex items-center gap-2 text-slate-600">
							<Video className="h-4 w-4" />
							<a
								href={meeting.online_link}
								target="_blank"
								rel="noopener noreferrer"
								className="text-blue-600 hover:underline truncate"
							>
								Join Meeting
							</a>
						</div>
					)}
					{meeting.mode === "hybrid" && meeting.location && (
						<div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
							<MapPin className="h-3 w-3" />
							<span className="truncate">{meeting.location}</span>
						</div>
					)}
				</div>
			),
		},
		{
			key: "organizer",
			label: "Organizer",
			render: (meeting) => (
				<div>
					{meeting.organizer ? (
						<div className="flex items-center gap-2">
							<Users className="h-4 w-4 text-slate-400" />
							<span className="text-slate-600">
								{meeting.organizer.user?.fullname || "Unknown"}
							</span>
						</div>
					) : (
						<span className="text-slate-400 italic">No organizer</span>
					)}
				</div>
			),
		},
		{
			key: "participants",
			label: "Participants",
			render: (meeting) => (
				<div className="flex items-center gap-2">
					<Users className="h-4 w-4 text-slate-400" />
					<span className="text-slate-600">
						{meeting.participants.length} participant{meeting.participants.length !== 1 ? "s" : ""}
					</span>
				</div>
			),
		},
		{
			key: "status",
			label: "Status",
			render: (meeting) => {
				const now = new Date();
				const start = new Date(meeting.start_time);
				const end = new Date(meeting.end_time);

				let status = "upcoming";
				if (now >= start && now <= end) {
					status = "ongoing";
				} else if (now > end) {
					status = "completed";
				}

				return <StatusBadge status={status} />;
			},
		},
	];

	const actions: TableAction<IMeeting>[] = [
		{
			label: "Edit",
			icon: <Edit className="h-4 w-4" />,
			onClick: onEdit,
			show: (meeting) => {
				const now = new Date();
				const start = new Date(meeting.start_time);
				return start > now; // Only allow editing future meetings
			},
		},
		{
			label: "Delete",
			icon: <Trash2 className="h-4 w-4" />,
			onClick: onDelete,
			variant: "destructive",
		},
	];

	return (
		<PerformanceTable
			data={meetings}
			columns={columns}
			actions={actions}
			onAdd={onAdd}
			addLabel="Schedule Meeting"
			searchPlaceholder="Search meetings..."
			onSearch={onSearch}
			isLoading={isLoading}
			emptyMessage="No meetings found"
		/>
	);
}
