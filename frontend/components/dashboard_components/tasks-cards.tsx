"use client";

import type {ApiTask} from "../task-notification";

import {useEffect, useState} from "react";
import {ArrowRight} from "lucide-react";
import {useRouter} from "next/navigation";

import {fetchUserTasks} from "@/lib/helpers";

// Tasks Cards Component
export function TasksCards({branchId}: {branchId: string | null}) {
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await fetchUserTasks();
      const responseData: ApiTask[] = response.data;
      const pendingTasks = responseData.filter((task) => task.status === "pending");

      setTasks(pendingTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const viewAllTasks = () => {
    router.push("/tasks");
  };

  return (
    <div className="grid grid-cols-4 gap-4 mb-6 cursor-pointer" onClick={viewAllTasks}>
      <div className="bg-red-100 rounded-[30px] py-3 px-4 flex justify-between items-center">
        <div className="flex items-center">
          <span className="text-xl font-bold text-red-500 mr-2">{tasks.length}</span>
          <span className="text-red-500 text-sm">Critical Tasks</span>
        </div>
        <ArrowRight className="text-red-500 h-4 w-4" />
      </div>

      <div className="bg-blue-100 rounded-[30px] py-3 px-4 flex justify-between items-center">
        <div className="flex items-center">
          <span className="text-xl font-bold text-blue-500 mr-2">0</span>
          <span className="text-blue-500 text-sm">Expired Tasks</span>
        </div>
        <ArrowRight className="text-blue-500 h-4 w-4" />
      </div>

      <div className="bg-purple-100 rounded-[30px] py-3 px-4 flex justify-between items-center">
        <div className="flex items-center">
          <span className="text-xl font-bold text-purple-500 mr-2">1</span>
          <span className="text-purple-500 text-sm">Open tasks</span>
        </div>
        <ArrowRight className="text-purple-500 h-4 w-4" />
      </div>

      <div className="bg-green-100 rounded-[30px] py-3 px-4 flex justify-between items-center">
        <div className="flex items-center">
          <span className="text-xl font-bold text-green-500 mr-2">0</span>
          <span className="text-green-500 text-sm">Waiting Tasks</span>
        </div>
        <ArrowRight className="text-green-500 h-4 w-4" />
      </div>
    </div>
  );
}
