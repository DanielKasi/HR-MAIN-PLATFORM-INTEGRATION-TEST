"use client";

import { useState, useEffect } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IReportableModels } from "@/types/reports.types";
import { REPORTS_API } from "@/lib/api/reports.utils";
import { replaceUnderscore } from "@/lib/helpers";
import { DialogSkeleton } from "./dialog-skeleton";

interface ReportDialogProps {
	isOpen: boolean;
	onClose: () => void;
	app: string;
}

export function ReportDialog({ isOpen, onClose, app }: ReportDialogProps) {
	const [reportableModels, setReportableModels] = useState<IReportableModels>({ report_types: [] });
	const [selectedReportType, setSelectedReportType] = useState("");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [format, setFormat] = useState<"pdf" | "excel">("pdf");

	useEffect(() => {
		if (isOpen) {
			fetchReportableModels();
		}
	}, [isOpen, app]);

	const fetchReportableModels = async () => {
		try {
			const response = await REPORTS_API.getReportableModels({ app });
			setReportableModels(response);
			if (response.report_types.length > 0) {
				setSelectedReportType(response.report_types[0]);
			}
		} catch (error) {
			// Error handling can be added here if needed (e.g., toast)
		}
	};

	const handleDownload = () => {
		if (!selectedReportType || !startDate || !endDate) {
			return;
		}

		REPORTS_API.downloadReport({
			app,
			start_date: startDate,
			end_date: endDate,
			report_type: selectedReportType,
			format_type: format,
		}).catch(() => {
			// Error is already handled in downloadReport with toast; prevent uncaught rejection
		});

		onClose();
	};

	const confirmDisabled = !selectedReportType || !startDate || !endDate;

	return (
		<DialogSkeleton
			isOpen={isOpen}
			onClose={onClose}
			title="Generate Report"
			onConfirm={handleDownload}
			confirmText="Download Report"
			confirmDisabled={confirmDisabled}
			showActions={true}
		>
			<div className="space-y-4">
				<div>
					<Label htmlFor="report-type">Report Type</Label>
					<Select value={selectedReportType} onValueChange={setSelectedReportType}>
						<SelectTrigger className="rounded-xl" id="report-type">
							<SelectValue placeholder="Select report type" />
						</SelectTrigger>
						<SelectContent>
							{reportableModels.report_types.map((report_type, idx) => (
								<SelectItem key={idx} value={report_type}>
									{replaceUnderscore(report_type)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="grid grid-cols-2 gap-4">
					<div>
						<Label htmlFor="start-date">Start Date</Label>
						<Input
							id="start-date"
							type="date"
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
						/>
					</div>
					<div>
						<Label htmlFor="end-date">End Date</Label>
						<Input
							id="end-date"
							type="date"
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
						/>
					</div>
				</div>

				<div>
					<Label htmlFor="format">Format</Label>
					<Select value={format} onValueChange={(value) => setFormat(value as "pdf" | "excel")}>
						<SelectTrigger id="format">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="pdf">PDF</SelectItem>
							<SelectItem value="excel">Excel</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
		</DialogSkeleton>
	);
}
