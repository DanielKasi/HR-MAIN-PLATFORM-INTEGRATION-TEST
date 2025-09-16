"use client";

import { Download, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { toast } from "sonner";
import type { IEmployeeDeduction } from "@/types/types.utils";

interface DeductionExportMenuProps {
	deductions: IEmployeeDeduction[];
	getCalculatedAmount: (deduction: IEmployeeDeduction) => number;
	disabled?: boolean;
}

export function DeductionExportMenu({
	deductions,
	getCalculatedAmount,
	disabled = false,
}: DeductionExportMenuProps) {
	const exportToCSV = () => {
		const csvContent = [
			[
				"Employee",
				"Deduction Type",
				"Method",
				"Amount",
				"Percentage",
				"Calculated Amount",
				"Status",
				"Effective From",
				"Effective To",
			],
			...deductions.map((deduction) => [
				deduction.employee.user?.fullname,
				deduction.deduction_type.name,
				deduction.calculation_method,
				deduction.amount,
				deduction.percentage,
				getCalculatedAmount(deduction),
				deduction.is_active ? "Active" : "Inactive",
				format(new Date(deduction.effective_from), "yyyy-MM-dd"),
				deduction.effective_to ? format(new Date(deduction.effective_to), "yyyy-MM-dd") : "",
			]),
		]
			.map((row) => row.join(","))
			.join("\n");

		const blob = new Blob([csvContent], { type: "text/csv" });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "employee-deductions.csv";
		a.click();
		window.URL.revokeObjectURL(url);
	};

	const exportToExcel = () => {
		try {
			const excelData = deductions.map((deduction) => ({
				"Employee Name": deduction.employee.user?.fullname,
				"Employee Email": deduction.employee.email,
				"Deduction Type": deduction.deduction_type.name,
				"Calculation Method":
					deduction.calculation_method === "fixed" ? "Fixed Amount" : "Percentage",
				"Fixed Amount":
					deduction.calculation_method === "fixed" ? parseFloat(deduction.amount) : "",
				Percentage:
					deduction.calculation_method === "percentage" ? parseFloat(deduction.percentage) : "",
				"Calculated Amount": getCalculatedAmount(deduction),
				Status: deduction.is_active ? "Active" : "Inactive",
				"Effective From": format(new Date(deduction.effective_from), "yyyy-MM-dd"),
				"Effective To": deduction.effective_to
					? format(new Date(deduction.effective_to), "yyyy-MM-dd")
					: "",
				"Created Date": format(new Date(deduction.created_at), "yyyy-MM-dd"),
			}));

			const headers = Object.keys(excelData[0] || {});
			let htmlTable = '<table border="1"><thead><tr>';

			headers.forEach((header) => {
				htmlTable += `<th>${header}</th>`;
			});
			htmlTable += "</tr></thead><tbody>";

			excelData.forEach((row) => {
				htmlTable += "<tr>";
				headers.forEach((header) => {
					const value = row[header as keyof typeof row];
					htmlTable += `<td>${value}</td>`;
				});
				htmlTable += "</tr>";
			});
			htmlTable += "</tbody></table>";

			const excelContent = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office"
              xmlns:x="urn:schemas-microsoft-com:office:excel"
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8" />
          <!--[if gte mso 9]>
          <xml>
            <x:ExcelWorkbook>
              <x:ExcelWorksheets>
                <x:ExcelWorksheet>
                  <x:Name>Employee Deductions</x:Name>
                  <x:WorksheetSource HRef="sheet.htm"/>
                </x:ExcelWorksheet>
              </x:ExcelWorksheets>
            </x:ExcelWorkbook>
          </xml>
          <![endif]-->
        </head>
        <body>
          ${htmlTable}
        </body>
        </html>
      `;

			const blob = new Blob([excelContent], { type: "application/vnd.ms-excel" });
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `employee-deductions-${format(new Date(), "yyyy-MM-dd")}.xls`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			window.URL.revokeObjectURL(url);

			toast.success("Excel file downloaded successfully");
		} catch (error) {
			toast.error("Failed to export Excel file");
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					className="border-red-200 text-red-700 hover:bg-red-50 bg-transparent"
					disabled={disabled}
				>
					<Download className="mr-2 h-4 w-4" />
					Export
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-48">
				<DropdownMenuItem
					onClick={exportToCSV}
					className="cursor-pointer hover:bg-red-50 focus:bg-red-50"
				>
					<Download className="h-4 w-4 mr-2 text-red-600" />
					Export as CSV
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={exportToExcel}
					className="cursor-pointer hover:bg-green-50 focus:bg-green-50"
				>
					<FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
					Export as Excel
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
