"use client"

import { useState, useEffect } from "react"
import { Users, Building, Briefcase, Loader2 } from 'lucide-react'
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InfiniteScrollSelect } from "@/components/infinite-scroll-select"
import { getDepartments, getJobPositions, getPaginatedEmployees } from "@/lib/utils"
import type { IDepartment, IJobPosition, IEmployee } from "@/types/types.utils"
import { useSelector } from "react-redux"
import { selectSelectedInstitution } from "@/store/auth/selectors"

type ContextType = 'employee' | 'department' | 'job_position'

interface ContextItem {
  id: number
  name: string
  description?: string
}

interface ContextSelectorProps {
  selectedContext: ContextType | ""
  onContextChange: (context: ContextType | "") => void
  selectedItems: ContextItem[]
  onItemsChange: (items: ContextItem[]) => void
  disabled?: boolean
}

export function ContextSelector({
  selectedContext,
  onContextChange,
  selectedItems,
  onItemsChange,
  disabled = false,
}: ContextSelectorProps) {
  const [contextData, setContextData] = useState<ContextItem[]>([]);
  const currentInstitution = useSelector(selectSelectedInstitution);
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")

  // Reset data when context changes
  useEffect(() => {
    if (selectedContext) {
      setContextData([])
      setPage(1)
      setSearchQuery("")
      setHasMore(true)
      onItemsChange([])
      fetchContextData(1, "", true)
    }
  }, [selectedContext, currentInstitution])

  const fetchContextData = async (pageNum: number, search: string = "", reset: boolean = false) => {
    if (!selectedContext || !currentInstitution) return

    setLoading(true)
    try {
      let data: any[] = []

      switch (selectedContext) {
        case 'employee':
          const employees = await getPaginatedEmployees({ institutionId: currentInstitution.id })
          data = employees.results.map((emp: IEmployee) => ({
            id: emp.id,
            name: emp.user?.fullname || emp.email,
            description: `${emp.email} • ${emp.department?.name || 'No Department'}`
          }))
          break

        case 'department':
          const departments = await getDepartments({ institutionId: currentInstitution.id })
          data = departments.map((dept: IDepartment) => ({
            id: dept.id,
            name: dept.name,
            description: dept.description || `Department in ${dept.institution_details?.institution_name || 'Institution'}`
          }))
          break

        case 'job_position':
          const positions = await getJobPositions({ institutionId: currentInstitution.id })
          data = positions.map((pos: IJobPosition) => ({
            id: pos.id,
            name: pos.name,
            description: pos.description || `Position in ${pos.department_details?.name || 'Department'}`
          }))
          break

        default:
          data = []
      }

      // Filter by search if provided
      if (search) {
        data = data.filter(item =>
          item.name.toLowerCase().includes(search.toLowerCase()) ||
          (item.description && item.description.toLowerCase().includes(search.toLowerCase()))
        )
      }

      if (reset) {
        setContextData(data)
      } else {
        setContextData(prev => [...prev, ...data])
      }

      setHasMore(false)
      setPage(pageNum)
    } catch (error) {
      console.error(`Error fetching ${selectedContext} data:`, error)
      setContextData([])
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setPage(1)
    fetchContextData(1, query, true)
  }

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchContextData(page + 1, searchQuery, false)
    }
  }

  const handleItemSelect = (item: ContextItem) => {
    const isSelected = selectedItems.some(selected => selected.id === item.id)

    if (isSelected) {
      // Remove item
      onItemsChange(selectedItems.filter(selected => selected.id !== item.id))
    } else {
      // Add item
      onItemsChange([...selectedItems, item])
    }
  }

  const getContextIcon = (context: ContextType) => {
    switch (context) {
      case 'employee':
        return <Users className="h-4 w-4" />
      case 'department':
        return <Building className="h-4 w-4" />
      case 'job_position':
        return <Briefcase className="h-4 w-4" />
      default:
        return null
    }
  }

  const getContextLabel = (context: ContextType) => {
    switch (context) {
      case 'employee':
        return 'Employees'
      case 'department':
        return 'Departments'
      case 'job_position':
        return 'Job Positions'
      default:
        return ''
    }
  }

  return (
    <div className="space-y-4">
      {/* Context Type Selection */}
      <div className="space-y-2">
        <Label htmlFor="context" className="text-sm font-medium">
          Target Group *
        </Label>
        <Select
          value={selectedContext}
          onValueChange={(value: ContextType | "") => onContextChange(value)}
          disabled={disabled}
        >
          <SelectTrigger className="focus:ring-orange-500 focus:border-orange-500">
            <SelectValue placeholder="Select target group for this allowance" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="employee">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Individual Employees
              </div>
            </SelectItem>
            <SelectItem value="department">
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Departments
              </div>
            </SelectItem>
            <SelectItem value="job_position">
              <div className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Job Positions
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-500">
          Choose whether this allowance applies to specific employees, entire departments, or job positions
        </p>
      </div>

      {/* Context Items Selection */}
      {selectedContext && (
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            {getContextIcon(selectedContext)}
            Select {getContextLabel(selectedContext)} *
          </Label>

          {/* Selected Items Display */}
          {selectedItems.length > 0 && (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-orange-900">
                  Selected {getContextLabel(selectedContext)} ({selectedItems.length})
                </p>
                <button
                  type="button"
                  onClick={() => onItemsChange([])}
                  className="text-xs text-orange-700 hover:text-orange-900"
                  disabled={disabled}
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedItems.map((item) => (
                  <div
                    key={item.id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-orange-300 rounded text-xs"
                  >
                    <span>{item.name}</span>
                    <button
                      type="button"
                      onClick={() => handleItemSelect(item)}
                      className="text-orange-600 hover:text-orange-800"
                      disabled={disabled}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <InfiniteScrollSelect
            items={contextData.filter(item => !selectedItems.some(selectedItem => selectedItem.id === item.id))}
            loading={loading}
            hasMore={hasMore}
            onLoadMore={handleLoadMore}
            onSearch={handleSearch}
            onSelect={handleItemSelect}
            selectedItem={null} // We handle multi-select differently
            getItemId={(item) => item.id}
            getItemLabel={(item) => item.name}
            getItemDescription={(item) => item.description || ""}
            placeholder={`Search ${getContextLabel(selectedContext).toLowerCase()}...`}
            searchPlaceholder={`Search ${getContextLabel(selectedContext).toLowerCase()}...`}
            emptyMessage={`No ${selectedItems.length ? "more" : ""} ${getContextLabel(selectedContext).toLowerCase()} found`}
          // className="h-48"
          />

          <p className="text-xs text-gray-500">
            Click on items to select/deselect them. You can select multiple {getContextLabel(selectedContext).toLowerCase()}.
          </p>
        </div>
      )}
    </div>
  )
}
