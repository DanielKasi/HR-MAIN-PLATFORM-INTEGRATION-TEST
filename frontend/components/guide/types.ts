export interface SetupStep {
	id: string;
	title: string;
	description: string;
	endpoint_to_check: string;
	to_complete_step_page_link: string;
	status: "completed" | "in-progress" | "pending";
}

export interface SetupGuideProps {
	InstitutionId: string;
	collapsible?: boolean;
	showCompleteButton?: boolean;
	maxVisibleSteps?: number;
	className?: string;
}
