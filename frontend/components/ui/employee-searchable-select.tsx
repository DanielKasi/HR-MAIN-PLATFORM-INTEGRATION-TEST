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
  value: (string | number)[]
  onValueChange: (value: (string | number)[]) => void
  disabled?: boolean
  placeholder?: string
  isLoading?: boolean
  showEmployeeId?: boolean
  showDepartment?: boolean
  className?: string
  triggerClassName?: string,
  multiple?:boolean
}

export const EmployeeSearchableSelect = ({
  employees,
  value,
  onValueChange,
  disabled = false,
  placeholder = "Select employee(s)",
  isLoading = false,
  showEmployeeId = true,
  showDepartment = true,
  className,
  triggerClassName,
  multiple=false
}: EmployeeSearchableSelectProps) => {
  
  const getEmployeeName = (employee: Employee): string => {
    if (employee.user?.fullname) return employee.user.fullname
    if (employee.name) return employee.name
    return employee.user?.email || employee.email || "Unknown Employee"
  }

  const getEmployeeEmail = (employee: Employee): string => {
    return employee.user?.email || employee.email || ""
  }

  const employeeItems = employees.map((employee) => {
    const name = getEmployeeName(employee)
    const email = getEmployeeEmail(employee)
    const details = []


    if (showDepartment && employee.department) {
      details.push(employee.department)
    }

    let label = name
    if (details.length > 0) {
      label += ` (${details.join(" • ")})`
    }

    return {
      id: employee.id,
      label: label,
      value: `${name} ${email} ${employee.department || ""}`.toLowerCase(),
    }
  })

  const selectedItems = value || []

  const handleSelect = (selected: string | number) => {
    if (!selectedItems.includes(selected)) {
      if(multiple){
        onValueChange([...selectedItems, selected])
      }else {
        onValueChange([selected])

      }
    }
  }

  let displayPlaceholder = placeholder

  if (isLoading) {
    displayPlaceholder = "Loading employees..."
  } else if (selectedItems.length > 0) {
    const selectedNames = selectedItems
      .map((id) => {
        const emp = employees.find((e) => e.id.toString() === id.toString())
        return emp ? getEmployeeName(emp) : null
      })
      .filter(Boolean)
      .join(", ")
    displayPlaceholder = selectedNames || placeholder
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
        multiple={multiple} 
        disabled={disabled || isLoading}
        triggerClassName={`w-full justify-between focus:ring-orange-500 focus:border-orange-500 ${triggerClassName || ""}`}
        popoverClassName="w-full"
      />
    </div>
  )
}

export default EmployeeSearchableSelect
