"use client";

import type React from "react";
import type {
	JobApplication,
	JobApplicationFormData,
	JobPositionAdvert,
	IInterviewType,
	ICountry,
	RequiredDocument,
	FormDataState,
} from "@/types/types.utils";
import type {
	IInterviewStage,
	IInterviewFormData,
	IInterviewStageFormData,
} from "@/types/types.utils";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import {
	Plus,
	Mail,
	Phone,
	MapPin,
	Calendar,
	User,
	Upload,
	FileText,
	AlertCircle,
	MoreVertical,
	Edit,
	Eye,
	X,
	Users,
	Check,
	ChevronUp,
	ChevronDown,
	Filter,
	Building,
	Search,
	CalendarDays,
	Loader2,
	Loader,
} from "lucide-react";
import { toast } from "sonner";
import { Icon } from "@iconify/react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
	createJobApplication,
	getJobApplications,
	getJobPositionAdverts,
	getPaginatedJobAdverts,
	updateJobApplicationStatus,
	getPaginatedJobApplications,
	getPaginatedJobApplicationsFromUrl,
} from "@/lib/utils";
import {
	selectUser,
	selectSelectedInstitution,
	selectSelectedBranch,
} from "@/store/auth/selectors";
import { selectApplicationForm } from "@/store/miscellaneous/selectors";
import { saveApplicationForm, clearApplicationForm } from "@/store/miscellaneous/actions";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
	DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import CountrySelect from "@/components/common/country-select";
import { getInterviewStages, createInterview } from "@/lib/utils";
import { EmployeeSearchableSelect } from "@/components/selects/employee-searchable-select";
import { TableSkeleton } from "@/components/common/skeletons/table-skeleton";
import { PaginatedTableWrapper } from "@/components/common/tables/paginated-table-wrapper";
import { getFileUrl } from "@/lib/helpers";
import { CreateInterviewStageDialog } from "@/components/dialogs/create-interview-stage-dialog";
import FixedLoader from "@/components/fixed-loader";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";

const statusColors = {
	new: "bg-blue-100 text-blue-800",
	reviewed: "bg-yellow-100 text-yellow-800",
	shortlisted: "bg-green-100 text-green-800",
	rejected: "bg-red-100 text-red-800",
	passed: "bg-purple-100 text-purple-800",
};

const sourceLabels = {
	website: "Website",
	referral: "Referral",
	job_board: "Job Board",
	social_media: "Social Media",
	head_hunt: "Head Hunt",
	other: "Other",
};

const interviewTypes: Array<{ value: IInterviewType; label: string }> = [
	{ value: "online", label: "Virtual" },
	{ value: "in_person", label: "In person" },
];

export default function ApplicationsPage() {
	const router = useRouter();
	const dispatch = useDispatch();

	const userData = useSelector(selectUser);
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const selectedBranch = useSelector(selectSelectedBranch);
	const savedApplicationForm = useSelector(selectApplicationForm);

	const refreshTableRef = useRef<(() => void) | null>(null);
	const [applications, setApplications] = useState<JobApplication[]>([]);
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [filteredApplications, setFilteredApplications] = useState<JobApplication[]>([]);
	const [selectedApplications, setSelectedApplications] = useState<JobApplication[]>([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState<string>("all");
	const [jobFilter, setJobFilter] = useState<string>("all");
	const [isBulkShortlisting, setIsBulkShortlisting] = useState(false);
	const [individualLoadingStates, setIndividualLoadingStates] = useState<Record<number, boolean>>(
		{},
	);

	const [isFetchingInterviewData, setIsFetchingInterviewData] = useState(false);
	const [selectedJobRequiredDocuments, setSelectedJobRequiredDocuments] = useState<
		RequiredDocument[]
	>([]);

	// const [showScheduleDialog, setShowScheduleDialog] = useState(false);
	const [showCreateStageDialog, setShowCreateStageDialog] = useState(false);
	const [interviewStages, setInterviewStages] = useState<IInterviewStage[]>([]);
	const [isSchedulingInterview, setIsSchedulingInterview] = useState(false);
	const [isCreatingStage, setIsCreatingStage] = useState(false);
	const [selectedApplicationForInterview, setSelectedApplicationForInterview] =
		useState<JobApplication | null>(null);
	// const [showBulkScheduleDialog, setShowBulkScheduleDialog] = useState(false);
	const [showScheduleInterviewDialog, setShowScheduleInterviewDialog] = useState<{
		type: "bulk" | "single";
		isOpen: boolean;
	}>({ type: "single", isOpen: false });
	const [bulkInterviewFormData, setBulkInterviewFormData] = useState<IInterviewFormData>({
		interview_stage: 0,
		interview_date: "",
		location: "",
		interview_type: "in_person",
		status: "scheduled",
		job_position_application: 0,
		interview_time: "",
		feedback: {},
	});
	// const [isSchedulingInterview, setisSchedulingInterview] = useState(false);
	const [stageFormData, setStageFormData] = useState<IInterviewStageFormData>({
		name: "",
		level: 1,
		interviewers: [],
		job_position_advert: 0,
		feedback_fields: [],
	});

	const [interviewFormData, setInterviewFormData] = useState<IInterviewFormData>({
		interview_stage: 0,
		interview_date: "",
		interview_time: "",
		location: "",
		interview_type: "in_person",
		status: "scheduled",
		feedback: {},
		rating: undefined,
		job_position_application: 0,
	});

	const [interviewErrors, setInterviewErrors] = useState<any>({});
	const [ordering, setOrdering] = useState("");

	const updateInterviewFormData = (field: string, value: any) => {
		setInterviewFormData((prev) => ({ ...prev, [field]: value }));
		setInterviewErrors((prev: any) => ({ ...prev, [field]: undefined }));
	};

	const fetchInterviewData = async () => {
		if (!selectedInstitution) return;

		try {
			setIsFetchingInterviewData(true);
			const stagesResponse = await getInterviewStages({ institutionId: selectedInstitution.id });

			let stagesArray: IInterviewStage[] = [];

			if (stagesResponse && "results" in stagesResponse && Array.isArray(stagesResponse.results)) {
				stagesArray = stagesResponse.results;
			} else if (Array.isArray(stagesResponse)) {
				stagesArray = stagesResponse;
			}

			let filteredStages: IInterviewStage[] = stagesArray;

			// Filter stages for this job position
			if (selectedApplicationForInterview) {
				filteredStages = stagesArray.filter(
					(stage) =>
						stage.job_position_advert === selectedApplicationForInterview.job_position_advert,
				);
			} else if (selectedApplications.length) {
				filteredStages = stagesArray.filter((stage) =>
					selectedApplications.some(
						(selectedApp) => stage.job_position_advert === selectedApp.job_position_advert,
					),
				);
			}
			setInterviewStages(filteredStages);

			// Set default interview date to tomorrow at 10 AM
			const tomorrow = new Date();

			tomorrow.setDate(tomorrow.getDate() + 1);
			tomorrow.setHours(10, 0, 0, 0);
			setInterviewFormData((prev) => ({
				...prev,
				interview_date: tomorrow.toISOString().slice(0, 16),
			}));
		} catch (error) {
			toast.error("Failed to load interview data");
		} finally {
			setIsFetchingInterviewData(false);
		}
	};

	const handleScheduleInterview = async () => {
		if (!selectedApplicationForInterview || !selectedInstitution) return;

		// Validate form
		const errors: any = {};

		if (!interviewFormData.interview_stage || interviewFormData.interview_stage === 0) {
			errors.interview_stage = "Please select an interview stage";
		}
		if (!interviewFormData.interview_date) {
			errors.interview_date = "Interview date and time is required";
		} else {
			const interviewDate = new Date(interviewFormData.interview_date);
			const now = new Date();

			if (interviewDate <= now) {
				errors.interview_date = "Interview date must be in the future";
			}
		}
		if (!interviewFormData.location || interviewFormData.location.trim() === "") {
			errors.location = "Interview location is required";
		}

		if (Object.keys(errors).length > 0) {
			setInterviewErrors(errors);

			return;
		}

		if (!userData?.id) {
			toast.error("User information not available. Please refresh and try again.");

			return;
		}

		setIsSchedulingInterview(true);

		try {
			let interviewTime = "";

			if (interviewFormData.interview_date) {
				const dateTime = new Date(interviewFormData.interview_date);
				const hours = dateTime.getHours().toString().padStart(2, "0");
				const minutes = dateTime.getMinutes().toString().padStart(2, "0");

				interviewTime = `${hours}:${minutes}`;
			}

			const createData: IInterviewFormData = {
				job_position_application: selectedApplicationForInterview.id,
				interview_stage: interviewFormData.interview_stage,
				interview_date: interviewFormData.interview_date,
				location: interviewFormData.location,
				interview_time: interviewTime,
				interview_type: interviewFormData.interview_type,
				status: interviewFormData.status || "scheduled",
				feedback: interviewFormData.feedback || undefined,
				rating: interviewFormData.rating || undefined,
				created_by: userData.id,
			};

			const result = await createInterview({
				institutionId: selectedInstitution.id,
				interviewData: createData,
			});

			if (result) {
				clearAllFilters();
				toast.success("Interview scheduled successfully!");
				setShowScheduleInterviewDialog({ type: "single", isOpen: false });
				setSelectedApplicationForInterview(null);
				// Reset form
				setInterviewFormData({
					interview_stage: 0,
					interview_date: "",
					interview_time: "",
					location: "",
					interview_type: "in_person",
					status: "scheduled",
					feedback: {},
					job_position_application: 0,
				});
				setInterviewErrors({});
				await loadApplications();
			} else {
				toast.error("Failed to schedule interview");
			}
		} catch (error) {
			toast.error("Failed to schedule interview");
		} finally {
			setIsSchedulingInterview(false);
		}
	};

	// Add this function to handle opening the schedule interview dialog
	const handleOpenScheduleInterview = async (application: JobApplication) => {
		setSelectedApplicationForInterview(application);
		await fetchInterviewData();
		setShowScheduleInterviewDialog({ type: "single", isOpen: true });
	};

	// Enhanced date filtering state
	const [dateFilter, setDateFilter] = useState<{
		startDate: string;
		endDate: string;
		type: "application_date" | "posted_date";
	}>({
		startDate: "",
		endDate: "",
		type: "application_date",
	});

	// Updated sorting with better defaults
	const [sortField, setSortField] = useState<"application_date" | "posted_date">(
		"application_date",
	);
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
	const [currentPage, setCurrentPage] = useState(1);
	const [itemsPerPage] = useState(5);

	const [confirmAction, setConfirmAction] = useState<{
		isOpen: boolean;
		applicationId: number | null;
		applicantName: string;
		action: "shortlisted" | "rejected" | null;
	}>({
		isOpen: false,
		applicationId: null,
		applicantName: "",
		action: null,
	});

	const [confirmBulkAction, setConfirmBulkAction] = useState<{
		isOpen: boolean;
		action: "shortlisted" | "reviewed" | "rejected" | null;
		count: number;
	}>({
		isOpen: false,
		action: null,
		count: 0,
	});

	const handleSort = (field: "application_date" | "posted_date") => {
		if (sortField === field) {
			setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
		} else {
			setSortField(field);
			setSortDirection("asc");
		}
	};

	const [formData, setFormData] = useState<JobApplicationFormData>({
		job_position_advert: 0,
		applicant_name: "",
		applicant_email: "",
		applicant_phone: "",
		resume: undefined, // Change from null to undefined
		cover_letter: undefined, // Change from null to undefined
		status: "new",
		gender: "male",
		state: "",
		address: "",
		address_latitude: "",
		address_longitude: "",
		country: "",
		source: "website",
		recommended_by: undefined,
		application_date: new Date().toISOString().split("T")[0],
		created_by: userData?.id || 0,
		required_document_files: {},
		selectedJobRequiredDocuments: [], // Already correct
	});

	// Separate state for the country selector
	const [selectedCountry, setSelectedCountry] = useState<ICountry | null>(null);

	const [jobPositionAdverts, setJobPositionAdverts] = useState<JobPositionAdvert[]>([]);
	const [isLoadingAdverts, setIsLoadingAdverts] = useState(false);

	// Infinite-scroll job position dropdown state
	const [jpFilterText, setJpFilterText] = useState("");
	const [jobPositionOptions, setJobPositionOptions] = useState<JobPositionAdvert[]>([]);
	const [isLoadingJobPositions, setIsLoadingJobPositions] = useState(false);
	const [hasMoreJobPositions, setHasMoreJobPositions] = useState(true);
	const [jobPositionPage, setJobPositionPage] = useState(1);
	const [jobPositionDropdownOpen, setJobPositionDropdownOpen] = useState(false);
	const [jobPositionInitiallyLoaded, setJobPositionInitiallyLoaded] = useState(false);
	const jobPositionDropdownRef = useRef<HTMLDivElement | null>(null);
	const jobPositionContainerRef = useRef<HTMLDivElement | null>(null);
	const jobPositionSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

	const [applicationLocation, setApplicationLocation] = useState<{
		latitude: string;
		longitude: string;
	}>({
		latitude: "",
		longitude: "",
	});

	// Load saved application form data from Redux on component mount
	useEffect(() => {
		if (savedApplicationForm) {
			setFormData({
				job_position_advert: savedApplicationForm.job_position_advert,
				applicant_name: savedApplicationForm.applicant_name,
				applicant_email: savedApplicationForm.applicant_email,
				applicant_phone: savedApplicationForm.applicant_phone || "",
				// Cannot serialize File object in Redux, so will always be undefined at read time from Redux Store
				// Cannot serialize File object in Redux, so will always be undefined at read time from Redux Store
				status: savedApplicationForm.status || "new",
				gender: savedApplicationForm.gender,
				state: savedApplicationForm.state || "",
				address: savedApplicationForm.address,
				address_latitude: savedApplicationForm.address_latitude || "",
				address_longitude: savedApplicationForm.address_longitude || "",
				country: savedApplicationForm.country || "",
				source: savedApplicationForm.source || "website",
				recommended_by: savedApplicationForm.recommended_by,
				application_date:
					savedApplicationForm.application_date || new Date().toISOString().split("T")[0],
				created_by: savedApplicationForm.created_by || userData?.id || 0,
				required_document_files: savedApplicationForm.required_document_files || {},
			});

			// Set the selected country for the CountrySelect component
			if (savedApplicationForm.country) {
				setSelectedCountry({ name: { common: savedApplicationForm.country }, cca2: "" });
			}
		}
	}, [savedApplicationForm, userData]);

	useEffect(() => {
		if (applicationLocation.latitude && applicationLocation.longitude) {
			setFormData((prev) => ({
				...prev,
				address_latitude: applicationLocation.latitude,
				address_longitude: applicationLocation.longitude,
			}));

			const updatedFormData = {
				...formData,
				address_latitude: applicationLocation.latitude,
				address_longitude: applicationLocation.latitude,
			};

			dispatch(saveApplicationForm({ ...updatedFormData })); // Cannot serialize File object in Redux
		}
	}, [applicationLocation]);

	useEffect(() => {
		if (!selectedInstitution || !selectedBranch) {
			router.push("/dashboard");

			return;
		}

		loadApplications();
		loadJobPositionAdverts();
	}, [selectedInstitution, selectedBranch, router]);

	useEffect(() => {
		let filtered = applications;

		// Text search filter
		if (searchTerm) {
			filtered = filtered.filter(
				(app) =>
					app.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
					app.applicant_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
					(app.applicant_phone &&
						app.applicant_phone.toLowerCase().includes(searchTerm.toLowerCase())),
			);
		}

		// Status filter
		if (statusFilter !== "all") {
			filtered = filtered.filter((app) => app.status === statusFilter);
		}

		// Job filter
		if (jobFilter !== "all") {
			filtered = filtered.filter((app) => app.job_position_advert.toString() === jobFilter);
		}

		// Date range filter
		if (dateFilter.startDate || dateFilter.endDate) {
			filtered = filtered.filter((app) => {
				const dateToCheck =
					dateFilter.type === "application_date"
						? app.application_date
						: app.job_position_advert_job_details?.job_posted_date;

				if (!dateToCheck) return false;

				const appDate = new Date(dateToCheck);
				const startDate = dateFilter.startDate ? new Date(dateFilter.startDate) : null;
				const endDate = dateFilter.endDate ? new Date(dateFilter.endDate) : null;

				if (startDate && appDate < startDate) return false;
				if (endDate && appDate > endDate) return false;

				return true;
			});
		}

		// Apply sorting
		const sortedFiltered = [...filtered].sort((a, b) => {
			let aValue: string, bValue: string;

			if (sortField === "application_date") {
				aValue = a.application_date;
				bValue = b.application_date;
			} else {
				aValue = a.job_position_advert_job_details?.job_posted_date || "";
				bValue = b.job_position_advert_job_details?.job_posted_date || "";
			}

			const comparison = new Date(aValue).getTime() - new Date(bValue).getTime();

			return sortDirection === "asc" ? comparison : -comparison;
		});

		setFilteredApplications(sortedFiltered);
		setCurrentPage(1);
	}, [applications, searchTerm, statusFilter, jobFilter, dateFilter, sortField, sortDirection]);

	// Helper to format job position label
	const getPositionLabel = useCallback((advert: JobPositionAdvert): string => {
		return `${advert.job_position_details?.name || `Job Opening `}`;
	}, []);

	// Fetch job positions paginated with optional server-side search
	const fetchJobPositionsPaged = useCallback(
		async (searchTerm: string = "", page: number = 1, reset: boolean = false) => {
			if (!selectedInstitution) return;
			try {
				setIsLoadingJobPositions(true);
				const response = await getPaginatedJobAdverts({
					institutionId: selectedInstitution.id,
					page,
					search: searchTerm.trim() || undefined,
				});
				const results = Array.isArray(response?.results) ? response.results : [];
				// Filter out expired and closed adverts
				const filteredResults = results.filter(
					(advert: JobPositionAdvert) =>
						advert.job_position_advert_status !== "expired" &&
						advert.job_position_advert_status !== "closed",
				);

				if (reset || page === 1) {
					setJobPositionOptions(filteredResults);
				} else {
					setJobPositionOptions((prev) => [...prev, ...filteredResults]);
				}
				setHasMoreJobPositions(Boolean(response?.next));
				setJobPositionPage(page);
			} catch (e) {
				if (reset) setJobPositionOptions([]);
				setHasMoreJobPositions(false);
			} finally {
				setIsLoadingJobPositions(false);
			}
		},
		[selectedInstitution],
	);

	// Debounced search for job positions
	useEffect(() => {
		if (!jobPositionDropdownOpen) return;
		if (jobPositionSearchTimeoutRef.current) {
			clearTimeout(jobPositionSearchTimeoutRef.current);
		}
		jobPositionSearchTimeoutRef.current = setTimeout(() => {
			fetchJobPositionsPaged(jpFilterText, 1, true);
		}, 300);

		return () => {
			if (jobPositionSearchTimeoutRef.current) {
				clearTimeout(jobPositionSearchTimeoutRef.current);
			}
		};
	}, [jpFilterText, jobPositionDropdownOpen, fetchJobPositionsPaged]);

	// Open dropdown and load first page if needed
	const handleJobPositionInputFocus = useCallback(() => {
		setJobPositionDropdownOpen(true);
		if (!jobPositionInitiallyLoaded) {
			setJobPositionInitiallyLoaded(true);
			fetchJobPositionsPaged("", 1, true);
		}
	}, [jobPositionInitiallyLoaded, fetchJobPositionsPaged]);

	// Close on outside click
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			const container = jobPositionContainerRef.current;

			if (container && !container.contains(e.target as Node)) {
				setJobPositionDropdownOpen(false);
			}
		};

		if (jobPositionDropdownOpen) {
			document.addEventListener("mousedown", handler);
		}

		return () => document.removeEventListener("mousedown", handler);
	}, [jobPositionDropdownOpen]);

	// Scroll handler to load more
	const handleJobPositionDropdownScroll = useCallback(
		(e: React.UIEvent<HTMLDivElement>) => {
			const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

			if (
				scrollHeight - scrollTop <= clientHeight + 50 &&
				hasMoreJobPositions &&
				!isLoadingJobPositions
			) {
				fetchJobPositionsPaged(jpFilterText.trim(), jobPositionPage + 1, false);
			}
		},
		[
			hasMoreJobPositions,
			isLoadingJobPositions,
			jpFilterText,
			jobPositionPage,
			fetchJobPositionsPaged,
		],
	);

	// Initialize jpFilterText when jobPositionAdverts are loaded and form has a selected job position
	useEffect(() => {
		if (formData.job_position_advert && jobPositionAdverts.length > 0) {
			const selectedAdvert = jobPositionAdverts.find((p) => p.id === formData.job_position_advert);

			if (selectedAdvert && !jpFilterText) {
				setJpFilterText(getPositionLabel(selectedAdvert));
			}
		}
	}, [formData.job_position_advert, jobPositionAdverts, jpFilterText, getPositionLabel]);

	const loadApplications = async () => {
		if (!selectedInstitution) return;

		setIsLoading(true);
		setError(null);

		try {
			const response = await getJobApplications({ institutionId: selectedInstitution.id });

			let applicationsArray: JobApplication[] = [];

			if (response && "results" in response && Array.isArray(response.results)) {
				applicationsArray = response.results;
			} else if (Array.isArray(response)) {
				applicationsArray = response;
			} else if (response === null) {
				applicationsArray = [];
				setError("Failed to load applications");
			} else {
				applicationsArray = [];
				setError("Failed to load applications - unexpected response format");
			}

			// Sort applications by application_date (newest first) by default
			const sortedApplications = applicationsArray.sort(
				(a, b) => new Date(b.application_date).getTime() - new Date(a.application_date).getTime(),
			);

			setApplications(sortedApplications);
		} catch (err: any) {
			setApplications([]);
			setError(err?.message || "Failed to load applications");
		} finally {
			setIsLoading(false);
		}
	};

	const loadJobPositionAdverts = async () => {
		if (!selectedInstitution) return;

		setIsLoadingAdverts(true);
		try {
			const response = await getJobPositionAdverts({ institutionId: selectedInstitution.id });
			// console.log("Job Position Adverts Response:", response);

			let advertsArray: JobPositionAdvert[] = [];

			if (response && "results" in response && Array.isArray(response.results)) {
				advertsArray = response.results;
				setJobPositionAdverts(advertsArray);
			} else if (Array.isArray(response)) {
				advertsArray = response;
			} else {
				advertsArray = [];
			}

			setJobPositionAdverts(advertsArray);
		} catch (err: any) {
			setJobPositionAdverts([]);
			setError(err?.message || "Failed to load job position adverts");
		} finally {
			setIsLoadingAdverts(false);
		}
	};

	const handleInputChange = (field: keyof typeof formData, value: string | number | null) => {
		// console.log("\n\n Updating field : ", field, "\n\n With value : ", value);

		const updatedFormData = {
			...formData,
			[field]: value,
		};

		setFormData(updatedFormData);

		dispatch(saveApplicationForm({ ...updatedFormData })); // Cannot serialize File object in Redux
	};

	const handleFileChange = (field: "resume" | "cover_letter", file: File | null) => {
		const updatedFormData = {
			...formData,
			[field]: file || undefined, // Convert null to undefined
		};
		setFormData(updatedFormData);
	};

	const handleDocumentFileChange = (documentName: string, file: File | null) => {
		setFormData((prev) => {
			const updatedFiles = { ...prev.required_document_files };

			if (file) {
				updatedFiles[documentName] = file;
			} else {
				delete updatedFiles[documentName];
			}

			return {
				...prev,
				required_document_files: updatedFiles,
			};
		});
	};
	const handleAddressCoordinatesChange = (lat: string, lon: string) => {
		setApplicationLocation({ latitude: lat, longitude: lon });
	};

	const handleClearForm = () => {
		const defaultFormData = {
			job_position_advert: 0,
			applicant_name: "",
			applicant_email: "",
			applicant_phone: "",
			resume: undefined, // Change from null to undefined
			cover_letter: undefined, // Change from null to undefined
			status: "new" as const,
			gender: "male" as const,
			state: "",
			address: "",
			address_latitude: "",
			address_longitude: "",
			country: "",
			source: "website" as const,
			recommended_by: undefined,
			application_date: new Date().toISOString().split("T")[0],
			created_by: userData?.id || 0,
			required_document_files: {},
			selectedJobRequiredDocuments: [], // Add this to match JobApplicationFormData
		};

		setFormData(defaultFormData);
		setSelectedCountry(null);
		setSelectedJobRequiredDocuments([]);
		setError(null);

		// Clear from Redux
		dispatch(clearApplicationForm());

		toast.success("Form cleared successfully");
	};

	const handleViewApplication = (applicationId: number) => {
		router.push(`/applications/${applicationId}`);
	};

	const handleEditApplication = (applicationId: number) => {
		router.push(`/applications/${applicationId}/edit`);
	};

	const resetFiltersAndShowNewApplication = () => {
		setStatusFilter("all");
		setSearchTerm("");
		setSelectedApplications([]);
	};

	// Enhanced filter clearing functions
	const clearDateFilters = () => {
		setDateFilter({
			startDate: "",
			endDate: "",
			type: "application_date",
		});
	};

	const clearAllFilters = () => {
		setSearchTerm("");
		setStatusFilter("all");
		setJobFilter("all");
		clearDateFilters();
		setSortField("application_date");
		setSortDirection("desc");
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setIsSubmitting(true);

		try {
			// Basic validation
			if (!formData.applicant_name.trim()) {
				throw new Error("Please enter the applicant's name");
			}

			if (!formData.applicant_email.trim()) {
				throw new Error("Please enter the applicant's email");
			}

			if (!formData.address.trim()) {
				throw new Error("Please enter the applicant's address");
			}

			if (!selectedCountry) {
				throw new Error("Please select a country");
			}

			if (formData.job_position_advert === 0) {
				throw new Error("Please select a job position");
			}

			if (formData.source === "head_hunt" && !formData.recommended_by) {
				throw new Error("Please select which employee head hunted this candidate");
			}

			if (!selectedInstitution || !selectedBranch) {
				throw new Error("Missing organization or branch information");
			}

			if (!userData?.id) {
				throw new Error("User information not available. Please refresh and try again.");
			}

			// Validate required documents
			if (selectedJobRequiredDocuments.length > 0) {
				const missingRequiredDocs = selectedJobRequiredDocuments.filter(
					(doc) => !doc.is_optional && !formData.required_document_files?.[doc.document_name],
				);

				if (missingRequiredDocs.length > 0) {
					throw new Error(
						`Please upload all required documents: ${missingRequiredDocs
							.map((doc) => doc.document_name)
							.join(", ")}`,
					);
				}
			}

			// Prepare the data for API call
			const applicationData: JobApplicationFormData = {
				job_position_advert: formData.job_position_advert,
				applicant_name: formData.applicant_name.trim(),
				applicant_email: formData.applicant_email.trim(),
				applicant_phone: formData.applicant_phone?.trim() || undefined,
				resume: formData.resume || undefined,
				cover_letter: formData.cover_letter || undefined,
				status: formData.status,
				gender: formData.gender,
				state: formData.state?.trim() || undefined,
				address: formData.address.trim(),
				address_latitude: formData.address_latitude || undefined,
				address_longitude: formData.address_longitude || undefined,
				country: selectedCountry.name.common,
				source: formData.source,
				application_date: formData.application_date,
				created_by: userData.id,
				recommended_by: formData.source === "head_hunt" ? formData.recommended_by : undefined,
				required_document_files: formData.required_document_files,
				selectedJobRequiredDocuments: selectedJobRequiredDocuments, // Include here
			};

			console.log("📤 Submitting application data:", {
				job_position: applicationData.job_position_advert,
				applicant: applicationData.applicant_name,
				email: applicationData.applicant_email,
				documentCount: selectedJobRequiredDocuments.length,
				hasResume: !!applicationData.resume,
				hasCoverLetter: !!applicationData.cover_letter,
			});

			// Call the API with application data
			const newApplication = await createJobApplication({
				institutionId: selectedInstitution.id,
				applicationData,
			});

			if (newApplication) {
				// Success - reset form and show success message
				setIsCreateDialogOpen(false);
				resetFiltersAndShowNewApplication();

				// Reset form to initial state
				setFormData({
					job_position_advert: 0,
					applicant_name: "",
					applicant_email: "",
					applicant_phone: "",

					status: "new",
					gender: "male",
					state: "",
					address: "",
					address_latitude: "",
					address_longitude: "",
					country: "",
					source: "website",
					recommended_by: undefined,
					application_date: new Date().toISOString().split("T")[0],
					created_by: userData.id,
					required_document_files: {},
				});

				setSelectedCountry(null);
				setSelectedJobRequiredDocuments([]);
				clearAllFilters();

				toast.success("Application created successfully!");

				// Refresh the applications table
				if (refreshTableRef.current) {
					refreshTableRef.current();
				}

				// Clear the saved form data from Redux
				dispatch(clearApplicationForm());
			} else {
				throw new Error("Failed to create application - no response from server");
			}
		} catch (err: any) {
			console.error(" Submission error:", err);

			// Handle different error types
			if (err?.response?.data) {
				const errorData = err.response.data;
				if (typeof errorData === "object") {
					if (errorData.non_field_errors) {
						setError(errorData.non_field_errors.join(", "));
					} else if (errorData.detail) {
						setError(errorData.detail);
					} else {
						// Field-specific errors
						const fieldErrors = Object.entries(errorData)
							.map(
								([field, messages]) =>
									`${field}: ${Array.isArray(messages) ? messages.join(", ") : messages}`,
							)
							.join("; ");
						setError(fieldErrors || "Please check all fields and try again.");
					}
				} else if (typeof errorData === "string") {
					setError(errorData);
				} else {
					setError("An error occurred while creating the application.");
				}
			} else if (err?.message) {
				setError(err.message);
			} else {
				setError("Failed to create application. Please check your connection and try again.");
			}

			// Scroll to error message
			setTimeout(() => {
				const errorElement = document.getElementById("error-alert");
				if (errorElement) {
					errorElement.scrollIntoView({ behavior: "smooth", block: "center" });
				}
			}, 100);
		} finally {
			setIsSubmitting(false);
		}
	};
	const handleSubmitInterviews = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!selectedInstitution || !userData) {
			return;
		}

		const shortlistedApps = (
			showScheduleInterviewDialog.type === "single"
				? [selectedApplicationForInterview]
				: applications
		).filter(
			(app) =>
				selectedApplications.find((s_app) => s_app.id === app?.id) && app?.status === "shortlisted",
		);

		const errors: any = {};

		if (!bulkInterviewFormData.interview_stage) {
			errors.interview_stage = "Please select an interview stage";
		}
		if (!bulkInterviewFormData.interview_date) {
			errors.interview_date = "Interview date and time is required";
		} else {
			const interviewDate = new Date(bulkInterviewFormData.interview_date);
			const now = new Date();

			if (interviewDate <= now) {
				errors.interview_date = "Interview date must be in the future";
			}
		}
		if (!bulkInterviewFormData.location || bulkInterviewFormData.location.trim() === "") {
			errors.location = "Interview location is required";
		}

		if (Object.keys(errors).length > 0) {
			setInterviewErrors(errors);

			return;
		}

		setIsSchedulingInterview(true);

		try {
			if (selectedApplicationForInterview) {
			}
			const interviewPromises = shortlistedApps
				.map(async (application, index) => {
					// Calculate interview time (30 minutes apart)
					const baseDateTime = new Date(bulkInterviewFormData.interview_date);
					const interviewDateTime = new Date(baseDateTime.getTime() + index * 30 * 60 * 1000);

					let interviewTime = "";

					if (bulkInterviewFormData.interview_date) {
						const hours = interviewDateTime.getHours().toString().padStart(2, "0");
						const minutes = interviewDateTime.getMinutes().toString().padStart(2, "0");

						interviewTime = `${hours}:${minutes}`;
					}
					if (application) {
						const feedbackPayload =
							showScheduleInterviewDialog.type === "single"
								? interviewFormData.feedback || bulkInterviewFormData.feedback || undefined
								: bulkInterviewFormData.feedback || undefined;
						const ratingPayload =
							showScheduleInterviewDialog.type === "single"
								? (interviewFormData.rating ?? bulkInterviewFormData.rating ?? undefined)
								: (bulkInterviewFormData.rating ?? undefined);

						const createData: IInterviewFormData = {
							job_position_application: application.id,
							interview_stage: bulkInterviewFormData.interview_stage,
							interview_date: interviewDateTime.toISOString().slice(0, 16),
							location: bulkInterviewFormData.location,
							interview_time: interviewTime,
							interview_type: bulkInterviewFormData.interview_type,
							status: bulkInterviewFormData.status || "scheduled",
							feedback: feedbackPayload,
							rating: ratingPayload,
							created_by: userData.id,
						};

						return await createInterview({
							institutionId: selectedInstitution.id,
							interviewData: createData,
						});
					}
				})
				.filter(Boolean);

			const results = await Promise.all(interviewPromises);
			const successCount = results.filter((result) => result !== null).length;
			const failureCount = results.length - successCount;

			if (successCount > 0) {
				toast.success(
					`${successCount} interview(s) scheduled successfully!${
						failureCount > 0 ? ` ${failureCount} failed.` : ""
					}`,
				);
				if (showScheduleInterviewDialog.type === "bulk") {
					setBulkInterviewFormData({
						interview_stage: 0,
						interview_date: "",
						location: "",
						interview_type: "in_person",
						status: "scheduled",
						job_position_application: 0,
						interview_time: "",
					});
				} else {
					setInterviewFormData({
						interview_stage: 0,
						interview_date: "",
						location: "",
						interview_type: "in_person",
						job_position_application: 0,
						interview_time: "",
						status: "scheduled",
						feedback: {},
						rating: undefined,
					});
				}
				setInterviewErrors({});

				setShowScheduleInterviewDialog((prev) => ({ ...prev, isOpen: false }));
				setSelectedApplications([]);
				// Reset form

				await loadApplications();
			} else {
				toast.error("Failed to schedule any interviews");
			}
		} catch (error) {
			toast.error("Failed to schedule interviews");
		} finally {
			setIsSchedulingInterview(false);
		}
	};

	const handleSelectApplication = (applicationId: number, checked: boolean) => {
		const match = applications.find((appl) => appl.id === applicationId);

		if (!match) {
			return;
		}
		if (checked) {
			setSelectedApplications((prev) => [...prev, match]);
		} else {
			setSelectedApplications((prev) => prev.filter((appl) => appl.id !== applicationId));
		}
	};

	const handleSelectAll = (checked: boolean) => {
		if (checked) {
			const eligibleApps = currentApplications.filter((app) => {
				// Count different statuses on current page
				const statusCounts = currentApplications.reduce(
					(acc, a) => {
						acc[a.status] = (acc[a.status] || 0) + 1;

						return acc;
					},
					{} as Record<string, number>,
				);

				const hasShortlisted = statusCounts.shortlisted > 0;
				const hasNewOrReviewed = (statusCounts.new || 0) + (statusCounts.reviewed || 0) > 0;

				if (hasShortlisted && !hasNewOrReviewed) {
					return app.status === "shortlisted";
				}
				// If we have ONLY new/reviewed applications, select all new/reviewed
				else if (!hasShortlisted && hasNewOrReviewed) {
					return app.status === "new" || app.status === "reviewed";
				}
				// If we have MIXED statuses, only select new/reviewed (protect shortlisted)
				else if (hasShortlisted && hasNewOrReviewed) {
					return app.status === "new" || app.status === "reviewed";
				}

				return false; // Default: don't select anything
			});

			setSelectedApplications(eligibleApps);
		} else {
			setSelectedApplications([]);
		}
	};
	const executeBulkAction = async (
		action: "shortlisted" | "reviewed" | "rejected",
		applications?: JobApplication[],
	) => {
		const applicationsToProcess = applications || selectedApplications;

		if (action === "shortlisted") {
			setIsBulkShortlisting(true);
		}

		try {
			const promises = applicationsToProcess.map((application) => {
				const updateData: {
					applicationId: number;
					status: string;
					shortlisted_by?: number;
					reviewed_by?: number;
					rejected_by?: number;
				} = {
					applicationId: application.id,
					status: action,
				};

				if (action === "shortlisted" && userData?.id) {
					updateData.shortlisted_by = userData.id;
				} else if (action === "reviewed" && userData?.id) {
					updateData.reviewed_by = userData.id;
				} else if (action === "rejected" && userData?.id) {
					updateData.rejected_by = userData.id;
				}

				return updateJobApplicationStatus(updateData);
			});

			await Promise.all(promises);
			setApplications((prev) =>
				prev.map((app) =>
					applicationsToProcess.find((appl) => appl.id === app.id)
						? { ...app, status: action }
						: app,
				),
			);
			setSelectedApplications([]);

			toast.success(
				`${applicationsToProcess.length} application${applicationsToProcess.length > 1 ? "s" : ""} updated to ${action}`,
			);
			refreshTableRef.current?.();
		} catch (error) {
			toast.error(`Failed to update application${applicationsToProcess.length > 1 ? "s" : ""}`);
		} finally {
			if (action === "shortlisted") {
				setIsBulkShortlisting(false);
			}
		}
	};

	const handleBulkAction = async (
		action: "shortlisted" | "reviewed" | "rejected" | "schedule_interview",
	) => {
		if (selectedApplications.length === 0) {
			toast.error("Please select applications first");

			return;
		}

		// For schedule interview, only allow shortlisted applications
		if (action === "schedule_interview") {
			const shortlistedApps = applications.filter(
				(app) =>
					selectedApplications.find((appl) => appl.id === app.id) && app.status === "shortlisted",
			);

			// console.log("\n\n Scheduling interviews with shortlisted applicants : ", shortlistedApps);

			if (shortlistedApps.length === 0) {
				toast.error("Please select shortlisted applications to schedule interviews");

				return;
			}

			// setBulkInterviewFormData({
			//   interview_stage: 0,
			//   interview_time: "",
			//   interview_date: "",
			//   location: "",
			//   interview_type: "in_person",
			//   status: "scheduled",
			//   job_position_application: 0,
			// });

			await fetchInterviewData();
			setShowScheduleInterviewDialog({ type: "bulk", isOpen: true });

			return;
		}

		let eligibleApps: JobApplication[] = [];
		let actionText = "";

		if (action === "reviewed") {
			// Only "new" applications can be marked as reviewed
			eligibleApps = applications.filter(
				(app) => selectedApplications.find((appl) => appl.id === app.id) && app.status === "new",
			);
			actionText = "mark as reviewed";
		} else if (action === "shortlisted") {
			// Only "reviewed" applications can be shortlisted
			eligibleApps = applications.filter(
				(app) =>
					selectedApplications.find((appl) => appl.id === app.id) && app.status === "reviewed",
			);
			actionText = "shortlist";
		} else if (action === "rejected") {
			// Only "new" or "reviewed" applications can be rejected
			eligibleApps = applications.filter(
				(app) =>
					selectedApplications.find((appl) => appl.id === app.id) &&
					(app.status === "new" || app.status === "reviewed"),
			);
			actionText = "reject";
		}

		if (eligibleApps.length === 0) {
			const statusRequirement = {
				reviewed: "new",
				shortlisted: "reviewed",
				rejected: "new or reviewed",
			}[action];

			toast.error(
				`No eligible applications selected. Only ${statusRequirement} applications can be ${actionText}.`,
			);

			return;
		}

		// Show different message if not all selected apps are eligible
		if (eligibleApps.length < selectedApplications.length) {
			const skippedCount = selectedApplications.length - eligibleApps.length;

			toast.warning(
				`${skippedCount} application(s) skipped - only eligible applications will be ${actionText}.`,
			);
		}

		// Show confirmation for shortlist and reject actions
		if (action === "shortlisted" || action === "rejected") {
			setConfirmBulkAction({
				isOpen: true,
				action,
				count: eligibleApps.length, // Use eligible apps count, not total selected
			});

			return;
		}

		// Execute directly for "reviewed" action
		await executeBulkAction(action, eligibleApps);
	};

	const handleConfirmBulkAction = async () => {
		if (confirmBulkAction.action) {
			// Filter eligible applications again for the confirmed action
			let eligibleApps: JobApplication[] = [];

			if (confirmBulkAction.action === "shortlisted") {
				eligibleApps = applications.filter(
					(app) =>
						selectedApplications.find((appl) => appl.id === app.id) && app.status === "reviewed",
				);
			} else if (confirmBulkAction.action === "rejected") {
				eligibleApps = applications.filter(
					(app) =>
						selectedApplications.find((appl) => appl.id === app.id) &&
						(app.status === "new" || app.status === "reviewed"),
				);
			}

			// FIXED: Use the executeBulkAction function instead of individual executeAction calls
			// This ensures only eligible applications are processed
			await executeBulkAction(confirmBulkAction.action, eligibleApps);

			setConfirmBulkAction({
				isOpen: false,
				action: null,
				count: 0,
			});
		}
	};

	const safeFilteredApplications = Array.isArray(filteredApplications) ? filteredApplications : [];
	const totalPages = Math.ceil(safeFilteredApplications.length / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentApplications = safeFilteredApplications.slice(startIndex, endIndex);

	const handleIndividualAction = async (
		applicationId: number,
		action: "new" | "reviewed" | "shortlisted" | "rejected" | "passed",
	) => {
		if (action === "shortlisted" || action === "rejected") {
			const application = applications.find((app) => app.id === applicationId);

			if (application) {
				setConfirmAction({
					isOpen: true,
					applicationId,
					applicantName: application.applicant_name,
					action: action as "shortlisted" | "rejected",
				});

				return;
			}
		}

		await executeAction(applicationId, action);
	};

	const executeAction = async (
		applicationId: number,
		action: "new" | "reviewed" | "shortlisted" | "rejected" | "passed",
	) => {
		if (action === "shortlisted") {
			setIndividualLoadingStates((prev) => ({ ...prev, [applicationId]: true }));
		}

		try {
			const updateData: {
				applicationId: number;
				status: string;
				shortlisted_by?: number;
				reviewed_by?: number;
				rejected_by?: number;
			} = {
				applicationId,
				status: action,
			};

			if (action === "shortlisted" && userData?.id) {
				updateData.shortlisted_by = userData.id;
			} else if (action === "reviewed" && userData?.id) {
				updateData.reviewed_by = userData.id;
			} else if (action === "rejected" && userData?.id) {
				updateData.rejected_by = userData.id;
			}

			await updateJobApplicationStatus(updateData);

			setApplications((prev) =>
				prev.map((app) => (app.id === applicationId ? { ...app, status: action } : app)),
			);
			clearAllFilters();
			toast.success(`Application ${action} successfully`);
			refreshTableRef.current?.();
		} catch (error) {
			toast.error(`Failed to ${action} application`);
		} finally {
			if (action === "shortlisted") {
				setIndividualLoadingStates((prev) => ({ ...prev, [applicationId]: false }));
			}
		}
	};

	const handleConfirmAction = async () => {
		if (confirmAction.applicationId && confirmAction.action) {
			await executeAction(confirmAction.applicationId, confirmAction.action);
			setConfirmAction({
				isOpen: false,
				applicationId: null,
				applicantName: "",
				action: null,
			});
		}
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	if (!selectedInstitution || !selectedBranch) {
		return <div>Loading...</div>;
	}

	if (isLoading) {
		return (
			<div className="p-2 space-y-6">
				<Card className="h-[calc(100vh-2rem)] shadow-lg">
					<CardHeader className="border-b">
						<div className="flex justify-between gap-8 items-center">
							<div className="flex items-center justify-start gap-4">
								<div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
								<div className="space-y-2">
									<div className="h-6 bg-gray-200 rounded w-64 animate-pulse" />
									<div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
								</div>
							</div>
							<div className="flex gap-2">
								<div className="h-10 w-32 bg-gray-200 rounded animate-pulse" />
								<div className="h-10 w-36 bg-gray-200 rounded animate-pulse" />
								<div className="h-10 w-28 bg-gray-200 rounded animate-pulse" />
							</div>
						</div>
					</CardHeader>
					<TableSkeleton rows={10} columns={8} />
				</Card>
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 w-full h-full bg-white p-3 md:p-4 lg:p-8 gap-4 rounded-lg relative">
			<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ">
				<div className="flex flex-col">
					<h1 className="text-lg sm:text-2xl md:text-3xl font-bold whitespace-nowrap">
						Job Applications
					</h1>
					<p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xs sm:max-w-none">
						Manage and track all job applications for {selectedBranch.branch_name} -
					</p>
				</div>
				<Button
					onClick={() => setIsCreateDialogOpen(true)}
					className="flex items-center sm:mt-15 lg:mt-0"
				>
					<Plus className="mr-2 h-4 w-4" />
					Create Application
				</Button>
			</div>

			{/* Enhanced Filter Section */}
			<div className="space-y-4">
				<div className="flex flex-col flex-wrap lg:flex-row gap-4 items-start lg:items-center mt-6">
					<div className="relative w-full max-w-md md:max-w-lg lg:max-w-sm">
						<Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
						<Input
							placeholder="Search by name, email, or phone..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="pl-10"
						/>
					</div>
					<div className="flex flex-col sm:flex-row gap-5 flex-1 lg:flex-[0.5]">
						<Select value={statusFilter} onValueChange={setStatusFilter}>
							<SelectTrigger className="w-full sm:w-48">
								<SelectValue placeholder="Filter by status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Statuses</SelectItem>
								<SelectItem value="new">New</SelectItem>
								<SelectItem value="reviewed">Reviewed</SelectItem>
								<SelectItem value="shortlisted">Shortlisted</SelectItem>
								<SelectItem value="accepted">Accepted</SelectItem>
								<SelectItem value="rejected">Rejected</SelectItem>
							</SelectContent>
						</Select>
						<Select value={jobFilter} onValueChange={setJobFilter}>
							<SelectTrigger className="w-full sm:w-48">
								<SelectValue placeholder="Filter by job" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Jobs</SelectItem>
								{jobPositionAdverts.map((advert) => (
									<SelectItem key={advert.id} value={advert.id.toString()}>
										{advert.job_position_details?.name || `Job Opening `}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Date Filter Row */}
					<div className="flex flex-col sm:flex-row gap-4 p-4 ">
						<div className="flex items-center gap-2">
							<Calendar className="h-4 w-4 text-muted-foreground" />
							<span className="text-sm font-medium text-gray-700">Date Filter:</span>
						</div>

						<Select
							value={dateFilter.type}
							onValueChange={(value: "application_date" | "posted_date") =>
								setDateFilter((prev) => ({ ...prev, type: value }))
							}
						>
							<SelectTrigger className="w-full sm:w-40">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="application_date">Application Date</SelectItem>
								<SelectItem value="posted_date">Posted Date</SelectItem>
							</SelectContent>
						</Select>

						<div className="flex items-center gap-2">
							<Label htmlFor="start-date" className="text-sm whitespace-nowrap">
								From:
							</Label>
							<Input
								id="start-date"
								type="date"
								value={dateFilter.startDate}
								onChange={(e) => setDateFilter((prev) => ({ ...prev, startDate: e.target.value }))}
								className="w-full sm:w-auto"
							/>
						</div>

						<div className="flex items-center gap-2">
							<Label htmlFor="end-date" className="text-sm whitespace-nowrap">
								To:
							</Label>
							<Input
								id="end-date"
								type="date"
								value={dateFilter.endDate}
								onChange={(e) => setDateFilter((prev) => ({ ...prev, endDate: e.target.value }))}
								className="w-full sm:w-auto"
							/>
						</div>

						{(dateFilter.startDate || dateFilter.endDate) && (
							<Button
								variant="outline"
								size="sm"
								onClick={clearDateFilters}
								className="w-full sm:w-auto"
							>
								<X className="h-4 w-4 mr-1" />
								Clear Dates
							</Button>
						)}
					</div>
				</div>

				{/* Active Filters Indicator */}
				{(searchTerm ||
					statusFilter !== "all" ||
					jobFilter !== "all" ||
					dateFilter.startDate ||
					dateFilter.endDate) && (
					<div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
						<div className="flex items-center gap-2 text-sm text-blue-800">
							<Filter className="h-4 w-4" />
							<span>
								Filters active - showing {safeFilteredApplications.length} of {applications.length}{" "}
								applications
							</span>
						</div>
						<Button
							variant="outline"
							size="sm"
							onClick={clearAllFilters}
							className="text-blue-600 border-blue-300 hover:bg-blue-100"
						>
							<X className="h-4 w-4 mr-1" />
							Clear All Filters
						</Button>
					</div>
				)}
			</div>
			{selectedApplications.length > 0 && (
				<Card className="border-blue-200 bg-blue-50">
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<Users className="h-4 w-4 text-blue-600" />
								<span className="text-sm font-medium text-blue-800">
									{selectedApplications.length} application(s) selected
								</span>
							</div>
							<div className="flex items-center gap-2 flex-wrap">
								{/* Your existing review button */}
								{selectedApplications.some((appl) => {
									const app = applications.find((a) => a.id === appl.id);

									return app?.status === "new";
								}) && (
									<Button
										size="sm"
										variant="outline"
										onClick={() => handleBulkAction("reviewed")}
										className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
									>
										<Eye className="h-4 w-4 mr-2" />
										Mark as Reviewed
									</Button>
								)}

								{/* Your existing shortlist button */}
								{selectedApplications.some((appl) => {
									const app = applications.find((a) => a.id === appl.id);

									return app?.status === "reviewed";
								}) && (
									<Button
										size="sm"
										variant="outline"
										onClick={() => handleBulkAction("shortlisted")}
										disabled={isBulkShortlisting}
										className="text-green-600 border-green-200 hover:bg-green-50"
									>
										{isBulkShortlisting ? (
											<>
												<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 mr-2" />
												Shortlisting...
											</>
										) : (
											<>
												<Check className="h-4 w-4 mr-2" />
												Shortlist
											</>
										)}
									</Button>
								)}

								{/* UPDATED: Schedule Interview button - now works for multiple selections */}
								{selectedApplications.some((appl) => {
									const app = applications.find((a) => a.id === appl.id);

									return app?.status === "shortlisted";
								}) && (
									<Button
										size="sm"
										variant="outline"
										onClick={() => handleBulkAction("schedule_interview")}
										className="text-blue-600 border-blue-200 hover:bg-blue-50"
									>
										{isFetchingInterviewData ? (
											<Loader className="animate-spin" />
										) : (
											<Calendar className="h-4 w-4 mr-2" />
										)}
										Schedule Interview
										{selectedApplications.filter((appl) => {
											const app = applications.find((a) => a.id === appl.id);

											return app?.status === "shortlisted";
										}).length > 1
											? "s"
											: ""}
									</Button>
								)}

								{/* Your existing reject button */}
								{selectedApplications.some((appl) => {
									const app = applications.find((a) => a.id === appl.id);

									return app?.status === "new" || app?.status === "reviewed";
								}) && (
									<Button
										size="sm"
										variant="outline"
										onClick={() => handleBulkAction("rejected")}
										className="text-red-600 border-red-200 hover:bg-red-50"
									>
										<X className="h-4 w-4 mr-2" />
										Reject
									</Button>
								)}

								<Button
									size="sm"
									variant="outline"
									onClick={() => setSelectedApplications([])}
									className="text-gray-600"
								>
									Clear Selection
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			{error && !isCreateDialogOpen && (
				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			<Card className="mt-6 h-full">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Users className="h-5 w-5" />
						Applications ({safeFilteredApplications.length})
					</CardTitle>
					<CardDescription>
						All job applications submitted to your organization
						{safeFilteredApplications.length !== applications.length &&
							` (${applications.length} total)`}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<PaginatedTableWrapper<JobApplication>
						fetchFirstPage={async () => {
							if (!selectedInstitution) throw new Error("No institution selected");

							return await getPaginatedJobApplications({
								institutionId: selectedInstitution.id,
								page: 1,
								ordering,
								search: searchTerm || undefined,
								status: statusFilter !== "all" ? statusFilter : undefined,
								jobPositionAdvert: jobFilter !== "all" ? jobFilter : undefined,
							});
						}}
						fetchFromUrl={async (args: { url: string }) =>
							getPaginatedJobApplicationsFromUrl(args.url)
						}
						deps={[selectedInstitution?.id, searchTerm, statusFilter, jobFilter, ordering]}
						className="space-y-4"
						footerClassName="pt-4"
					>
						{({ data, loading, refresh }) => {
							// Store refresh function in ref when component mounts/updates
							useEffect(() => {
								refreshTableRef.current = refresh;
							}, [refresh]);

							if (loading) {
								return <TableSkeleton rows={10} columns={10} />;
							}

							if (!data || data.results.length === 0) {
								return (
									<div className="text-center py-8 text-gray-500">
										{searchTerm ||
										statusFilter !== "all" ||
										jobFilter !== "all" ||
										dateFilter.startDate ||
										dateFilter.endDate
											? "No applications match your current filters."
											: "No applications have been submitted yet."}
									</div>
								);
							}

							// Apply client-side filters (date filter and sorting)
							let filteredResults = data.results.filter((application) => {
								if (dateFilter.startDate || dateFilter.endDate) {
									const appDate = new Date(application.application_date);
									const startDate = dateFilter.startDate ? new Date(dateFilter.startDate) : null;
									const endDate = dateFilter.endDate ? new Date(dateFilter.endDate) : null;

									if (startDate && appDate < startDate) return false;
									if (endDate && appDate > endDate) return false;
								}

								if (statusFilter !== "all") {
									if (application.status !== statusFilter) return false;
								}

								return true;
							});

							// Apply sorting
							const sortedResults = [...filteredResults].sort((a, b) => {
								let aValue: string, bValue: string;

								if (sortField === "application_date") {
									aValue = a.application_date;
									bValue = b.application_date;
								} else {
									aValue = a.job_position_advert_job_details?.job_posted_date || "";
									bValue = b.job_position_advert_job_details?.job_posted_date || "";
								}

								const comparison = new Date(aValue).getTime() - new Date(bValue).getTime();

								return sortDirection === "asc" ? comparison : -comparison;
							});

							if (sortedResults.length === 0) {
								return (
									<div className="text-center py-8 text-gray-500">
										No applications found matching the selected date filters.
									</div>
								);
							}

							return (
								<>
									<div className="">
										<Table className="min-w-full">
											<TableHeader>
												<TableRow>
													<TableHead className="w-12">
														<div className="flex items-center">
															<Checkbox
																checked={
																	sortedResults.length > 0 &&
																	(() => {
																		// Count different statuses on current page
																		const statusCounts = sortedResults.reduce(
																			(acc, a) => {
																				acc[a.status] = (acc[a.status] || 0) + 1;

																				return acc;
																			},
																			{} as Record<string, number>,
																		);

																		const hasShortlisted = statusCounts.shortlisted > 0;
																		const hasNewOrReviewed =
																			(statusCounts.new || 0) + (statusCounts.reviewed || 0) > 0;

																		let selectableApps: typeof sortedResults = [];

																		// Determine which apps should be selectable based on the mix
																		if (hasShortlisted && !hasNewOrReviewed) {
																			// Only shortlisted apps
																			selectableApps = sortedResults.filter(
																				(app) => app.status === "shortlisted",
																			);
																		} else if (!hasShortlisted && hasNewOrReviewed) {
																			// Only new/reviewed apps
																			selectableApps = sortedResults.filter(
																				(app) => app.status === "new" || app.status === "reviewed",
																			);
																		} else if (hasShortlisted && hasNewOrReviewed) {
																			// Mixed: only select new/reviewed (protecting shortlisted)
																			selectableApps = sortedResults.filter(
																				(app) => app.status === "new" || app.status === "reviewed",
																			);
																		}

																		// Check if all selectable apps are selected
																		return (
																			selectableApps.length > 0 &&
																			selectableApps.every((app) =>
																				selectedApplications.find((appl) => appl.id === app.id),
																			)
																		);
																	})()
																}
																onCheckedChange={handleSelectAll}
																title={(() => {
																	const statusCounts = sortedResults.reduce(
																		(acc, a) => {
																			acc[a.status] = (acc[a.status] || 0) + 1;

																			return acc;
																		},
																		{} as Record<string, number>,
																	);

																	const hasShortlisted = statusCounts.shortlisted > 0;
																	const hasNewOrReviewed =
																		(statusCounts.new || 0) + (statusCounts.reviewed || 0) > 0;

																	if (hasShortlisted && !hasNewOrReviewed) {
																		return "Select all shortlisted applications";
																	} else if (!hasShortlisted && hasNewOrReviewed) {
																		return "Select new and reviewed applications (protecting shortlisted)";
																	} else if (hasShortlisted && hasNewOrReviewed) {
																		return "Select new and reviewed applications (protecting shortlisted)";
																	}

																	return "Select applications";
																})()}
															/>
														</div>
													</TableHead>
													<TableHead>
														<div className="flex items-center justify-start gap-4">
															<span>Applicant</span>
															<Button
																onClick={() => {
																	if (ordering === "applicant") {
																		setOrdering("");
																	} else {
																		setOrdering("applicant");
																	}
																}}
																size={"sm"}
																variant={ordering === "applicant" ? "default" : "outline"}
																type="button"
															>
																<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
															</Button>
														</div>{" "}
													</TableHead>
													<TableHead>Job Position/ Title </TableHead>
													<TableHead
														className="cursor-pointer hover:bg-muted/50"
														onClick={() => handleSort("posted_date")}
													>
														<div className="flex items-center gap-1">
															Posted Date
															{sortField === "posted_date" &&
																(sortDirection === "asc" ? (
																	<ChevronUp className="h-4 w-4" />
																) : (
																	<ChevronDown className="h-4 w-4" />
																))}
														</div>
													</TableHead>
													<TableHead>
														<div className="flex items-center justify-start gap-4">
															<span>Contact</span>
															<Button
																onClick={() => {
																	if (ordering === "applicant_email") {
																		setOrdering("");
																	} else {
																		setOrdering("applicant_email");
																	}
																}}
																size={"sm"}
																variant={ordering === "applicant_email" ? "default" : "outline"}
																type="button"
															>
																<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
															</Button>
														</div>{" "}
													</TableHead>
													<TableHead>Location</TableHead>
													<TableHead>
														<div className="flex items-center justify-start gap-4">
															<span>Status</span>

															<Button
																onClick={() => {
																	if (ordering === "status") {
																		setOrdering("");
																	} else {
																		setOrdering("status");
																	}
																}}
																size={"sm"}
																variant={ordering === "status" ? "default" : "outline"}
																type="button"
															>
																<Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
															</Button>
														</div>{" "}
													</TableHead>
													<TableHead>Source</TableHead>
													<TableHead
														className="cursor-pointer hover:bg-muted/50"
														onClick={() => handleSort("application_date")}
													>
														<div className="flex items-center gap-1">
															Applied
															{sortField === "application_date" &&
																(sortDirection === "asc" ? (
																	<ChevronUp className="h-4 w-4" />
																) : (
																	<ChevronDown className="h-4 w-4" />
																))}
														</div>
													</TableHead>
													<TableHead>Documents</TableHead>
													<TableHead>Actions</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{sortedResults.map((application) => (
													<TableRow key={application.id}>
														<TableCell>
															<div className="flex items-center">
																<Checkbox
																	checked={
																		!!selectedApplications.find(
																			(appl) => appl.id === application.id,
																		)
																	}
																	onCheckedChange={(checked: any) =>
																		handleSelectApplication(application.id, checked as boolean)
																	}
																/>
															</div>
														</TableCell>
														<TableCell>
															<div className="space-y-1">
																<div className="font-medium">{application.applicant_name}</div>
																<div className="flex items-center text-sm text-muted-foreground">
																	<User className="mr-1 h-3 w-3" />
																	{application.gender}
																</div>
															</div>
														</TableCell>
														<TableCell>
															<div className="space-y-1">
																<div className="font-medium">
																	{application.job_position_advert_job_details?.name || `Advert `}
																</div>
															</div>
														</TableCell>
														<TableCell>
															<div className="flex items-center text-sm">
																<Calendar className="mr-1 h-3 w-3" />
																{formatDate(
																	application.job_position_advert_job_details.job_posted_date,
																)}
															</div>
														</TableCell>
														<TableCell>
															<div className="space-y-1">
																<div className="flex items-center text-sm">
																	<Mail className="mr-1 h-3 w-3" />
																	{application.applicant_email}
																</div>
																{application.applicant_phone && (
																	<div className="flex items-center text-sm text-muted-foreground">
																		<Phone className="mr-1 h-3 w-3" />
																		{application.applicant_phone}
																	</div>
																)}
															</div>
														</TableCell>
														<TableCell>
															<div className="space-y-1">
																<div className="flex items-center text-sm">
																	<MapPin className="mr-1 h-3 w-3" />
																	{application.country}
																</div>
																{application.state && (
																	<div className="text-sm text-muted-foreground">
																		{application.state}
																	</div>
																)}
															</div>
														</TableCell>
														<TableCell>
															<Badge className={statusColors[application.status]}>
																{application.status.charAt(0).toUpperCase() +
																	application.status.slice(1)}
															</Badge>
														</TableCell>
														<TableCell>
															<span className="text-sm">{sourceLabels[application.source]}</span>
														</TableCell>
														<TableCell>
															<div className="flex items-center text-sm">
																<Calendar className="mr-1 h-3 w-3" />
																{formatDate(application.application_date)}
															</div>
														</TableCell>
														<TableCell>
															<div className="py-1 flex flex-col gap-2 items-start">
																<Button variant="link" size="sm" className="h-auto p-0" asChild>
																	<a
																		href={getFileUrl(application.resume)}
																		target="_blank"
																		rel="noopener noreferrer"
																		className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
																	>
																		<FileText className="h-3 w-3" />
																		Resume
																	</a>
																</Button>
																{application.cover_letter && (
																	<Button variant="link" size="sm" className="h-auto p-0" asChild>
																		<a
																			href={getFileUrl(application.cover_letter)}
																			target="_blank"
																			rel="noopener noreferrer"
																			className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
																		>
																			<FileText className="h-3 w-3" />
																			Cover Letter
																		</a>
																	</Button>
																)}
															</div>
														</TableCell>
														<TableCell>
															<DropdownMenu>
																<DropdownMenuTrigger asChild>
																	<Button variant="ghost" size="sm">
																		<MoreVertical className="!h-4 !w-4 text-dark" />
																	</Button>
																</DropdownMenuTrigger>
																<DropdownMenuContent align="end">
																	<DropdownMenuItem
																		onClick={() => handleViewApplication(application.id)}
																	>
																		<Eye className="h-4 w-4 mr-2" />
																		View Details
																	</DropdownMenuItem>
																	<DropdownMenuItem
																		onClick={() => handleEditApplication(application.id)}
																	>
																		<Edit className="h-4 w-4 mr-2" />
																		Edit
																	</DropdownMenuItem>
																	<DropdownMenuItem
																		onClick={() => handleOpenScheduleInterview(application)}
																		disabled={application.status !== "shortlisted"}
																	>
																		<Calendar className="h-4 w-4 mr-2" />
																		Schedule Interview
																	</DropdownMenuItem>
																	<DropdownMenuItem
																		onClick={() =>
																			handleIndividualAction(application.id, "reviewed")
																		}
																		disabled={application.status !== "new"}
																	>
																		<Eye className="h-4 w-4 mr-2" />
																		Mark as Reviewed
																	</DropdownMenuItem>
																	<DropdownMenuItem
																		onClick={() =>
																			handleIndividualAction(application.id, "shortlisted")
																		}
																		disabled={application.status !== "reviewed"}
																	>
																		<Check className="h-4 w-4 mr-2" />
																		Shortlist
																	</DropdownMenuItem>
																	<DropdownMenuItem
																		onClick={() =>
																			handleIndividualAction(application.id, "rejected")
																		}
																		disabled={
																			application.status !== "new" &&
																			application.status !== "reviewed"
																		}
																	>
																		<X className="h-4 w-4 mr-2" />
																		Reject
																	</DropdownMenuItem>
																</DropdownMenuContent>
															</DropdownMenu>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								</>
							);
						}}
					</PaginatedTableWrapper>
				</CardContent>
			</Card>

			{/* Create Application Dialog */}
			<Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
				<DialogContent className="max-w-4xl">
					<DialogHeader className="pb-6">
						<DialogTitle className="text-2xl font-semibold text-gray-800">
							Add Application
						</DialogTitle>
						<DialogDescription className="text-gray-600">
							Fill in the details to create a new job application.
						</DialogDescription>
					</DialogHeader>

					{error && (
						<Alert variant="destructive" className="mb-4">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					<form onSubmit={handleSubmit} className="space-y-6">
						<div className="max-h-[80vh] md:max-h-[65svh]  overflow-y-auto">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-2">
									<label
										htmlFor="job_position_advert"
										className="block text-sm font-medium text-gray-800"
									>
										Job Position / Title *
									</label>
									<div className="relative">
										<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground z-10" />
										<div className="relative" ref={jobPositionContainerRef}>
											<Input
												className="w-full bg-white border-gray-300 pl-9"
												placeholder="Search or select job position"
												type="text"
												value={(() => {
													if (jobPositionDropdownOpen && jpFilterText !== "") {
														return jpFilterText;
													}
													if (formData.job_position_advert && jpFilterText === "") {
														const selectedAdvert = jobPositionAdverts.find(
															(p) => p.id === formData.job_position_advert,
														);
														return selectedAdvert ? getPositionLabel(selectedAdvert) : "";
													}
													return jpFilterText;
												})()}
												onChange={(e) => {
													const newValue = e.target.value;
													setJpFilterText(newValue);
													setJobPositionDropdownOpen(true);

													if (newValue === "") {
														handleInputChange("job_position_advert", 0);
													}
												}}
												onFocus={handleJobPositionInputFocus}
												onKeyDown={(e) => {
													if (
														(e.key === "Backspace" || e.key === "Delete") &&
														jpFilterText === ""
													) {
														handleInputChange("job_position_advert", 0);
													}
												}}
											/>
											{jobPositionDropdownOpen && (
												<div
													className="absolute top-full mt-2 left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto"
													ref={jobPositionDropdownRef}
													onScroll={handleJobPositionDropdownScroll}
												>
													{jobPositionOptions.length > 0 ? (
														<>
															{jobPositionOptions.map((advert) => (
																<div
																	key={advert.id}
																	className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
																	onClick={() => {
																		handleInputChange("job_position_advert", Number(advert.id));
																		setJpFilterText("");
																		setJobPositionDropdownOpen(false);
																		setSelectedJobRequiredDocuments(
																			advert.required_documents || [],
																		);
																	}}
																>
																	<div className="flex flex-col">
																		<span className="font-medium">
																			{advert.job_position_details?.name || `Job Opening `}
																		</span>
																	</div>
																</div>
															))}
															{isLoadingJobPositions && (
																<div className="flex items-center justify-center py-3 text-sm text-gray-500">
																	<Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading more...
																</div>
															)}
															{!hasMoreJobPositions && (
																<div className="text-center py-3 text-gray-500 text-sm">
																	No more positions
																</div>
															)}
														</>
													) : isLoadingJobPositions ? (
														<div className="flex items-center justify-center py-8 text-sm text-gray-500">
															<Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading positions...
														</div>
													) : (
														<div className="text-center py-8 text-gray-500 text-sm">
															{jpFilterText
																? `No positions found for "${jpFilterText}"`
																: "No positions available"}
														</div>
													)}
												</div>
											)}
										</div>
									</div>
								</div>
								<div className="space-y-2">
									<label
										htmlFor="application_date"
										className="block text-sm font-medium text-gray-800"
									>
										Application Date *
									</label>
									<div className="relative">
										<Input
											id="application_date"
											type="date"
											value={formData.application_date}
											onChange={(e) => handleInputChange("application_date", e.target.value)}
											className="w-full pr-10 bg-white border-gray-300"
											max={new Date().toISOString().split("T")[0]}
											required
										/>
										<CalendarDays className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-gray-500 pointer-events-none" />
									</div>
								</div>
							</div>

							{/* Second Row - Name and Gender */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-2">
									<label
										htmlFor="applicant_name"
										className="block text-sm font-medium text-gray-800"
									>
										Applicant Name *
									</label>
									<Input
										id="applicant_name"
										placeholder="Applicant Name"
										value={formData.applicant_name}
										onChange={(e) => handleInputChange("applicant_name", e.target.value)}
										className="bg-white border-gray-300"
										required
									/>
								</div>

								<div className="space-y-2">
									<label htmlFor="gender" className="block text-sm font-medium text-gray-800">
										Gender *
									</label>
									<Select
										value={formData.gender}
										onValueChange={(value: any) => handleInputChange("gender", value)}
									>
										<SelectTrigger className="w-full bg-white border-gray-300">
											<SelectValue placeholder="Select Gender" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="male">Male</SelectItem>
											<SelectItem value="female">Female</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>

							{/* Third Row - Email and Phone */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-2">
									<label
										htmlFor="applicant_email"
										className="block text-sm font-medium text-gray-800"
									>
										Email *
									</label>
									<Input
										id="applicant_email"
										placeholder="email@email.com"
										type="email"
										value={formData.applicant_email}
										onChange={(e) => handleInputChange("applicant_email", e.target.value)}
										className="bg-white border-gray-300"
										required
									/>
								</div>

								<div className="space-y-2">
									<label
										htmlFor="applicant_phone"
										className="block text-sm font-medium text-gray-800"
									>
										Phone Number
									</label>
									<Input
										id="applicant_phone"
										placeholder="0751234567"
										type="tel"
										value={formData.applicant_phone}
										onChange={(e) => handleInputChange("applicant_phone", e.target.value)}
										className="bg-white border-gray-300"
									/>
								</div>
							</div>

							{/* Fourth Row - Source and Address */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-2">
									<label htmlFor="source" className="block text-sm font-medium text-gray-800">
										Source
									</label>
									<Select
										value={formData.source}
										onValueChange={(value: string) => {
											handleInputChange("source", value);
											if (value !== "head_hunt") {
												handleInputChange("recommended_by", null);
											}
										}}
									>
										<SelectTrigger className="w-full bg-white border-gray-300">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="website">Website</SelectItem>
											<SelectItem value="referral">Referral</SelectItem>
											<SelectItem value="job_board">Job Board</SelectItem>
											<SelectItem value="social_media">Social Media</SelectItem>
											<SelectItem value="head_hunt">Head Hunt</SelectItem>
											<SelectItem value="other">Other</SelectItem>
										</SelectContent>
									</Select>
								</div>

								<div className="space-y-2">
									<label htmlFor="address" className="block text-sm font-medium text-gray-800">
										Address *
									</label>
									<div className="relative">
										<LocationAutocomplete
											value={formData.address}
											onChange={(value) => handleInputChange("address", value)}
											onCoordinatesChange={handleAddressCoordinatesChange}
											placeholder="Search for applicant's address..."
											showCurrentLocationButton={true}
											className="w-full bg-white border-gray-300"
										/>
									</div>
									{/* Hidden coordinate fields */}
									<input
										type="hidden"
										value={formData.address_latitude || ""}
										onChange={(e) => handleInputChange("address_latitude", e.target.value)}
									/>
									<input
										type="hidden"
										value={formData.address_longitude || ""}
										onChange={(e) => handleInputChange("address_longitude", e.target.value)}
									/>
									<input
										type="hidden"
										value={formData.created_by || userData?.id || 0}
										onChange={(e) => handleInputChange("created_by", Number(e.target.value))}
									/>
								</div>
							</div>

							{/* Head Hunt Field - Only show when source is head_hunt */}
							{formData.source === "head_hunt" && (
								<div className="space-y-2 my-4">
									<label
										htmlFor="recommended_by"
										className="block text-sm font-medium text-gray-800"
									>
										Head Hunted By *
									</label>
									<div className="w-full">
										<EmployeeSearchableSelect
											value={formData.recommended_by ? [formData.recommended_by.toString()] : []}
											onValueChange={(values) => {
												const selectedValue = Array.isArray(values) ? values[0] : values;

												handleInputChange(
													"recommended_by",
													selectedValue ? Number(selectedValue) : null,
												);
											}}
											placeholder="Select the employee who head hunted this candidate"
											showEmployeeId={false}
											showDepartment={true}
											multiple={false}
										/>
									</div>
									{!formData.recommended_by && (
										<p className="text-sm text-muted-foreground">
											Please select which employee was responsible for head hunting this candidate.
										</p>
									)}
								</div>
							)}

							{/* Fifth Row - State and Country */}
							<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
								<div className="space-y-2">
									<label htmlFor="state" className="block text-sm font-medium text-gray-800">
										State
									</label>
									<Input
										id="state"
										placeholder="State"
										value={formData.state}
										onChange={(e) => handleInputChange("state", e.target.value)}
										className="bg-white border-gray-300"
									/>
								</div>

								<div className="space-y-2">
									<label htmlFor="country" className="block text-sm font-medium text-gray-800">
										Country *
									</label>
									<CountrySelect
										countries={undefined}
										selectedCountry={selectedCountry}
										onCountryChange={(country) => {
											setSelectedCountry(country);
											handleInputChange("country", country?.name.common || "");
										}}
										disabled={false}
										compact={false}
									/>
								</div>
							</div>

							{/* Dynamic Required Documents Section */}
							<div className="space-y-4">
								<h3 className="text-lg font-medium text-gray-800">Required Documents</h3>

								{/* Job-specific required documents */}
								{selectedJobRequiredDocuments.length === 0 ? (
									<div className="text-center py-4 border-2 border-dashed border-gray-300 rounded-md bg-gray-50">
										<FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
										<p className="text-sm text-gray-600">
											No additional documents required for this position
										</p>
									</div>
								) : (
									<div className="space-y-4">
										{selectedJobRequiredDocuments.map((doc, index) => (
											<div key={doc.id || index} className="space-y-2">
												<div className="flex items-center justify-between">
													<Label
														htmlFor={`document-${index}`}
														className="text-sm font-medium text-gray-800"
													>
														{doc.document_name}
														{!doc.is_optional && <span className="text-red-500 ml-1">*</span>}
													</Label>
													{doc.is_optional && (
														<Badge
															variant="outline"
															className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200"
														>
															Optional
														</Badge>
													)}
												</div>

												{doc.description && (
													<p className="text-sm text-gray-600 mb-2">{doc.description}</p>
												)}

												<div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-md bg-gray-50 text-center cursor-pointer hover:border-gray-400 transition-colors duration-200">
													<input
														id={`document-${index}`}
														type="file"
														accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
														className="sr-only"
														onChange={(e) => {
															handleDocumentFileChange(
																doc.document_name,
																e.target.files?.[0] || null,
															);
														}}
														required={!doc.is_optional}
													/>
													<label
														htmlFor={`document-${index}`}
														className="flex flex-col items-center cursor-pointer w-full"
													>
														<Upload className="h-6 w-6 text-primary mb-2" />
														<span className="text-sm font-medium text-primary">
															Click to Upload {doc.document_name}
														</span>
													</label>

													{formData.required_document_files?.[doc.document_name] && (
														<p className="text-sm text-gray-700 mt-2 flex items-center">
															<FileText className="mr-1 h-3 w-3" />
															{formData.required_document_files[doc.document_name].name}
														</p>
													)}
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						</div>

						{/* Form Actions */}
						<div className="flex justify-start gap-4 pt-6 border-t">
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? "Creating..." : "Add Application"}
							</Button>
							<Button type="button" variant="outline" onClick={handleClearForm}>
								Clear Form
							</Button>
							<Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
								Cancel
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>

			{/* Individual Action Confirmation Dialog */}
			<AlertDialog
				open={confirmAction.isOpen}
				onOpenChange={(open: any) => {
					if (!open) {
						setConfirmAction({
							isOpen: false,
							applicationId: null,
							applicantName: "",
							action: null,
						});
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{confirmAction.action === "shortlisted"
								? "Shortlist Application"
								: "Reject Application"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to{" "}
							{confirmAction.action === "shortlisted" ? "shortlist" : "reject"} the application from{" "}
							<strong>{confirmAction.applicantName}</strong>?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmAction}
							className={
								confirmAction.action === "rejected" ? "bg-destructive hover:bg-destructive/90" : ""
							}
						>
							{confirmAction.action === "shortlisted" ? "Shortlist" : "Reject"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Bulk Action Confirmation Dialog */}
			<AlertDialog
				open={confirmBulkAction.isOpen}
				onOpenChange={(open: any) => {
					if (!open) {
						setConfirmBulkAction({
							isOpen: false,
							action: null,
							count: 0,
						});
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{confirmBulkAction.action === "shortlisted"
								? "Shortlist Applications"
								: "Reject Applications"}
						</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to{" "}
							{confirmBulkAction.action === "shortlisted" ? "shortlist" : "reject"}{" "}
							<strong>{confirmBulkAction.count}</strong> selected application
							{confirmBulkAction.count !== 1 ? "s" : ""}?
							{confirmBulkAction.action === "rejected" && (
								<span className="block mt-2 text-red-600 font-medium">
									This action cannot be undone.
								</span>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleConfirmBulkAction}
							className={
								confirmBulkAction.action === "rejected"
									? "bg-destructive hover:bg-destructive/90"
									: ""
							}
						>
							{confirmBulkAction.action === "shortlisted" ? "Shortlist" : "Reject"}{" "}
							{confirmBulkAction.count} Application{confirmBulkAction.count !== 1 ? "s" : ""}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<Dialog
				open={showScheduleInterviewDialog.isOpen}
				onOpenChange={(open) =>
					setShowScheduleInterviewDialog((prev) => ({ ...prev, isOpen: open }))
				}
			>
				<DialogContent className="w-full max-w-lg md:max-w-xl lg:max-w-2xl xl:max-w-4xl">
					<DialogHeader>
						<DialogTitle>
							Schedule {showScheduleInterviewDialog.type === "bulk" ? "Bulk" : ""} Interview
							{showScheduleInterviewDialog.type === "bulk" ? "s" : ""}
						</DialogTitle>
						<DialogDescription>
							<>
								{showScheduleInterviewDialog.type === "single" ? (
									<>
										Schedule interview for{" "}
										{selectedApplicationForInterview?.applicant_name || "this applicant"}.
									</>
								) : (
									<>
										Schedule interviews for{" "}
										{
											selectedApplications.filter((appl) => {
												const app = applications.find((a) => a.id === appl.id);

												return app?.status === "shortlisted";
											}).length
										}{" "}
										shortlisted applicants. Each interview will be scheduled 30 minutes apart
										starting from your selected time.
									</>
								)}
							</>
						</DialogDescription>
					</DialogHeader>

					{/* Create Interview Stage Button */}

					<form onSubmit={handleSubmitInterviews} className="py-8 space-y-6 px-3">
						{/* Form Fields - Responsive Grid */}
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[60svh] overflow-y-auto">
							{/* Interview Stage */}
							<div className="space-y-2">
								<div className="flex justify-between">
									<Label htmlFor="bulk_interview_stage" className="text-sm font-medium">
										Interview Stage *
									</Label>
									<Button
										type="button"
										variant="outline"
										onClick={() => setShowCreateStageDialog(true)}
										size="sm"
									>
										<Plus className="h-4 w-4" />
									</Button>
								</div>

								<Select
									value={bulkInterviewFormData.interview_stage.toString()}
									onValueChange={(value: any) => {
										setBulkInterviewFormData((prev) => ({
											...prev,
											interview_stage: parseInt(value),
										}));
										if (interviewErrors.interview_stage) {
											setInterviewErrors((prev: any) => ({ ...prev, interview_stage: undefined }));
										}
									}}
								>
									<SelectTrigger
										className={interviewErrors.interview_stage ? "border-destructive" : ""}
									>
										<SelectValue
											placeholder={
												interviewStages.length === 0
													? "No stages available"
													: "Select interview stage"
											}
										/>
									</SelectTrigger>
									<SelectContent>
										{interviewStages.map((stage) => (
											<SelectItem key={stage.id} value={stage.id.toString()}>
												<div className="flex items-center gap-2">
													<Building className="h-4 w-4" />
													{stage.name} (Level {stage.level})
												</div>
											</SelectItem>
										))}
										{interviewStages.length === 0 && (
											<SelectItem value="no-stages" disabled>
												No interview stages available
											</SelectItem>
										)}
									</SelectContent>
								</Select>

								{interviewStages
									.find((stage) => stage.id === bulkInterviewFormData.interview_stage)
									?.feedback_fields?.map((field, idx) => {
										const fieldKey = field.label.toLowerCase().trim().replace(/\s+/g, "_");

										// Helper to read/write nested feedback object
										const readFeedbackValue = () =>
											bulkInterviewFormData.feedback
												? bulkInterviewFormData.feedback[fieldKey]
												: undefined;

										const writeFeedbackValue = (val: any) => {
											setBulkInterviewFormData((prev) => ({
												...prev,
												feedback: {
													...(prev.feedback || {}),
													[fieldKey]: val,
												},
											}));
											setInterviewFormData((prev) => ({
												...prev,
												feedback: {
													...(prev.feedback || {}),
													[fieldKey]: val,
												},
											}));
										};

										if (field.type === "rating") {
											const max =
												Array.isArray(field.options) && field.options.length > 0
													? Math.max(...(field.options as number[]))
													: 10;
											const current = Number(readFeedbackValue() || 1);
											const ratingValue = [Number(current || 1)];

											return (
												<div key={field.label + "_rating_" + idx} className="space-y-3">
													<Label className="text-sm font-medium text-slate-700">
														{field.label}: {ratingValue[0]}/{max}
													</Label>
													<div className="px-3">
														<Slider
															key={`rating-slider-${fieldKey}`}
															value={ratingValue}
															onValueChange={(val: number[]) => writeFeedbackValue(Number(val[0]))}
															max={max}
															min={1}
															step={1}
															className="w-full"
															disabled={isFetchingInterviewData}
														/>
														<div className="flex justify-between text-xs text-slate-500 mt-1">
															<span>Poor (1)</span>
															<span>Average {Math.ceil(max / 2)}</span>
															<span>Excellent ({max})</span>
														</div>
													</div>
												</div>
											);
										}
										if (field.type === "checkbox") {
											// treat 'checkbox' here as single-choice (radio) as previously implemented
											const selected = String(readFeedbackValue() ?? "");
											return (
												<div key={field.label + "_choice_" + idx} className="space-y-4">
													<Label className="text-sm text-gray-800 capitalize">
														{field.label.replace("_", " ")}
													</Label>
													<RadioGroup
														value={selected}
														onValueChange={(val) => writeFeedbackValue(val)}
														className="flex flex-col space-y-2"
													>
														{(field.options || []).map((option, optionIdx) => {
															const optionId = `option_${fieldKey}_${optionIdx}`;
															return (
																<div key={optionId} className="flex items-center space-x-2">
																	<RadioGroupItem value={String(option)} id={optionId} />
																	<Label htmlFor={optionId} className="text-sm">
																		{String(option)}
																	</Label>
																</div>
															);
														})}
													</RadioGroup>
												</div>
											);
										}

										if (field.type === "text") {
											const value = readFeedbackValue() || "";
											return (
												<div key={field.label + "_text_" + idx} className="space-y-2">
													<Label className="block text-sm font-medium text-gray-800">
														{field.label}
													</Label>
													<Input
														required={field.required}
														value={value}
														onChange={(e) => writeFeedbackValue(e.target.value)}
														className="bg-white border-gray-300"
													/>
												</div>
											);
										}

										return null;
									})}

								{interviewErrors.interview_stage && (
									<p className="text-sm text-destructive">{interviewErrors.interview_stage}</p>
								)}
								<p className="text-xs text-muted-foreground">
									Can't find the right stage? Click "Create New Stage" to add one.
								</p>
							</div>

							{/* Interview Date */}
							<div className="space-y-2">
								<Label htmlFor="bulk_interview_date" className="text-sm font-medium">
									Start Interview Date & Time *
								</Label>
								<Input
									id="bulk_interview_date"
									type="datetime-local"
									value={bulkInterviewFormData.interview_date}
									onChange={(e) => {
										setBulkInterviewFormData((prev) => ({
											...prev,
											interview_date: e.target.value,
										}));
										if (interviewErrors.interview_date) {
											setInterviewErrors((prev: any) => ({ ...prev, interview_date: undefined }));
										}
									}}
									className={interviewErrors.interview_date ? "border-destructive" : ""}
									min={new Date().toISOString().slice(0, 16)}
								/>
								{interviewErrors.interview_date && (
									<p className="text-sm text-destructive">{interviewErrors.interview_date}</p>
								)}

								<p className="text-xs text-muted-foreground">
									{showScheduleInterviewDialog.type === "bulk" ? (
										<>{`First interview starts at this time. Subsequent interviews will be scheduled 30  minutes apart.`}</>
									) : (
										<>{"Interview starts at this time"}</>
									)}
								</p>
							</div>

							{/* Interview Location */}
							<div className="space-y-2">
								<Label htmlFor="bulk_location" className="text-sm font-medium">
									Interview Location *
								</Label>
								<Input
									id="bulk_location"
									value={bulkInterviewFormData.location}
									onChange={(e) => {
										setBulkInterviewFormData((prev) => ({
											...prev,
											location: e.target.value,
										}));
										if (interviewErrors.location) {
											setInterviewErrors((prev: any) => ({ ...prev, location: undefined }));
										}
									}}
									placeholder="e.g., Conference Room A, Zoom Link, etc."
									className={interviewErrors.location ? "border-destructive" : ""}
								/>
								{interviewErrors.location && (
									<p className="text-sm text-destructive">{interviewErrors.location}</p>
								)}
								<p className="text-xs text-muted-foreground">
									Specify if interview is in-person or virtual
								</p>
							</div>

							{/* Interview Type */}
							<div className="space-y-2">
								<Label htmlFor="bulk_interview_type" className="text-sm font-medium">
									Interview Type
								</Label>
								<Select
									value={bulkInterviewFormData.interview_type}
									onValueChange={(value: IInterviewType) =>
										setBulkInterviewFormData((prev) => ({
											...prev,
											interview_type: value,
										}))
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select interview type" />
									</SelectTrigger>
									<SelectContent>
										{interviewTypes.map((i_type, idx) => (
											<SelectItem key={idx} value={i_type.value as string}>
												{i_type.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Form Actions */}
						<div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
							<Button
								type="button"
								variant="outline"
								onClick={() =>
									setShowScheduleInterviewDialog((prev) => ({ ...prev, isOpen: false }))
								}
								disabled={isSchedulingInterview}
								className="w-full sm:w-auto"
							>
								Cancel
							</Button>
							<Button
								type="submit"
								disabled={isSchedulingInterview}
								className="flex items-center justify-center gap-2 w-full sm:w-auto"
							>
								{isSchedulingInterview ? (
									<>
										<div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
										Scheduling interviews...
									</>
								) : (
									<>
										<Check className="h-4 w-4" />
										Schedule{" "}
										{
											applications.filter(
												(app) =>
													selectedApplications.find((appl) => appl.id === app.id) &&
													app.status === "shortlisted",
											).length
										}{" "}
										Interview
										{applications.filter(
											(app) =>
												selectedApplications.find((appl) => appl.id === app.id) &&
												app.status === "shortlisted",
										).length !== 1
											? "s"
											: ""}
									</>
								)}
							</Button>
						</div>
					</form>
				</DialogContent>
			</Dialog>

			{selectedApplicationForInterview && (
				<CreateInterviewStageDialog
					isOpen={showCreateStageDialog}
					onOpenChange={setShowCreateStageDialog}
					jobPositionId={selectedApplicationForInterview.job_position_advert}
					jobPositionName={selectedApplicationForInterview.job_position_advert_job_details.name}
					existingStagesCount={interviewStages.length}
					onSuccess={async (newStage) => {
						await fetchInterviewData();
					}}
					showTrigger={false}
				/>
			)}

			{isFetchingInterviewData && <FixedLoader fixed={false} className="!bg-black/5" />}
		</div>
	);
}
