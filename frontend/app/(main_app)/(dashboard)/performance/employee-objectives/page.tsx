"use client";

import {useState, useEffect} from "react";
import {useSelector} from "react-redux";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import {EMPLOYEE_OBJECTIVES_API, showErrorToast} from "@/lib/utils";
import type {IEmployeeObjective, IEmployeeObjectiveFormData} from "@/types/types.utils";
import {EmployeeObjectivesTable} from "@/components/performance/employee-objectives/employee-objective-table";
import {EmployeeObjectiveModal} from "@/components/performance/employee-objectives/employee-objective-modal";
import {PerformanceStatsCard} from "@/components/performance/common/performance-stats-card";
import {Button} from "@/components/ui/button";
import {toast} from "sonner";
import {Users, Target, TrendingUp, AlertTriangle, ArrowLeft} from "lucide-react";
import Link from "next/link";
import {ConfirmationDialog} from "@/components/confirmation-dialog";

export default function EmployeeObjectivesPage() {
  const [employeeObjectives, setEmployeeObjectives] = useState<IEmployeeObjective[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployeeObjective, setEditingEmployeeObjective] = useState<
    IEmployeeObjective | undefined
  >();
  const [objectiveToDelete, setObjectiveToDelete] = useState<IEmployeeObjective | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const currentInstitution = useSelector(selectSelectedInstitution);

  const fetchEmployeeObjectives = async () => {
    if (!currentInstitution) return;

    setLoading(true);
    try {
      const response = await EMPLOYEE_OBJECTIVES_API.getPaginated({
        search: searchQuery || undefined,
      });
      setEmployeeObjectives(response.results);
    } catch (error) {
      toast.error("Failed to fetch employee objectives");
      console.error("Error fetching employee objectives:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeObjectives();
  }, [currentInstitution, searchQuery]);

  const handleCreate = () => {
    setEditingEmployeeObjective(undefined);
    setModalOpen(true);
  };

  const handleEdit = (employeeObjective: IEmployeeObjective) => {
    setEditingEmployeeObjective(employeeObjective);
    setModalOpen(true);
  };

  const handleSubmit = async (data: IEmployeeObjectiveFormData) => {
    setSubmitting(true);
    try {
      if (editingEmployeeObjective) {
        await EMPLOYEE_OBJECTIVES_API.update({objectiveId: editingEmployeeObjective.id, data});
        toast.success("Objective assignment updated successfully");
      } else {
        await EMPLOYEE_OBJECTIVES_API.create({data});
        toast.success("Objective assigned successfully");
      }

      setModalOpen(false);
      fetchEmployeeObjectives();
    } catch (error: any) {
      toast.error(error.message || "Failed to save objective assignment");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (employeeObjective: IEmployeeObjective) => {
    if (!objectiveToDelete) return;

    try {
      await EMPLOYEE_OBJECTIVES_API.delete({objectiveId: employeeObjective.id});
      toast.success("Objective assignment removed successfully");
      fetchEmployeeObjectives();
    } catch (error: any) {
      showErrorToast({error, defaultMessage: "Failed to remove objective assignment"});
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // Calculate stats
  const totalAssignments = employeeObjectives.length;
  const onTrack = employeeObjectives.filter((eo) => eo.status === "on_track").length;
  const atRisk = employeeObjectives.filter(
    (eo) => eo.status === "at_risk" || eo.status === "behind",
  ).length;
  const completed = employeeObjectives.filter((eo) => eo.status === "closed").length;

  return (
    <div className="min-h-screen p-6 bg-white">
      <div className="">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/performance">
              <Button
                variant="outline"
                size="sm"
                className="rounded-full aspect-square p-0 w-10 h-10 bg-transparent"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
                Employee Objectives
              </h1>
              <p className="text-slate-600 text-lg">
                Assign and track individual employee objectives
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <PerformanceStatsCard
            title="Total Assignments"
            value={totalAssignments}
            icon={<Users className="h-5 w-5" />}
            description="Active assignments"
          />
          <PerformanceStatsCard
            title="On Track"
            value={onTrack}
            icon={<TrendingUp className="h-5 w-5" />}
            description="Progressing well"
          />
          <PerformanceStatsCard
            title="At Risk"
            value={atRisk}
            icon={<AlertTriangle className="h-5 w-5" />}
            description="Need attention"
          />
          <PerformanceStatsCard
            title="Completed"
            value={completed}
            icon={<Target className="h-5 w-5" />}
            description="Successfully closed"
          />
        </div>

        {/* Employee Objectives Table */}
        <EmployeeObjectivesTable
          employeeObjectives={employeeObjectives}
          onEdit={handleEdit}
          onDelete={setObjectiveToDelete}
          onAdd={handleCreate}
          onSearch={handleSearch}
          isLoading={loading}
        />

        {/* Employee Objective Modal */}
        <EmployeeObjectiveModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          employeeObjective={editingEmployeeObjective}
          onSubmit={handleSubmit}
          isLoading={submitting}
        />
        {objectiveToDelete && (
          <ConfirmationDialog
            description="Are you sure you want to delete this employee objective? This action cannot be undone."
            isOpen={!!objectiveToDelete}
            title={`Delete objective ${objectiveToDelete.objective.name} on ${objectiveToDelete.employee.user?.fullname}`}
            onConfirm={() => handleDelete(objectiveToDelete)}
            onClose={() => {
              setObjectiveToDelete(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
