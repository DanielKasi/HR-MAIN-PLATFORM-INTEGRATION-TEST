"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { PERIODS_API } from "@/lib/utils";
import type { IPeriod, IPeriodFormData } from "@/types/types.utils";
import { PeriodsTable } from "@/components/performance/periods/periods-table";
import { PeriodModal } from "@/components/performance/periods/period-modal";
import { PerformanceStatsCard } from "@/components/performance/common/performance-stats-card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Calendar, Clock, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

export default function PeriodsPage() {
	const [periods, setPeriods] = useState<IPeriod[]>([]);
	const [loading, setLoading] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const [editingPeriod, setEditingPeriod] = useState<IPeriod | undefined>();
	const [periodToDelete, setPeriodToDelete] = useState<IPeriod | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");

	const currentInstitution = useSelector(selectSelectedInstitution);

	const fetchPeriods = async () => {
		if (!currentInstitution) return;

		setLoading(true);
		try {
			const response = await PERIODS_API.getPaginated({
				search: searchQuery || undefined,
			});
			setPeriods(response.results);
		} catch (error) {
			toast.error("Failed to fetch periods");
			console.error("Error fetching periods:", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchPeriods();
	}, [currentInstitution, searchQuery]);

	const handleCreate = () => {
		setEditingPeriod(undefined);
		setModalOpen(true);
	};

	const handleEdit = (period: IPeriod) => {
		setEditingPeriod(period);
		setModalOpen(true);
	};

	const handleSubmit = async (data: IPeriodFormData) => {
		setSubmitting(true);
		try {
			if (editingPeriod) {
				await PERIODS_API.update({ periodId: editingPeriod.id, data });
				toast.success("Period updated successfully");
			} else {
				await PERIODS_API.create({ data });
				toast.success("Period created successfully");
			}

			setModalOpen(false);
			fetchPeriods();
		} catch (error: any) {
			toast.error(error.message || "Failed to save period");
		} finally {
			setSubmitting(false);
		}
	};

	const handleDelete = async (period: IPeriod) => {
		if (!periodToDelete) {
			return;
		}

		try {
			await PERIODS_API.delete({ periodId: period.id });
			toast.success("Period deleted successfully");
			fetchPeriods();
		} catch (error: any) {
			toast.error(error.message || "Failed to delete period");
		}
	};

	const handleSearch = (query: string) => {
		setSearchQuery(query);
	};

	// Calculate stats
	const totalPeriods = periods.length;
	const activePeriods = periods.filter((p) => !p.is_closed).length;
	const closedPeriods = periods.filter((p) => p.is_closed).length;
	const currentPeriods = periods.filter((p) => {
		const now = new Date();
		const start = new Date(p.start_date);
		const end = new Date(p.end_date);
		return now >= start && now <= end && !p.is_closed;
	}).length;

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
								Performance Periods
							</h1>
							<p className="text-slate-600 text-lg">
								Manage performance review cycles and evaluation periods
							</p>
						</div>
					</div>
				</div>

				{/* Stats Cards */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
					<PerformanceStatsCard
						title="Total Periods"
						value={totalPeriods}
						icon={<Calendar className="h-5 w-5" />}
						description="All time"
					/>
					<PerformanceStatsCard
						title="Active Periods"
						value={activePeriods}
						icon={<Clock className="h-5 w-5" />}
						description="Currently open"
					/>
					<PerformanceStatsCard
						title="Current Periods"
						value={currentPeriods}
						icon={<CheckCircle className="h-5 w-5" />}
						description="In progress now"
					/>
					<PerformanceStatsCard
						title="Closed Periods"
						value={closedPeriods}
						icon={<XCircle className="h-5 w-5" />}
						description="Completed"
					/>
				</div>

				{/* Periods Table */}
				<PeriodsTable
					periods={periods}
					onEdit={handleEdit}
					onDelete={handleDelete}
					onAdd={handleCreate}
					onSearch={handleSearch}
					isLoading={loading}
				/>

				{/* Period Modal */}
				<PeriodModal
					isOpen={modalOpen}
					onClose={() => setModalOpen(false)}
					period={editingPeriod}
					onSubmit={handleSubmit}
					isLoading={submitting}
				/>
				{periodToDelete && (
					<ConfirmationDialog
						description="Are you sure you want to delete this period? This action cannot be undone."
						isOpen={!!periodToDelete}
						title={`Delete period ${periodToDelete.name}?`}
						onConfirm={() => handleDelete(periodToDelete)}
						onClose={() => {
							setPeriodToDelete(null);
						}}
					/>
				)}
			</div>
		</div>
	);
}
