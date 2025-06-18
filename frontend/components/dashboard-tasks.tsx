"use client";

import {useState, useEffect} from "react";
import {AlertTriangle, ArrowRight, CheckCircle} from "lucide-react";
import {useRouter} from "next/navigation";
import {formatDistanceToNow} from "date-fns";

import {ApiTask} from "./task-notification";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import apiRequest from "@/lib/apiRequest";
import {fetchUserTasks} from "@/lib/helpers";

export interface DisplayTask {
  id: number;
  title: string;
  description: string;
  time: string;
  link: string;
  type: "product_approval" | "stock_approval" | "other";
}

export function DashboardTasks() {
  const [tasks, setTasks] = useState<DisplayTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const response = await fetchUserTasks();
      const responseData: ApiTask[] = response.data;
      // Filter only pending tasks
      const pendingTasks = responseData.filter((task) => task.status === "not_started");

      // Convert API tasks to display format
      const convertedTasks = pendingTasks.map((task) => {
        // Determine task type based on action category
        let taskType: "product_approval" | "stock_approval" | "other" = "other";

        if (task.step.action_details.category.code.includes("product")) {
          taskType = "product_approval";
        } else if (task.step.action_details.category.code.includes("stock")) {
          taskType = "stock_approval";
        }

        // Build link based on action type
        let link = "$";

        if (taskType === "product_approval") {
          link = `/inventory/products/${task.object_id}`;
        }
        // else if (taskType === "stock_approval") {
        //   link = `/inventory/stock/${task.object_id}`
        // }

        return {
          id: task.id,
          title: task.step.step_name,
          description:
            task.content_object || `Approval needed for ${task.step.action_details.label}`,
          time: formatDistanceToNow(new Date(task.updated_at), {addSuffix: true}),
          link,
          type: taskType,
        };
      });

      setTasks(convertedTasks);
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();

    // Set up polling to check for new tasks every minute
    const interval = setInterval(fetchTasks, 15000);

    return () => clearInterval(interval);
  }, []);

  const handleTaskClick = (link: string) => {
    // router.push(link)
  };

  const markTaskAsComplete = async (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      // Call API to mark task as completed
      await apiRequest.patch(`workflow/task/${taskId}/`, {
        status: "completed",
      });

      // Remove task from UI
      setTasks(tasks.filter((task) => task.id !== taskId));
    } catch (error) {
      console.error("Failed to complete task:", error);
    }
  };

  const viewAllTasks = () => {
    router.push("/tasks");
  };

  // Only show if there are tasks or loading state
  if (isLoading || tasks.length === 0) return null;

  return (
    <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-red-600 dark:text-red-400">
          <AlertTriangle className="mr-2 h-5 w-5" />
          Pending Tasks ({tasks.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex flex-col rounded-lg border bg-background p-4 shadow-sm cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => handleTaskClick(task.link)}
            >
              <div className="flex justify-between items-start">
                <h3 className="font-medium">{task.title}</h3>
                <Badge
                  variant={
                    task.type === "product_approval"
                      ? "destructive"
                      : task.type === "stock_approval"
                        ? "default"
                        : "outline"
                  }
                >
                  {task.type === "product_approval"
                    ? "Product"
                    : task.type === "stock_approval"
                      ? "Stock"
                      : "Other"}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{task.description}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{task.time}</span>
                <Button
                  className="h-8 px-2"
                  size="sm"
                  variant="ghost"
                  onClick={(e) => markTaskAsComplete(task.id, e)}
                >
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="sr-only">Mark as complete</span>
                </Button>
              </div>
            </div>
          ))}
        </div>

        {tasks.length > 2 && (
          <div className="mt-4 flex justify-end">
            <Button className="gap-1" variant="outline" onClick={viewAllTasks}>
              View All Tasks
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
