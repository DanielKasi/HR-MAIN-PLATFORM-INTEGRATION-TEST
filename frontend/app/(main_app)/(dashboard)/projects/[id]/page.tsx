"use client";

import {useEffect, useState} from "react";
import {useParams} from "next/navigation";
import type {UserProfile} from "@/types";
import {apiGet} from "@/lib/apiRequest";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Progress} from "@/components/ui/progress";
import {Avatar, AvatarFallback, AvatarImage} from "@/components/ui/avatar";
import {
  ArrowLeft,
  Edit,
  Users,
  Calendar,
  Target,
  Plus,
  CheckCircle2,
  AlertTriangle,
  MoreHorizontal,
  Eye,
  Trash2,
  FileText,
  TrendingUp,
  Activity,
  MoreVertical,
} from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface IProjectTask {
  id: number;
  project: number;
  task_name: string;
  description: string;
  leaders: UserProfile[];
  assigned_to: UserProfile[];
  start_date: string;
  end_date: string;
  task_status: "not_started" | "in_progress" | "completed" | "on_hold";
  priority: "low" | "medium" | "high" | "urgent";
}

interface IProject {
  id: number;
  institution: number;
  project_name: string;
  leaders: UserProfile[];
  members: UserProfile[];
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
  project_tasks: IProjectTask[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-50 text-green-700 border-green-200";
    case "in_progress":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "planning":
      return "bg-yellow-50 text-yellow-700 border-yellow-200";
    case "on_hold":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "cancelled":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
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

const calculateProgress = (tasks: IProjectTask[]) => {
  if (tasks.length === 0) return 0;
  const completedTasks = tasks.filter((task) => task.task_status === "completed").length;
  return Math.round((completedTasks / tasks.length) * 100);
};

const getDaysRemaining = (endDate: string) => {
  const today = new Date();
  const end = new Date(endDate);
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export default function ProjectDetailsPage() {
  const params = useParams();
  const [project, setProject] = useState<IProject | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProject = async () => {
    try {
      const response = await apiGet(`projects/projects/${params.id}/details`);
      setProject(response.data);
    } catch (error) {
      console.error("Error fetching project:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchProject();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-lg">Loading project details...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-lg">Project not found</div>
      </div>
    );
  }

  const progress = calculateProgress(project.project_tasks);
  const daysRemaining = getDaysRemaining(project.end_date);
  const isOverdue = daysRemaining < 0 && project.project_status !== "completed";

  const taskStats = {
    total: project.project_tasks.length,
    completed: project.project_tasks.filter((t) => t.task_status === "completed").length,
    inProgress: project.project_tasks.filter((t) => t.task_status === "in_progress").length,
    overdue: project.project_tasks.filter(
      (t) => getDaysRemaining(t.end_date) < 0 && t.task_status !== "completed",
    ).length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-full mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/projects">
              <Button variant="outline" size="sm" className="shadow-sm bg-transparent">
                <ArrowLeft className="h-4 w-4 mr-2" />
              </Button>
            </Link>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                {project.project_name}
              </h1>
              <div className="flex items-center gap-3">
                <Badge className={`${getStatusColor(project.project_status)} border`}>
                  {project.project_status.replace("_", " ")}
                </Badge>
                {isOverdue && (
                  <Badge variant="destructive">{Math.abs(daysRemaining)} days overdue</Badge>
                )}
              </div>
            </div>
          </div>
          <Link href={`/projects/edit/${project.id}`}>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit Project
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Progress</p>
                  <p className="text-3xl font-bold">{progress}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Completed Tasks</p>
                  <p className="text-3xl font-bold">{taskStats.completed}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">In Progress</p>
                  <p className="text-3xl font-bold">{taskStats.inProgress}</p>
                </div>
                <Activity className="h-8 w-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Team Members</p>
                  <p className="text-3xl font-bold">
                    {project.leaders.length + project.members.length}
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Overview */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <FileText className="h-5 w-5" />
                  Project Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Description</h4>
                  <p className="text-slate-600 leading-relaxed">{project.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Timeline</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="h-4 w-4" />
                        <span>Start: {new Date(project.start_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="h-4 w-4" />
                        <span>End: {new Date(project.end_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Progress</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Overall completion</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-3" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tasks Section */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Target className="h-5 w-5" />
                    Project Tasks ({project.project_tasks.length})
                  </CardTitle>
                  <Link href={`/projects/project-tasks/add?project=${project.id}`}>
                    <Button variant="outline" size="sm" className="shadow-sm bg-transparent">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {project.project_tasks.map((task) => {
                    const taskDaysRemaining = getDaysRemaining(task.end_date);
                    const isTaskOverdue = taskDaysRemaining < 0 && task.task_status !== "completed";

                    return (
                      <div
                        key={task.id}
                        className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-900 mb-1">{task.task_name}</h4>
                            <p className="text-sm text-slate-600 line-clamp-2">
                              {task.description}
                            </p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/projects/project-tasks/${task.id}`}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/projects/project-tasks/edit/${task.id}`}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Task
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge className={`${getStatusColor(task.task_status)} border text-xs`}>
                              {task.task_status.replace("_", " ")}
                            </Badge>
                            <Badge className={`${getPriorityColor(task.priority)} border text-xs`}>
                              {task.priority}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-slate-600">
                              <Users className="h-3 w-3" />
                              {task.assigned_to.length}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-600">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(task.end_date).toLocaleDateString()}</span>
                            {isTaskOverdue && (
                              <Badge variant="destructive" className="text-xs">
                                Overdue
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {project.project_tasks.length === 0 && (
                    <div className="text-center py-12">
                      <Target className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">No tasks yet</h3>
                      <p className="text-slate-600 mb-4">
                        Start by creating your first task for this project
                      </p>
                      <Link href={`/projects/project-tasks/add?project=${project.id}`}>
                        <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          Create Task
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Team Members */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Members
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-slate-900 mb-3">Project Leaders</h4>
                  <div className="space-y-2">
                    {project.leaders.map((leader) => (
                      <div
                        key={leader.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-slate-50"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`/placeholder.svg?height=32&width=32`} />
                          <AvatarFallback className="text-xs">
                            {leader.user.fullname
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {leader.user.fullname}
                          </p>
                          <p className="text-xs text-slate-600">Leader</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-slate-900 mb-3">Team Members</h4>
                  <div className="space-y-2">
                    {project.members.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-slate-50"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={`/placeholder.svg?height=32&width=32`} />
                          <AvatarFallback className="text-xs">
                            {member.user.fullname
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {member.user.fullname}
                          </p>
                          <p className="text-xs text-slate-600">Member</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{taskStats.total}</p>
                    <p className="text-xs text-blue-700">Total Tasks</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{taskStats.completed}</p>
                    <p className="text-xs text-green-700">Completed</p>
                  </div>
                </div>

                {taskStats.overdue > 0 && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">{taskStats.overdue} overdue tasks</span>
                    </div>
                  </div>
                )}

                <div className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Days remaining</span>
                    <span
                      className={`font-medium ${isOverdue ? "text-red-600" : "text-slate-900"}`}
                    >
                      {isOverdue ? `${Math.abs(daysRemaining)} overdue` : `${daysRemaining} days`}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
