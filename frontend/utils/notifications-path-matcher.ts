import { INotification } from "@/store/notifications/types";
import { ApprovalTask } from "@/types/approvals.types";

// Map model_name to frontend route
const PATH_MAP: { [key: string]: string } = {
	// allowancetype: '/payroll/allowance-types',
	asset: "/assets/assets",
	assetallocation: "/assets/asset-allocations",
	assetcategory: "/assets/asset-categories",
	assetrequest: "/assets/asset-requests",
	assetreturn: "/assets/asset-returns",
	approvergroup: "/admin/settings/approvals/approver-groups",
	bonuspointsettings: "/approvals/bonus-point-settings",
	branch: "/branches",
	branchlocationcomparisonconfig: "/approvals/branch-location-comparison-configs",
	branchpenaltyconfig: "/approvals/branch-penalty-configs",
	branchshift: "/approvals/branch-shifts",
	branchspotchecksetting: "/approvals/branch-spot-check-settings",
	branchworkingdays: "/approvals/branch-working-days",
	deductiontype: "/approvals/deduction-types",
	department: "/approvals/departments",
	disciplinaryaction: "/approvals/disciplinary-actions",
	document: "/approvals/documents",
	documenttemplate: "/approvals/document-templates",
	documenttype: "/approvals/document-types",
	emmployeeobjectives: "/approvals/employee-objectives", // Note: Typo in model name
	employee: "/approvals/employees",
	employeeallowance: "/approvals/employee-allowances",
	employeeattendance: "/approvals/employee-attendances",
	employeebonuspoint: "/approvals/employee-bonus-points",
	employeecontract: "/approvals/employee-contracts",
	employeeday: "/approvals/employee-days",
	employeededuction: "/approvals/employee-deductions",
	employeeobjectives: "/approvals/employee-objectives",
	employeepenalty: "/approvals/employee-penalties",
	employeeshift: "/approvals/employee-shifts",
	employeespotchecksetting: "/approvals/employee-spot-check-settings",
	employeetax: "/approvals/employee-taxes",
	employeetype: "/approvals/employee-types",
	employeeworkingdays: "/approvals/employee-working-days",
	event: "/approvals/events",
	feedback360: "/approvals/feedback-360s",
	institutionbankaccount: "/approvals/institution-bank-accounts",
	institutionbanktype: "/approvals/institution-bank-types",
	institutionemployeeseparationtypes: "/approvals/institution-employee-separation-types",
	institutionpenaltyconfig: "/approvals/institution-penalty-configs",
	institutionseparationpolicy: "/approvals/institution-separation-policies",
	institutionspotchecksetting: "/approvals/institution-spot-check-settings",
	institutiontax: "/approvals/institution-taxes",
	institutiontaxrule: "/approvals/institution-tax-rules",
	institutionworkingdays: "/approvals/institution-working-days",
	interviewstage: "/approvals/interview-stages",
	jobinterview: "/approvals/job-interviews",
	jobposition: "/job-positions",
	jobpositionadvert: "/approvals/job-position-adverts",
	keyresult: "/approvals/key-results",
	leaveapplication: "/approvals/leave-applications",
	leavebalance: "/approvals/leave-balances",
	leavepolicy: "/approvals/leave-policies",
	leavetype: "/approvals/leave-types",
	meeting: "/approvals/meetings",
	meetingintegration: "/approvals/meeting-integrations",
	objectives: "/approvals/objectives",
	offboardingstage: "/approvals/offboarding-stages",
	onboarding: "/approvals/onboardings",
	onlinemeeting: "/approvals/online-meetings",
	payrollperiod: "/payroll/payroll-period",
	payslip: "/approvals/payslips",
	penaltywaiverequest: "/approvals/penalty-waive-requests",
	period: "/approvals/periods",
	project: "/approvals/projects",
	projectdocument: "/approvals/project-documents",
	publicholiday: "/approvals/public-holidays",
	questiontemplate: "/approvals/question-templates",
	resignationrequest: "/approvals/resignation-requests",
	retirementrequest: "/approvals/retirement-requests",
	role: "/approvals/roles",
	rolepermission: "/approvals/role-permissions",
	task: "/approvals/tasks",
	taskdocument: "/approvals/task-documents",
	tasktimesheet: "/approvals/task-timesheets",
	terminationinitiation: "/approvals/termination-initiations",
	userrole: "/approvals/user-roles",
	worktype: "/approvals/work-types",
};

export const getNotificationPath = (notification: INotification): string => {
	const { model_name, object_id } = notification;
	// Get the base path or fallback to generic approvals page
	const basePath = PATH_MAP[model_name.toLowerCase()] || "/approvals";

	// Ensure object_id is valid
	if (!object_id || isNaN(object_id)) {
		console.warn(`Invalid object_id for notification: ${model_name}, id: ${object_id}`);

		return basePath;
	}

	// Construct the full URL
	return `${basePath}/${object_id}`;
};

export const getApprovalTaskPath = (task: ApprovalTask): string => {
	const model_name = task.content_object?.content_type?.model;
	const object_id = task.content_object?.object_id;
	// Get the base path or fallback to generic approvals page
	const basePath = PATH_MAP[model_name.toLowerCase()] || "/approvals";

	if (!object_id || isNaN(object_id)) {
		console.warn(`Invalid object_id for notification: ${model_name}, id: ${object_id}`);

		return basePath;
	}

	// Construct the full URL
	return `${basePath}/${object_id}`;
};
