"use client";

import React, {useState} from "react";
import {useRouter, useSearchParams} from "next/navigation";
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
import {ArrowLeft, Save, Calendar, FileText, Users, Target, AlertCircle} from "lucide-react";
import Link from "next/link";
import {Badge} from "@/components/ui/badge";
import {Checkbox} from "@/components/ui/checkbox";

export default function AddTaskPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("project");

  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    task_name: "",
    description: "",
    start_date: "",
    end_date: "",
    task_status: "not_started" as const,
    priority: "medium" as const,
    project: projectId || "",
    assigned_to: [] as string[],
    leaders: [] as string[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log("Creating task:", formData);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      router.push(projectId ? `/projects/${projectId}` : "/projects");
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const steps = [
    {id: 1, title: "Task Details", icon: FileText},
    {id: 2, title: "Timeline", icon: Calendar},
    {id: 3, title: "Assignment", icon: Users},
  ];

  const isStepComplete = (step: number) => {
    switch (step) {
      case 1:
        return formData.task_name && formData.description;
      case 2:
        return formData.start_date && formData.end_date;
      case 3:
        return true; // Assignment is optional
      default:
        return false;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // Mock team members - in real app, fetch from API
  const teamMembers = [
    {id: "1", name: "John Doe", role: "Developer"},
    {id: "2", name: "Jane Smith", role: "Designer"},
    {id: "3", name: "Mike Johnson", role: "Project Manager"},
    {id: "4", name: "Sarah Wilson", role: "QA Engineer"},
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-full mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-6">
          <Link href={projectId ? `/projects/${projectId}` : "/projects"}>
            <Button variant="outline" size="sm" className="shadow-sm bg-transparent">
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
          </Link>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              Create New Task
            </h1>
            <p className="text-slate-600 text-lg">Add a new task to your project</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
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
                        <Label htmlFor="task_name" className="text-base font-medium">
                          Task Name *
                        </Label>
                        <Input
                          id="task_name"
                          value={formData.task_name}
                          onChange={(e) => handleInputChange("task_name", e.target.value)}
                          placeholder="Enter a clear, actionable task name"
                          className="h-12 text-base border-slate-200 focus:border-blue-500"
                          required
                        />
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="description" className="text-base font-medium">
                          Task Description *
                        </Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => handleInputChange("description", e.target.value)}
                          placeholder="Describe what needs to be done, acceptance criteria, and any important details..."
                          rows={6}
                          className="text-base border-slate-200 focus:border-blue-500 resize-none"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3">
                          <Label htmlFor="priority" className="text-base font-medium">
                            Priority Level
                          </Label>
                          <Select
                            value={formData.priority}
                            onValueChange={(value) => handleInputChange("priority", value)}
                          >
                            <SelectTrigger className="h-12 text-base border-slate-200 focus:border-blue-500">
                              <SelectValue placeholder="Select priority" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="low">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                  Low Priority
                                </div>
                              </SelectItem>
                              <SelectItem value="medium">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                  Medium Priority
                                </div>
                              </SelectItem>
                              <SelectItem value="high">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                  High Priority
                                </div>
                              </SelectItem>
                              <SelectItem value="urgent">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                  Urgent
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="task_status" className="text-base font-medium">
                            Initial Status
                          </Label>
                          <Select
                            value={formData.task_status}
                            onValueChange={(value) => handleInputChange("task_status", value)}
                          >
                            <SelectTrigger className="h-12 text-base border-slate-200 focus:border-blue-500">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="not_started">Not Started</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="on_hold">On Hold</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
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
                            Due Date *
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
                          <div className="flex items-center gap-2 text-blue-800 mb-2">
                            <Calendar className="h-5 w-5" />
                            <span className="font-medium">Task Duration</span>
                          </div>
                          <p className="text-blue-700">
                            {Math.ceil(
                              (new Date(formData.end_date).getTime() -
                                new Date(formData.start_date).getTime()) /
                                (1000 * 60 * 60 * 24),
                            )}{" "}
                            days
                          </p>
                          {new Date(formData.end_date) < new Date(formData.start_date) && (
                            <div className="flex items-center gap-2 text-red-700 mt-2">
                              <AlertCircle className="h-4 w-4" />
                              <span className="text-sm">Due date cannot be before start date</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-base font-medium mb-3 block">
                            Task Leaders (Optional)
                          </Label>
                          <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
                            {teamMembers.map((member) => (
                              <div
                                key={member.id}
                                className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded"
                              >
                                <Checkbox
                                  id={`leader-${member.id}`}
                                  checked={formData.leaders.includes(member.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      handleInputChange("leaders", [
                                        ...formData.leaders,
                                        member.id,
                                      ]);
                                    } else {
                                      handleInputChange(
                                        "leaders",
                                        formData.leaders.filter((id) => id !== member.id),
                                      );
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`leader-${member.id}`}
                                  className="flex-1 cursor-pointer"
                                >
                                  <div className="font-medium text-slate-900">{member.name}</div>
                                  <div className="text-sm text-slate-600">{member.role}</div>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <Label className="text-base font-medium mb-3 block">
                            Assign To (Optional)
                          </Label>
                          <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
                            {teamMembers.map((member) => (
                              <div
                                key={member.id}
                                className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded"
                              >
                                <Checkbox
                                  id={`assign-${member.id}`}
                                  checked={formData.assigned_to.includes(member.id)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      handleInputChange("assigned_to", [
                                        ...formData.assigned_to,
                                        member.id,
                                      ]);
                                    } else {
                                      handleInputChange(
                                        "assigned_to",
                                        formData.assigned_to.filter((id) => id !== member.id),
                                      );
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`assign-${member.id}`}
                                  className="flex-1 cursor-pointer"
                                >
                                  <div className="font-medium text-slate-900">{member.name}</div>
                                  <div className="text-sm text-slate-600">{member.role}</div>
                                </label>
                              </div>
                            ))}
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
                      <Link href={projectId ? `/projects/${projectId}` : "/projects"}>
                        <Button
                          variant="outline"
                          type="button"
                          className="shadow-sm bg-transparent"
                        >
                          Cancel
                        </Button>
                      </Link>

                      {currentStep < 3 ? (
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
                          {loading ? "Creating..." : "Create Task"}
                        </Button>
                      )}
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Task Summary */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Task Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Priority</span>
                    <Badge className={getPriorityColor(formData.priority)}>
                      {formData.priority}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Status</span>
                    <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                      {formData.task_status.replace("_", " ")}
                    </Badge>
                  </div>

                  {formData.start_date && formData.end_date && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 text-sm">Duration</span>
                      <span className="font-medium text-slate-900">
                        {Math.ceil(
                          (new Date(formData.end_date).getTime() -
                            new Date(formData.start_date).getTime()) /
                            (1000 * 60 * 60 * 24),
                        )}{" "}
                        days
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Assignees</span>
                    <span className="font-medium text-slate-900">
                      {formData.assigned_to.length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Help Card */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-900">
                  <FileText className="h-5 w-5" />
                  Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-green-800 text-sm space-y-2">
                  <li>• Write clear, actionable task names</li>
                  <li>• Include acceptance criteria in description</li>
                  <li>• Set realistic deadlines</li>
                  <li>• Assign appropriate team members</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
