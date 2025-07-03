"use client";

import type React from "react";

import {useState, useEffect} from "react";
import {Filter, Search, SortAsc, SortDesc} from "lucide-react";
import {useRouter, useSearchParams} from "next/navigation";
import {formatDistanceToNow} from "date-fns";
import {useSelector} from "react-redux";

import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Input} from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {useWebSocket} from "@/lib/WebSocketProvider";
import {selectUser} from "@/store/auth/selectors";

export interface DisplayTask {
  id: number;
  title: string;
  description: string;
  time: string;
  link: string;
  type:
    | "product_approval"
    | "stock_approval"
    | "purchase_order_approval"
    | "stock_movement_to_branch"
    | "stock_movement_to_shelf"
    | "return_request"
    | "other";
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<DisplayTask[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<DisplayTask[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const taskId = useSearchParams().get("taskId");
  const currentUser = useSelector(selectUser);
  const {tasks: apiTasks, connected, sendMessage} = useWebSocket();

  // Convert API tasks to display format
  useEffect(() => {
    if (!apiTasks) {
      setIsLoading(true);

      return;
    }

    setIsLoading(false);
    setError(null);

    // Convert API tasks to display format
    const convertedTasks = apiTasks
      .filter(
        (task) =>
          task.status === "pending" &&
          (task.step.roles_details.find((role: {id: number}) =>
            currentUser?.roles.some((u_role) => u_role.id === role.id),
          ) ||
            task.step.approvers_details?.map(
              (appr: {approver_user: {user: {id: number | undefined}}}) =>
                appr.approver_user.user.id === currentUser?.id,
            )),
      )
      .map((task) => {
        // Determine task type based on action category
        let taskType:
          | "product_approval"
          | "purchase_order_approval"
          | "stock_movement_to_branch"
          | "stock_movement_to_shelf"
          | "return_request"
          | "other" = "other";

        if (task.step.action_details.code.toLowerCase().includes("product")) {
          taskType = "product_approval";
        } else if (task.step.action_details.code.toLowerCase().includes("purchase")) {
          taskType = "purchase_order_approval";
        } else if (task.step.action_details.code.toLowerCase().includes("branch")) {
          taskType = "stock_movement_to_branch";
        } else if (task.step.action_details.code.toLowerCase().includes("shelf")) {
          taskType = "stock_movement_to_shelf";
        } else if (task.step.action_details.code.toLowerCase().includes("return")) {
          taskType = "return_request";
        }

        // Build link based on action type
        let link = "#";

        if (taskType === "product_approval") {
          link = `/inventory/products/${task.object_id}`;
        } else if (taskType === "purchase_order_approval") {
          link = `/inventory/purchase-orders/${task.object_id}`;
        } else if (taskType === "stock_movement_to_branch") {
          link = `/main-branch-allocations/${task.object_id}`;
        } else if (taskType === "stock_movement_to_shelf") {
          link = `/main-branch-allocations/${task.object_id}`;
        } else if (taskType === "return_request") {
          link = `/return-requests/${task.object_id}`;
        }

        return {
          id: task.id,
          title: task.step.step_name,
          description: `Approval needed for ${task.step.action_details.label}`,
          time: formatDistanceToNow(new Date(task.updated_at), {
            addSuffix: true,
          }),
          link,
          type: taskType,
        };
      });

    setTasks(convertedTasks as any);
  }, [apiTasks, currentUser]);

  // Request fresh data when component mounts
  useEffect(() => {
    if (connected) {
      sendMessage({type: "fetch_tasks"});
    }
  }, [connected, sendMessage]);

  useEffect(() => {
    applyFilters(tasks, searchQuery, filterType, sortOrder, taskId);
  }, [searchQuery, filterType, sortOrder, tasks, taskId]);

  const applyFilters = (
    tasks: DisplayTask[],
    search: string,
    type = "all",
    sort: "asc" | "desc",
    id: string | null = null,
  ) => {
    let filtered = [...tasks];

    // Apply search filter
    if (search) {
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(search.toLowerCase()) ||
          task.description.toLowerCase().includes(search.toLowerCase()),
      );
    }
    if (id) {
      filtered = filtered.filter((task) => task.id.toString() === id);
    }
    // Apply type filter
    if (type && type !== "all") {
      filtered = filtered.filter((task) => task.type === type);
    }

    // Apply sorting by time
    filtered.sort((a, b) => {
      // Convert human-readable time to date for accurate sorting
      const timeA = new Date(a.time.replace("ago", "ago")).getTime();
      const timeB = new Date(b.time.replace("ago", "ago")).getTime();

      return sort === "asc" ? timeA - timeB : timeB - timeA;
    });

    setFilteredTasks(filtered);
  };

  const handleTaskClick = (link: string) => {
    router.push(link);
  };

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  const refreshTasks = () => {
    if (connected) {
      sendMessage({type: "fetch_tasks"});
    }
  };

  // Loading UI with skeleton
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Pending Tasks</CardTitle>
            <CardDescription>Loading tasks...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex w-full items-center gap-2 md:w-1/2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input disabled className="h-9" placeholder="Search tasks..." />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <div className="h-9 w-[180px] animate-pulse rounded-md bg-muted" />
                  </div>
                  <div className="h-9 w-9 animate-pulse rounded-md bg-muted" />
                </div>
              </div>
              <div className="flex h-[200px] items-center justify-center">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="h-16 w-16 animate-pulse rounded-full bg-muted" />
                  <h3 className="mt-4 text-lg font-semibold">Loading tasks</h3>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <div className="flex items-center gap-2">
          <Badge className="text-sm" variant="outline">
            {filteredTasks.length} {filteredTasks.length === 1 ? "Task" : "Tasks"}
          </Badge>
          {!connected && (
            <Badge className="text-sm" variant="destructive">
              Offline
            </Badge>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          <p>{error}</p>
          <Button className="mt-2" size="sm" variant="outline" onClick={refreshTasks}>
            Retry
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Pending Tasks</CardTitle>
          <CardDescription>Tasks that require your attention and action</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex w-full items-center gap-2 md:w-1/2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  className="h-9"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="h-9 w-[180px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="product_approval">Product Approval</SelectItem>
                      <SelectItem value="stock_approval">Stock Approval</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="h-9 w-9" size="icon" variant="outline" onClick={toggleSortOrder}>
                  {sortOrder === "asc" ? (
                    <SortAsc className="h-4 w-4" />
                  ) : (
                    <SortDesc className="h-4 w-4" />
                  )}
                </Button>
                <Button className="h-9 w-9" size="icon" variant="outline" onClick={refreshTasks}>
                  <svg
                    className="lucide lucide-refresh-cw"
                    fill="none"
                    height="16"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    width="16"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                    <path d="M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                    <path d="M3 21v-5h5" />
                  </svg>
                </Button>
              </div>
            </div>

            {filteredTasks.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => (
                    <TableRow
                      key={task.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleTaskClick(task.link)}
                    >
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell className="hidden md:table-cell">{task.description}</TableCell>
                      <TableCell>
                        <Badge
                          className="text-xs"
                          variant={
                            task.type === "product_approval"
                              ? "destructive"
                              : task.type === "purchase_order_approval"
                                ? "success"
                                : task.type === "stock_approval"
                                  ? "default"
                                  : task.type === "stock_movement_to_branch"
                                    ? "warning"
                                    : task.type === "stock_movement_to_shelf"
                                      ? "secondary"
                                      : task.type === "return_request"
                                        ? "info"
                                        : "outline"
                          }
                        >
                          {task.type === "product_approval"
                            ? "Product"
                            : task.type === "purchase_order_approval"
                              ? "Purchase Order"
                              : task.type === "stock_approval"
                                ? "Stock"
                                : task.type === "stock_movement_to_branch"
                                  ? "Stock Allocation To Branch"
                                  : task.type === "stock_movement_to_shelf"
                                    ? "Stock Allocation To Shelf"
                                    : task.type === "return_request"
                                      ? "Return Request"
                                      : "Other"}
                        </Badge>
                      </TableCell>
                      <TableCell>{task.time}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed">
                <div className="flex flex-col items-center justify-center text-center p-4">
                  <div className="rounded-full bg-muted p-3">
                    <Filter className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">No tasks found</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    No tasks match your current filters. Try changing your search or filter
                    settings.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
