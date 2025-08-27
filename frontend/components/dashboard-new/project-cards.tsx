import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

const projects = [
  {
    title: "Mobile App Development",
    date: "Sep 12 2025",
    leads: ["JD", "AS"],
    tasks: 2,
    progress: 74,
    status: "In Progress",
    statusColor: "bg-blue-500",
    startDate: "Sep 12, 2025",
    endDate: "Sep 23, 2025",
    daysLeft: "3 Days Left",
  },
  {
    title: "Client Onboarding Portal",
    date: "Sep 15 2025",
    leads: ["MR"],
    tasks: 2,
    progress: 0,
    status: "Not Started",
    statusColor: "bg-gray-400",
    startDate: "Sep 15, 2025",
    endDate: "Sep 23, 2025",
    daysLeft: "3 days overdue",
    overdue: true,
  },
  {
    title: "Website Redesign",
    date: "Sep 15 2025",
    leads: ["KL", "TM"],
    tasks: 5,
    progress: 100,
    status: "Completed",
    statusColor: "bg-green-500",
    startDate: "Sep 16, 2025",
    endDate: "Oct 01, 2025",
    daysLeft: "Completed on time",
  },
]

export function ProjectCards() {
  return (
    <Card className="shadow-none border-none bg-white rounded-3xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-medium">Projects</CardTitle>
        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600">
          View More
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {projects.map((project, index) => (
            <Card key={index} className="border border-gray-200 shadow-sm shadow-gray-300">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-gray-500">{project.date}</p>
                      <h3 className="font-medium text-sm">{project.title}</h3>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Lead(s)</span>
                      <div className="flex -space-x-1">
                        {project.leads.map((lead, i) => (
                          <Avatar key={i} className="w-6 h-6 border-2 border-white">
                            <AvatarFallback className="text-xs">{lead}</AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500">{project.tasks} Tasks</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-1 rounded-full text-white ${project.statusColor}`}>
                        {project.status}
                      </span>
                      <span className="text-xs font-medium">{project.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1">
                      <div
                        className={`h-1 rounded-full ${project.statusColor}`}
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between text-xs text-gray-500">
                    <div>
                      <p>Start Date</p>
                      <p className="font-medium">{project.startDate}</p>
                    </div>
                    <div>
                      <p>End Date</p>
                      <p className="font-medium">{project.endDate}</p>
                    </div>
                  </div>

                  <p className={`text-xs ${project.overdue ? "text-red-500" : "text-purple-600"}`}>
                    {project.daysLeft}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
