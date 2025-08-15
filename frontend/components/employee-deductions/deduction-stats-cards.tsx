"use client"

import { Users, Coins, Calendar, Percent } from 'lucide-react'  
import type { IEmployeeDeduction } from "@/types/types.utils"
import { formatCurrency } from "@/lib/helpers"

interface DeductionStatsCardsProps {
  deductions: IEmployeeDeduction[]
  getCalculatedAmount: (deduction: IEmployeeDeduction) => number
}

export function DeductionStatsCards({ deductions, getCalculatedAmount }: DeductionStatsCardsProps) {
  const activeDeductions = deductions.filter((d) => d.is_active)
  const percentageBasedDeductions = deductions.filter((d) => d.calculation_method === "percentage")
  const totalMonthlyCost = activeDeductions.reduce((sum, d) => sum + getCalculatedAmount(d), 0)

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 px-2">
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center">
          <div className="p-2 bg-red-100 rounded-lg">
            <Users className="h-5 w-5 text-red-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-600">Total Deductions</p>
            <p className="text-2xl font-bold text-gray-900">{deductions.length}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center">
          <div className="p-2 bg-green-100 rounded-lg">
            <Coins className="h-5 w-5 text-green-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-600">Active Deductions</p>
            <p className="text-2xl font-bold text-green-600">{activeDeductions.length}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Calendar className="h-5 w-5 text-blue-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-600">Total Monthly Cost</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(totalMonthlyCost)}
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Percent className="h-5 w-5 text-purple-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-600">Percentage Based</p>
            <p className="text-2xl font-bold text-purple-600">{percentageBasedDeductions.length}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
