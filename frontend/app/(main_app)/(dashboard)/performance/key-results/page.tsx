"use client";

import type { IKeyResult, IKeyResultFormData } from "@/types/types.utils";

import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { Target, Percent, TrendingUp, CheckCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { selectSelectedInstitution } from "@/store/auth/selectors";
import { KEY_RESULTS_API } from "@/lib/utils";
import { KeyResultsTable } from "@/components/performance/key-results/key-results-tabe";
import { KeyResultModal } from "@/components/performance/key-results/key-results-modal";
import { PerformanceStatsCard } from "@/components/performance/common/performance-stats-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationDialog } from "@/components/confirmation-dialog";

export default function KeyResultsPage() {
	const [keyResults, setKeyResults] = useState<IKeyResult[]>([]);
	const [loading, setLoading] = useState(true);
	const [modalOpen, setModalOpen] = useState(false);
	const [editingKeyResult, setEditingKeyResult] = useState<IKeyResult | undefined>();
	const [keyResultToDelete, setKeyResultToDelete] = useState<IKeyResult | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const tableRefreshRef = useRef<(() => void) | null>(null);

	const currentInstitution = useSelector(selectSelectedInstitution);

	const fetchKeyResults = async () => {
		if (!currentInstitution) return;

		setLoading(true);
		try {
			const response = await KEY_RESULTS_API.getPaginated({
				search: searchQuery || undefined,
			});
			setKeyResults(response.results);
		} catch (error) {
			toast.error("Failed to fetch key results");
			console.error("Error fetching key results:", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchKeyResults();
	}, [currentInstitution, searchQuery]);

	const handleCreate = () => {
		setEditingKeyResult(undefined);
		setModalOpen(true);
	};

	const handleEdit = (keyResult: IKeyResult) => {
		setEditingKeyResult(keyResult);
		setModalOpen(true);
	};

	const handleSubmit = async (data: IKeyResultFormData) => {
		setSubmitting(true);
		try {
			if (editingKeyResult) {
				await KEY_RESULTS_API.update({
					keyResultId: editingKeyResult.id,
					data: {
						title: data.title,
						description: data.description,
						progress_type: data.progress_type,
						target_value: data.target_value,
					},
				});
				toast.success("Key result updated successfully");
			} else {
				await KEY_RESULTS_API.create({ data });
				toast.success("Key result created successfully");
			}
			setModalOpen(false);
			setEditingKeyResult(undefined);
			tableRefreshRef.current?.();
		} catch (error: any) {
			toast.error(error.message || "Failed to save key result");
		} finally {
			setSubmitting(false);
		}
	};

	const handleDelete = async (keyResult: IKeyResult) => {
		if (!keyResultToDelete) return;

		try {
			await KEY_RESULTS_API.delete({ keyResultId: keyResult.id });
			toast.success("Key result deleted successfully");
			tableRefreshRef.current?.();
		} catch (error: any) {
			toast.error(error.message || "Failed to delete key result");
		} finally {
			setKeyResultToDelete(null);
		}
	};

	const handleSearch = (query: string) => {
		setSearchQuery(query);
	};

	// Calculate stats
	const totalKeyResults = keyResults.length;
	const percentageKeyResults = keyResults.filter((kr) => kr.progress_type === "percentage").length;
	const numberKeyResults = keyResults.filter((kr) => kr.progress_type === "number").length;
	const trackedKeyResults = keyResults.filter(
		(kr) => kr.target_value !== undefined && kr.target_value > 0,
	).length;

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
								Key Results
							</h1>
							<p className="text-slate-600 text-lg">Track and manage performance key results</p>
						</div>
					</div>
				</div>

				{/* Stats Cards */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
					<PerformanceStatsCard
						title="Total Key Results"
						value={totalKeyResults}
						icon={<Target className="h-5 w-5" />}
						description="All key results"
					/>
					<PerformanceStatsCard
						title="Percentage Type"
						value={percentageKeyResults}
						icon={<Percent className="h-5 w-5" />}
						description="Percentage-based tracking"
					/>
					<PerformanceStatsCard
						title="Number Type"
						value={numberKeyResults}
						icon={<TrendingUp className="h-5 w-5" />}
						description="Numeric tracking"
					/>
					<PerformanceStatsCard
						title="Tracked"
						value={trackedKeyResults}
						icon={<CheckCircle className="h-5 w-5" />}
						description="With current values"
					/>
				</div>

				<div className="flex justify-start">
					<Input
						type="text"
						placeholder="Search key results..."
						value={searchQuery}
						onChange={(e) => handleSearch(e.target.value)}
						className="max-w-sm md:max-w-lg lg:max-w-xl rounded-xl"
					/>
				</div>

				{/* Key Results Table */}
				<KeyResultsTable
					refreshFunctionRef={tableRefreshRef}
					searchTerm={searchQuery}
					onEdit={handleEdit}
					onDelete={handleDelete}
					onAdd={handleCreate}
				/>

				{/* Key Result Modal */}
				<KeyResultModal
					isOpen={modalOpen}
					onClose={() => setModalOpen(false)}
					keyResult={editingKeyResult}
					onSubmit={handleSubmit}
					isLoading={submitting}
				/>
				{keyResultToDelete && (
					<ConfirmationDialog
						isOpen={!!keyResultToDelete}
						onClose={() => setKeyResultToDelete(null)}
						onConfirm={() => handleDelete(keyResultToDelete)}
						title={`Delete Key Result`}
						description={`Are you sure you want to delete the key result "${keyResultToDelete.title}"? This action cannot be undone.`}
						confirmText="Delete"
						cancelText="Cancel"
					/>
				)}
			</div>
		</div>
	);
}
