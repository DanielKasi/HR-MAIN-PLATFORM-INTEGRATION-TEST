"use client";

import React, {useState, useEffect} from "react";
import {useRouter} from "next/navigation";
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
import {ArrowLeft, Save, Calendar, FileText, Settings, Users, Target, X} from "lucide-react";
import Link from "next/link";
import {useSelector} from "react-redux";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import {Badge} from "@/components/ui/badge";
import {apiGet, apiPost} from "@/lib/apiRequest";
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
import {UserProfile} from "@/types";

export default function AddProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [leadersOpen, setLeadersOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const selectedInstitution = useSelector(selectSelectedInstitution);
  const institutionId = selectedInstitution?.id;

  const [formData, setFormData] = useState({
    project_name: "",
    description: "",
    start_date: "",
    end_date: "",
    project_status: "planning" as const,
    institution: selectedInstitution?.id,
    leaders: [] as number[],
    members: [] as number[],
  });

  // Function to fetch users
  const fetchUsers = async () => {
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

  useEffect(() => {
    if (currentStep === 3) {
      fetchUsers();
    }
  }, [currentStep]);

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
    // console.log("Creating project:", formData);
      const response = await apiPost(`/projects/projects/${institutionId}/`, formData);
      if (response.status === 201) {
        router.push("/projects");
      }
    } catch (error) {
      console.error("Error creating project:", error);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-full mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-6">
          <Link href="/projects">
            <Button variant="outline" size="sm" className="shadow-sm bg-transparent">
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
          </Link>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              Create New Project
            </h1>
            <p className="text-slate-600 text-lg">
              Set up your project with all the necessary details
            </p>
          </div>
        </div>

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
                    <div className="flex items-center gap-3">
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
                      <p className="text-blue-700 mt-1">
                        {Math.ceil(
                          (new Date(formData.end_date).getTime() -
                            new Date(formData.start_date).getTime()) /
                            (1000 * 60 * 60 * 24),
                        )}{" "}
                        days
                      </p>
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
                              {users.map((user) => (
                                <CommandItem
                                  key={user.id}
                                  onSelect={() => handleUserSelection(user.id, "leaders")}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.leaders.includes(user.id)
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span>{user.user.fullname}</span>
                                    <span className="text-sm text-slate-500">
                                      {user.user.email}
                                    </span>
                                  </div>
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
                              {users.map((user) => (
                                <CommandItem
                                  key={user.id}
                                  onSelect={() => handleUserSelection(user.id, "members")}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.members.includes(user.id)
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span>{user.user.fullname}</span>
                                    <span className="text-sm text-slate-500">
                                      {user.user.email}
                                    </span>
                                  </div>
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
                      Initial Status
                    </Label>
                    <Select
                      value={formData.project_status}
                      onValueChange={(value) => handleInputChange("project_status", value)}
                    >
                      <SelectTrigger className="h-12 text-base border-slate-200 focus:border-blue-500">
                        <SelectValue placeholder="Select initial status" />
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
                            ? `${Math.ceil(
                                (new Date(formData.end_date).getTime() -
                                  new Date(formData.start_date).getTime()) /
                                  (1000 * 60 * 60 * 24),
                              )} days`
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
                  <Link href="/projects">
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
                    <Button type="submit" disabled={loading}>
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? "Creating..." : "Create Project"}
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
