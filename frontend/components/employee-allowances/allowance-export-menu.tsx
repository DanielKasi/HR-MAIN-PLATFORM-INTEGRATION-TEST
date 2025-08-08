"use client"

import { Download, FileSpreadsheet } from 'lucide-react'
import { format } from "date-fns"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { IEmployeeAllowance } from '@/types/types.utils'


interface AllowanceExportMenuProps {
  allowances: IEmployeeAllowance[]
  getCalculatedAmount: (allowance: IEmployeeAllowance) => number
  disabled?: boolean
}

export function AllowanceExportMenu({ allowances, getCalculatedAmount, disabled = false }: AllowanceExportMenuProps) {
  const exportToCSV = () => {
    const csvContent = [
      [
        "Employee",
        "Allowance Type",
        "Method",
        "Amount",
        "Percentage",
        "Calculated Amount",
        "Status",
        "Effective From",
        "Effective To",
      ],
      ...allowances.map((allowance) => [
        allowance.employee.user?.fullname || "",
        allowance.allowance_type.name,
        allowance.calculation_method,
        allowance.amount,
        allowance.percentage,
        getCalculatedAmount(allowance),
        allowance.is_active ? "Active" : "Inactive",
        format(new Date(allowance.effective_from), "yyyy-MM-dd"),
        allowance.effective_to ? format(new Date(allowance.effective_to), "yyyy-MM-dd") : "",
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "employee-allowances.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const exportToExcel = () => {
    try {
      const excelData = allowances.map((allowance) => ({
        "Employee Name": allowance.employee.user?.fullname || "",
        "Employee Email": allowance.employee.email,
        "Allowance Type": allowance.allowance_type.name,
        "Calculation Method": allowance.calculation_method === "fixed" ? "Fixed Amount" : "Percentage",
        "Fixed Amount": allowance.calculation_method === "fixed" ? Number.parseFloat(allowance.amount) : "",
        "Percentage": allowance.calculation_method === "percentage" ? Number.parseFloat(allowance.percentage) : "",
        "Calculated Amount": getCalculatedAmount(allowance),
        "Status": allowance.is_active ? "Active" : "Inactive",
        "Effective From": format(new Date(allowance.effective_from), "yyyy-MM-dd"),
        "Effective To": allowance.effective_to ? format(new Date(allowance.effective_to), "yyyy-MM-dd") : "",
        "Created Date": format(new Date(allowance.created_at), "yyyy-MM-dd"),
      }))

      const headers = Object.keys(excelData[0] || {})
      let htmlTable = '<table border="1"><thead><tr>'

      for (const header of headers) {
        htmlTable += `<th>${header}</th>`
      }
      htmlTable += '</tr></thead><tbody>'

      for (const row of excelData) {
        htmlTable += '<tr>'
        for (const header of headers) {
          const value = row[header as keyof typeof row]
          htmlTable += `<td>${value}</td>`
        }
        htmlTable += '</tr>'
      }
      htmlTable += '</tbody></table>'

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
                  <x:Name>Employee Allowances</x:Name>
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
      `

      const blob = new Blob([excelContent], { type: 'application/vnd.ms-excel' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `employee-allowances-${format(new Date(), "yyyy-MM-dd")}.xls`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.success("Excel file downloaded successfully")
    } catch (error) {
      toast.error("Failed to export Excel file")
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="border-orange-200 text-orange-700 hover:bg-orange-50 bg-transparent"
          disabled={disabled}
        >
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={exportToCSV}
          className="cursor-pointer hover:bg-orange-50 focus:bg-orange-50"
        >
          <Download className="h-4 w-4 mr-2 text-orange-600" />
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
  )
}
