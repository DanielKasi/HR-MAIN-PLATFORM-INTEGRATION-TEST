"use client";

import { useEffect, useRef, useState } from "react";
import type { UserProfile } from "@/types";
import { PERMISSION_CODES } from "@/constants";
import ProtectedComponent from "@/components/ProtectedComponent";
import { apiGet } from "@/lib/apiRequest";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Users,
  Target,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Pause,
  XCircle,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  MoreVertical,
} from "lucide-react";
import Link from "next/link";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { PROJECTS_API, showErrorToast } from "@/lib/utils";
import { ColumnDef, PaginatedTable } from "@/components/common/tables/paginated-table";
import { Icon } from "@iconify/react"
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { toast } from "sonner";

interface IProjectTask {
  id: number;
  project: number;
  task_name: string;
  description: string;
  managers: UserProfile[];
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
  managers: UserProfile[];
  assignees: UserProfile[];
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

const getStatusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    case "in_progress":
      return <Clock className="h-4 w-4 text-blue-600" />;
    case "planning":
      return <Target className="h-4 w-4 text-yellow-600" />;
    case "on_hold":
      return <Pause className="h-4 w-4 text-myOrange" />;
    case "cancelled":
      return <XCircle className="h-4 w-4 text-red-600" />;
    default:
      return <AlertCircle className="h-4 w-4 text-gray-600" />;
  }
};

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

export default function ProjectsPage() {
  // const [projects, setProjects] = useState<IProject[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const currentInstitution = useSelector(selectSelectedInstitution);
  const [ordering, setOrdering] = useState("");
  const tableRefreshRef = useRef<(() => void) | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<IProject | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);


  const columns: ColumnDef<IProject>[] = [
    {
      key: "name",
      header: (
        <div className="flex items-center justify-start gap-4">
          <span>Name</span>
        </div>
      ),
      cell: (project) => project.project_name || "N/A",
    },
    {
      key: "email",
      header: (
        <div className="flex items-center justify-start gap-4">
          <span>Leaders</span>
          <Button
            onClick={() => {
              setOrdering((prev) => (prev === "email" ? "" : "email"));
            }}
            size="sm"
            variant={ordering === "email" ? "default" : "outline"}
            type="button"
          >
            <Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
          </Button>
        </div>
      ),
      cell: (project) => <Badge>
        {project.managers.length}
      </Badge>
    },
    {
      key: "assignees",
      header: (
        <div className="flex items-center justify-start gap-4">
          <span>Members</span>
          <Button
            onClick={() => {
              setOrdering((prev) => (prev === "assignees" ? "" : "assignees"));
            }}
            size="sm"
            variant={ordering === "assignees" ? "default" : "outline"}
            type="button"
          >
            <Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
          </Button>
        </div>
      ),
      cell: (project) => <Badge>
        {project.assignees.length}
      </Badge>
    },
    {
      key: "start_date",
      header: (
        <div className="flex items-center justify-start gap-4">
          <span>Start Date</span>
          <Button
            onClick={() => {
              setOrdering((prev) => (prev === "end_date" ? "" : "end_date"));
            }}
            size="sm"
            variant={ordering === "end_date" ? "default" : "outline"}
            type="button"
          >
            <Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
          </Button>
        </div>
      ),
      cell: (project) => project.start_date,
    },
    {
      key: "end_date",
      header: (
        <div className="flex items-center justify-start gap-4">
          <span>End Date</span>
          <Button
            onClick={() => {
              setOrdering((prev) => (prev === "end_date" ? "" : "end_date"));
            }}
            size="sm"
            variant={ordering === "end_date" ? "default" : "outline"}
            type="button"
          >
            <Icon icon="hugeicons:sorting-02" className="!h-4 !w-4" />
          </Button>
        </div>
      ),
      cell: (project) => project.end_date,
    },
    {
      key: "status",
      header: "Status",
      cell: (project) => <Badge variant={"secondary"} className="capitalize">{project.project_status.replace("_", " ")}</Badge>
    },
    {
      key: "actions",
      header: "Actions",
      cell: (project) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem className="p-0">
              <Link
                className="text-xs flex items-center justify-start w-full h-full px-2 py-1.5"
                href={`projects/${project.id}/`}
              >
                <Eye className="h-4 w-4 mr-2" /> View Details
              </Link>
            </DropdownMenuItem>
            <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_EMPLOYEES}>
              <DropdownMenuItem className="p-0">
                <Link
                  className="text-xs flex items-center justify-start w-full h-full px-2 py-1.5"
                  href={`projects/edit/${project.id}`}
                >
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </Link>
              </DropdownMenuItem>
            </ProtectedComponent>
            <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_DELETE_EMPLOYEES}>
              <DropdownMenuItem
                onClick={() => setProjectToDelete(project)}
                className="text-red-600 p-0"
              >
                <span className="text-red-600 hover:text-red-700 text-xs w-full h-full px-2 py-1.5 flex items-center">
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </span>
              </DropdownMenuItem>
            </ProtectedComponent>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const handleDelete = async () => {
    if (!currentInstitution) {
      toast.error("No institution selected");
      return;
    }
    if (!projectToDelete) {
      toast.error("No employee to delete!");
      return;
    }
    try {
      await PROJECTS_API.delete({ project_id: projectToDelete.id });
      tableRefreshRef.current?.();
      toast.success("Employee deleted successfully");
    } catch (error: unknown) {
      showErrorToast({ error, defaultMessage: "Failed to delete employee" });
    } finally {
      setProjectToDelete(null);
    }
  };

  return (
    <div className="min-h-screen bg-white p-4 rounded-xl">
      <div className="max-w-full mx-auto space-y-8">
        {/* Header Section */}
        <div>
          <div className="flex items-center justify-between gap-8">
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              Projects
            </h1>
            <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_CREATE_PROJECTS}>
              <Link href="/projects/add">
                <Button className="rounded-xl">
                  <Plus className="mr-2 h-5 w-5" />
                  Create Project
                </Button>
              </Link>
            </ProtectedComponent>
          </div>
          <p className="text-slate-600 text-lg">
            Manage and track all your projects in one place
          </p>

        </div>


        {/* Search and Filter */}

        <div className="!py-6 !w-full">
          <div className="flex flex-col md:flex-row md:items-center gap-4 w-full">
            <div className="relative w-full max-w-md md:max-w-lg lg:max-w-2xl xl:maw-w-3xl">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
              <Input
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 !w-full"
              />
            </div>
            
          </div>
        </div>

        {/* Projects Grid */}
        <ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_PROJECTS}>


          <>
            <PaginatedTable<IProject>
              fetchFirstPage={async () => {
                if (!currentInstitution) throw new Error("No institution selected");
                return await PROJECTS_API.getPaginatedProjects({
                  institutionId: currentInstitution.id,
                  page: 1,
                  ordering,
                  search: searchTerm || undefined,
                });
              }}
              fetchFromUrl={PROJECTS_API.getPaginatedProjectsFromUrl}
              deps={[currentInstitution?.id, searchTerm, ordering]}
              query={searchTerm}
              onError={(err) => showErrorToast({ error: err, defaultMessage: "Failed to fetch projects" })}
              className="space-y-4"
              tableClassName="min-w-[800px]"
              footerClassName="pt-4"
              columns={columns}
              skeletonRows={10}
              refreshRef={tableRefreshRef}
              emptyState={
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No employees found</p>
                </div>
              } />
          </>
        </ProtectedComponent>



        {projectToDelete && (
          <ConfirmationDialog
            description="Are you sure you want to delete this project? This action cannot be undone."
            disabled={isDeleting}
            isOpen={!!projectToDelete}
            title={`Delete ${projectToDelete.project_name}`}
            onConfirm={() => handleDelete}
            onClose={() => {
              setProjectToDelete(null)
              setIsDeleting(false)
            }}
          />
        )}

      </div>
    </div>
  );
}
