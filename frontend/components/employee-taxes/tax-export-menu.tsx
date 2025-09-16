"use client";

import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IEmployeeTax } from "@/types/types.utils";

interface TaxExportMenuProps {
	taxes: IEmployeeTax[];
	disabled?: boolean;
}

export function TaxExportMenu({ taxes, disabled = false }: TaxExportMenuProps) {
	const exportToCSV = () => {
		const headers = [
			"Employee Name",
			"Employee Email",
			"Tax Type",
			"Status",
			"Effective From",
			"Effective To",
			"Created Date",
		];

		const csvData = taxes.map((tax) => [
			tax.employee.user?.fullname || "Unknown",
			tax.employee.email,
			tax.institution_tax.tax_name,
			getStatusText(tax),
			formatDate(tax.effective_from),
			tax.effective_to ? formatDate(tax.effective_to) : "No end date",
			formatDate(tax.created_at),
		]);

		const csvContent = [
			headers.join(","),
			...csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
		].join("\n");

		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const link = document.createElement("a");
		const url = URL.createObjectURL(blob);
		link.setAttribute("href", url);
		link.setAttribute("download", `employee_taxes_${new Date().toISOString().split("T")[0]}.csv`);
		link.style.visibility = "hidden";
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	};

	const exportToPDF = () => {
		// This would typically use a PDF library like jsPDF
		// For now, we'll just show an alert
		alert("PDF export functionality would be implemented here");
	};

	const getStatusText = (tax: IEmployeeTax) => {
		const now = new Date();
		const effectiveFrom = new Date(tax.effective_from);
		const effectiveTo = tax.effective_to ? new Date(tax.effective_to) : null;

		if (effectiveFrom > now) {
			return "Upcoming";
		}

		if (effectiveTo && effectiveTo < now) {
			return "Expired";
		}

		return "Active";
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" disabled={disabled}>
					<Download className="h-4 w-4 mr-2" />
					Export
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={exportToCSV}>
					<FileSpreadsheet className="h-4 w-4 mr-2" />
					Export as CSV
				</DropdownMenuItem>
				<DropdownMenuItem onClick={exportToPDF}>
					<FileText className="h-4 w-4 mr-2" />
					Export as PDF
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
