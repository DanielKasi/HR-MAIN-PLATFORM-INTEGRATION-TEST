"use client";

import {Bell, Clock, ClipboardList, Hourglass} from "lucide-react";
import {useEffect} from "react";

import {Card} from "@/components/ui/card";

type TaskSummaryData = {
  critical: number;
  expired: number;
  open: number;
  waiting: number;
  total: number;
};

export function TaskSummary() {
  const taskData: TaskSummaryData = {
    critical: 2,
    expired: 0,
    open: 1,
    waiting: 0,
    total: 3,
  };

  // In a real app, you would fetch this data from your API
  useEffect(() => {
    // Fetch task summary data
    // This is just a placeholder for demonstration
  }, []);

  // Calculate percentages
  const criticalPercent = Math.round((taskData.critical / taskData.total) * 100) || 0;
  const expiredPercent = Math.round((taskData.expired / taskData.total) * 100) || 0;
  const openPercent = Math.round((taskData.open / taskData.total) * 100) || 0;
  const waitingPercent = Math.round((taskData.waiting / taskData.total) * 100) || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Critical Tasks */}
      <Card className="overflow-hidden rounded-lg flex">
        <div className="bg-red-600 w-1/4 flex items-center justify-center">
          <Bell className="h-10 w-10 text-white" />
        </div>
        <div className="bg-red-500 w-3/4 p-4 text-white">
          <div className="text-center">
            <h3 className="text-sm font-medium uppercase">CRITICAL TASKS</h3>
            <p className="text-5xl font-bold my-2">{taskData.critical}</p>
            <div className="text-xs">{criticalPercent}% of total</div>
          </div>
        </div>
      </Card>

      {/* Expired Tasks */}
      <Card className="overflow-hidden rounded-lg flex">
        <div className="bg-amber-600 w-1/4 flex items-center justify-center">
          <Clock className="h-10 w-10 text-white" />
        </div>
        <div className="bg-amber-500 w-3/4 p-4 text-white">
          <div className="text-center">
            <h3 className="text-sm font-medium uppercase">EXPIRED TASKS</h3>
            <p className="text-5xl font-bold my-2">{taskData.expired}</p>
            <div className="text-xs">{expiredPercent}% of total</div>
          </div>
        </div>
      </Card>

      {/* Open Tasks */}
      <Card className="overflow-hidden rounded-lg flex">
        <div className="bg-purple-700 w-1/4 flex items-center justify-center">
          <ClipboardList className="h-10 w-10 text-white" />
        </div>
        <div className="bg-purple-600 w-3/4 p-4 text-white">
          <div className="text-center">
            <h3 className="text-sm font-medium uppercase">OPEN TASKS</h3>
            <p className="text-5xl font-bold my-2">{taskData.open}</p>
            <div className="text-xs">{openPercent}% of total</div>
          </div>
        </div>
      </Card>

      {/* Waiting Tasks */}
      <Card className="overflow-hidden rounded-lg flex">
        <div className="bg-gray-600 w-1/4 flex items-center justify-center">
          <Hourglass className="h-10 w-10 text-white" />
        </div>
        <div className="bg-gray-500 w-3/4 p-4 text-white">
          <div className="text-center">
            <h3 className="text-sm font-medium uppercase">WAITING TASKS</h3>
            <p className="text-5xl font-bold my-2">{taskData.waiting}</p>
            <div className="text-xs">{waitingPercent}% of total</div>
          </div>
        </div>
      </Card>
    </div>
  );
}
