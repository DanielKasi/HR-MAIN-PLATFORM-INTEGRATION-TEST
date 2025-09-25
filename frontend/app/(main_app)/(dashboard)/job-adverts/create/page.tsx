"use client";

import type React from "react";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { Plus, Trash2, ArrowLeft, CalendarDays, X, Search, Loader2, Edit } from "lucide-react";
import { toast } from "sonner";

import apiRequest from "@/lib/apiRequest";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
	selectSelectedInstitution,
	selectSelectedBranch,
	selectUser,
} from "@/store/auth/selectors";
import { selectJobAdvertForm } from "@/store/miscellaneous/selectors";
import { saveJobAdvertForm, clearJobAdvertForm } from "@/store/miscellaneous/actions";
import { TableSkeleton } from "@/components/common/table-skeleton";
import { CreateJobPositionDialog } from "@/components/dialogs/create-job-position-dialog";
import { SearchableSelect, type SearchableSelectItem } from "@/components/searchable-select";
import { RichTextEditor } from "@/components/common/rich-editor";
import InterviewStageEditorDialog from "@/components/common/dialogs/interview-stage-editor-dialog";
import {
	createInterviewStage,
	createJobPositionAdvert,
	fetchEmployees,
	getJobPositions,
	showErrorToast,
	upddateInterviewStage,
} from "@/lib/utils";
import {
	IEmployee,
	IInterviewStage,
	IInterviewStageFormData,
	IJobPosition,
	JobAdvertCompleteFormData,
	JobAdvertStatus,
	JobAdvertTypes,
	JobPositionAdvert,
	JobPositionAdvertFormData,
} from "@/types/types.utils";
import { useDocumentTitle } from "@/hooks/use-document-title";

const DEFAULT_PAGE_SIZE = 10;

type Interviewer = {
	id: string;
	name: string;
	role: string;
};

type FeedbackField = {
	id: string;
	name: string;
	type: string;
};

type Stage = {
	id: string;
	name: string;
	interviewers: Interviewer[];
	feedbackFields: FeedbackField[];
};

const getStatusColor = (status: JobAdvertStatus) => {
	switch (status) {
		case "active":
			return "bg-green-100 text-green-800 border-green-200";
		case "archived":
			return "bg-gray-100 text-gray-800 border-gray-200";
		case "expired":
			return "bg-red-100 text-red-800 border-red-200";
		case "closed":
			return "bg-blue-100 text-blue-800 border-blue-200";
		default:
			return "bg-gray-100 text-gray-800 border-gray-200";
	}
};

const getStatusVariant = (status: JobAdvertStatus) => {
	switch (status) {
		case "active":
			return "success";
		case "archived":
			return "secondary";
		case "expired":
			return "destructive";
		case "closed":
			return "outline";
		default:
			return "secondary";
	}
};

const formatDate = (dateString: string) => {
	return new Date(dateString).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
};

const isExpired = (expiryDate: string) => {
	return new Date(expiryDate) < new Date();
};

export default function JobAdvertsPage() {
	const [step, setStep] = useState(1); // 1 for General Info, 2 for Interview Stages

	const [formData, setFormData] = useState<JobPositionAdvertFormData>({
		job_position: 0,
		expiry_date: "",
		number_of_employees_expected: 1,
		extra_information: "",
		advert_type: "external" as JobAdvertTypes,
		level: 0,
		interviewers: [],
	});

	// Separate form data for interview stages
	// const [stageFormData, setStageFormData] = useState<IInterviewStageFormData>({
	//   name: "",
	//   level: 1,
	//   interviewers: [],
	//   job_position_advert: 0,
	// })

	const [jobPositions, setJobPositions] = useState<IJobPosition[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [errors, setErrors] = useState<Partial<Record<keyof JobPositionAdvertFormData, string>>>(
		{},
	);

	const [stages, setStages] = useState<Stage[]>([]);
	const [interviewStages, setInterviewStages] = useState<IInterviewStage[]>([]);

	const [newStageName, setNewStageName] = useState("");
	const [selectedInterviewers, setSelectedInterviewers] = useState<Interviewer[]>([]);
	const [newFeedbackFieldName, setNewFeedbackFieldName] = useState("");
	const [newFeedbackFieldType, setNewFeedbackFieldType] = useState("Number");
	const [employees, setEmployees] = useState<IEmployee[]>([]);
	const [isCreatingStage, setIsCreatingStage] = useState(false);
	const [createdJobOpening, setCreatedJobOpening] = useState<JobPositionAdvert | null>(null);
	const [editingIntreviewStage, setEditingInterviewStage] = useState<IInterviewStage | null>(null);
	const [isStageEditorOpen, setIsStageEditorOpen] = useState(false);
	// const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

	// const [stageErrors, setStageErrors] = useState<Partial<Record<keyof IInterviewStageFormData, string>>>({})
	// const [isEditStageDialogOpen, setIsEditStageDialogOpen] = useState(false);

	const userData = useSelector(selectUser);
	const router = useRouter();
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const selectedBranch = useSelector(selectSelectedBranch);
	const dispatch = useDispatch();
	const savedJobAdvertForm = useSelector(selectJobAdvertForm);

	useDocumentTitle("JOB OPENINGS");

	// Infinite-scroll job position dropdown state
	const [jpFilterText, setJpFilterText] = useState("");
	const [jobPositionOptions, setJobPositionOptions] = useState<IJobPosition[]>([]);
	const [isLoadingJobPositions, setIsLoadingJobPositions] = useState(false);
	const [hasMoreJobPositions, setHasMoreJobPositions] = useState(true);
	const [jobPositionPage, setJobPositionPage] = useState(1);
	const [jobPositionDropdownOpen, setJobPositionDropdownOpen] = useState(false);
	const [jobPositionInitiallyLoaded, setJobPositionInitiallyLoaded] = useState(false);
	const jobPositionDropdownRef = useRef<HTMLDivElement | null>(null);
	const jobPositionContainerRef = useRef<HTMLDivElement | null>(null);
	const jobPositionSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	// const jobPOsitionsIntersectionObserverRef = useRef<IntersectionObserver | null>(null)

	// Load saved form data from Redux on component mount
	useEffect(() => {
		if (savedJobAdvertForm) {
			setFormData({
				job_position: savedJobAdvertForm.job_position,
				expiry_date: savedJobAdvertForm.expiry_date,
				number_of_employees_expected: savedJobAdvertForm.number_of_employees_expected,
				extra_information: savedJobAdvertForm.extra_information,
				advert_type: savedJobAdvertForm.advert_type,
				level: savedJobAdvertForm.level,
				interviewers: savedJobAdvertForm.interviewers,
			});

			// Restore interview stages data
			if (savedJobAdvertForm.stages) {
				setStages(savedJobAdvertForm.stages);
			}
			if (savedJobAdvertForm.newStageName) {
				setNewStageName(savedJobAdvertForm.newStageName);
			}
			if (savedJobAdvertForm.selectedInterviewers) {
				setSelectedInterviewers(savedJobAdvertForm.selectedInterviewers);
			}
			if (savedJobAdvertForm.newFeedbackFieldName) {
				setNewFeedbackFieldName(savedJobAdvertForm.newFeedbackFieldName);
			}
			if (savedJobAdvertForm.newFeedbackFieldType) {
				setNewFeedbackFieldType(savedJobAdvertForm.newFeedbackFieldType);
			}
		}
	}, [savedJobAdvertForm]);

	useEffect(() => {
		if (!selectedInstitution || !selectedBranch) {
			router.push("/dashboard");

			return;
		}
		fetchJobPositions();
	}, [selectedInstitution, selectedBranch, router]);

	// Helper to format job position label
	const getPositionLabel = useCallback((position: IJobPosition): string => {
		return `${position.name} - ${position.department_details?.name ?? ""}`.trim();
	}, []);

	// Fetch job positions paginated with optional server-side search
	const fetchJobPositionsPaged = useCallback(
		async (searchTerm: string = "", page: number = 1, reset: boolean = false) => {
			if (!selectedInstitution) return;
			try {
				setIsLoadingJobPositions(true);
				const params = new URLSearchParams({ page: String(page) });

				if (searchTerm.trim()) params.append("search", searchTerm.trim());
				const res = await apiRequest.get(
					`recruitment/institution/${selectedInstitution.id}/job-position/?${params.toString()}`,
				);
				const results = Array.isArray(res.data?.results)
					? (res.data.results as IJobPosition[])
					: [];

				if (reset || page === 1) {
					setJobPositionOptions(results);
				} else {
					setJobPositionOptions((prev) => [...prev, ...results]);
				}
				setHasMoreJobPositions(Boolean(res.data?.next));
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

	const fetchJobPositions = async () => {
		if (!selectedInstitution) return;

		try {
			setIsLoading(true);
			const [fetchedJobPositions, fetchedEmployees] = await Promise.all([
				getJobPositions({ institutionId: selectedInstitution.id }),
				fetchEmployees({ institutionId: selectedInstitution.id }),
			]);
			// console.log("Fetched job positions:", fetchedJobPositions);

			if (fetchedJobPositions) {
				setJobPositions(fetchedJobPositions);
			} else {
				toast.error("Failed to load job positions");
			}

			// Handle employees data
			let employeesArray: IEmployee[] = [];

			if (
				fetchedEmployees &&
				"results" in fetchedEmployees &&
				Array.isArray(fetchedEmployees.results)
			) {
				employeesArray = fetchedEmployees.results;
			} else if (Array.isArray(fetchedEmployees)) {
				employeesArray = fetchedEmployees;
			}
			setEmployees(employeesArray);

			// Don't load existing interview stages since this is for creating a new job opening
			// Interview stages will be created fresh
		} catch (error) {
			toast.error("Failed to load job positions and employees");
		} finally {
			setIsLoading(false);
		}
	};

	const updateFormData = (
		field: keyof Exclude<JobPositionAdvertFormData, "job_position_advert_status">,
		value: any,
	) => {
		const updatedFormData = { ...formData, [field]: value };

		setFormData(updatedFormData);

		// Save complete form data to Redux including interview stages
		const completeFormData: JobAdvertCompleteFormData = {
			...updatedFormData,
			stages,
			newStageName,
			selectedInterviewers,
			newFeedbackFieldName,
			newFeedbackFieldType,
		};

		dispatch(saveJobAdvertForm(completeFormData));

		// Clear error when user starts typing
		if (errors[field]) {
			setErrors((prev) => ({ ...prev, [field]: undefined }));
		}
	};

	// Function to save complete form data to Redux
	// const saveCompleteFormToRedux = () => {
	//   const completeFormData: JobAdvertCompleteFormData = {
	//     ...formData,
	//     stages,
	//     newStageName,
	//     selectedInterviewers,
	//     newFeedbackFieldName,
	//     newFeedbackFieldType,
	//   }
	//   dispatch(saveJobAdvertForm(completeFormData))
	// }

	const validateForm = (): boolean => {
		const newErrors: Partial<Record<keyof JobPositionAdvertFormData, string>> = {};

		if (!formData.job_position || formData.job_position === 0) {
			newErrors.job_position = "Please select a job position";
		}

		if (!formData.expiry_date) {
			newErrors.expiry_date = "Expiry date is required";
		} else {
			const expiryDate = new Date(formData.expiry_date);
			const today = new Date();

			today.setHours(0, 0, 0, 0);
			if (expiryDate <= today) {
				newErrors.expiry_date = "Expiry date must be in the future";
			}
		}

		if (formData.number_of_employees_expected && formData.number_of_employees_expected < 1) {
			newErrors.number_of_employees_expected = "Number of employees must be at least 1";
		}

		if (!formData.advert_type) {
			newErrors.advert_type = "Please select an opening type";
		}

		setErrors(newErrors);

		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async () => {
		if (!selectedInstitution || !selectedBranch) {
			toast.error("Missing organization or branch information");

			return;
		}

		if (!validateForm()) {
			toast.error("Please fix the form errors before submitting");

			return;
		}

		// If there are stages, we need to create them via "Add Stage" button
		if (stages.length > 0) {
			toast.error("Please use the 'Add Stage' button to create stages with the job opening");

			return;
		}

		setIsSubmitting(true);

		try {
			const createData: JobPositionAdvertFormData = {
				job_position: formData.job_position,
				job_position_advert_status: formData.job_position_advert_status,
				expiry_date: formData.expiry_date,
				number_of_employees_expected: formData.number_of_employees_expected || undefined,
				extra_information: formData.extra_information || undefined,
				advert_type: formData.advert_type,
				level: formData.level,
				interviewers: formData.interviewers,
			};

			const jobOpeningResponse = await createJobPositionAdvert({
				institutionId: selectedInstitution.id,
				advertData: createData,
			});

			setCreatedJobOpening(jobOpeningResponse);

			toast.success("Job opening created successfully!");
			setStep(2);
		} catch (error: any) {
			showErrorToast({ error, defaultMessage: "Failed to create job opening. Please try again." });
		} finally {
			setIsSubmitting(false);
			dispatch(clearJobAdvertForm());
		}
	};

	const handleBack = () => {
		router.back();
	};

	const handleClearForm = () => {
		const defaultFormData: JobPositionAdvertFormData = {
			job_position: 0,
			expiry_date: "",
			number_of_employees_expected: 1,
			extra_information: "",
			advert_type: "external" as JobAdvertTypes,
			level: 0,
			interviewers: [],
		};

		setFormData(defaultFormData);
		setErrors({});
		setStages([]);
		setNewStageName("");
		setSelectedInterviewers([]);
		setNewFeedbackFieldName("");
		setNewFeedbackFieldType("Number");

		// Clear from Redux
		dispatch(clearJobAdvertForm());

		toast.success("Form cleared successfully");
	};

	const handleJobPositionCreated = (newJobPosition: IJobPosition) => {
		setJobPositions((prev) => [...prev, newJobPosition]);
		updateFormData("job_position", newJobPosition.id);
	};

	const handleAddStage = async () => {
		if (newStageName.trim() === "") {
			toast.error("Please enter a stage name");

			return;
		}
		if (selectedInterviewers.length === 0) {
			toast.error("Please select at least one interviewer");

			return;
		}
		if (!selectedInstitution) {
			toast.error("Missing organization information");

			return;
		}

		if (!formData.job_position || formData.job_position === 0) {
			toast.error("Please select a job position first before adding stages");

			return;
		}

		setIsCreatingStage(true);

		try {
			if (!createdJobOpening) {
				throw new Error("Failed to get job opening ID");
			}

			// Now create the stage with the actual job opening ID
			const stageData: IInterviewStageFormData = {
				name: newStageName,
				level: stages.length + 1,
				interviewers: selectedInterviewers.map((interviewer) => Number(interviewer.id)),
				job_position_advert: Number(createdJobOpening.id),
			};

			const newStage = await createInterviewStage({
				institutionId: selectedInstitution.id,
				stageData: stageData,
			});

			if (newStage) {
				// Add to local stages for display
				const localStage: Stage = {
					id: newStage.id.toString(),
					name: newStage.name,
					interviewers: selectedInterviewers,
					feedbackFields: [],
				};

				const updatedStages = [...stages, localStage];

				setStages(updatedStages);
				setNewStageName("");
				setSelectedInterviewers([]);

				// Save updated stages to Redux before clearing
				// const completeFormData: JobAdvertCompleteFormData = {
				//   ...formData,
				//   stages: updatedStages,
				//   newStageName: "",
				//   selectedInterviewers: [],
				//   newFeedbackFieldName,
				//   newFeedbackFieldType,
				// }
				// dispatch(saveJobAdvertForm(completeFormData))

				toast.success("Interview stage created successfully!");

				// Clear the saved form data from Redux on successful creation
				dispatch(clearJobAdvertForm());
			}
		} catch (error: any) {
			const errorMessage =
				error?.detail || error?.message || "Failed to create job opening and stage";

			toast.error(errorMessage);
		} finally {
			setIsCreatingStage(false);
		}
	};

	const handleDeleteStage = (id: string) => {
		const updatedStages = stages.filter((stage) => stage.id !== id);

		setStages(updatedStages);

		// Save to Redux
		const completeFormData: JobAdvertCompleteFormData = {
			...formData,
			stages: updatedStages,
			newStageName,
			selectedInterviewers,
			newFeedbackFieldName,
			newFeedbackFieldType,
		};

		dispatch(saveJobAdvertForm(completeFormData));

		toast.success("Interview stage deleted");
	};

	const handleAddFeedbackField = (stageId: string) => {
		if (newFeedbackFieldName.trim() === "") return;
		setStages(
			stages.map((stage) =>
				stage.id === stageId
					? {
							...stage,
							feedbackFields: [
								...stage.feedbackFields,
								{
									id: `${newFeedbackFieldName}-${Date.now()}`,
									name: newFeedbackFieldName,
									type: newFeedbackFieldType,
								},
							],
						}
					: stage,
			),
		);
		setNewFeedbackFieldName("");
		setNewFeedbackFieldType("Number");
	};

	const handleDeleteFeedbackField = (stageId: string, fieldId: string) => {
		setStages(
			stages.map((stage) =>
				stage.id === stageId
					? {
							...stage,
							feedbackFields: stage.feedbackFields.filter((field) => field.id !== fieldId),
						}
					: stage,
			),
		);
	};

	const handleSelectInterviewer = (interviewerId: string) => {
		const employee = employees.find((emp) => emp.id.toString() === interviewerId);

		if (employee && !selectedInterviewers.some((i) => i.id === interviewerId)) {
			const interviewer: Interviewer = {
				id: interviewerId,
				name: employee?.name || `Employee ${employee.id}`,
				role: employee.user?.user_type || "Staff",
			};
			const updatedSelectedInterviewers = [...selectedInterviewers, interviewer];

			setSelectedInterviewers(updatedSelectedInterviewers);

			// Save to Redux
			const completeFormData: JobAdvertCompleteFormData = {
				...formData,
				stages,
				newStageName,
				selectedInterviewers: updatedSelectedInterviewers,
				newFeedbackFieldName,
				newFeedbackFieldType,
			};

			dispatch(saveJobAdvertForm(completeFormData));
		}
	};

	const handleRemoveSelectedInterviewer = (interviewerId: string) => {
		const updatedSelectedInterviewers = selectedInterviewers.filter((i) => i.id !== interviewerId);

		setSelectedInterviewers(updatedSelectedInterviewers);

		// Save to Redux
		const completeFormData: JobAdvertCompleteFormData = {
			...formData,
			stages,
			newStageName,
			selectedInterviewers: updatedSelectedInterviewers,
			newFeedbackFieldName,
			newFeedbackFieldType,
		};

		dispatch(saveJobAdvertForm(completeFormData));
	};

	// const handleCreateStage = async (e: React.FormEvent) => {
	//   e.preventDefault()
	//   e.stopPropagation()

	//   if (!selectedInstitution) {
	//     toast.error("Missing organization information")
	//     return
	//   }

	//   const newStageErrors: Partial<Record<keyof IInterviewStageFormData, string>> = {}
	//   if (!stageFormData.name.trim()) {
	//     newStageErrors.name = "Stage name is required"
	//   }
	//   if (!stageFormData.interviewers || stageFormData.interviewers.length === 0) {
	//     newStageErrors.interviewers = "Please select at least one interviewer"
	//   }

	//   if (stageFormData.level < 1) {
	//     newStageErrors.level = "Level must be at least 1"
	//   }

	//   if (Object.keys(newStageErrors).length > 0) {
	//     setStageErrors(newStageErrors)
	//     return
	//   }

	//   setIsCreatingStage(true)

	//   try {
	//     const newStage = await createInterviewStage({
	//       institutionId: selectedInstitution.id,
	//       stageData: stageFormData,
	//     })

	//     if (newStage) {
	//       setInterviewStages((prev) => [...prev, newStage])
	//       const localStage: Stage = {
	//         id: newStage.id.toString(),
	//         name: newStage.name,
	//         interviewers: stageFormData.interviewers.map((empId) => {
	//           const emp = employees.find((e) => e.id === empId)
	//           return {
	//             id: empId.toString(),
	//             name: emp?.user?.fullname || `Employee ${empId}`,
	//             role: emp?.user?.user_type || "Staff",
	//           }
	//         }),
	//         feedbackFields: [],
	//       }

	//       setStages((prev) => [...prev, localStage])
	//       setStageFormData({
	//         name: "",
	//         level: stageFormData.level + 1,
	//         interviewers: [],
	//         job_position_advert: 0,
	//       })
	//       setStageErrors({})
	//       toast.success("Interview stage created successfully!")
	//     } else {
	//       toast.error("Failed to create interview stage")
	//     }
	//   } catch (error) {
	//     toast.error("Failed to create interview stage")
	//   } finally {
	//     setIsCreatingStage(false)
	//   }
	// }

	// const updateStageFormData = (field: keyof IInterviewStageFormData, value: any) => {
	//   setStageFormData((prev) => ({ ...prev, [field]: value }))
	//   if (stageErrors[field]) {
	//     setStageErrors((prev) => ({ ...prev, [field]: undefined }))
	//   }
	// }

	useEffect(() => {
		if (!formData.expiry_date) {
			const defaultExpiryDate = new Date();

			defaultExpiryDate.setDate(defaultExpiryDate.getDate() + 30);
			setFormData((prev) => ({
				...prev,
				expiry_date: defaultExpiryDate.toISOString().split("T")[0],
			}));
		}
	}, [formData.expiry_date]);

	// const jobPositionItems: SearchableSelectItem[] = jobPositions.map((position) => ({
	//   id: position.id,
	//   label: `${position.name} - ${position.department_details?.name}`,
	//   value: `${position.name} ${position.department_details?.name}`.toLowerCase(),
	// }))

	const advertTypeItems: SearchableSelectItem[] = [
		{ id: "external", label: "External", value: "external" },
		{ id: "internal", label: "Internal", value: "internal" },
		{ id: "both", label: "Both Internal and External", value: "both internal external" },
	];

	// const fetchJobAdverts = useCallback(
	//   async (showRefreshLoader = false, page = 1, size = DEFAULT_PAGE_SIZE) => {
	//     if (!selectedInstitution) return

	//     try {
	//       if (showRefreshLoader) {
	//         setIsRefreshing(true)
	//       } else {
	//         setIsLoading(true)
	//       }
	//       setError("")

	//       const response: IPaginatedResponse<JobPositionAdvert> = await getJobPositionAdverts({
	//         institutionId: selectedInstitution.id,
	//       })

	//       let advertsArray: JobPositionAdvert[] = []
	//       let pagination: { count: number; next: string | null; previous: string | null } = {
	//         count: 0,
	//         next: null,
	//         previous: null,
	//       }

	//       if (response && "results" in response && Array.isArray(response.results)) {
	//         advertsArray = response.results
	//         pagination = {
	//           count: response.count || 0,
	//           next: response.next || null,
	//           previous: response.previous || null,
	//         }
	//       } else if (response === null) {
	//         advertsArray = []
	//       }

	//       // setJobAdverts(advertsArray)
	//       setPaginationInfo(pagination)
	//     } catch (err) {
	//       // setJobAdverts([])
	//       setError(`Failed to fetch job openings: ${err instanceof Error ? err.message : "Unknown error"}`)
	//       toast.error("Failed to load job openings")
	//     } finally {
	//       setIsLoading(false)
	//       setIsRefreshing(false)
	//     }
	//   },
	//   [selectedInstitution],
	// )

	// const [jobAdverts, setJobAdverts] = useState<JobPositionAdvert[]>([])
	// const [paginationInfo, setPaginationInfo] = useState<{
	//   count: number
	//   next: string | null
	//   previous: string | null
	// }>({ count: 0, next: null, previous: null })
	// const [isRefreshing, setIsRefreshing] = useState(false)
	// const [searchTerm, setSearchTerm] = useState("")
	// const [statusFilter, setStatusFilter] = useState<string>("all")
	// const [dateRange, setDateRange] = useState<{ from: string | null; to: string | null }>({ from: null, to: null })
	// const [error, setError] = useState("")
	// const [isClosing, setIsClosing] = useState(false)
	// const [closingAdvertId, setClosingAdvertId] = useState<number | null>(null)
	// const [currentPage, setCurrentPage] = useState(1)

	// useEffect(() => {
	//   if (!selectedInstitution || !selectedBranch) {
	//     router.push("/dashboard")
	//     return
	//   }
	//   fetchJobAdverts(false, currentPage, pageSize)
	// }, [selectedInstitution, selectedBranch, currentPage, pageSize])

	// const handleRefresh = useCallback(() => {
	//   fetchJobAdverts(true, 1, pageSize)
	//   setCurrentPage(1)
	// }, [fetchJobAdverts, pageSize])

	// const filteredJobAdverts = useMemo(() => {
	//   if (!Array.isArray(jobAdverts)) {
	//     return []
	//   }

	//   return jobAdverts.filter((advert) => {
	//     const matchesSearch = !searchTerm.trim()
	//       ? true
	//       : advert.job_position_details?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
	//         advert.extra_information?.toLowerCase().includes(searchTerm.toLowerCase())

	//     const matchesStatus = statusFilter === "all" || advert.job_position_advert_status === statusFilter

	//     const matchesDateRange =
	//       !dateRange.from && !dateRange.to
	//         ? true
	//         : (() => {
	//             const publishedDate = new Date(advert.published_date).getTime()
	//             const fromDate = dateRange.from ? new Date(dateRange.from).getTime() : Number.NEGATIVE_INFINITY
	//             const toDate = dateRange.to ? new Date(dateRange.to).getTime() : Number.POSITIVE_INFINITY
	//             return publishedDate >= fromDate && publishedDate <= toDate
	//           })()

	//     return matchesSearch && matchesStatus && matchesDateRange
	//   })
	// }, [jobAdverts, searchTerm, statusFilter, dateRange])

	// const publishedAdverts = useMemo(
	//   () =>
	//     Array.isArray(jobAdverts) ? jobAdverts.filter((advert) => advert.job_position_advert_status === "active") : [],
	//   [jobAdverts],
	// )

	// const draftAdverts = useMemo(
	//   () =>
	//     Array.isArray(jobAdverts) ? jobAdverts.filter((advert) => advert.job_position_advert_status === "archived") : [],
	//   [jobAdverts],
	// )

	// const expiredAdverts = useMemo(
	//   () =>
	//     Array.isArray(jobAdverts)
	//       ? jobAdverts.filter(
	//           (advert) => advert.job_position_advert_status === "expired" || isExpired(advert.expiry_date),
	//         )
	//       : [],
	//   [jobAdverts],
	// )

	// const handleCreateJobAdvert = useCallback(() => {
	//   router.push("/job-adverts/create")
	// }, [router])

	// const handleEditJobAdvert = useCallback(
	//   (advertId: number) => {
	//     router.push(`/job-adverts/${advertId}/edit`)
	//   },
	//   [router],
	// )

	// const handleArchiveJobAdvert = useCallback((advertId: number) => {
	//   toast.success("Job opening archiving would be implemented here")
	// }, [])

	// const handleCloseJobAdvert = useCallback(
	//   async (advertId: number) => {
	//     if (!advertId) return

	//     try {
	//       setIsClosing(true)
	//       const updatedAdvert = await updateJobPositionAdvert({
	//         advertId: advertId,
	//         advertData: { job_position_advert_status: "closed" },
	//       })

	//       if (updatedAdvert) {
	//         toast.success("Job opening closed successfully!")
	//         fetchJobAdverts(true, currentPage, pageSize)
	//       } else {
	//         toast.error("Failed to close job openings")
	//       }
	//     } catch (error) {
	//       toast.error("Failed to close job openings")
	//     } finally {
	//       setIsClosing(false)
	//       setClosingAdvertId(null) // Reset the closing advert ID
	//     }
	//   },
	//   [fetchJobAdverts, currentPage, pageSize],
	// )

	// const handleViewJobAdvert = useCallback(
	//   (advertId: number) => {
	//     router.push(`/job-adverts/${advertId}`)
	//   },
	//   [router],
	// )

	// const handlePageChange = (page: number) => {
	//   setCurrentPage(page)
	// }

	// const handlePageSizeChange = (newPageSize: string) => {
	//   setPageSize(Number.parseInt(newPageSize))
	//   setCurrentPage(1)
	// }

	// const clearFilters = () => {
	//   setSearchTerm("")
	//   setStatusFilter("all")
	//   setDateRange({ from: null, to: null })
	//   setCurrentPage(1)
	// }

	// const totalPages = Math.ceil(paginationInfo.count / pageSize)

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
		<div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
			<div className="">
				<div className="flex items-center gap-2 sm:gap-3 md:gap-4 mb-6 sm:mb-8">
					<Button
						variant="outline"
						size="sm"
						onClick={handleBack}
						className="rounded-full aspect-square"
					>
						<ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
					</Button>
					<h1 className="text-3xl font-semibold text-gray-800">Create New Job Opening</h1>
				</div>

				{/* Progress Indicator */}
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-4 sm:gap-0">
					<div className="flex items-center gap-2 sm:gap-3">
						<div
							className={`flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full font-bold text-xs sm:text-sm ${
								step === 1
									? "border-2 border-[#FF4D4D] text-[#FF4D4D]"
									: "bg-green-100 text-green-700"
							}`}
						>
							{step === 1 ? "1" : "✓"}
						</div>
						<span className="font-medium text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-gray-800">
							General Job Information
						</span>
					</div>
					<div className="flex-1 h-px bg-gray-300 mx-2 sm:mx-4 hidden sm:block" />
					<div className="flex items-center gap-2 sm:gap-3">
						<div
							className={`flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full font-bold text-xs sm:text-sm ${
								step === 2
									? "border-2 border-[#FF4D4D] text-[#FF4D4D]"
									: "bg-gray-200 text-gray-500"
							}`}
						>
							2
						</div>
						<span className="font-medium text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl text-gray-800">
							Interview Stages Setup
						</span>
					</div>
				</div>

				{/* Step 1: General Job Information */}
				{step === 1 && (
					<div className="space-y-4 sm:space-y-6">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
							{/* Job Position */}
							<div>
								<label
									htmlFor="job_position"
									className="block text-xs sm:text-sm md:text-base font-normal text-gray-800 mb-2"
								>
									Job Position / Title *
								</label>
								<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
									<div className="flex-grow min-w-0" ref={jobPositionContainerRef}>
										<div className="relative">
											<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
											<Input
												className={`pl-9 bg-white border-gray-300 rounded-md text-xs sm:text-sm ${
													errors.job_position ? "border-destructive" : ""
												}`}
												placeholder="Search or select job position"
												type="text"
												value={jpFilterText}
												onChange={(e) => {
													setJpFilterText(e.target.value);
													setJobPositionDropdownOpen(true);
												}}
												onFocus={handleJobPositionInputFocus}
											/>
											{jobPositionDropdownOpen && (
												<div
													className="absolute top-full mt-2 left-0 right-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto"
													ref={jobPositionDropdownRef}
													onScroll={handleJobPositionDropdownScroll}
												>
													{jobPositionOptions.length > 0 ? (
														<>
															{jobPositionOptions.map((position) => (
																<div
																	key={position.id}
																	className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
																	onClick={() => {
																		updateFormData("job_position", Number(position.id));
																		setJpFilterText(getPositionLabel(position));
																		setJobPositionDropdownOpen(false);
																	}}
																>
																	<div className="font-medium text-sm">
																		{getPositionLabel(position)}
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
									<CreateJobPositionDialog
										trigger={
											<Button
												type="button"
												variant="outline"
												size="icon"
												className="border border-gray-300 text-gray-700 bg-transparent h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10"
											>
												<Plus className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
											</Button>
										}
										onJobPositionCreated={handleJobPositionCreated}
									/>
								</div>
								{errors.job_position && (
									<p className="text-xs sm:text-sm text-destructive mt-1">{errors.job_position}</p>
								)}
							</div>

							{/* Opening Type */}
							<div>
								<label
									htmlFor="advert_type"
									className="block text-xs sm:text-sm md:text-base font-normal text-gray-800 mb-2"
								>
									Opening Type *
								</label>
								<SearchableSelect
									items={advertTypeItems}
									selectedItems={formData.advert_type ? [formData.advert_type] : []}
									placeholder="Select Opening Type"
									searchPlaceholder="Search opening types..."
									emptyMessage="No opening types found."
									onSelect={(itemId) => updateFormData("advert_type", itemId as JobAdvertTypes)}
									multiple={false}
									triggerClassName={`w-full bg-white border border-gray-300 rounded-md px-2 sm:px-3 py-2 text-xs sm:text-sm ${
										errors.advert_type ? "border-destructive" : ""
									}`}
									popoverClassName="w-[280px] sm:w-[320px] md:w-[380px] lg:w-[420px]"
								/>
								{errors.advert_type && (
									<p className="text-xs sm:text-sm text-destructive mt-1">{errors.advert_type}</p>
								)}
							</div>

							{/* Number of Employees Required */}
							<div>
								<label
									htmlFor="number_of_employees_expected"
									className="block text-xs sm:text-sm md:text-base font-normal text-gray-800 mb-2"
								>
									Number of Employees Required
								</label>
								<Input
									id="number_of_employees_expected"
									placeholder="Required Number"
									type="number"
									min="1"
									max="1000"
									value={formData.number_of_employees_expected?.toString() || ""}
									onChange={(e) =>
										updateFormData(
											"number_of_employees_expected",
											Number(e.target.value) || undefined,
										)
									}
									className={`
                    
                    ${errors.number_of_employees_expected ? "border-destructive" : ""}
                  `}
								/>
								{errors.number_of_employees_expected && (
									<p className="text-xs sm:text-sm text-destructive mt-1">
										{errors.number_of_employees_expected}
									</p>
								)}
							</div>

							{/* Expiry Date */}
							<div>
								<label
									htmlFor="expiry_date"
									className="block text-xs sm:text-sm md:text-base font-medium text-gray-800 mb-2"
								>
									Expiry Date *
								</label>
								<div className="relative">
									<Input
										id="expiry_date"
										placeholder="--/--/----"
										type="date"
										min={new Date().toISOString().split("T")[0]}
										value={formData.expiry_date}
										onChange={(e) => updateFormData("expiry_date", e.target.value)}
										className={`w-full pr-8 sm:pr-10 bg-white border-gray-300 text-xs sm:text-sm ${errors.expiry_date ? "border-destructive" : ""}`}
									/>
									<CalendarDays className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 h-3 w-3 sm:h-4 sm:w-4 text-gray-500 pointer-events-none" />
								</div>
								{errors.expiry_date && (
									<p className="text-xs sm:text-sm text-destructive mt-1">{errors.expiry_date}</p>
								)}
							</div>
						</div>

						{/* Job Description */}
						<div>
							<label
								htmlFor="extra_information"
								className="block text-xs sm:text-sm md:text-base font-medium text-gray-800 mb-2"
							>
								Job Description
							</label>
							<p className="text-xs text-gray-500 mb-2">
								Provide a concise summary of the role, including key duties and responsibilities.
							</p>
							<RichTextEditor
								id="extra_information"
								placeholder="Add job description..."
								value={formData.extra_information || ""}
								onChange={(value) => updateFormData("extra_information", value)}
							/>
						</div>

						{/* Next Button */}
						<div className="mt-8 flex justify-start gap-4">
							<Button className="flex items-center gap-2 px-6 lg:px-8 " onClick={handleSubmit}>
								Next
							</Button>
							<Button
								variant="outline"
								className="flex items-center gap-2 px-6 lg:px-8 "
								onClick={handleClearForm}
							>
								Clear Form
							</Button>
						</div>
					</div>
				)}

				{/* Step 2: Interview Stages Setup */}
				{step === 2 && (
					<div className="space-y-6 sm:space-y-8">
						<Card className="border-none shadow-none">
							<CardHeader className="pb-3 sm:pb-4">
								<CardTitle className="text-base sm:text-lg md:text-xl font-semibold text-gray-800">
									Interview Stage Name
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3 sm:space-y-4">
								<div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
									<Input
										placeholder="Enter stage name"
										value={newStageName}
										onChange={(e) => {
											const value = e.target.value;

											setNewStageName(value);

											// Save to Redux
											const completeFormData: JobAdvertCompleteFormData = {
												...formData,
												stages,
												newStageName: value,
												selectedInterviewers,
												newFeedbackFieldName,
												newFeedbackFieldType,
											};

											dispatch(saveJobAdvertForm(completeFormData));
										}}
										className="bg-white border-gray-300 text-xs sm:text-sm"
									/>
									<div className="flex flex-col gap-2">
										<SearchableSelect
											items={employees.map((employee) => ({
												id: employee.id.toString(),
												label: `${employee?.name || `${employee.user?.fullname}`}`,
												value: `${employee?.name || `${employee.user?.fullname}`}`,
											}))}
											selectedItems={selectedInterviewers.map((interviewer) => interviewer.id)}
											placeholder="Select Interviewers"
											searchPlaceholder="Search employees..."
											emptyMessage="No employees found."
											onSelect={(itemId) => handleSelectInterviewer(String(itemId))}
											multiple={false}
											triggerClassName="w-full bg-white border-gray-300 text-xs sm:text-sm"
											popoverClassName="w-[280px] sm:w-[320px] md:w-[380px] lg:w-[420px]"
										/>
										<div className="flex flex-wrap gap-1 sm:gap-2">
											{selectedInterviewers.map((interviewer) => (
												<Badge
													key={interviewer.id}
													className="bg-gray-200 text-gray-700 flex items-center gap-1 text-xs"
												>
													<span className="truncate max-w-[120px] sm:max-w-[150px]">
														{interviewer.name}
													</span>
													<Button
														variant="ghost"
														size="icon"
														className="h-3 w-3 sm:h-4 sm:w-4 p-0 text-gray-500 hover:text-gray-800"
														onClick={() => handleRemoveSelectedInterviewer(interviewer.id)}
													>
														<X className="h-2 w-2 sm:h-3 sm:w-3" />
													</Button>
												</Badge>
											))}
										</div>
									</div>
								</div>

								{/* <div className="space-y-2">
                  <p className="text-xs sm:text-sm md:text-base font-medium text-gray-800">
                    Feedback Fields (Optional)
                  </p>
                  <p className="text-xs text-gray-500">
                    Add feedback fields specific to this stage. Final comments and overall ratings are already required
                    and will be included automatically.
                  </p>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    <Badge className="bg-gray-200 text-gray-700 flex items-center gap-1 text-xs">
                      Smartness (Number)
                    </Badge>
                    <Badge className="bg-gray-200 text-gray-700 flex items-center gap-1 text-xs">
                      Time Management (Dropdown)
                    </Badge>
                    <Badge className="bg-gray-200 text-gray-700 flex items-center gap-1 text-xs">
                      Candidate's Attitude (Dropdown)
                    </Badge>
                    <Button
                      variant="outline"
                      className="flex items-center gap-1 text-gray-700 border-gray-300 bg-transparent text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-auto"
                    >
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4" /> Add Field
                    </Button>
                  </div>
                </div> */}
								<Button
									className="flex items-center gap-2 px-4 sm:px-6 py-2 text-xs sm:text-sm md:text-base"
									onClick={handleAddStage}
									type="button"
									disabled={isCreatingStage}
								>
									{isCreatingStage ? (
										<>
											<div className="h-3 w-3 sm:h-4 sm:w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
											Adding...
										</>
									) : (
										<>
											<Plus className="h-3 w-3 sm:h-4 sm:w-4" /> Add Stage
										</>
									)}
								</Button>
							</CardContent>
						</Card>

						<h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800">Stages</h2>
						{stages.length === 0 ? (
							<div className="text-center py-6 sm:py-8 text-muted-foreground">
								<div className="flex flex-col items-center gap-2">
									<div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gray-100 flex items-center justify-center">
										<Plus className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />
									</div>
									<p className="text-xs sm:text-sm">No interview stages created yet</p>
									<p className="text-xs">
										Use the "Add Stage" button above to create your first interview stage
									</p>
								</div>
							</div>
						) : (
							<div className="space-y-4 sm:space-y-6 px-4 md:px-6">
								{stages.map((stage, index) => (
									<Card key={stage.id} className="border-gray-200 shadow-sm">
										<CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 gap-2 sm:gap-0">
											<div className="flex items-center gap-2">
												<div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-purple-100 text-purple-700 font-bold text-xs sm:text-sm">
													{index + 1}
												</div>
												<CardTitle className="text-base sm:text-lg md:text-xl font-semibold text-gray-800">
													{stage.name}
												</CardTitle>
											</div>

											<Button
												variant="ghost"
												size="sm"
												className="text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-auto"
												onClick={() => {
													const stageMatch = interviewStages.find(
														(s) => s.id.toString() === stage.id,
													);

													if (stageMatch) {
														setEditingInterviewStage(stageMatch);
														setIsStageEditorOpen(true);
													}
												}}
											>
												<Edit className="h-3 w-3 sm:h-4 sm:w-4" />
												Edit
											</Button>
											<Button
												variant="ghost"
												size="sm"
												className="text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 h-auto"
												onClick={() => handleDeleteStage(stage.id)}
											>
												<Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
												Delete
											</Button>
										</CardHeader>
										<CardContent className="space-y-3 sm:space-y-4">
											<div>
												<p className="text-xs sm:text-sm md:text-base font-medium text-gray-800 mb-2">
													Interviewers
												</p>
												<div className="flex flex-wrap gap-1 sm:gap-2">
													{stage.interviewers.length > 0 ? (
														stage.interviewers.map((interviewer) => (
															<Badge
																key={interviewer.id}
																className="bg-gray-200 text-gray-700 text-xs"
															>
																<span className="truncate max-w-[120px] sm:max-w-[150px]">
																	{interviewer.name} ({interviewer.role})
																</span>
															</Badge>
														))
													) : (
														<p className="text-xs sm:text-sm text-muted-foreground">
															No interviewers assigned
														</p>
													)}
												</div>
											</div>
											{stage.feedbackFields.length > 0 && (
												<div>
													<p className="text-xs sm:text-sm md:text-base font-medium text-gray-800 mb-2">
														Feedback Fields
													</p>
													<div className="flex flex-wrap gap-1 sm:gap-2">
														{stage.feedbackFields.map((field) => (
															<Badge
																key={field.id}
																className="bg-gray-200 text-gray-700 flex items-center gap-1 text-xs"
															>
																{field.name} ({field.type})
																<Button
																	variant="ghost"
																	size="icon"
																	className="h-3 w-3 sm:h-4 sm:w-4 p-0 text-gray-500 hover:text-gray-800"
																	onClick={() => handleDeleteFeedbackField(stage.id, field.id)}
																>
																	<X className="h-2 w-2 sm:h-3 sm:w-3" />
																</Button>
															</Badge>
														))}
													</div>
												</div>
											)}
										</CardContent>
									</Card>
								))}
							</div>
						)}

						{/* Previous and Submit Buttons */}
						<div className="mt-6 sm:mt-8 flex flex-col sm:flex-row justify-start gap-2 sm:gap-4">
							{/* <Button
                className="flex items-center gap-2 px-4 sm:px-6 py-2 text-xs sm:text-sm md:text-base"
                onClick={() => {
                  // Save current form state before moving to previous step
                  // saveCompleteFormToRedux()
                  setStep(1)
                }}
              >
                Previous
              </Button> */}
							<Button
								className="flex items-center gap-2 px-4 sm:px-6 py-2 text-xs sm:text-sm md:text-base"
								onClick={() => {
									router.push("/job-adverts/");
								}}
								disabled={isSubmitting}
								type="button"
							>
								Finish
								{/* {isSubmitting ? (
                  <>
                    <div className="h-3 w-3 sm:h-4 sm:w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Finish"
                )} */}
							</Button>
							{/* <Button
                variant="outline"
                className="flex items-center gap-2 px-4 sm:px-6 py-2 text-xs sm:text-sm md:text-base"
                onClick={handleClearForm}
              >
                Clear Form
              </Button> */}
						</div>
					</div>
				)}
				{/* Stage editor dialog - placed inside return so it has access to component state */}
				<InterviewStageEditorDialog
					open={isStageEditorOpen}
					initial={
						editingIntreviewStage
							? { id: editingIntreviewStage.id, name: editingIntreviewStage.name }
							: undefined
					}
					onClose={() => {
						setIsStageEditorOpen(false);
						setEditingInterviewStage(null);
					}}
					onSave={async ({ name }) => {
						if (!editingIntreviewStage) return;
						try {
							const interviewersIds = (editingIntreviewStage.interviewers ?? [])
								.map((it: any) => {
									if (typeof it === "number") return it;
									if (typeof it === "string") return Number(it);
									if (it && (it as any).id) return Number((it as any).id);

									return null;
								})
								.filter(Boolean) as number[];

							const stageData = {
								name,
								level: (editingIntreviewStage as any).level ?? 1,
								interviewers: interviewersIds,
								job_position_advert:
									(editingIntreviewStage as any).job_position_advert ?? createdJobOpening?.id ?? 0,
							};

							const updated = await upddateInterviewStage({
								stageId: Number(editingIntreviewStage.id),
								stageData,
							});

							setInterviewStages((prev) =>
								prev.map((s) =>
									s.id === editingIntreviewStage.id ? { ...s, name: updated?.name ?? name } : s,
								),
							);
							setStages((prev) =>
								prev.map((s) =>
									s.id === editingIntreviewStage.id.toString() ? { ...s, name } : s,
								),
							);
							toast.success("Interview stage updated");
						} catch (err) {
							toast.error("Failed to update interview stage");
						}
					}}
				/>
			</div>
		</div>
	);
}
