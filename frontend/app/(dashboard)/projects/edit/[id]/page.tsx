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
import {ArrowLeft, Save, Calendar, FileText, Settings, AlertTriangle} from "lucide-react";
import Link from "next/link";
import {Badge} from "@/components/ui/badge";

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
}

export default function EditProjectPage() {
  const params = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalData, setOriginalData] = useState<any>(null);

  const [formData, setFormData] = useState({
    project_name: "",
    description: "",
    start_date: "",
    end_date: "",
    project_status: "planning" as const,
    institution: 1,
  });

  const fetchProject = async () => {
    try {
      const response = await apiGet(`projects/projects/${params.id}/details`);
      const project = response.data;
      const projectData = {
        project_name: project.project_name,
        description: project.description,
        start_date: project.start_date.split("T")[0],
        end_date: project.end_date.split("T")[0],
        project_status: project.project_status,
        institution: project.institution,
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
    setLoading(true);

    try {
      console.log("Updating project:", formData);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      router.push(`/projects/${params.id}`);
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
  };

  const handleReset = () => {
    if (originalData) {
      setFormData(originalData);
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
            <Button variant="outline" size="sm" className="shadow-sm">
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
                <AlertTriangle className="h-5 w-5 text-orange-600" />
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
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  Reset Changes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-slate-900">Project Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="project_name" className="text-base font-medium">
                      Project Name *
                    </Label>
                    <Input
                      id="project_name"
                      value={formData.project_name}
                      onChange={(e) => handleInputChange("project_name", e.target.value)}
                      placeholder="Enter project name"
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
                      placeholder="Describe your project..."
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
                        <SelectItem value="planning">Planning</SelectItem>
                        <SelectItem value="not_started">Not Started</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-4 pt-6 border-t border-slate-200">
                    <Button type="submit" disabled={loading || !hasChanges}>
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? "Updating..." : "Save Changes"}
                    </Button>
                    <Link href={`/projects/${params.id}`}>
                      <Button variant="outline" type="button" className="shadow-sm">
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
            {/* Project Summary */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Project Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Current Status</span>
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                      {formData.project_status.replace("_", " ")}
                    </Badge>
                  </div>

                  {formData.start_date && formData.end_date && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600 text-sm">Duration</span>
                      <span className="font-medium text-slate-900">{getDurationDays()} days</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 text-sm">Last Modified</span>
                    <span className="font-medium text-slate-900">Today</span>
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
                        <p className="text-sm font-medium text-red-800">End Date</p>
                        <p className="text-xs text-red-700">
                          {new Date(formData.end_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Help Card */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Settings className="h-5 w-5" />
                  Need Help?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-blue-800 text-sm mb-3">
                  Make sure to update your project status as work progresses to keep your team
                  informed.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                >
                  View Documentation
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
