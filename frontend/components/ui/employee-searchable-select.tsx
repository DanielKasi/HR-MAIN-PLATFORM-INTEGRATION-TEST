

"use client"

import { SearchableSelect } from "../../components/searchable-select"
import { User } from "lucide-react"

export interface Employee {
  id: string | number
  name?: string
  email?: string
  employee_id?: string
  department?: string
  position?: string
  user?: {
    fullname?: string
    email?: string
  }
}

export interface EmployeeSearchableSelectProps {
  employees: Employee[]
  value: string | number | undefined
  onValueChange: (value: string | number) => void
  disabled?: boolean
  placeholder?: string
  isLoading?: boolean
  showEmployeeId?: boolean
  showDepartment?: boolean
  className?: string
  triggerClassName?: string
}

export const EmployeeSearchableSelect = ({
  employees,
  value,
  onValueChange,
  disabled = false,
  placeholder = "Select employee",
  isLoading = false,
  showEmployeeId = true,
  showDepartment = true,
  className,
  triggerClassName
}: EmployeeSearchableSelectProps) => {
  
  const getEmployeeName = (employee: Employee): string => {
    if (employee.user?.fullname) {
      return employee.user.fullname
    }
    if (employee.name) {
      return employee.name
    }
    return employee.user?.email || employee.email || 'Unknown Employee'
  }

  
  const getEmployeeEmail = (employee: Employee): string => {
    return employee.user?.email || employee.email || ''
  }

  const employeeItems = employees.map(employee => {
    const name = getEmployeeName(employee)
    const email = getEmployeeEmail(employee)
    const details = []
    
    if (showEmployeeId && employee.employee_id && employee.employee_id !== employee.id.toString()) {
      details.push(`ID: ${employee.employee_id}`)
    }
    
    if (showDepartment && employee.department) {
      details.push(employee.department)
    }
    
    let label = name
    if (details.length > 0) {
      label += ` (${details.join(' • ')})`
    }
    
    return {
      id: employee.id,
      label: label,
      value: `${name} ${email} ${employee.employee_id || ''} ${employee.department || ''}`.toLowerCase()
    }
  })
  
  const selectedItems = value ? [value] : []
  
  const handleSelect = (itemId: string | number) => {
    onValueChange(itemId)
  }
  
  // Find selected employee for custom display
  const selectedEmployee = employees.find(emp => emp.id.toString() === value?.toString())
  
  // Create display placeholder - this is the key fix
  let displayPlaceholder = placeholder
  
  if (isLoading) {
    displayPlaceholder = "Loading employees..."
  } else if (selectedEmployee) {
    const selectedName = getEmployeeName(selectedEmployee)
    let nameDisplay = selectedName
    
    if (showEmployeeId && selectedEmployee.employee_id && selectedEmployee.employee_id !== selectedEmployee.id.toString()) {
      nameDisplay += ` (ID: ${selectedEmployee.employee_id})`
    }
    
    if (showDepartment && selectedEmployee.department) {
      nameDisplay += ` (${selectedEmployee.department})`
    }
    
    displayPlaceholder = nameDisplay
  }
  
  const displayEmptyMessage = isLoading ? "Loading employees..." : "No employees found"
  
  return (
    <div className={className}>
      <SearchableSelect
        items={employeeItems}
        selectedItems={selectedItems}
        placeholder={displayPlaceholder}
        emptyMessage={displayEmptyMessage}
        searchPlaceholder="Search employees by name, email, ID, or department..."
        onSelect={handleSelect}
        multiple={false}
        disabled={disabled || isLoading}
        triggerClassName={`w-full justify-between focus:ring-orange-500 focus:border-orange-500 ${triggerClassName || ''}`}
        popoverClassName="w-full"
      />
    </div>
  )
}

export default EmployeeSearchableSelect