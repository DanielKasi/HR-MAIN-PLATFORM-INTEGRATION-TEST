"use client";

import React, {useEffect, useState} from "react";
import {useParams, useRouter} from "next/navigation";
import {apiGet} from "@/lib/apiRequest";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {
  ArrowLeft,
  Save,
  Calendar,
  FileText,
  Settings,
  AlertTriangle,
  Users,
  Target,
  X,
} from "lucide-react";
import Link from "next/link";
import {Badge} from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {Popover, PopoverContent, PopoverTrigger} from "@/components/ui/popover";
import {Check, ChevronsUpDown} from "lucide-react";
import {cn} from "@/lib/utils";
import type {UserProfile} from "@/types";

interface IProject {
  id: number;
  institution: number;
  project_name: string;
  description: string;
  start_date: string;
  end_date: string;
  project_status:
    | "not_started"
    | "in_progress"
    | "planning"
    | "on_hold"
    | "cancelled"
    | "completed";
  leaders: number[];
  members: number[];
}

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState<any>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [leadersOpen, setLeadersOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    project_name: "",
    description: "",
    start_date: "",
    end_date: "",
    project_status: "planning" as const,
    institution: 1,
    leaders: [] as number[],
    members: [] as number[],
  });

  // Function to fetch users
  const fetchUsers = async (institutionId: number) => {
    setLoadingUsers(true);
    try {
      const response = await apiGet(`/institution/profile/${institutionId}/`);
      if (response.status === 200) {
        const data = await response.data;
        setUsers(data.results);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchProject = async () => {
    try {
      const response = await apiGet(`projects/projects/${params.id}/details`);
      const project = response.data;

      // Fetch users for the institution
      await fetchUsers(project.institution);

      const projectData = {
        project_name: project.project_name,
        description: project.description,
        start_date: project.start_date.split("T")[0],
        end_date: project.end_date.split("T")[0],
        project_status: project.project_status,
        institution: project.institution,
        leaders: project.leaders || [],
        members: project.members || [],
      };
      setFormData(projectData);
      setOriginalData(projectData);
    } catch (error) {
      console.error("Error fetching project:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchProject();
    }
  }, [params.id]);

  useEffect(() => {
    if (originalData) {
      const changed = JSON.stringify(formData) !== JSON.stringify(originalData);
      setHasChanges(changed);
    }
  }, [formData, originalData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    const newErrors: Record<string, string[]> = {};
    if (formData.leaders.length === 0) {
      newErrors.leaders = ["This field is required."];
    }
    if (formData.members.length === 0) {
      newErrors.members = ["This field is required."];
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);

    try {
      console.log("Updating project:", formData);
      // Replace with your actual API call
      // const response = await apiPost(`/projects/projects/${params.id}/`, formData);
      // if (response.status === 200) {
      router.push(`/projects/${params.id}`);
      // }
    } catch (error) {
      console.error("Error updating project:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: [],
      }));
    }
  };

  const handleUserSelection = (userId: number, field: "leaders" | "members") => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].includes(userId)
        ? prev[field].filter((id) => id !== userId)
        : [...prev[field], userId],
    }));

    // Clear errors when user makes selection
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: [],
      }));
    }
  };

  const removeUser = (userId: number, field: "leaders" | "members") => {
    setFormData((prev) => ({
      ...prev,
      [field]: prev[field].filter((id) => id !== userId),
    }));
  };

  const getSelectedUsers = (userIds: number[]) => {
    return users.filter((user) => userIds.includes(user.id));
  };

  const handleReset = () => {
    if (originalData) {
      setFormData(originalData);
      setErrors({});
    }
  };

  const steps = [
    {id: 1, title: "Basic Info", icon: FileText},
    {id: 2, title: "Timeline", icon: Calendar},
    {id: 3, title: "Team", icon: Users},
    {id: 4, title: "Settings", icon: Settings},
  ];

  const isStepComplete = (step: number) => {
    switch (step) {
      case 1:
        return formData.project_name && formData.description;
      case 2:
        return formData.start_date && formData.end_date;
      case 3:
        return formData.leaders.length > 0 && formData.members.length > 0;
      case 4:
        return formData.project_status;
      default:
        return false;
    }
  };

  if (initialLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-lg">Loading project...</div>
      </div>
    );
  }

  const getDurationDays = () => {
    if (formData.start_date && formData.end_date) {
      return Math.ceil(
        (new Date(formData.end_date).getTime() - new Date(formData.start_date).getTime()) /
          (1000 * 60 * 60 * 24),
      );
    }
    return 0;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-full mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-6">
          <Link href={`/projects/${params.id}`}>
            <Button variant="outline" size="sm" className="shadow-sm bg-transparent">
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
          </Link>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              Edit Project
            </h1>
            <p className="text-slate-600 text-lg">Update your project details and settings</p>
          </div>
        </div>

        {/* Changes Alert */}
        {hasChanges && (
          <Card className="border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-myOrange" />
                <div className="flex-1">
                  <p className="text-orange-800 font-medium">You have unsaved changes</p>
                  <p className="text-orange-700 text-sm">
                    Make sure to save your changes before leaving this page.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="border-orange-300 text-orange-700 hover:bg-orange-100 bg-transparent"
                >
                  Reset Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Steps */}
        <Card className="border-0 shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = isStepComplete(step.id);

                return (
                  <React.Fragment key={step.id}>
                    <div
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => setCurrentStep(step.id)}
                    >
                      <div
                        className={`
                        w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300
                        ${
                          isActive
                            ? "bg-blue-600 text-white shadow-lg"
                            : isCompleted
                              ? "bg-green-600 text-white"
                              : "bg-slate-200 text-slate-600"
                        }
                      `}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="hidden sm:block">
                        <p
                          className={`font-medium ${isActive ? "text-blue-600" : "text-slate-600"}`}
                        >
                          {step.title}
                        </p>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`
                        flex-1 h-0.5 mx-4 transition-all duration-300
                        ${isStepComplete(step.id) ? "bg-green-600" : "bg-slate-200"}
                      `}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl font-bold text-slate-900">
              {steps.find((s) => s.id === currentStep)?.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="project_name" className="text-base font-medium">
                      Project Name *
                    </Label>
                    <Input
                      id="project_name"
                      value={formData.project_name}
                      onChange={(e) => handleInputChange("project_name", e.target.value)}
                      placeholder="Enter a descriptive project name"
                      className="h-12 text-base border-slate-200 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="description" className="text-base font-medium">
                      Project Description *
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      placeholder="Describe the project goals, scope, and key deliverables..."
                      rows={6}
                      className="text-base border-slate-200 focus:border-blue-500 resize-none"
                      required
                    />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label htmlFor="start_date" className="text-base font-medium">
                        Start Date *
                      </Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => handleInputChange("start_date", e.target.value)}
                        className="h-12 text-base border-slate-200 focus:border-blue-500"
                        required
                      />
                    </div>
                    <div className="space-y-3">
                      <Label htmlFor="end_date" className="text-base font-medium">
                        End Date *
                      </Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => handleInputChange("end_date", e.target.value)}
                        className="h-12 text-base border-slate-200 focus:border-blue-500"
                        required
                      />
                    </div>
                  </div>

                  {formData.start_date && formData.end_date && (
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 text-blue-800">
                        <Calendar className="h-5 w-5" />
                        <span className="font-medium">Project Duration</span>
                      </div>
                      <p className="text-blue-700 mt-1">{getDurationDays()} days</p>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-6">
                  {/* Leaders Selection */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Project Leaders *</Label>
                    <Popover open={leadersOpen} onOpenChange={setLeadersOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={leadersOpen}
                          className={cn(
                            "h-12 justify-between text-base border-slate-200 focus:border-blue-500",
                            errors.leaders?.length > 0 && "border-red-500",
                          )}
                        >
                          {formData.leaders.length > 0
                            ? `${formData.leaders.length} leader(s) selected`
                            : "Select project leaders..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search users..." />
                          <CommandList>
                            <CommandEmpty>
                              {loadingUsers ? "Loading users..." : "No users found."}
                            </CommandEmpty>
                            <CommandGroup>
                              <div className="px-2 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wide">
                                Selected Leaders ({formData.leaders.length})
                              </div>
                              {users
                                .filter((user) => formData.leaders.includes(user.id))
                                .map((user) => (
                                  <CommandItem
                                    key={`selected-leader-${user.id}`}
                                    onSelect={() => handleUserSelection(user.id, "leaders")}
                                    className="bg-blue-50 border-l-4 border-l-blue-500"
                                  >
                                    <Check className="mr-2 h-4 w-4 text-blue-600" />
                                    <div className="flex flex-col flex-1">
                                      <span className="font-medium text-blue-900">
                                        {user.user.fullname}
                                      </span>
                                      <span className="text-sm text-blue-700">
                                        {user.user.email}
                                      </span>
                                    </div>
                                    <Badge
                                      variant="secondary"
                                      className="ml-2 bg-blue-100 text-blue-800"
                                    >
                                      Leader
                                    </Badge>
                                  </CommandItem>
                                ))}

                              {formData.leaders.length > 0 &&
                                users.filter((user) => !formData.leaders.includes(user.id)).length >
                                  0 && (
                                  <div className="px-2 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wide border-t mt-1 pt-2">
                                    Available Users (
                                    {
                                      users.filter((user) => !formData.leaders.includes(user.id))
                                        .length
                                    }
                                    )
                                  </div>
                                )}

                              {users
                                .filter((user) => !formData.leaders.includes(user.id))
                                .map((user) => (
                                  <CommandItem
                                    key={`available-leader-${user.id}`}
                                    onSelect={() => handleUserSelection(user.id, "leaders")}
                                    className="hover:bg-slate-50"
                                  >
                                    <div className="mr-2 h-4 w-4 border border-slate-300 rounded flex items-center justify-center">
                                      <div className="h-2 w-2 bg-transparent rounded-sm"></div>
                                    </div>
                                    <div className="flex flex-col flex-1">
                                      <span>{user.user.fullname}</span>
                                      <span className="text-sm text-slate-500">
                                        {user.user.email}
                                      </span>
                                    </div>
                                    {formData.members.includes(user.id) && (
                                      <Badge variant="outline" className="ml-2 text-xs">
                                        Member
                                      </Badge>
                                    )}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {/* Selected Leaders */}
                    {formData.leaders.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {getSelectedUsers(formData.leaders).map((user) => (
                          <Badge
                            key={user.id}
                            variant="secondary"
                            className="flex items-center gap-1"
                          >
                            {user.user.fullname}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removeUser(user.id, "leaders")}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}

                    {errors.leaders && errors.leaders.length > 0 && (
                      <p className="text-sm text-red-600">{errors.leaders[0]}</p>
                    )}
                  </div>

                  {/* Members Selection */}
                  <div className="space-y-3">
                    <Label className="text-base font-medium">Project Members *</Label>
                    <Popover open={membersOpen} onOpenChange={setMembersOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={membersOpen}
                          className={cn(
                            "h-12 justify-between text-base border-slate-200 focus:border-blue-500",
                            errors.members?.length > 0 && "border-red-500",
                          )}
                        >
                          {formData.members.length > 0
                            ? `${formData.members.length} member(s) selected`
                            : "Select project members..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Search users..." />
                          <CommandList>
                            <CommandEmpty>
                              {loadingUsers ? "Loading users..." : "No users found."}
                            </CommandEmpty>
                            <CommandGroup>
                              <div className="px-2 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wide">
                                Selected Members ({formData.members.length})
                              </div>
                              {users
                                .filter((user) => formData.members.includes(user.id))
                                .map((user) => (
                                  <CommandItem
                                    key={`selected-member-${user.id}`}
                                    onSelect={() => handleUserSelection(user.id, "members")}
                                    className="bg-green-50 border-l-4 border-l-green-500"
                                  >
                                    <Check className="mr-2 h-4 w-4 text-green-600" />
                                    <div className="flex flex-col flex-1">
                                      <span className="font-medium text-green-900">
                                        {user.user.fullname}
                                      </span>
                                      <span className="text-sm text-green-700">
                                        {user.user.email}
                                      </span>
                                    </div>
                                    <Badge
                                      variant="secondary"
                                      className="ml-2 bg-green-100 text-green-800"
                                    >
                                      Member
                                    </Badge>
                                  </CommandItem>
                                ))}

                              {formData.members.length > 0 &&
                                users.filter((user) => !formData.members.includes(user.id)).length >
                                  0 && (
                                  <div className="px-2 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wide border-t mt-1 pt-2">
                                    Available Users (
                                    {
                                      users.filter((user) => !formData.members.includes(user.id))
                                        .length
                                    }
                                    )
                                  </div>
                                )}

                              {users
                                .filter((user) => !formData.members.includes(user.id))
                                .map((user) => (
                                  <CommandItem
                                    key={`available-member-${user.id}`}
                                    onSelect={() => handleUserSelection(user.id, "members")}
                                    className="hover:bg-slate-50"
                                  >
                                    <div className="mr-2 h-4 w-4 border border-slate-300 rounded flex items-center justify-center">
                                      <div className="h-2 w-2 bg-transparent rounded-sm"></div>
                                    </div>
                                    <div className="flex flex-col flex-1">
                                      <span>{user.user.fullname}</span>
                                      <span className="text-sm text-slate-500">
                                        {user.user.email}
                                      </span>
                                    </div>
                                    {formData.leaders.includes(user.id) && (
                                      <Badge variant="outline" className="ml-2 text-xs">
                                        Leader
                                      </Badge>
                                    )}
                                  </CommandItem>
                                ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {/* Selected Members */}
                    {formData.members.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {getSelectedUsers(formData.members).map((user) => (
                          <Badge
                            key={user.id}
                            variant="outline"
                            className="flex items-center gap-1"
                          >
                            {user.user.fullname}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => removeUser(user.id, "members")}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}

                    {errors.members && errors.members.length > 0 && (
                      <p className="text-sm text-red-600">{errors.members[0]}</p>
                    )}
                  </div>

                  {/* Team Summary */}
                  {(formData.leaders.length > 0 || formData.members.length > 0) && (
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-2 text-green-800 mb-2">
                        <Users className="h-5 w-5" />
                        <span className="font-medium">Team Summary</span>
                      </div>
                      <div className="text-green-700 text-sm">
                        <p>
                          {formData.leaders.length} leader(s) and {formData.members.length}{" "}
                          member(s) selected
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="project_status" className="text-base font-medium">
                      Project Status
                    </Label>
                    <Select
                      value={formData.project_status}
                      onValueChange={(value) => handleInputChange("project_status", value)}
                    >
                      <SelectTrigger className="h-12 text-base border-slate-200 focus:border-blue-500">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planning">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-yellow-600" />
                            Planning
                          </div>
                        </SelectItem>
                        <SelectItem value="not_started">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-gray-600" />
                            Not Started
                          </div>
                        </SelectItem>
                        <SelectItem value="in_progress">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-blue-600" />
                            In Progress
                          </div>
                        </SelectItem>
                        <SelectItem value="on_hold">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-myOrange" />
                            On Hold
                          </div>
                        </SelectItem>
                        <SelectItem value="completed">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-green-600" />
                            Completed
                          </div>
                        </SelectItem>
                        <SelectItem value="cancelled">
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-red-600" />
                            Cancelled
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                    <h3 className="font-semibold text-slate-900 mb-3">Project Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Name:</span>
                        <span className="font-medium">{formData.project_name || "Not set"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Duration:</span>
                        <span className="font-medium">
                          {formData.start_date && formData.end_date
                            ? `${getDurationDays()} days`
                            : "Not set"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Leaders:</span>
                        <span className="font-medium">{formData.leaders.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Members:</span>
                        <span className="font-medium">{formData.members.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Status:</span>
                        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                          {formData.project_status.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6 border-t border-slate-200">
                <div>
                  {currentStep > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentStep(currentStep - 1)}
                      className="shadow-sm"
                    >
                      Previous
                    </Button>
                  )}
                </div>
                <div className="flex gap-3">
                  <Link href={`/projects/${params.id}`}>
                    <Button variant="outline" type="button" className="shadow-sm bg-transparent">
                      Cancel
                    </Button>
                  </Link>
                  {currentStep < 4 ? (
                    <Button
                      type="button"
                      onClick={() => setCurrentStep(currentStep + 1)}
                      disabled={!isStepComplete(currentStep)}
                    >
                      Next Step
                    </Button>
                  ) : (
                    <Button type="submit" disabled={loading || !hasChanges}>
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? "Updating..." : "Save Changes"}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
