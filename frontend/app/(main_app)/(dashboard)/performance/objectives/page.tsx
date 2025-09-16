"use client";

import {useState, useEffect} from "react";
import {useSelector} from "react-redux";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import {OBJECTIVES_API} from "@/lib/utils";
import type {IObjective, IObjectiveFormData} from "@/types/types.utils";
import {ObjectivesTable} from "@/components/performance/objectives/objectives-table";
import {ObjectiveModal} from "@/components/performance/objectives/objective-modal";
import {PerformanceStatsCard} from "@/components/performance/common/performance-stats-card";
import {Button} from "@/components/ui/button";
import {toast} from "sonner";
import {Target, Users, CheckCircle, ArrowLeft} from "lucide-react";
import Link from "next/link";
import {ConfirmationDialog} from "@/components/confirmation-dialog";

export default function ObjectivesPage() {
  const [objectives, setObjectives] = useState<IObjective[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<IObjective | undefined>();
  const [objectiveToDelete, setObjectiveToDelete] = useState<IObjective | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const currentInstitution = useSelector(selectSelectedInstitution);

  const fetchObjectives = async () => {
    if (!currentInstitution) return;

    setLoading(true);
    try {
      const response = await OBJECTIVES_API.getPaginated({
        search: searchQuery || undefined,
      });
      setObjectives(response.results);
    } catch (error) {
      toast.error("Failed to fetch objectives");
      console.error("Error fetching objectives:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObjectives();
  }, [currentInstitution, searchQuery]);

  const handleCreate = () => {
    setEditingObjective(undefined);
    setModalOpen(true);
  };

  const handleEdit = (objective: IObjective) => {
    setEditingObjective(objective);
    setModalOpen(true);
  };

  const handleSubmit = async (data: IObjectiveFormData) => {
    setSubmitting(true);
    try {
      if (editingObjective) {
        await OBJECTIVES_API.update({objectiveId: editingObjective.id, data});
        toast.success("Objective updated successfully");
      } else {
        await OBJECTIVES_API.create({data});
        toast.success("Objective created successfully");
      }

      setModalOpen(false);
      fetchObjectives();
    } catch (error: any) {
      toast.error(error.message || "Failed to save objective");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (objective: IObjective) => {
    if (!objectiveToDelete) return;

    try {
      await OBJECTIVES_API.delete({objectiveId: objective.id});
      toast.success("Objective deleted successfully");
      fetchObjectives();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete objective");
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };


  const totalObjectives = objectives.length;
  const withManagers = objectives.filter((o) => o.managers).length;
  const withAssignees = objectives.filter((o) => o.assignees).length;
  const withKeyResults = objectives.filter((o) => o.key_result).length;

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
                Objectives
              </h1>
              <p className="text-slate-600 text-lg">
                Define and manage performance objectives and goals
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <PerformanceStatsCard
            title="Total Objectives"
            value={totalObjectives}
            icon={<Target className="h-5 w-5" />}
            description="All objectives"
          />
          <PerformanceStatsCard
            title="With Managers"
            value={withManagers}
            icon={<Users className="h-5 w-5" />}
            description="Have assigned managers"
          />
          <PerformanceStatsCard
            title="With Assignees"
            value={withAssignees}
            icon={<Users className="h-5 w-5" />}
            description="Have assigned employees"
          />
          <PerformanceStatsCard
            title="With Key Results"
            value={withKeyResults}
            icon={<CheckCircle className="h-5 w-5" />}
            description="Linked to key results"
          />
        </div>

        {/* Objectives Table */}
        <ObjectivesTable
          objectives={objectives}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAdd={handleCreate}
          onSearch={handleSearch}
          isLoading={loading}
        />

        {/* Objective Modal */}
        <ObjectiveModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          objective={editingObjective}
          onSubmit={handleSubmit}
          isLoading={submitting}
        />
        {objectiveToDelete && (
          <ConfirmationDialog
            description="Are you sure you want to delete this objective? This action cannot be undone."
            isOpen={!!objectiveToDelete}
            title={`Delete objective ${objectiveToDelete.name}?`}
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
