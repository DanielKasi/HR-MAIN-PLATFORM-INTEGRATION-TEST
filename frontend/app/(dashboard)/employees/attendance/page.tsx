"use client";
import React, {useState, useEffect} from "react";
import EmployeeAttendance from "../../../../components/attendance/employee-attendance";
import {Eye} from "lucide-react";

import {useSelector} from "react-redux";
import {selectSelectedInstitution} from "@/store/auth/selectors";

import {TableSkeleton} from "@/components/common/table-skeleton";
import {Card, CardHeader} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {useRouter} from "next/navigation";

const AttendancePage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const router = useRouter();

  useEffect(() => {
    setLoading(false);
  }, [selectedInstitution]);

  const handleViewAttendance = () => {
    router.push("attendance/view-attendance");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employees...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-2 space-y-6">
        <Card className="h-[calc(100vh-2rem)] shadow-lg">
          <CardHeader className="border-b">
            <div className="flex justify-between gap-8 items-center">
              <div className="flex items-center justify-start gap-4">
                <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-6 bg-gray-200 rounded w-64 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-48 animate-pulse"></div>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-10 w-36 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-10 w-28 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </CardHeader>
          <TableSkeleton rows={10} columns={8} />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8 min-h-screen">
      <div className="w-full">
        <div className="mb-8">
          <div className="flex flex-col w-full">
            <div className="flex items-center justify-between w-full gap-8">
              <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-2">
                Employee Attendance
              </h1>
              <Button
                size="sm"
                onClick={handleViewAttendance}
                className="flex items-center gap-2  text-white px-4 py-2 rounded-lg shadow-sm transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span className="hidden sm:inline">View Attendance</span>
              </Button>
            </div>
            <p className="text-muted-foreground">Manage daily attendance for your organization</p>
          </div>
        </div>
        <EmployeeAttendance
          scope={{type:"default"}}
        />
      </div>
    </div>
  );
};

export default AttendancePage;
