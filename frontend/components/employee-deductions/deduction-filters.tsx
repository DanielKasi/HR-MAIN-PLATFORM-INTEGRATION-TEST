"use client"

import { Search } from 'lucide-react'
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"

interface DeductionFiltersProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  statusFilter: "all" | "active" | "inactive"
  onStatusFilterChange: (value: "all" | "active" | "inactive") => void
  methodFilter: "all" | "fixed" | "percentage"
  onMethodFilterChange: (value: "all" | "fixed" | "percentage") => void
  onClearFilters: () => void
}

export function DeductionFilters({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  methodFilter,
  onMethodFilterChange,
  onClearFilters,
}: DeductionFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6 mx-2">
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by employee name or deduction type..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 focus:ring-red-500 focus:border-red-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="focus:ring-red-500 focus:border-red-500">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={methodFilter} onValueChange={onMethodFilterChange}>
            <SelectTrigger className="focus:ring-red-500 focus:border-red-500">
              <SelectValue placeholder="Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Methods</SelectItem>
              <SelectItem value="fixed">Fixed Amount</SelectItem>
              <SelectItem value="percentage">Percentage</SelectItem>
            </SelectContent>
          </Select>
          
          <div></div>
          
          <Button
            onClick={onClearFilters}
            variant="outline"
            className="border-red-200 text-red-700 hover:bg-red-50 bg-transparent"
          >
            Clear Filters
          </Button>
        </div>
      </div>
    </div>
  )
}
