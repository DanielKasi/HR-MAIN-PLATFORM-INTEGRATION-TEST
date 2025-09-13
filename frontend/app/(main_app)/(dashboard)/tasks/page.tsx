"use client"
import { useState, useEffect, useCallback, useRef } from "react"
import { Filter, Search, SortAsc, SortDesc, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { useSelector } from "react-redux"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"

import { selectUser } from "@/store/auth/selectors"
import { useDocumentTitle } from "@/hooks/use-document-title"
import type { ApprovalTaskType, ApprovalTaskStatus, ApprovalTask } from "@/types/approvals.types"
import { APPROVAL_TASKS_API } from "@/lib/api/approvals/utils"
import { getDashboardTasksAnalytics, showErrorToast } from "@/lib/utils"

export default function TasksPage() {
  const [tasks, setTasks] = useState<ApprovalTask[]>([])
  const [filteredTasks, setFilteredTasks] = useState<ApprovalTask[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nextUrl, setNextUrl] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const router = useRouter()
  const searchParams = useSearchParams()
  const taskType = (searchParams.get("type") || "all") as ApprovalTaskType
  const currentUser = useSelector(selectUser)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useDocumentTitle("TASKS")

  // Map task types to status filters
  const getStatusFromTaskType = (type: ApprovalTaskType): ApprovalTaskStatus | undefined => {
    switch (type) {
      case "incoming":
      case "open":
        return "pending"
      case "outgoing":
        return "approved"
      case "critical":
      case "expired":
        return "pending"
      default:
        return undefined
    }
  }

  const fetchTasks = useCallback(
    async (reset = false) => {
      if (!currentUser?.id) return

      try {
        setIsLoading(reset)
        setError(null)

        const status = getStatusFromTaskType(taskType)
        // const response = await APPROVAL_TASKS_API.fetchAll({
        //   // assigned_to: currentUser.id,
        //   status,
        //   page_size: 20,
        // })
        const response = await getDashboardTasksAnalytics()


        if (reset && taskType) {
          let filteredTasks: ApprovalTask[] = []
          if (taskType === "all") {
            filteredTasks = [...response.incoming.tasks, ...response.outgoing.tasks, ...response.critical.tasks, ...response.expired.tasks];
          }
          else {
            filteredTasks = response[taskType as keyof typeof response]?.tasks || [];
          }
          setTasks(filteredTasks);
        }
        // setNextUrl(response.next)
        // setHasMore(!!response.next)
        setHasMore(false) // Disable infinite scroll for now
      } catch (err) {
        showErrorToast({ error: err, defaultMessage: "Failed to fetch tasks" })
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    },
    [currentUser?.id, taskType],
  )

  const loadMoreTasks = useCallback(async () => {
    if (!nextUrl || isLoadingMore) return

    try {
      setIsLoadingMore(true)
      const response = await APPROVAL_TASKS_API.fetchPaginatedTasksFromUrl(nextUrl)

      setTasks((prev) => [...prev, ...response.results])
      setNextUrl(response.next)
      setHasMore(!!response.next)
    } catch (err) {
      setError("Failed to load more tasks")
      console.error("Error loading more tasks:", err)
    } finally {
      setIsLoadingMore(false)
    }
  }, [nextUrl, isLoadingMore])

  const lastTaskElementRefCallback = useCallback(
    (node: HTMLDivElement) => {
      if (isLoadingMore) return
      if (observerRef.current) observerRef.current.disconnect()

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          loadMoreTasks()
        }
      })

      if (node) observerRef.current.observe(node)
    },
    [isLoadingMore, hasMore, loadMoreTasks],
  )

  // Initial fetch and refetch when task type changes
  useEffect(() => {
    fetchTasks(true)
  }, [fetchTasks])

  // Apply search and sort filters
  useEffect(() => {
    let filtered = [...tasks]

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (task) =>
          task.level.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.level.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Apply sorting by updated_at
    filtered.sort((a, b) => {
      const timeA = new Date(a.updated_at).getTime()
      const timeB = new Date(b.updated_at).getTime()
      return sortOrder === "asc" ? timeA - timeB : timeB - timeA
    })

    setFilteredTasks(filtered)
  }, [tasks, searchQuery, sortOrder])

  const getStatusIcon = (status: ApprovalTaskStatus) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4" />
      case "approved":
        return <CheckCircle className="h-4 w-4" />
      case "rejected":
        return <XCircle className="h-4 w-4" />
      case "terminated":
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: ApprovalTaskStatus) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "approved":
        return "bg-green-100 text-green-800 border-green-200"
      case "rejected":
        return "bg-red-100 text-red-800 border-red-200"
      case "terminated":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-blue-100 text-blue-800 border-blue-200"
    }
  }

  const handleTaskClick = (task: ApprovalTask) => {
    // Navigate to the object that needs approval - this would need to be customized based on your routing
    router.push(`/approvals/${task.id}`)
  }

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
  }

  const refreshTasks = () => {
    fetchTasks(true)
  }

  // Loading UI
  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Loading Tasks...</CardTitle>
            <CardDescription>Please wait while we fetch your tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
                  <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                  </div>
                  <div className="h-6 w-16 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>
        <div className="flex items-center gap-2">
          <Badge className="text-sm" variant="outline">
            {filteredTasks.length} {filteredTasks.length === 1 ? "Task" : "Tasks"}
          </Badge>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-destructive">
          <p>{error}</p>
          <Button className="mt-2 bg-transparent" size="sm" variant="outline" onClick={refreshTasks}>
            Retry
          </Button>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            <span className="capitalize">{taskType}</span> Tasks
          </CardTitle>
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
                <Button className="h-9 w-9 bg-transparent" size="icon" variant="outline" onClick={toggleSortOrder}>
                  {sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                </Button>
                <Button className="h-9 w-9 bg-transparent" size="icon" variant="outline" onClick={refreshTasks}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {filteredTasks.length > 0 ? (
              <div className="space-y-3">
                {filteredTasks.map((task, index) => (
                  <div
                    key={task.id}
                    ref={index === filteredTasks.length - 1 ? lastTaskElementRefCallback : undefined}
                    className="flex items-center space-x-4 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => handleTaskClick(task)}
                  >
                    <div
                      className={`flex items-center justify-center w-10 h-10 rounded-full border ${getStatusColor(task.status)}`}
                    >
                      {getStatusIcon(task.status)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm truncate">
                          {task.level.name || `Level ${task.level.level}`}
                        </h3>
                        <Badge variant="outline" className="text-xs">
                          {task.status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{task.level.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Updated {formatDistanceToNow(new Date(task.updated_at), { addSuffix: true })}</span>
                        {task.approved_by_fullname && (
                          <>
                            <Separator orientation="vertical" className="h-3" />
                            <span>By {task.approved_by_fullname}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDistanceToNow(new Date(task.updated_at))}
                    </div>
                  </div>
                ))}

                {isLoadingMore && (
                  <div className="flex items-center justify-center p-4">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    <span className="text-sm text-muted-foreground">Loading more tasks...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-[200px] items-center justify-center rounded-md border border-dashed">
                <div className="flex flex-col items-center justify-center text-center p-4">
                  <div className="rounded-full bg-muted p-3">
                    <Filter className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">No tasks found</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    No tasks match your current search. Try adjusting your search terms.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
