"use client"

import { format } from "date-fns"
import { Edit, Trash2, MoreVertical, Users } from 'lucide-react'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import type { IEmployeeDeduction } from "@/types/types.utils"

interface DeductionTableProps {
  deductions: IEmployeeDeduction[]
  totalDeductions: number
  getCalculatedAmount: (deduction: IEmployeeDeduction) => number
  onEdit: (deduction: IEmployeeDeduction) => void
  onDelete: (id: number) => void
  onClearFilters: () => void
}

export function DeductionTable({
  deductions,
  totalDeductions,
  getCalculatedAmount,
  onEdit,
  onDelete,
  onClearFilters,
}: DeductionTableProps) {
  const getCategoryColor = () => {
    return "bg-red-50 text-red-700 border-red-200"
  }

  if (deductions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mx-2">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Current Deductions
            <span className="text-sm font-normal text-gray-500 ml-2">
              (0 of {totalDeductions} records)
            </span>
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Overview of all employee deductions and their calculated amounts
          </p>
        </div>
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No deductions found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {totalDeductions === 0
              ? "No deductions have been created yet."
              : "No deductions match your current filters."}
          </p>
          {totalDeductions > 0 && (
            <Button onClick={onClearFilters} variant="outline" className="mt-4 bg-transparent">
              Clear Filters
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mx-2">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          Current Deductions
          <span className="text-sm font-normal text-gray-500 ml-2">
            ({deductions.length} of {totalDeductions} records)
          </span>
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Overview of all employee deductions and their calculated amounts
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold text-gray-900">Employee</TableHead>
            <TableHead className="font-semibold text-gray-900">Deduction Type</TableHead>
            <TableHead className="font-semibold text-gray-900">Method</TableHead>
            <TableHead className="font-semibold text-gray-900">Calculated Amount</TableHead>
            <TableHead className="font-semibold text-gray-900">Status</TableHead>
            <TableHead className="font-semibold text-gray-900">Effective Period</TableHead>
            <TableHead className="font-semibold text-gray-900">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deductions.map((deduction) => (
            <TableRow key={deduction.id} className="hover:bg-gray-50 transition-colors">
              <TableCell>
                <div>
                  <div className="font-medium text-gray-900">{deduction.employee.user?.fullname}</div>
                  <div className="text-sm text-gray-500">{deduction.employee.email}</div>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={`${getCategoryColor()} border font-medium`}>
                  {deduction.deduction_type.name}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="flex items-center gap-1 w-fit">
                  {deduction.calculation_method === "fixed" ? "Fixed" : "Percentage"}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-lg font-semibold text-red-600">
                  ${getCalculatedAmount(deduction).toLocaleString()}
                </span>
              </TableCell>
              <TableCell>
                <Badge
                  variant={deduction.is_active ? "default" : "secondary"}
                  className={
                    deduction.is_active
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-gray-200 text-gray-700"
                  }
                >
                  {deduction.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div className="font-medium">
                    From: {format(new Date(deduction.effective_from), "MMM dd, yyyy")}
                  </div>
                  {deduction.effective_to && (
                    <div className="text-gray-500">
                      To: {format(new Date(deduction.effective_to), "MMM dd, yyyy")}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
                      <MoreVertical className="h-4 w-4 text-gray-600" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={() => onEdit(deduction)}
                      className="cursor-pointer hover:bg-red-50 focus:bg-red-50"
                    >
                      <Edit className="h-4 w-4 mr-2 text-red-600" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(deduction.id)}
                      className="cursor-pointer hover:bg-red-50 focus:bg-red-50 text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
