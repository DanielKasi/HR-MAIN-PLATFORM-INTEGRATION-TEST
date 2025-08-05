import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function WorkingDaysSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </CardHeader>
      </Card>

      {/* Current Working Days Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {Array.from({ length: 7 }).map((_, index) => (
              <div key={index} className="text-center p-4 border rounded-lg">
                <Skeleton className="h-6 w-6 rounded-full mx-auto mb-2" />
                <Skeleton className="h-4 w-16 mx-auto mb-1" />
                <Skeleton className="h-3 w-12 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Form Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-4 w-32" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 7 }).map((_, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                  <Skeleton className="h-4 w-4" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-20" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
