"use client";

import {useEffect, useState} from "react";
import type {UserProfile} from "@/app/types";
import {apiGet} from "@/lib/apiRequest";
import {Button} from "@/components/ui/button";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Badge} from "@/components/ui/badge";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Plus, Eye, Edit, Users} from "lucide-react";
import Link from "next/link";
import {useSelector} from "react-redux";
import {selectSelectedInstitution} from "@/store/auth/selectors";

interface IProjectDocument {
  id: number;
  project: number;
  document: File;
}

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

interface IProjectTaskDocument {
  id: number;
  task: number;
  document: File;
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

interface ITaskTimeSheet {
  id: number;
  task: number;
  start_time: string;
  end_time: string;
  notes: string;
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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<IProject[]>([]);
  const [loading, setLoading] = useState(true);
  const selectedInstitution = useSelector(selectSelectedInstitution);

  const institutionId = selectedInstitution?.id;

  const fetchProjects = async () => {
    try {
      const response = await apiGet(`/projects/projects/${institutionId}`);
      setProjects(response.data.results);
    } catch (error) {
      console.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="text-lg">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Manage and track all your projects</p>
        </div>
        <Link href="/projects/add">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Leaders</TableHead>
                <TableHead>Tasks</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell className="font-medium">{project.project_name}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(project.project_status)}>
                      {project.project_status.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(project.start_date).toLocaleDateString()}</TableCell>
                  <TableCell>{new Date(project.end_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {project.leaders.length}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{project.project_tasks.length} tasks</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/projects/${project.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Link href={`/projects/edit/${project.id}`}>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
