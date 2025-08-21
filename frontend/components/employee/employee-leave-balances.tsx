"use client";

import React, {useState, useEffect} from "react";
import {Card, CardContent} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Loader2, Calendar, TrendingUp, TrendingDown, Minus} from "lucide-react";
import {getAllLeaveBalances, getLeaveTypes} from "@/lib/utils";
import {ILeaveBalance, ILeaveType} from "@/types/types.utils";
import {toast} from "sonner";

interface EmployeeLeaveBalancesProps {
  employeeId: string;
  institutionId: number;
}

const EmployeeLeaveBalances: React.FC<EmployeeLeaveBalancesProps> = ({
  employeeId,
  institutionId,
}) => {
  const [leaveBalances, setLeaveBalances] = useState<ILeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<ILeaveType[]>([]);
  const [loading, setLoading] = useState(false);

  const getLeaveTypeName = (leaveType: any): string => {
    if (typeof leaveType === "object" && leaveType?.name) {
      return leaveType.name;
    }
    const type = leaveTypes.find((type) => type.id === leaveType);
    return type?.name || "Unknown Leave Type";
  };

  const getLeaveTypeCategory = (leaveType: any): string => {
    if (typeof leaveType === "object" && leaveType?.category) {
      return leaveType.category;
    }
    const type = leaveTypes.find((type) => type.id === leaveType);
    return type?.category || "annual";
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      annual: "bg-blue-50 text-blue-700 border-blue-200",
      sick: "bg-red-50 text-red-700 border-red-200",
      maternity: "bg-pink-50 text-pink-700 border-pink-200",
      paternity: "bg-indigo-50 text-indigo-700 border-indigo-200",
      study: "bg-purple-50 text-purple-700 border-purple-200",
      compassionate: "bg-green-50 text-green-700 border-green-200",
    };
    return colors[category as keyof typeof colors] || "bg-gray-50 text-gray-700 border-gray-200";
  };

  const getBalanceStatus = (available: number, allocated: number) => {
    const percentage = (available / allocated) * 100;
    if (percentage > 50) return {status: "good", icon: TrendingUp, color: "text-green-600"};
    if (percentage > 20) return {status: "medium", icon: Minus, color: "text-yellow-600"};
    return {status: "low", icon: TrendingDown, color: "text-red-600"};
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [balances, types] = await Promise.all([
        getAllLeaveBalances({institutionId, employeeId}),
        getLeaveTypes({institutionId}),
      ]);

      // Backend already filters by employeeId, so we can use the data directly
      setLeaveBalances(balances);
      setLeaveTypes(types.filter((type) => type.is_active !== false));
    } catch (error: any) {
      toast.error("Failed to fetch leave balances");
      console.error("Error fetching leave balances:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId && institutionId) {
      fetchData();
    }
  }, [employeeId, institutionId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span className="text-sm text-gray-600">Loading leave balances...</span>
      </div>
    );
  }

  if (leaveBalances.length === 0) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Leave Balances</h3>
        <p className="text-gray-600">No leave balance records found for this employee.</p>
      </div>
    );
  }

  // Calculate totals
  const totalAllocated = leaveBalances.reduce((sum, balance) => {
    return sum + (parseFloat(balance.allocated_days.toString()) || 0);
  }, 0);

  const totalUsed = leaveBalances.reduce((sum, balance) => {
    return sum + (parseFloat(balance.used_days.toString()) || 0);
  }, 0);

  const totalAvailable = leaveBalances.reduce((sum, balance) => {
    const available =
      typeof balance.available_days === "string"
        ? parseFloat(balance.available_days)
        : balance.available_days || 0;
    return sum + available;
  }, 0);

  return (
    <div className="space-y-4">
      {/* Quick Stats - Profile Style */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-[#f0f0f6] border-[#e8e8f2] rounded-lg p-3">
          <div className="text-xs text-[#848496] mb-1">Total Allocated</div>
          <div className="text-lg font-bold text-[#162032]">{totalAllocated} days</div>
        </div>
        <div className="bg-[#f0f0f6] border-[#e8e8f2] rounded-lg p-3">
          <div className="text-xs text-[#848496] mb-1">Used</div>
          <div className="text-lg font-bold text-[#e21732]">{totalUsed} days</div>
        </div>
        <div className="bg-[#f0f0f6] border-[#e8e8f2] rounded-lg p-3">
          <div className="text-xs text-[#848496] mb-1">Available</div>
          <div className="text-lg font-bold text-[#3cb371]">{totalAvailable} days</div>
        </div>
      </div>

      {/* Compact Table - Profile Style */}
      <div className="bg-white rounded-lg overflow-hidden border border-[#e8e8f2]">
        <div className="overflow-x-auto">
          <Table className="[&_th]:border-0 [&_td]:border-0">
            <TableHeader>
              <TableRow className="bg-[#f7f7fb] hover:bg-[#f7f7fb]">
                <TableHead className="font-semibold text-[#162032] py-3 px-4 text-xs">
                  Leave Type
                </TableHead>
                <TableHead className="font-semibold text-[#162032] text-center py-3 px-4 text-xs">
                  Allocated
                </TableHead>
                <TableHead className="font-semibold text-[#162032] text-center py-3 px-4 text-xs">
                  Used
                </TableHead>
                <TableHead className="font-semibold text-[#162032] text-center py-3 px-4 text-xs">
                  Available
                </TableHead>
                <TableHead className="font-semibold text-[#162032] text-center py-3 px-4 text-xs">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveBalances.map((balance) => {
                const available =
                  typeof balance.available_days === "string"
                    ? parseFloat(balance.available_days)
                    : balance.available_days || 0;
                const allocated = parseFloat(balance.allocated_days.toString()) || 0;
                const balanceStatus = getBalanceStatus(available, allocated);
                const StatusIcon = balanceStatus.icon;

                return (
                  <TableRow key={balance.id} className="hover:bg-[#f7f7fb]/50">
                    <TableCell className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="font-medium text-[#162032] text-xs">
                          {getLeaveTypeName(balance.leave_type)}
                        </div>
                        <Badge
                          variant="outline"
                          className={`${getCategoryColor(getLeaveTypeCategory(balance.leave_type))} text-xs px-2 py-0.5`}
                        >
                          {getLeaveTypeCategory(balance.leave_type)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium py-3 px-4 text-xs">
                      {balance.allocated_days}
                    </TableCell>
                    <TableCell className="text-center font-medium py-3 px-4 text-xs">
                      {balance.used_days}
                    </TableCell>
                    <TableCell className="text-center py-3 px-4">
                      <span className={`text-sm font-bold ${balanceStatus.color}`}>
                        {available}
                      </span>
                    </TableCell>
                    <TableCell className="text-center py-3 px-4">
                      <div className="flex items-center justify-center">
                        <StatusIcon className={`h-3 w-3 ${balanceStatus.color}`} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default EmployeeLeaveBalances;
