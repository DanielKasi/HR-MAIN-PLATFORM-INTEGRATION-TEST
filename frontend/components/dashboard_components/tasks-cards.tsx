"use client";

import type {ApiTask} from "../task-notification";

import {useEffect, useState} from "react";
import {ArrowRight} from "lucide-react";
import {useRouter} from "next/navigation";
import { TaskType } from "@/app/(dashboard)/tasks/page";

// Tasks Cards Component
export function TasksCards({branchId}: {branchId: string | null}) {
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const router = useRouter();

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      // const response = await fetchUserTasks();
      // const responseData: ApiTask[] = response.data;
      // const pendingTasks = responseData.filter((task) => task.status === "pending");
      // setTasks(pendingTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  const viewTasks = (type:TaskType) => {
    router.push(`/tasks?type=${type}`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 my-6 py-4 cursor-pointer">
      <div className="bg-primary/10 rounded-2xl py-3 px-4 flex justify-between items-center" onClick={() => viewTasks("incoming")}>
        <div className="flex items-center">
          <span className="text-xl font-bold text-primary mr-2">1</span>
          <span className="text-primary-hover text-sm">Incoming tasks</span>
        </div>
        <ArrowRight className="text-primary-hover h-4 w-4" />
      </div>
      <div className="bg-purple-100 rounded-2xl py-3 px-4 flex justify-between items-center" onClick={() => viewTasks("open")}>
        <div className="flex items-center">
          <span className="text-xl font-bold text-purple-500 mr-2">1</span>
          <span className="text-purple-500 text-sm">Open tasks</span>
        </div>
        <ArrowRight className="text-purple-500 h-4 w-4" />
      </div>
      <div className="bg-red-100 rounded-2xl py-3 px-4 flex justify-between items-center" onClick={() => viewTasks("critical")}>
        <div className="flex items-center">
          <span className="text-xl font-bold text-red-500 mr-2">{tasks.length}</span>
          <span className="text-red-500 text-sm">Critical Tasks</span>
        </div>
        <ArrowRight className="text-red-500 h-4 w-4" />
      </div>

      <div className="bg-gray-200/60 rounded-2xl py-3 px-4 flex justify-between items-center" onClick={() => viewTasks("critical")}>
        <div className="flex items-center">
          <span className="text-xl font-bold text-gray-600 mr-2">0</span>
          <span className="text-gray-600 text-sm">Expired Tasks</span>
        </div>
        <ArrowRight className="text-blue-500 h-4 w-4" />
      </div>

      <div className="bg-green-100 rounded-2xl py-3 px-4 flex justify-between items-center" onClick={() => viewTasks("outgoing")}>
        <div className="flex items-center">
          <span className="text-xl font-bold text-green-500 mr-2">0</span>
          <span className="text-green-500 text-sm">Outgoing Tasks</span>
        </div>
        <ArrowRight className="text-green-500 h-4 w-4" />
      </div>
    </div>
  );
}
