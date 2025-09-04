"use client";

import type React from "react";
import {useEffect, useState} from "react";
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
import {ArrowLeft, Save, Calendar, FileText, Users, AlertTriangle} from "lucide-react";
import Link from "next/link";
import {Badge} from "@/components/ui/badge";
import {Checkbox} from "@/components/ui/checkbox";
import {PERMISSION_CODES} from "@/constants";
import ProtectedComponent from "@/components/ProtectedComponent";

interface IProjectTask {
  id: number;
  project: number;
  task_name: string;
  description: string;
  start_date: string;
  end_date: string;
  task_status: "not_started" | "in_progress" | "completed" | "on_hold";
  priority: "low" | "medium" | "high" | "urgent";
  assigned_to: string[];
  leaders: string[];
}

export default function EditTaskPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState<any>(null);

  const [formData, setFormData] = useState({
    task_name: "",
    description: "",
    start_date: "",
    end_date: "",
    task_status: "not_started" as const,
    priority: "medium" as const,
    project: 1,
    assigned_to: [] as string[],
    leaders: [] as string[],
  });

  const fetchTask = async () => {
    try {
      const response = await apiGet(`projects/tasks/${params.id}/details`);
      const task = response.data;
      const taskData = {
        task_name: task.task_name,
        description: task.description,
        start_date: task.start_date.split("T")[0],
        end_date: task.end_date.split("T")[0],
        task_status: task.task_status,
        priority: task.priority,
        project: task.project,
        assigned_to: task.assigned_to.map((user: any) => user.id.toString()),
        leaders: task.leaders.map((user: any) => user.id.toString()),
      };
      setFormData(taskData);
      setOriginalData(taskData);
    } catch (error) {
      console.error("Error fetching task:", error);
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchTask();
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
    setLoading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      router.push(`/projects/project-tasks/${params.id}`);
    } catch (error) {
      console.error("Error updating task:", error);
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

  const handleReset = () => {
    if (originalData) {
      setFormData(originalData);
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

  if (initialLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-lg">Loading task...</div>
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
      <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_TASKS}>
        <div className="max-w-full mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-6">
          <Link href={`/projects/project-tasks/${params.id}`}>
            <Button variant="outline" size="sm" className="shadow-sm bg-transparent">
              <ArrowLeft className="h-4 w-4 mr-2" />
            </Button>
          </Link>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              Edit Task
            </h1>
            <p className="text-slate-600 text-lg">Update task details and assignments</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-slate-900">Task Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="task_name" className="text-base font-medium">
                      Task Name *
                    </Label>
                    <Input
                      id="task_name"
                      value={formData.task_name}
                      onChange={(e) => handleInputChange("task_name", e.target.value)}
                      placeholder="Enter task name"
                      className="h-12 text-base border-slate-200 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="description" className="text-base font-medium">
                      Description *
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      placeholder="Describe the task..."
                      rows={6}
                      className="text-base border-slate-200 focus:border-blue-500 resize-none"
                      required
                    />
                  </div>

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
                        Task Status
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
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Team Assignment */}
                  <div className="space-y-6">
                    <div>
                      <Label className="text-base font-medium mb-3 block">Task Leaders</Label>
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
                                  handleInputChange("leaders", [...formData.leaders, member.id]);
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
                      <Label className="text-base font-medium mb-3 block">Assign To</Label>
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

                  <div className="flex gap-4 pt-6 border-t border-slate-200">
                    <Button type="submit" disabled={loading || !hasChanges}>
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? "Updating..." : "Save Changes"}
                    </Button>
                    <Link href={`/projects/project-tasks/${params.id}`}>
                      <Button variant="outline" type="button" className="shadow-sm bg-transparent">
                        Cancel
                      </Button>
                    </Link>
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
                  <FileText className="h-5 w-5" />
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
                    <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                      {formData.task_status.replace("_", " ")}
                    </Badge>
                  </div>

                  {formData.start_date && formData.end_date && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 text-sm">Duration</span>
                      <span className="font-medium text-slate-900">{getDurationDays()} days</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Assignees</span>
                    <span className="font-medium text-slate-900">
                      {formData.assigned_to.length}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Leaders</span>
                    <span className="font-medium text-slate-900">{formData.leaders.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline Preview */}
            {formData.start_date && formData.end_date && (
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-800">Start Date</p>
                        <p className="text-xs text-green-700">
                          {new Date(formData.start_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-red-800">Due Date</p>
                        <p className="text-xs text-red-700">
                          {new Date(formData.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Team Preview */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Assignment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {formData.leaders.length > 0 && (
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Leaders</h4>
                    <div className="space-y-1">
                      {formData.leaders.map((leaderId) => {
                        const leader = teamMembers.find((m) => m.id === leaderId);
                        return leader ? (
                          <div key={leaderId} className="text-sm text-slate-600">
                            {leader.name} - {leader.role}
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {formData.assigned_to.length > 0 && (
                  <div>
                    <h4 className="font-medium text-slate-900 mb-2">Assignees</h4>
                    <div className="space-y-1">
                      {formData.assigned_to.map((assigneeId) => {
                        const assignee = teamMembers.find((m) => m.id === assigneeId);
                        return assignee ? (
                          <div key={assigneeId} className="text-sm text-slate-600">
                            {assignee.name} - {assignee.role}
                          </div>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                {formData.leaders.length === 0 && formData.assigned_to.length === 0 && (
                  <p className="text-slate-500 text-sm">No team members assigned yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        </div>
      </ProtectedComponent>
    </div>
  );
}
