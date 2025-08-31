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
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Activity,
  MessageSquare,
  Paperclip,
  Plus,
} from "lucide-react";
import Link from "next/link";
import {Textarea} from "@/components/ui/textarea";
import {PERMISSION_CODES} from "@/types/types.utils";
import ProtectedComponent from "@/components/ProtectedComponent";

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

interface ITaskTimeSheet {
  id: number;
  task: number;
  start_time: string;
  end_time: string;
  notes: string;
  user: UserProfile;
}

interface ITaskComment {
  id: number;
  task: number;
  user: UserProfile;
  comment: string;
  created_at: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-50 text-green-700 border-green-200";
    case "in_progress":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "not_started":
      return "bg-gray-50 text-gray-700 border-gray-200";
    case "on_hold":
      return "bg-orange-50 text-orange-700 border-orange-200";
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

const getDaysRemaining = (endDate: string) => {
  const today = new Date();
  const end = new Date(endDate);
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export default function TaskDetailsPage() {
  const params = useParams();
  const [task, setTask] = useState<IProjectTask | null>(null);
  const [timeSheets, setTimeSheets] = useState<ITaskTimeSheet[]>([]);
  const [comments, setComments] = useState<ITaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");

  const fetchTask = async () => {
    try {
      const response = await apiGet(`projects/tasks/${params.id}/details`);
      setTask(response.data);
      setTimeSheets([
        {
          id: 1,
          task: Number(params.id),
          start_time: "2024-01-15T09:00:00Z",
          end_time: "2024-01-15T12:00:00Z",
          notes: "Initial setup and research",
          user: {id: 1, user: {fullname: "John Doe"}} as UserProfile,
        },
      ]);
      setComments([
        {
          id: 1,
          task: Number(params.id),
          user: {id: 1, user: {fullname: "Jane Smith"}} as UserProfile,
          comment: "Started working on this task. The requirements look clear.",
          created_at: "2024-01-15T10:30:00Z",
        },
      ]);
    } catch (error) {
      console.error("Error fetching task:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) {
      fetchTask();
    }
  }, [params.id]);

  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment: ITaskComment = {
        id: comments.length + 1,
        task: Number(params.id),
        user: {id: 1, user: {fullname: "Current User"}} as UserProfile,
        comment: newComment,
        created_at: new Date().toISOString(),
      };
      setComments([...comments, comment]);
      setNewComment("");
    }
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-lg">Loading task details...</div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-lg">Task not found</div>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining(task.end_date);
  const isOverdue = daysRemaining < 0 && task.task_status !== "completed";
  const totalHours = timeSheets.reduce((acc, sheet) => {
    const start = new Date(sheet.start_time);
    const end = new Date(sheet.end_time);
    return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_TASKS}>
        <div className="max-w-full mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href={`/projects/${task.project}`}>
              <Button variant="outline" size="sm" className="shadow-sm bg-transparent">
                <ArrowLeft className="h-4 w-4 mr-2" />
              </Button>
            </Link>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                {task.task_name}
              </h1>
              <div className="flex items-center gap-3">
                <Badge className={`${getStatusColor(task.task_status)} border`}>
                  {task.task_status.replace("_", " ")}
                </Badge>
                <Badge className={`${getPriorityColor(task.priority)} border`}>
                  {task.priority} priority
                </Badge>
                {isOverdue && (
                  <Badge variant="destructive">{Math.abs(daysRemaining)} days overdue</Badge>
                )}
              </div>
            </div>
          </div>
          <Link href={`/projects/project-tasks/edit/${task.id}`}>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit Task
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Time Logged</p>
                  <p className="text-3xl font-bold">{totalHours.toFixed(1)}h</p>
                </div>
                <Clock className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Assignees</p>
                  <p className="text-3xl font-bold">{task.assigned_to.length}</p>
                </div>
                <Users className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Comments</p>
                  <p className="text-3xl font-bold">{comments.length}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Days Left</p>
                  <p className="text-3xl font-bold">{isOverdue ? 0 : daysRemaining}</p>
                </div>
                <Calendar className="h-8 w-8 text-orange-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Task Overview */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <FileText className="h-5 w-5" />
                  Task Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Description</h4>
                  <p className="text-slate-600 leading-relaxed">{task.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Timeline</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="h-4 w-4" />
                        <span>Start: {new Date(task.start_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="h-4 w-4" />
                        <span>Due: {new Date(task.end_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-slate-900 mb-2">Progress</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Status</span>
                        <span className="font-medium">{task.task_status.replace("_", " ")}</span>
                      </div>
                      <Progress
                        value={
                          task.task_status === "completed"
                            ? 100
                            : task.task_status === "in_progress"
                              ? 50
                              : 0
                        }
                        className="h-3"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Time Tracking */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Clock className="h-5 w-5" />
                    Time Tracking
                  </CardTitle>
                  <Button variant="outline" size="sm" className="shadow-sm bg-transparent">
                    <Plus className="h-4 w-4 mr-2" />
                    Log Time
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {timeSheets.map((sheet) => (
                    <div key={sheet.id} className="p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={`/placeholder.svg?height=32&width=32`} />
                            <AvatarFallback className="text-xs">
                              {sheet.user.user.fullname
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-slate-900">{sheet.user.user.fullname}</p>
                            <p className="text-sm text-slate-600">
                              {new Date(sheet.start_time).toLocaleDateString()} •
                              {(
                                (new Date(sheet.end_time).getTime() -
                                  new Date(sheet.start_time).getTime()) /
                                (1000 * 60 * 60)
                              ).toFixed(1)}
                              h
                            </p>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 ml-11">{sheet.notes}</p>
                    </div>
                  ))}

                  {timeSheets.length === 0 && (
                    <div className="text-center py-8">
                      <Clock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        No time logged yet
                      </h3>
                      <p className="text-slate-600 mb-4">Start tracking time spent on this task</p>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Log Time
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Comments */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <MessageSquare className="h-5 w-5" />
                  Comments ({comments.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add Comment */}
                <div className="space-y-3">
                  <Textarea
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="border-slate-200 focus:border-blue-500"
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button onClick={handleAddComment} disabled={!newComment.trim()}>
                      Add Comment
                    </Button>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarImage src={`/placeholder.svg?height=32&width=32`} />
                        <AvatarFallback className="text-xs">
                          {comment.user.user.fullname
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900">{comment.user.user.fullname}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="text-slate-600">{comment.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Assigned Team */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Assigned Team
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium text-slate-900 mb-3">Task Leaders</h4>
                  <div className="space-y-2">
                    {task.leaders.map((leader) => (
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
                  <h4 className="font-medium text-slate-900 mb-3">Assignees</h4>
                  <div className="space-y-2">
                    {task.assigned_to.map((member) => (
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
                          <p className="text-xs text-slate-600">Assignee</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Task Info */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Task Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Priority</span>
                    <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Status</span>
                    <Badge className={getStatusColor(task.task_status)}>
                      {task.task_status.replace("_", " ")}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Time logged</span>
                    <span className="font-medium text-slate-900">{totalHours.toFixed(1)}h</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Days remaining</span>
                    <span
                      className={`font-medium ${isOverdue ? "text-red-600" : "text-slate-900"}`}
                    >
                      {isOverdue ? `${Math.abs(daysRemaining)} overdue` : `${daysRemaining} days`}
                    </span>
                  </div>
                </div>

                {isOverdue && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium text-sm">Task is overdue</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Clock className="mr-2 h-4 w-4" />
                  Log Time
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <Paperclip className="mr-2 h-4 w-4" />
                  Add Attachment
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark Complete
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        </div>
      </ProtectedComponent>
    </div>
  );
}
