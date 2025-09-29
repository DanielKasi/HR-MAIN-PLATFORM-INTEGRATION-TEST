export interface IProjectDashboard {
	projects: ProjectsAnalytics;
	tasks: TasksAnalytics;
	active_projects: number;
	overdue_tasks: number;
}

export interface ProjectsAnalytics {
	total: number;
	by_status: ProjectStatusCount[];
}

export interface TasksAnalytics {
	total: number;
	by_status: TaskStatusCount[];
	by_priority: TaskPriorityCount[];
}

export interface ProjectStatusCount {
	status: string;
	count: number;
}

export interface TaskStatusCount {
	status: string;
	count: number;
}

export interface TaskPriorityCount {
	priority: string;
	count: number;
}
