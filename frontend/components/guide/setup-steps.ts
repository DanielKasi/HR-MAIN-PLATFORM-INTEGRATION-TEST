import type { SetupStep } from "./types";

export const SETUP_STEPS: SetupStep[] = [
	{
		id: "create-branch",
		title: "Create Branch",
		description: "Add branches to your organisation",
		endpoint_to_check: `institution/{InstitutionId}/branch`,
		to_complete_step_page_link: "/branches",
		status: "pending",
	},
	{
		id: "create-role",
		title: "Create Role and Permissions",
		description: "Define roles for your staff assignees",
		endpoint_to_check: "user/role/?Institution_id={InstitutionId}",
		to_complete_step_page_link: "/users/roles",
		status: "pending",
	},
	{
		id: "add-staff",
		title: "Add Staff and Permissions",
		description: "Add staff assignees with appropriate permissions",
		endpoint_to_check: "institution/profile/{InstitutionId}/",
		to_complete_step_page_link: "/users",
		status: "pending",
	},
	{
		id: "add-approval-steps",
		title: "Add Institution Approval Steps",
		description: "Configure approval workflows for your Institution",
		endpoint_to_check: `workflow/Institution-approval-step/{InstitutionId}/`,
		to_complete_step_page_link: "/admin/Institution-approval-steps",
		status: "pending",
	},
];
