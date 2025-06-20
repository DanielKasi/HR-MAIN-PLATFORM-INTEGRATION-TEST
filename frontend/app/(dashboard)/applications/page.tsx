"use client";

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
  DialogTrigger,
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
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createJobApplication, getJobApplications, getJobPositionAdverts, updateJobApplicationStatus } from "@/lib/utils";
import type {
  IJobPosition,
  JobApplication,
  JobApplicationFormData,
  JobPositionAdvert,
} from "@/app/types/types.utils";
import { selectSelectedInstitution, selectSelectedBranch } from "@/store/auth/selectors";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

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

  const router = useRouter();
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const selectedBranch = useSelector(selectSelectedBranch);

  // Form state
  const [formData, setFormData] = useState<
    Omit<JobApplicationFormData, "resume"> & { resume: File | null; cover_letter?: File }
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
    country: "",
    source: "website",
  });

  const [jobPositionAdverts, setJobPositionAdverts] = useState<JobPositionAdvert[]>([]);
  const [isLoadingAdverts, setIsLoadingAdverts] = useState(false);

  // Check if institution is selected and redirect if not
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
    if (searchTerm) {
      filtered = filtered.filter(
        (app) =>
          app.applicant_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.applicant_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (app.applicant_phone && app.applicant_phone.toLowerCase().includes(searchTerm.toLowerCase())),
      );
    }
    if (statusFilter !== "all") {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }
    setFilteredApplications(filtered);
  }, [applications, searchTerm, statusFilter]);

  const loadApplications = async () => {
    if (!selectedInstitution) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await getJobApplications({ institutionId: selectedInstitution.id });
      console.log("Apps", data);
      if (data) {
        setApplications(data);
      } else {
        setError("Failed to load applications");
      }
    } catch (err: any) {
      setError(err?.message || "An error occurred while loading applications");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadJobPositionAdverts = async () => {
    if (!selectedInstitution) return;

    setIsLoadingAdverts(true);
    try {
      const data = await getJobPositionAdverts({ institutionId: selectedInstitution.id });
      console.log("Adverts", data);
      if (data) {
        setJobPositionAdverts(data);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load job position adverts");
      console.error("Failed to load job position adverts:", err);
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

  const handleViewApplication = (applicationId: number) => {
  router.push(`/applications/${applicationId}`)
}

const handleEditApplication = (applicationId: number) => {
  router.push(`/applications/${applicationId}/edit`)
}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedInstitution || !selectedBranch) {
      setError("Missing organization or branch information");
      return;
    }

    if (!formData.resume) {
      setError("Resume is required");
      return;
    }

    if (formData.job_position_advert === 0) {
      setError("Please select a job position");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const applicationData: JobApplicationFormData = {
        ...formData,
        resume: formData.resume,
        cover_letter: formData.cover_letter || undefined,
        applicant_phone: formData.applicant_phone || undefined,
        state: formData.state || undefined,
        application_date: new Date().toISOString(),
        address: formData.address || "",
        country: formData.country || "",
      };

      // Add debugging logs
      console.log("Submitting application with institutionId:", selectedInstitution.id);
      console.log("Application data:", {
        ...applicationData,
        resume: applicationData.resume ? `File: ${applicationData.resume.name}` : "No resume",
        cover_letter: applicationData.cover_letter
          ? `File: ${applicationData.cover_letter.name}`
          : "No cover letter",
      });

      const newApplication = await createJobApplication({
        institutionId: selectedInstitution.id,
        applicationData,
      });

      if (newApplication) {
        console.log("Application created successfully:", newApplication);
        setApplications((prev) => [newApplication, ...prev]);
        setIsCreateDialogOpen(false);

        // Reset form
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
          country: "",
          source: "website",
        });
      } else {
        setError("Failed to create application - API returned null");
      }
    } catch (err: any) {
      console.error("Full error object:", err);
      console.error("Error response:", err?.response?.data);
      console.error("Error status:", err?.response?.status);

      // More detailed error message
      let errorMessage = "An error occurred while creating the application";
      if (err?.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err?.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err?.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
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
  


  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedApplications(filteredApplications.map((app) => app.id));
    } else {
      setSelectedApplications([]);
    }
  };


  const handleBulkAction = async (action: "shortlisted" | "reviewed") => {
    if (selectedApplications.length === 0) {
      toast.error("Please select applications first");
      return;
    }
    try {
      const promises = selectedApplications.map((applicationId) =>
        updateJobApplicationStatus({ applicationId, status: action }),
      );
      await Promise.all(promises);
      setApplications((prev) =>
        prev.map((app) => (selectedApplications.includes(app.id) ? { ...app, status: action } : app)),
      );
      setSelectedApplications([]);
      toast.success(`${selectedApplications.length} applications updated to ${action}`);
    } catch (error) {
      toast.error("Failed to update applications");
    }
  };

  const handleIndividualAction = async (applicationId: number, action: "new" | "reviewed" | "shortlisted" | "rejected" | "passed") => {
    try {
      await updateJobApplicationStatus({ applicationId, status: action });
      setApplications((prev) =>
        prev.map((app) => (app.id === applicationId ? { ...app, status: action } : app)),
      );
      toast.success(`Application ${action} successfully`);
    } catch (error) {
      toast.error(`Failed to ${action} application`);
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

  // Show loading if institution/branch not selected
  if (!selectedInstitution || !selectedBranch) {
    return <div>Loading...</div>;
  }

  if (isLoading) {
    return (
      <div className="w-full py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading applications...</p>
          </div>
        </div>
      </div>
    );
  }

return (
    <div className="w-full py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>                                                                                                                                                                                 
          <h1 className="text-3xl font-bold">Job Applications</h1>
          <p className="text-muted-foreground">
            Manage and track all job applications for {selectedBranch.branch_name} -{" "}
            {selectedInstitution.institution_name}
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Application
            </Button>
          </DialogTrigger>
          {/* ... DialogContent remains unchanged ... */}
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
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
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction("shortlisted")}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  <Check className="h-4 w-4 mr-2" />
                  Shortlist
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction("reviewed")}
                  className="text-yellow-600 border-yellow-200 hover:bg-yellow-50"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Mark as Reviewed
                </Button>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Applications ({filteredApplications.length})
          </CardTitle>
          <CardDescription>All job applications submitted to your organization</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredApplications.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all"
                  ? "No applications match your current filters."
                  : "No applications have been submitted yet."}
              </p>
              {applications.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                  }}
                  className="mt-2"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={
                          filteredApplications.length > 0 &&
                          selectedApplications.length === filteredApplications.length
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Job Position</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Documents</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredApplications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedApplications.includes(application.id)}
                          onCheckedChange={(checked) => handleSelectApplication(application.id, checked as boolean)}
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
                            {application.job_position_advert_job_details?.name || `Advert #${application.job_position_advert}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {application.positions} positions
                          </div>
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
                        <div className="space-y-1">
                          <Button variant="link" size="sm" className="h-auto p-0" asChild>
                            <a href={application.resume} target="_blank" rel="noopener noreferrer">
                              Resume
                            </a>
                          </Button>
                          {application.cover_letter && (
                            <Button variant="link" size="sm" className="h-auto p-0" asChild>
                              <a href={application.cover_letter} target="_blank" rel="noopener noreferrer">
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
                          <DropdownMenuContent align="end" className="!bg-white shadow-md shadow-black/20 rounded-md border border-black/20">
                            <DropdownMenuItem onClick={() => handleViewApplication(application.id)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditApplication(application.id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Application
                            </DropdownMenuItem>
                            {application.status !== "rejected" && (
                              <DropdownMenuItem onClick={() => handleIndividualAction(application.id, "rejected")}>
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
        </CardContent>
      </Card>
    </div>
  );
}
