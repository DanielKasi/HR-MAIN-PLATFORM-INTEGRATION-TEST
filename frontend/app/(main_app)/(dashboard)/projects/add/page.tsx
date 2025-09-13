"use client";

import React, {useState, useEffect} from "react";
import {useRouter} from "next/navigation";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";

import {ArrowLeft, Save, Calendar, FileText, Settings, Users, Target, X} from "lucide-react";
import Link from "next/link";
import {useSelector} from "react-redux";
import {selectSelectedInstitution} from "@/store/auth/selectors";

import {cn, PROJECTS_API, showErrorToast} from "@/lib/utils";

import {IProjectFormData} from "@/types/types.utils";

import UserProfileSearchableSelect from "@/components/selects/user-profile-searchable-select";
import {toast} from "sonner";

export default function AddProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof typeof formData, string>>>({});

  const currentInstitution = useSelector(selectSelectedInstitution);

  const MAX_DATE_TODAY = new Date().toISOString().split("T")[0];
  const Date18YearsOld = new Date();
  Date18YearsOld.setFullYear(new Date().getFullYear() - 18);
  const MAX_DATE_18 = Date18YearsOld.toISOString().split("T")[0];

  const [formData, setFormData] = useState<IProjectFormData>({
    project_name: "",
    description: "",
    start_date: "",
    end_date: "",
    project_status: "planning" as const,
    institution: 0,
    leaders: [],
    members: [],
  });

  useEffect(() => {
    if (currentInstitution) {
      setFormData((prev) => ({...prev, institution: currentInstitution.id}));
    }
  }, [currentInstitution]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInstitution) {
      return;
    }

    const newErrors: Partial<Record<keyof typeof formData, string>> = {};
    if (formData.leaders.length === 0) {
      newErrors.leaders = "This field is required.";
    }
    if (formData.members.length === 0) {
      newErrors.members = "This field is required.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      await PROJECTS_API.create({institutionId: currentInstitution.id, data: formData});
      toast.success("Project created successfully !");
      router.push("/projects");
    } catch (error) {
      showErrorToast({error, defaultMessage: "Error creating project"});
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string | number[]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
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
        [field]: "",
      }));
    }
  };

  return (
    <div className="min-h-screen p-6 bg-white rounded-xl">
      <div className="">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-start gap-4 mb-2">
            <Link href="/projects">
              <Button variant="outline" size="sm" className="rounded-full !aspect-square">
                <ArrowLeft className="h-4 w-4 " />
              </Button>
            </Link>
            <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
              Create New Project
            </h1>
          </div>
          <p className="text-slate-600 text-lg">
            Set up your project with all the necessary details
          </p>
        </div>

        {/* Form */}
        <div className="">
          <form onSubmit={handleSubmit} className="space-y-6">
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
                  rows={4}
                  className="rounded-xl resize-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="start_date" className="text-base font-medium">
                    Start Date *
                  </Label>
                  <Input
                    id="start_date"
                    type="date"
                    max={MAX_DATE_TODAY}
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
                    min={MAX_DATE_TODAY}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              {/* Leaders Selection */}
              <div className="">
                <Label className={`text-base font-medium ${errors.leaders ? "mb-3" : ""}`}>
                  Project Leaders *
                </Label>
                {errors.leaders && <p className="text-sm text-red-600">{errors.leaders}</p>}
                <UserProfileSearchableSelect
                  value={formData.leaders}
                  onValueChange={(values) => {
                    handleInputChange(
                      "leaders",
                      values.map((val) => Number(val)),
                    );
                  }}
                  placeholder="Select project leaders"
                  showEmployeeId={false}
                  showDepartment={true}
                  multiple={true}
                />
              </div>

              <div className="">
                <Label className={`text-base font-medium ${errors.members ? "mb-4" : ""}`}>
                  Project Members *
                </Label>
                {errors.members && <p className="text-sm text-red-600">{errors.members}</p>}
                <UserProfileSearchableSelect
                  value={formData.members}
                  onValueChange={(values) => {
                    handleInputChange(
                      "members",
                      values.map((val) => Number(val)),
                    );
                  }}
                  placeholder="Select project members"
                  showEmployeeId={false}
                  showDepartment={true}
                  multiple={true}
                />
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Button type="submit" className="px-8 md:px-24 rounded-full" disabled={loading}>
                {loading ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
