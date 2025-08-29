"use client";

import { DialogTrigger } from "@/components/ui/dialog";

import type React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  ChevronLeft,
  ChevronRight,
  Filter,
  Building,
  Search,
  CalendarDays,
} from "lucide-react";
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
  updateJobApplicationStatus,
} from "@/lib/utils";
import type {
  JobApplication,
  JobApplicationFormData,
  JobPositionAdvert,
  IPaginatedResponse,
} from "@/types/types.utils";
import { selectUser, selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import ProtectedComponent from "@/components/ProtectedComponent";
import { PERMISSION_CODES } from "@/types/types.utils";
import {
  createInterviewStage,
  getInterviewStages,
  fetchEmployees,
  createInterview,
} from "@/lib/utils";
import type {
  IInterviewStage,
  IEmployee,
  IInterviewFormData,
  IInterviewStageFormData,
} from "@/types/types.utils";
import { EmployeeSearchableSelect } from "@/components/selects/employee-searchable-select";
import { TableSkeleton } from "@/components/common/table-skeleton";

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

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filteredApplications, setFilteredApplications] = useState<JobApplication[]>([]);
  const [selectedApplications, setSelectedApplications] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [isBulkShortlisting, setIsBulkShortlisting] = useState(false);
  const [individualLoadingStates, setIndividualLoadingStates] = useState<Record<number, boolean>>(
    {},
  );

  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showCreateStageDialog, setShowCreateStageDialog] = useState(false);
  const [interviewStages, setInterviewStages] = useState<IInterviewStage[]>([]);
  const [isSchedulingInterview, setIsSchedulingInterview] = useState(false);
  const [isCreatingStage, setIsCreatingStage] = useState(false);
  const [selectedApplicationForInterview, setSelectedApplicationForInterview] =
    useState<JobApplication | null>(null);
  const [showBulkScheduleDialog, setShowBulkScheduleDialog] = useState(false);
  const [bulkInterviewFormData, setBulkInterviewFormData] = useState<IInterviewFormData>({
    interview_stage: 0,
    interview_date: "",
    location: "",
    interview_type: "in_person",
    interview_time: "",
    job_position_application: 0,
    status: "scheduled",
  });
  const [isBulkScheduling, setIsBulkScheduling] = useState(false);
  const [stageFormData, setStageFormData] = useState<IInterviewStageFormData>({
    name: "",
    level: 1,
    interviewers: [],
    job_position_advert: 0,
  });

  const [stageErrors, setStageErrors] = useState<any>({});

  const [interviewFormData, setInterviewFormData] = useState<IInterviewFormData>({
    interview_stage: 0,
    interview_date: "",
    location: "",
    interview_type: "in_person",
    interview_time: "",
    job_position_application: 0,
    status: "scheduled",
    feedback: "",
    rating: undefined,
  });

  const [interviewErrors, setInterviewErrors] = useState<any>({});

  // Add these helper functions
  const updateStageFormData = (field: string, value: any) => {
    setStageFormData((prev) => ({ ...prev, [field]: value }));
    if (stageErrors[field]) {
      setStageErrors((prev: any) => ({ ...prev, [field]: undefined }));
    }
  };

  const updateInterviewFormData = (field: string, value: any) => {
    setInterviewFormData((prev) => ({ ...prev, [field]: value }));
    setInterviewErrors((prev: any) => ({ ...prev, [field]: undefined }));
  };

  const fetchInterviewData = async () => {
    if (!selectedInstitution || !selectedApplicationForInterview) return;

    try {
      const stagesResponse = await
        getInterviewStages({ institutionId: selectedInstitution.id })

      let stagesArray: IInterviewStage[] = [];
      if (stagesResponse && "results" in stagesResponse && Array.isArray(stagesResponse.results)) {
        stagesArray = stagesResponse.results;
      } else if (Array.isArray(stagesResponse)) {
        stagesArray = stagesResponse;
      }

      // Filter stages for this job position
      const filteredStages = stagesArray.filter(
        (stage) =>
          stage.job_position_advert === selectedApplicationForInterview.job_position_advert,
      );
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
    }
  };

  const handleCreateInterviewStage = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectedInstitution || !selectedApplicationForInterview) {
      toast.error("Missing organization or application information");
      return;
    }

    const newStageErrors: any = {};
    if (!stageFormData.name.trim()) {
      newStageErrors.name = "Stage name is required";
    }
    if (!stageFormData.interviewers || stageFormData.interviewers.length === 0) {
      newStageErrors.interviewers = "Please select at least one interviewer";
    }

    if (Object.keys(newStageErrors).length > 0) {
      setStageErrors(newStageErrors);
      return;
    }

    setIsCreatingStage(true);

    try {
      const stageDataWithJobAdvert = {
        ...stageFormData,
        job_position_advert: selectedApplicationForInterview.job_position_advert,
        level: interviewStages.length + 1,
      };

      const newStage = await createInterviewStage({
        institutionId: selectedInstitution.id,
        stageData: stageDataWithJobAdvert,
      });

      if (newStage) {
        setStageFormData({
          name: "",
          level: 1,
          interviewers: [],
          job_position_advert: selectedApplicationForInterview.job_position_advert,
        });
        setStageErrors({});
        clearAllFilters();
        setShowCreateStageDialog(false);
        await fetchInterviewData();
        toast.success("Interview stage created successfully!");
      } else {
        toast.error("Failed to create interview stage");
      }
    } catch (error) {
      toast.error("Failed to create interview stage");
    } finally {
      setIsCreatingStage(false);
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
        clearAllFilters()
        toast.success("Interview scheduled successfully!");
        setShowScheduleDialog(false);
        setSelectedApplicationForInterview(null);
        // Reset form
        setInterviewFormData({
          interview_stage: 0,
          interview_date: "",
          location: "",
          interview_type: "in_person",
          interview_time: "",
          job_position_application: 0,
          status: "scheduled",
          feedback: "",
          rating: undefined,
        });
        setInterviewErrors({});

        // Refresh applications to show updated status
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
    setShowScheduleDialog(true);
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
  const userData = useSelector(selectUser);
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

  const router = useRouter();
  const handleSort = (field: "application_date" | "posted_date") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const selectedBranch = useSelector(selectSelectedBranch);

  const [formData, setFormData] = useState<
    Omit<JobApplicationFormData, "resume"> & {
      resume: File | null;
      cover_letter?: File;
      address_latitude?: string;
      address_longitude?: string;
      recommended_by?: number;
    }
  >({
    job_position_advert: 0,
    applicant_name: "",
    applicant_email: "",
    applicant_phone: "",
    resume: null,
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
  });

  const [jobPositionAdverts, setJobPositionAdverts] = useState<JobPositionAdvert[]>([]);
  const [isLoadingAdverts, setIsLoadingAdverts] = useState(false);

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

      let advertsArray: JobPositionAdvert[] = [];

      if (response && "results" in response && Array.isArray(response.results)) {
        advertsArray = response.results;
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

  const handleInputChange = (
    field: keyof typeof formData,
    value: string | number | File | null,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileChange = (field: "resume" | "cover_letter", file: File | null) => {
    setFormData((prev) => ({
      ...prev,
      [field]: file,
    }));
  };

  const handleAddressCoordinatesChange = (lat: string, lon: string) => {
    setFormData((prev) => ({
      ...prev,
      address_latitude: lat,
      address_longitude: lon,
    }));
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

    // Simple validation checks
    if (!formData.applicant_name.trim()) {
      setError("Please enter the applicant's name");
      return;
    }

    if (!formData.applicant_email.trim()) {
      setError("Please enter the applicant's email");
      return;
    }

    if (!formData.address.trim()) {
      setError("Please enter the applicant's address");
      return;
    }

    if (!formData.country.trim()) {
      setError("Please enter the country");
      return;
    }

    if (formData.job_position_advert === 0) {
      setError("Please select a job position");
      return;
    }

    if (formData.source === "head_hunt" && !formData.recommended_by) {
      setError("Please select which employee head hunted this candidate");
      return;
    }

    if (!formData.resume) {
      setError("Please upload a resume");
      return;
    }

    if (!selectedInstitution || !selectedBranch) {
      setError("Missing organization or branch information");
      return;
    }

    if (!userData?.id) {
      setError("User information not available. Please refresh and try again.");
      return;
    }

    setIsSubmitting(true);

    try {
      const applicationData: JobApplicationFormData = {
        ...formData,
        resume: formData.resume,
        cover_letter: formData.cover_letter || undefined,
        applicant_phone: formData.applicant_phone || undefined,
        state: formData.state || undefined,
        application_date: formData.application_date,
        address: formData.address,
        country: formData.country,
        created_by: userData.id,
        recommended_by: formData.source === "head_hunt" ? formData.recommended_by : undefined, // Add this line
      };

      const newApplication = await createJobApplication({
        institutionId: selectedInstitution.id,
        applicationData,
      });

      if (newApplication) {
        // Maintain sorted order when adding new application
        setApplications((prev) => {
          const updated = [newApplication, ...prev];
          return updated.sort(
            (a, b) =>
              new Date(b.application_date).getTime() - new Date(a.application_date).getTime(),
          );
        });

        setIsCreateDialogOpen(false);
        resetFiltersAndShowNewApplication();
        setFormData({
          job_position_advert: 0,
          applicant_name: "",
          applicant_email: "",
          applicant_phone: "",
          resume: null,
          cover_letter: undefined,
          status: "new",
          gender: "male",
          state: "",
          address: "",
          address_latitude: "",
          address_longitude: "",
          country: "",
          source: "website",
          application_date: new Date().toISOString().split("T")[0],
          created_by: userData.id,
          recommended_by: undefined,
        });
        clearAllFilters()
        toast.success("Application created successfully!");
      } else {
        setError("Failed to create application");
      }
    } catch (err: any) {
      if (err?.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err?.message) {
        setError(err.message);
      } else {
        setError("Failed to create application. Please check all fields and try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectApplication = (applicationId: number, checked: boolean) => {
    if (checked) {
      setSelectedApplications((prev) => [...prev, applicationId]);
    } else {
      setSelectedApplications((prev) => prev.filter((id) => id !== applicationId));
    }
  };

  // NEW SMART VERSION:
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Only select applications that are eligible for bulk actions
      // This prevents selecting applications that shouldn't be processed together
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

        // If we have ONLY shortlisted applications, select all shortlisted
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

      setSelectedApplications(eligibleApps.map((app) => app.id));
    } else {
      setSelectedApplications([]);
    }
  };
  const executeBulkAction = async (
    action: "shortlisted" | "reviewed" | "rejected",
    applicationIds?: number[],
  ) => {
    const idsToProcess = applicationIds || selectedApplications;
    if (action === "shortlisted") {
      setIsBulkShortlisting(true);
    }

    try {
      const promises = idsToProcess.map((applicationId) => {
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

        return updateJobApplicationStatus(updateData);
      });

      await Promise.all(promises);
      setApplications((prev) =>
        prev.map((app) => (idsToProcess.includes(app.id) ? { ...app, status: action } : app)),
      );
      setSelectedApplications([]);

      toast.success(
        `${idsToProcess.length} application${idsToProcess.length > 1 ? "s" : ""} updated to ${action}`,
      );
    } catch (error) {
      toast.error(`Failed to update application${idsToProcess.length > 1 ? "s" : ""}`);
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
        (app) => selectedApplications.includes(app.id) && app.status === "shortlisted",
      );

      if (shortlistedApps.length === 0) {
        toast.error("Please select shortlisted applications to schedule interviews");
        return;
      }

      // Set default date to tomorrow at 10 AM
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      await fetchInterviewData();
      setShowBulkScheduleDialog(true);
      return;
    }

    let eligibleApps: JobApplication[] = [];
    let actionText = "";

    if (action === "reviewed") {
      // Only "new" applications can be marked as reviewed
      eligibleApps = applications.filter(
        (app) => selectedApplications.includes(app.id) && app.status === "new",
      );
      actionText = "mark as reviewed";
    } else if (action === "shortlisted") {
      // Only "reviewed" applications can be shortlisted
      eligibleApps = applications.filter(
        (app) => selectedApplications.includes(app.id) && app.status === "reviewed",
      );
      actionText = "shortlist";
    } else if (action === "rejected") {
      // Only "new" or "reviewed" applications can be rejected
      eligibleApps = applications.filter(
        (app) =>
          selectedApplications.includes(app.id) &&
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
    await executeBulkAction(
      action,
      eligibleApps.map((app) => app.id),
    );
  };

  const handleConfirmBulkAction = async () => {
    if (confirmBulkAction.action) {
      // Filter eligible applications again for the confirmed action
      let eligibleApps: JobApplication[] = [];

      if (confirmBulkAction.action === "shortlisted") {
        eligibleApps = applications.filter(
          (app) => selectedApplications.includes(app.id) && app.status === "reviewed",
        );
      } else if (confirmBulkAction.action === "rejected") {
        eligibleApps = applications.filter(
          (app) =>
            selectedApplications.includes(app.id) &&
            (app.status === "new" || app.status === "reviewed"),
        );
      }

      // FIXED: Use the executeBulkAction function instead of individual executeAction calls
      // This ensures only eligible applications are processed
      await executeBulkAction(
        confirmBulkAction.action,
        eligibleApps.map((app) => app.id),
      );

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
                <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-6 bg-gray-200 rounded w-64 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-10 w-36 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-10 w-28 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </CardHeader>
          <TableSkeleton rows={10} columns={8} />
        </Card>
      </div>
    )
  }


  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 w-full h-full bg-white p-3 sm:p-4 lg:p-8 gap-4 rounded-lg">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h1 className="text-lg sm:text-2xl md:text-3xl font-bold whitespace-nowrap">
            Job Applications
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-xs sm:max-w-none">
            Manage and track all job applications for {selectedBranch.branch_name} -
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center sm:mt-15 lg:mt-0">
          <Plus className="mr-2 h-4 w-4" />
          Create Application
        </Button>
      </div>


      {/* Enhanced Filter Section */}
      <div className="space-y-4">
        {/* Main Filters Row */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center mt-6">
          <div className="relative flex-1 lg:flex-[0.7]">
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
                    {advert.job_position_details?.name || `Job Opening`}
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
                {selectedApplications.some((id) => {
                  const app = applications.find((a) => a.id === id);
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
                {selectedApplications.some((id) => {
                  const app = applications.find((a) => a.id === id);
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
                {selectedApplications.some((id) => {
                  const app = applications.find((a) => a.id === id);
                  return app?.status === "shortlisted";
                }) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkAction("schedule_interview")}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule Interview
                      {selectedApplications.filter((id) => {
                        const app = applications.find((a) => a.id === id);
                        return app?.status === "shortlisted";
                      }).length > 1
                        ? "s"
                        : ""}
                    </Button>
                  )}

                {/* Your existing reject button */}
                {selectedApplications.some((id) => {
                  const app = applications.find((a) => a.id === id);
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
          {safeFilteredApplications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm ||
                  statusFilter !== "all" ||
                  jobFilter !== "all" ||
                  dateFilter.startDate ||
                  dateFilter.endDate
                  ? "No applications match your current filters."
                  : isLoading
                    ? "Loading applications..."
                    : "No applications have been submitted yet."}
              </p>
              {applications.length > 0 && !isLoading && (
                <Button variant="outline" onClick={clearAllFilters} className="mt-2">
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div>
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <div className="flex items-center">
                        <Checkbox
                          checked={
                            currentApplications.length > 0 &&
                            (() => {
                              // Count different statuses on current page
                              const statusCounts = currentApplications.reduce(
                                (acc, a) => {
                                  acc[a.status] = (acc[a.status] || 0) + 1;
                                  return acc;
                                },
                                {} as Record<string, number>,
                              );

                              const hasShortlisted = statusCounts.shortlisted > 0;
                              const hasNewOrReviewed =
                                (statusCounts.new || 0) + (statusCounts.reviewed || 0) > 0;

                              let selectableApps: typeof currentApplications = [];

                              // Determine which apps should be selectable based on the mix
                              if (hasShortlisted && !hasNewOrReviewed) {
                                // Only shortlisted apps
                                selectableApps = currentApplications.filter(
                                  (app) => app.status === "shortlisted",
                                );
                              } else if (!hasShortlisted && hasNewOrReviewed) {
                                // Only new/reviewed apps
                                selectableApps = currentApplications.filter(
                                  (app) => app.status === "new" || app.status === "reviewed",
                                );
                              } else if (hasShortlisted && hasNewOrReviewed) {
                                // Mixed: only select new/reviewed (protect shortlisted)
                                selectableApps = currentApplications.filter(
                                  (app) => app.status === "new" || app.status === "reviewed",
                                );
                              }

                              // Check if all selectable apps are selected
                              return (
                                selectableApps.length > 0 &&
                                selectableApps.every((app) => selectedApplications.includes(app.id))
                              );
                            })()
                          }
                          onCheckedChange={handleSelectAll}
                          title={(() => {
                            const statusCounts = currentApplications.reduce(
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
                              return "Select all new and reviewed applications";
                            } else if (hasShortlisted && hasNewOrReviewed) {
                              return "Select new and reviewed applications (protecting shortlisted)";
                            }
                            return "Select applications";
                          })()}
                        />
                      </div>
                    </TableHead>
                    <TableHead>Applicant</TableHead>
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
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
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
                  {currentApplications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedApplications.includes(application.id)}
                          onCheckedChange={(checked: any) =>
                            handleSelectApplication(application.id, checked as boolean)
                          }
                        />
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
                            {application.job_position_advert_job_details?.name ||
                              `Advert #${application.job_position_advert}`}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center text-sm">
                          <Calendar className="mr-1 h-3 w-3" />
                          {formatDate(application.job_position_advert_job_details.job_posted_date)}
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
                            <div className="text-sm text-muted-foreground">{application.state}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[application.status]}>
                          {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
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
                              href={`${process.env.NEXT_PUBLIC_BASE_URL}${application.resume}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Resume
                            </a>
                          </Button>
                          {application.cover_letter && (
                            <Button variant="link" size="sm" className="h-auto p-0" asChild>
                              <a
                                href={`${process.env.NEXT_PUBLIC_BASE_URL}${application.cover_letter}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Cover Letter
                              </a>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="!bg-white shadow-md shadow-black/20 rounded-md border border-black/20"
                          >
                            <DropdownMenuItem onClick={() => handleViewApplication(application.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditApplication(application.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Application
                            </DropdownMenuItem>

                            {/* Review option - only for new applications */}
                            {application.status === "new" && (
                              <DropdownMenuItem
                                onClick={() => handleIndividualAction(application.id, "reviewed")}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Mark as Reviewed
                              </DropdownMenuItem>
                            )}

                            {/* Shortlist option - only for reviewed applications */}
                            {application.status === "reviewed" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  handleIndividualAction(application.id, "shortlisted")
                                }
                                disabled={individualLoadingStates[application.id]}
                              >
                                {individualLoadingStates[application.id] ? (
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
                              </DropdownMenuItem>
                            )}

                            {/* Schedule Interview option - only for shortlisted applications */}
                            {application.status === "shortlisted" && (
                              <DropdownMenuItem
                                onClick={() => handleOpenScheduleInterview(application)}
                              >
                                <Calendar className="h-4 w-4 mr-2" />
                                Schedule Interview
                              </DropdownMenuItem>
                            )}

                            {/* Reject option - only for new and reviewed applications */}
                            {(application.status === "new" ||
                              application.status === "reviewed") && (
                                <DropdownMenuItem
                                  onClick={() => handleIndividualAction(application.id, "rejected")}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                              )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, safeFilteredApplications.length)} of{" "}
                {safeFilteredApplications.length} applications
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNumber}
                        variant={currentPage === pageNumber ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(pageNumber)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNumber}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Application Dialog */}
      {/* Create Application Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white">
          <DialogHeader className="pb-6">
            <DialogTitle className="text-2xl font-semibold text-gray-800">Add Application</DialogTitle>
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
            <div className="max-h-[60vh] overflow-y-auto px-1">
              <div className="space-y-6">
                {/* First Row - Job Position and Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="job_position_advert" className="block text-sm font-medium text-gray-800">
                      Job Position / Title *
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground z-10" />
                      <Select
                        value={formData.job_position_advert.toString()}
                        onValueChange={(value: string) =>
                          handleInputChange("job_position_advert", Number.parseInt(value))
                        }
                      >
                        <SelectTrigger className="w-full bg-white border-gray-300 pl-9">
                          <SelectValue
                            placeholder={
                              isLoadingAdverts ? "Loading job openings..." : "Search job position"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {jobPositionAdverts
                            .filter(
                              (advert) =>
                                advert.job_position_advert_status !== "expired" &&
                                advert.job_position_advert_status !== "closed",
                            )
                            .map((advert) => (
                              <SelectItem key={advert.id} value={advert.id.toString()}>
                                <div className="flex flex-col">
                                  <span className="font-medium">
                                    {advert.job_position_details.name || `Job Opening `}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="application_date" className="block text-sm font-medium text-gray-800">
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
                    <label htmlFor="applicant_name" className="block text-sm font-medium text-gray-800">
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
                    <label htmlFor="applicant_email" className="block text-sm font-medium text-gray-800">
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
                    <label htmlFor="applicant_phone" className="block text-sm font-medium text-gray-800">
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
                      onValueChange={(value: string | number | File | null) => {
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
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground z-10" />
                      <LocationAutocomplete
                        value={formData.address}
                        onChange={(value) => handleInputChange("address", value)}
                        onCoordinatesChange={handleAddressCoordinatesChange}
                        placeholder="Search for applicant's address..."
                        showCurrentLocationButton={true}
                        className="w-full pl-9 bg-white border-gray-300"
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
                  <div className="space-y-2">
                    <label htmlFor="recommended_by" className="block text-sm font-medium text-gray-800">
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
                    <Input
                      id="country"
                      placeholder="Country"
                      value={formData.country}
                      onChange={(e) => handleInputChange("country", e.target.value)}
                      className="bg-white border-gray-300"
                      required
                    />
                  </div>
                </div>

                {/* File Upload Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* CV Upload */}
                  <div className="space-y-2">
                    <label htmlFor="cv-upload" className="block text-sm font-medium text-gray-800">
                      Curriculum Vitae / Resume *
                    </label>
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-md bg-gray-50 text-center cursor-pointer hover:border-gray-400 transition-colors duration-200">
                      <input
                        id="cv-upload"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="sr-only"
                        onChange={(e) => handleFileChange("resume", e.target.files?.[0] || null)}
                        required
                      />
                      <label htmlFor="cv-upload" className="flex flex-col items-center cursor-pointer">
                        <Upload className="h-10 w-10 text-orange-500 mb-2" />
                        <span className="text-sm font-medium text-orange-500">Click to Upload or drag and drop</span>
                        <span className="text-xs text-gray-500">(Max. File size: 25 MB)</span>
                      </label>
                      {formData.resume && (
                        <p className="text-sm text-gray-700 mt-2 flex items-center">
                          <FileText className="mr-1 h-3 w-3" />
                          {formData.resume.name}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Cover Letter Upload */}
                  <div className="space-y-2">
                    <label htmlFor="cover-letter-upload" className="block text-sm font-medium text-gray-800">
                      Cover Letter
                    </label>
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-md bg-gray-50 text-center cursor-pointer hover:border-gray-400 transition-colors duration-200">
                      <input
                        id="cover-letter-upload"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        className="sr-only"
                        onChange={(e) => handleFileChange("cover_letter", e.target.files?.[0] || null)}
                      />
                      <label htmlFor="cover-letter-upload" className="flex flex-col items-center cursor-pointer">
                        <Upload className="h-10 w-10 text-orange-500 mb-2" />
                        <span className="text-sm font-medium text-orange-500">Click to Upload or drag and drop</span>
                        <span className="text-xs text-gray-500">(Max. File size: 25 MB)</span>
                      </label>
                      {formData.cover_letter && (
                        <p className="text-sm text-gray-700 mt-2 flex items-center">
                          <FileText className="mr-1 h-3 w-3" />
                          {formData.cover_letter.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-start gap-4 pt-6 border-t">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-8 shadow-md transition-colors duration-200 text-lg"
              >
                {isSubmitting ? "Creating..." : "Add Application"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold py-3 px-8 transition-colors duration-200 text-lg"
              >
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
      <Dialog open={showBulkScheduleDialog} onOpenChange={setShowBulkScheduleDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule Bulk Interviews</DialogTitle>
            <DialogDescription>
              Schedule interviews for{" "}
              {
                selectedApplications.filter((id) => {
                  const app = applications.find((a) => a.id === id);
                  return app?.status === "shortlisted";
                }).length
              }{" "}
              shortlisted applicants. Each interview will be scheduled 30 minutes apart starting
              from your selected time.
            </DialogDescription>
          </DialogHeader>

          {/* Create Interview Stage Button */}
          <div className="flex justify-end mb-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateStageDialog(true)}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create New Stage
            </Button>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();

              const shortlistedApps = applications.filter(
                (app) => selectedApplications.includes(app.id) && app.status === "shortlisted",
              );

              if (shortlistedApps.length === 0) {
                toast.error("No shortlisted applications selected");
                return;
              }

              // Validate form
              const errors: any = {};
              if (
                !bulkInterviewFormData.interview_stage ||
                bulkInterviewFormData.interview_stage === 0
              ) {
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

              if (!userData?.id) {
                toast.error("User information not available. Please refresh and try again.");
                return;
              }

              setIsBulkScheduling(true);

              try {
                const interviewPromises = shortlistedApps.map(async (application, index) => {
                  // Calculate interview time (30 minutes apart)
                  const baseDateTime = new Date(bulkInterviewFormData.interview_date);
                  const interviewDateTime = new Date(
                    baseDateTime.getTime() + index * 30 * 60 * 1000,
                  );

                  let interviewTime = "";
                  if (bulkInterviewFormData.interview_date) {
                    const hours = interviewDateTime.getHours().toString().padStart(2, "0");
                    const minutes = interviewDateTime.getMinutes().toString().padStart(2, "0");
                    interviewTime = `${hours}:${minutes}`;
                  }

                  const createData: IInterviewFormData = {
                    job_position_application: application.id,
                    interview_stage: bulkInterviewFormData.interview_stage,
                    interview_date: interviewDateTime.toISOString().slice(0, 16),
                    location: bulkInterviewFormData.location,
                    interview_time: interviewTime,
                    interview_type: bulkInterviewFormData.interview_type,
                    status: bulkInterviewFormData.status || "scheduled",
                    feedback: undefined,
                    rating: undefined,
                    created_by: userData.id,
                  };

                  return await createInterview({
                    institutionId: selectedInstitution.id,
                    interviewData: createData,
                  });
                });

                const results = await Promise.all(interviewPromises);
                const successCount = results.filter((result) => result !== null).length;
                const failureCount = results.length - successCount;

                if (successCount > 0) {
                  toast.success(
                    `${successCount} interview(s) scheduled successfully!${failureCount > 0 ? ` ${failureCount} failed.` : ""
                    }`,
                  );
                  setShowBulkScheduleDialog(false);
                  setSelectedApplications([]);
                  // Reset form
                  setBulkInterviewFormData({
                    interview_stage: 0,
                    interview_date: "",
                    location: "",
                    interview_type: "in_person",
                    interview_time: "",
                    job_position_application: 0,
                    status: "scheduled",
                  });
                  setInterviewErrors({});
                  await loadApplications();
                } else {
                  toast.error("Failed to schedule any interviews");
                }
              } catch (error) {
                toast.error("Failed to schedule interviews");
              } finally {
                setIsBulkScheduling(false);
              }
            }}
            className="space-y-6"
          >
            {/* Form Fields - Responsive Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Interview Stage */}
              <div className="space-y-2">
                <Label htmlFor="bulk_interview_stage" className="text-sm font-medium">
                  Interview Stage *
                </Label>
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
                  First interview starts at this time. Subsequent interviews will be scheduled 30
                  minutes apart.
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
                  onValueChange={(value: any) =>
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
                    <SelectItem value="in_person">In Person</SelectItem>
                    <SelectItem value="video_call">Video Call</SelectItem>
                    <SelectItem value="phone_call">Phone Call</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowBulkScheduleDialog(false)}
                disabled={isBulkScheduling}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  isBulkScheduling ||
                  selectedApplications.filter((id) => {
                    const app = applications.find((a) => a.id === id);
                    return app?.status === "shortlisted";
                  }).length === 0
                }
                className="flex items-center justify-center gap-2 w-full sm:w-auto"
              >
                {isBulkScheduling ? (
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
                          selectedApplications.includes(app.id) && app.status === "shortlisted",
                      ).length
                    }{" "}
                    Interview
                    {applications.filter(
                      (app) =>
                        selectedApplications.includes(app.id) && app.status === "shortlisted",
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

      {/* Create Interview Stage Dialog */}
      <Dialog open={showCreateStageDialog} onOpenChange={setShowCreateStageDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Interview Stage</DialogTitle>
            <DialogDescription>
              Create a new interview stage for the selected applications.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateInterviewStage} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stage_name">Stage Name *</Label>
              <Input
                id="stage_name"
                value={stageFormData.name}
                onChange={(e) => updateStageFormData("name", e.target.value)}
                placeholder="e.g., Technical Interview, HR Round"
                className={stageErrors.name ? "border-destructive" : ""}
              />
              {stageErrors.name && <p className="text-sm text-destructive">{stageErrors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="stage_interviewers">Interviewers *</Label>
              <div className="w-full max-w-full overflow-hidden">
                <EmployeeSearchableSelect

                  value={stageFormData.interviewers.map((id) => id.toString())}
                  onValueChange={(values) => {
                    const numberValues = Array.isArray(values)
                      ? values.map((v) => Number(v))
                      : [Number(values)];
                    const uniqueValues = [...new Set(numberValues)];
                    if (uniqueValues.length !== numberValues.length) {
                      toast.info("Duplicate interviewers removed");
                    }
                    updateStageFormData("interviewers", uniqueValues);
                  }}
                  disabled={isCreatingStage}
                  placeholder="Search and select interviewers"
                  showEmployeeId={false}
                  showDepartment={false}
                  multiple={true}
                />
              </div>
              {stageErrors.interviewers && (
                <p className="text-sm text-destructive">{stageErrors.interviewers}</p>
              )}

            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateStageDialog(false)}
                disabled={isCreatingStage}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingStage}>
                {isCreatingStage ? (
                  <>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Create Stage
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
