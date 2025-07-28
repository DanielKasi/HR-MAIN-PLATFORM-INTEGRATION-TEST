"use client";

import {useEffect, useState} from "react";
import {useParams} from "next/navigation";
import type {UserProfile} from "@/app/types";
import {apiGet} from "@/lib/apiRequest";
import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {ArrowLeft, Edit, Users, FileText} from "lucide-react";
import Link from "next/link";

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
      return "bg-green-100 text-green-800";
    case "in_progress":
      return "bg-blue-100 text-blue-800";
    case "planning":
      return "bg-yellow-100 text-yellow-800";
    case "on_hold":
      return "bg-orange-100 text-orange-800";
    case "cancelled":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "urgent":
      return "bg-red-100 text-red-800";
    case "high":
      return "bg-orange-100 text-orange-800";
    case "medium":
      return "bg-yellow-100 text-yellow-800";
    case "low":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/projects">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{project.project_name}</h1>
            <p className="text-muted-foreground">Project Details</p>
          </div>
        </div>
        <Link href={`/projects/edit/${project.id}`}>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            Edit Project
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Project Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">Status</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(project.project_status)}>
                      {project.project_status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Description</TableCell>
                  <TableCell>{project.description}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Start Date</TableCell>
                  <TableCell>{new Date(project.start_date).toLocaleDateString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">End Date</TableCell>
                  <TableCell>{new Date(project.end_date).toLocaleDateString()}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Total Tasks</TableCell>
                  <TableCell>{project.project_tasks.length}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Leaders</h4>
              <div className="space-y-1">
                {project.leaders.map((leader) => (
                  <div key={leader.id} className="text-sm">
                    {leader.user.fullname}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Members</h4>
              <div className="space-y-1">
                {project.members.map((member) => (
                  <div key={member.id} className="text-sm">
                    {member.user.fullname}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Task Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Due Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {project.project_tasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell className="font-medium">{task.task_name}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(task.task_status)}>
                      {task.task_status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPriorityColor(task.priority)}>{task.priority}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {task.assigned_to.length}
                    </div>
                  </TableCell>
                  <TableCell>{new Date(task.end_date).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
