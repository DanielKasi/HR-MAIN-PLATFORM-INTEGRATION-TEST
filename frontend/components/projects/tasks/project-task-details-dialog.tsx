import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { IProjectTask, IProjectTaskStatus } from "@/types/types.utils";

interface TaskDetailsDialogProps {
	isOpen: boolean;
	onClose: () => void;
	task: IProjectTask | null;
}

export default function TaskDetailsDialog({ isOpen, onClose, task }: TaskDetailsDialogProps) {
	if (!task) return null;

	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case "low":
				return "bg-green-50 text-green-700 border-green-200";
			case "medium":
				return "bg-yellow-50 text-yellow-700 border-yellow-200";
			case "high":
				return "bg-orange-50 text-orange-700 border-orange-200";
			case "urgent":
				return "bg-red-50 text-red-700 border-red-200";
			default:
				return "bg-gray-50 text-gray-700 border-gray-200";
		}
	};

	const getStatusColor = (status: IProjectTaskStatus) => {
		switch (status) {
			case "completed":
				return "bg-green-50 text-green-700 border-green-200";
			case "in_progress":
				return "bg-blue-50 text-blue-700 border-blue-200";
			case "not_started":
				return "bg-yellow-50 text-yellow-700 border-yellow-200";
			case "on_hold":
				return "bg-orange-50 text-orange-700 border-orange-200";
			default:
				return "bg-gray-50 text-gray-700 border-gray-200";
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">Task Details</DialogTitle>
					<DialogDescription>View the details of this task</DialogDescription>
				</DialogHeader>
				<div className="space-y-6">
					<div className="grid grid-cols-1 gap-6">
						<div className="space-y-2">
							<Label className="text-sm font-medium text-gray-700">Task Name</Label>
							<div className="p-3 bg-gray-50 rounded-md border">
								<span className="font-medium">{task.task_name}</span>
							</div>
						</div>
						<div className="space-y-2">
							<Label className="text-sm font-medium text-gray-700">Description</Label>
							<div className="p-3 bg-gray-50 rounded-md border">
								<span>{task.description || "No description"}</span>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label className="text-sm font-medium text-gray-700">Start Date</Label>
								<div className="p-3 bg-gray-50 rounded-md border">
									{new Date(task.start_date).toLocaleDateString()}
								</div>
							</div>
							<div className="space-y-2">
								<Label className="text-sm font-medium text-gray-700">End Date</Label>
								<div className="p-3 bg-gray-50 rounded-md border">
									{new Date(task.end_date).toLocaleDateString()}
								</div>
							</div>
						</div>
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label className="text-sm font-medium text-gray-700">Status</Label>
								<div className="p-3 bg-gray-50 rounded-md border">
									<Badge variant="outline" className={getStatusColor(task.task_status)}>
										{task.task_status}
									</Badge>
								</div>
							</div>
							<div className="space-y-2">
								<Label className="text-sm font-medium text-gray-700">Priority</Label>
								<div className="p-3 bg-gray-50 rounded-md border">
									<Badge variant="outline" className={getPriorityColor(task.priority)}>
										{task.priority}
									</Badge>
								</div>
							</div>
						</div>

						{(task.assignees?.length || task.managers?.length) && (
							<div className="space-y-2">
								<Label className="text-sm font-medium text-gray-700">Assignees</Label>
								<div className="p-3 bg-gray-50 rounded-md border">
									{(task.assignees || []).map((assignee) => (
										<div key={assignee.id}>{assignee.toString()}</div>
									))}
									{(task.managers || []).map((manager) => (
										<div key={manager.id}>Manager: {manager.toString()}</div>
									))}
								</div>
							</div>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
