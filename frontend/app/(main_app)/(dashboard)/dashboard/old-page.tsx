"use client";

import { SetStateAction, useEffect, useState, useMemo } from "react";
import {
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  Calendar,
  Clock,
  Coins,
  Award,
  AlertTriangle,
  Building,
  GraduationCap,
  Heart,
  MapPin,
  Bell,
  FileText,
  Plus,
  Download,
  Eye,
  Send,
  UserPlus,
  BarChart3,
  PieChart,
  Target,
  Globe,
  BookOpen,
  Zap,
  Star,
  Briefcase,
  Settings,
  CheckCircle2,
  XCircle,
  Megaphone,
} from "lucide-react";

// HR Dashboard Components
import { useSelector } from "react-redux";
import {
  selectUser,
  selectSelectedInstitution,
  selectAttachedInstitutions,
} from "@/store/auth/selectors";
import {
  getPaginatedEmployees,
  getLeaveApplications,
  getJobPositionAdverts,
  getInterviews,
  getLeaveTypes,
  getLeavePolicies,
  getDepartments,
} from "@/lib/utils";
import { IUserInstitution, USER_GENDER } from "@/types";
import { SimpleCalendarWidget } from "@/components/calendar-widget";
import { TasksCards } from "@/components/dashboard_components/tasks-cards";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { IDepartment, IEmployee, IInterview, ILeaveRequest, ILeaveType, JobPositionAdvert } from "@/types/types.utils";
import { formatCurrency } from "@/lib/helpers";
import { Button } from "@/components/ui/button";


// Interface for leave applications
interface LeaveApplication {
  id: string | number;
  employee: {
    id: string;
    user: {
      fullname: string;
      email: string;
    };
    employee_id: string;
  };
  leave_type: {
    id: string | number;
    name: string;
    category: string;
  };
  start_date: string;
  end_date: string;
  duration_type?: string;
  reason: string;
  handover_notes?: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  approved_by?: {
    id: string;
    fullname: string;
  };
  approved_at?: string;
  rejection_reason?: string;
  total_days?: number;
  created_at?: string;
  updated_at?: string;
}

// Interface for job openings
interface JobAdvert {
  id: number;
  job_position_details?: {
    name: string;
  };
  status: "active" | "archived" | "expired" | "closed";
  expiry_date: string;
  published_date: string;
  number_of_employees_expected?: number;
  extra_information?: string;
}





interface LeavePolicy {
  id: number;
  name: string;
  is_active: boolean;
  requires_manager_approval: boolean;
  requires_hr_approval: boolean;
}

const capitalizeFirstLetter = (str: string) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const WelcomeCard = () => {
  const userData = useSelector(selectUser);
  const now = new Date();
  const hour = now.getHours();

  let greeting = "Hello";
  if (hour >= 5 && hour < 12) {
    greeting = "Good morning";
  } else if (hour >= 12 && hour < 17) {
    greeting = "Good afternoon";
  } else if (hour >= 17 && hour < 22) {
    greeting = "Good evening";
  }

  const fullNameRaw = userData?.fullname || "User";
  const fullName = capitalizeFirstLetter(fullNameRaw);

  return (
    <div className="bg-gradient-to-r from-primary to-primary/40 rounded-xl p-6 text-white">
      <h2 className="text-2xl font-bold mb-2">
        {greeting},{" "}
        {userData?.gender === USER_GENDER.MALE
          ? "Mr"
          : userData?.gender === USER_GENDER.FEMALE
            ? "Ms"
            : ""}.{" "}
        {fullName}
      </h2>
      <p className="opacity-90">Here's your HR dashboard overview for today</p>
    </div>
  );
};

const StatsCards = ({
  departmentId,
  employees,
  leaveApplications,
  jobAdverts,
  interviews,
  leaveTypes,
  leavePolicies,
  departments,
}: {
  departmentId: string;
  employees: IEmployee[];
  leaveApplications: ILeaveRequest[];
  jobAdverts: JobPositionAdvert[];
  interviews: IInterview[];
  leaveTypes: ILeaveType[];
  leavePolicies: LeavePolicy[];
  departments: IDepartment[];
}) => {
  // Fixed filtering logic - filter employees first
  const filteredEmployees = useMemo(() => {
    if (departmentId === "all") {
      return employees;
    }
    // Filter by department name matching the selected department
    return employees.filter(
      (emp) => emp.department?.name?.toLowerCase() === departmentId.toLowerCase(),
    );
  }, [employees, departmentId]);

  // Calculate stats from filtered employees and related data
  const stats = useMemo(() => {
    const totalEmployees = filteredEmployees.length;
    const activeEmployees = Array.isArray(filteredEmployees)
      ? filteredEmployees.filter((emp) => emp.is_active).length
      : 0;

    // Calculate new hires from filtered employees (joined in current month)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const newHires = Array.isArray(filteredEmployees)
      ? filteredEmployees.filter((emp) => {
        const joinDate = new Date(emp.date_of_joining);
        return joinDate.getMonth() === currentMonth && joinDate.getFullYear() === currentYear;
      }).length
      : 0;

    // Calculate turnover rate (rough estimate)
    const turnoverRate = 8.5; // This would need historical data

    // Calculate average salary from filtered employees
    const avgSalary =
      filteredEmployees.length > 0
        ? filteredEmployees.reduce((sum, emp) => {
          const baseSalary = 40000 + (emp.experience || 0) * 5000;
          return sum + baseSalary;
        }, 0) / filteredEmployees.length
        : 65000;

    // For leave applications - filter by department employees if not "all"
    const departmentEmployeeIds = new Set(
      Array.isArray(filteredEmployees) ? filteredEmployees.map((emp) => emp.id.toString()) : [],
    );

    const relevantLeaveApplications =
      departmentId === "all"
        ? leaveApplications
        : leaveApplications.filter((app) => departmentEmployeeIds.has(app.employee.toString()));

    const pendingLeaves = Array.isArray(relevantLeaveApplications)
      ? relevantLeaveApplications.filter((app) => app.status === "pending").length
      : 0;

    // For job openings and interviews, these are usually organization-wide
    const openPositions = Array.isArray(jobAdverts)
      ? jobAdverts.filter((advert) => advert.job_position_advert_status === "active").length
      : 0;

    const satisfactionScore = 4.2; // Static for now
    const completedInterviews = interviews.filter(
      (interview) => interview.status === "completed",
    ).length;

    const ratedInterviews = interviews.filter((interview) => interview.rating);
    const avgInterviewRating =
      ratedInterviews.length > 0
        ? ratedInterviews.reduce((sum, interview) => sum + (interview.rating || 0), 0) /
        ratedInterviews.length
        : 0;

    const activeLeaveTypes = Array.isArray(leaveTypes)
      ? leaveTypes.filter((type) => type.is_active).length
      : 0;

    const activePolicies = Array.isArray(leavePolicies)
      ? leavePolicies.filter((policy) => policy.is_active).length
      : 0;

    const scheduledInterviews = interviews.filter(
      (interview) => interview.status === "scheduled",
    ).length;
    const departmentsCount = departments.length;

    const departmentsWithEmployees = Array.isArray(employees)
      ? new Set(employees.map((emp) => emp.department?.name).filter(Boolean)).size
      : 0;

    const departmentUtilization =
      departmentsCount > 0 ? Math.round((departmentsWithEmployees / departmentsCount) * 100) : 0;

    const hrApprovalPolicies = Array.isArray(leavePolicies)
      ? leavePolicies.filter((policy) => policy.requires_hr_approval).length
      : 0;

    return {
      totalEmployees,
      activeEmployees,
      newHires,
      turnoverRate,
      avgSalary: Math.round(avgSalary),
      pendingLeaves,
      openPositions,
      satisfactionScore,
      completedInterviews,
      avgInterviewRating: Number(avgInterviewRating.toFixed(1)),
      activeLeaveTypes,
      activePolicies,
      scheduledInterviews,
      departmentsCount,
      departmentUtilization,
      hrApprovalPolicies,
    };
  }, [
    filteredEmployees,
    leaveApplications,
    jobAdverts,
    interviews,
    leaveTypes,
    leavePolicies,
    departments,
    departmentId,
    employees,
  ]);

  const statsData = [
    {
      title: "Total Employees",
      subtitle: departmentId === "all" ? "Current workforce count" : `In ${departmentId}`,
      value: stats.totalEmployees,
      change: `+${stats.newHires} this month`,
      icon: Users,
      color: "bg-blue-50 text-blue-600",
      trend: "up",
    },
    {
      title: "Active Employees",
      subtitle: "Currently active workforce",
      value: stats.activeEmployees,
      change:
        stats.totalEmployees > 0
          ? `${((stats.activeEmployees / stats.totalEmployees) * 100).toFixed(1)}% active`
          : "0% active",
      icon: UserCheck,
      color: "bg-green-50 text-green-600",
      trend: "up",
    },
    {
      title: "Open Positions",
      subtitle: "Active job postings",
      value: stats.openPositions,
      change: "Actively recruiting",
      icon: Briefcase,
      color: "bg-orange-50 text-myOrange",
      trend: "neutral",
    },
    {
      title: "Pending Leaves",
      subtitle: departmentId === "all" ? "Awaiting approval" : `From ${departmentId}`,
      value: stats.pendingLeaves,
      change: "Requires approval",
      icon: Calendar,
      color: "bg-yellow-50 text-yellow-600",
      trend: "neutral",
    },
    {
      title: "Completed Interviews",
      subtitle: "This period",
      value: stats.completedInterviews,
      change: `${stats.scheduledInterviews} scheduled`,
      icon: Users,
      color: "bg-purple-50 text-purple-600",
      trend: "up",
    },
    {
      title: "Interview Rating",
      subtitle: "Average candidate rating",
      value: `${stats.avgInterviewRating}/10`,
      change: "Overall performance",
      icon: Star,
      color: "bg-yellow-50 text-yellow-600",
      trend: "up",
    },
    {
      title: "Leave Types",
      subtitle: "Active leave categories",
      value: stats.activeLeaveTypes,
      change: "Available options",
      icon: FileText,
      color: "bg-indigo-50 text-indigo-600",
      trend: "neutral",
    },
    {
      title: "Leave Policies",
      subtitle: "Active policies",
      value: stats.activePolicies,
      change: `${stats.hrApprovalPolicies} require HR`,
      icon: Settings,
      color: "bg-gray-50 text-gray-600",
      trend: "neutral",
    },
    {
      title: "Departments",
      subtitle: "Total organizational units",
      value: stats.departmentsCount,
      change: `${stats.departmentUtilization}% have employees`,
      icon: Building,
      color: "bg-blue-50 text-blue-600",
      trend: "neutral",
    },
    {
      title: "Avg. Salary",
      subtitle: departmentId === "all" ? "Estimated average" : `In ${departmentId}`,
      value: formatCurrency(stats.avgSalary),
      change: "+5.2% YoY",
      icon: Coins,
      color: "bg-emerald-50 text-emerald-600",
      trend: "up",
    },
    // {
    //   title: "Turnover Rate",
    //   subtitle: "Quarterly rate",
    //   value: `${stats.turnoverRate}%`,
    //   change: "-2.1% from last quarter",
    //   icon: UserX,
    //   color: "bg-red-50 text-red-600",
    //   trend: "down",
    // },
    // {
    //   title: "Satisfaction Score",
    //   subtitle: "Employee happiness",
    //   value: `${stats.satisfactionScore}/5`,
    //   change: "+0.3 from last survey",
    //   icon: Heart,
    //   color: "bg-pink-50 text-pink-600",
    //   trend: "up",
    // },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
      {statsData.map((stat, index) => (
        <div
          key={index}
          className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${stat.color} shrink-0`}>
              <stat.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold text-gray-900 leading-tight">{stat.value}</h3>
                <div
                  className={`text-xs font-medium ${stat.trend === "up"
                      ? "text-green-600"
                      : stat.trend === "down"
                        ? "text-red-600"
                        : "text-gray-500"
                    }`}
                >
                  {stat.trend === "up" ? "↗" : stat.trend === "down" ? "↘" : "→"}
                </div>
              </div>
              <p className="text-sm font-medium text-gray-700 mb-1 leading-tight">{stat.title}</p>
              <p className="text-xs text-gray-500 mb-1 leading-tight">{stat.subtitle}</p>
              <p className="text-xs text-gray-400 leading-tight">{stat.change}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const WorkforceOverview = ({
  employees,
  departments,
  departmentId,
}: {
  employees: IEmployee[];
  departments: IDepartment[];
  departmentId: string;
}) => {
  // Filter employees based on selected department
  const filteredEmployees = useMemo(() => {
    if (!Array.isArray(employees)) return [];

    if (departmentId === "all") {
      return employees;
    }
    return employees.filter(
      (emp) => emp.department?.name?.toLowerCase() === departmentId.toLowerCase(),
    );
  }, [employees, departmentId]);

  // Calculate department distribution from filtered data
  const departmentData = useMemo(() => {
    if (!Array.isArray(filteredEmployees)) return [];

    const deptCounts = filteredEmployees.reduce(
      (acc, emp) => {
        const deptName = emp.department?.name || "Unassigned";
        acc[deptName] = (acc[deptName] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const total = filteredEmployees.length;

    const relevantDepartments =
      departmentId === "all"
        ? new Set([
          ...(Array.isArray(departments) ? departments.map((dept) => dept.name) : []),
          ...Object.keys(deptCounts),
        ])
        : new Set([departmentId, ...Object.keys(deptCounts)]);

    return Array.from(relevantDepartments)
      .map((name, index) => ({
        name,
        count: deptCounts[name] || 0,
        percentage: total > 0 ? Number(((deptCounts[name] || 0) / total) * 100).toFixed(1) : "0",
        color: [
          "bg-blue-500",
          "bg-green-500",
          "bg-purple-500",
          "bg-pink-500",
          "bg-yellow-500",
          "bg-indigo-500",
          "bg-gray-500",
          "bg-orange-500",
          "bg-red-500",
          "bg-teal-500",
          "bg-cyan-500",
          "bg-emerald-500",
        ][index % 12],
        isEmpty: (deptCounts[name] || 0) === 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredEmployees, departments, departmentId]);

  // Calculate job levels based on experience from filtered employees
  const jobLevels = useMemo(() => {
    const levelCounts = filteredEmployees.reduce(
      (acc, emp) => {
        const experience = emp.experience || 0;
        let level = "Junior";
        if (experience >= 8) level = "Executive";
        else if (experience >= 5) level = "Senior";
        else if (experience >= 2) level = "Mid-Level";

        acc[level] = (acc[level] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const total = filteredEmployees.length;
    const levels = ["Junior", "Mid-Level", "Senior", "Executive"];
    const colors = ["bg-green-400", "bg-blue-400", "bg-purple-400", "bg-red-400"];

    return levels.map((level, index) => ({
      level,
      count: levelCounts[level] || 0,
      percentage: total > 0 ? Math.round(((levelCounts[level] || 0) / total) * 100) : 0,
      color: colors[index],
    }));
  }, [filteredEmployees]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 ">
      <div className="bg-white rounded-xl p-2 md:p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Employee Distribution by Department
          {departmentId !== "all" && (
            <span className="text-sm font-normal text-gray-500">({departmentId})</span>
          )}
        </h3>
        <div className="space-y-4">
          {departmentData.map((dept, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${dept.color} ${dept.isEmpty ? "opacity-30" : ""}`}
                ></div>
                <span
                  className={`text-sm font-medium ${dept.isEmpty ? "text-gray-400" : "text-gray-700"}`}
                >
                  {dept.name} {dept.isEmpty && "(Empty)"}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${dept.color} ${dept.isEmpty ? "opacity-30" : ""}`}
                    style={{ width: `${dept.percentage}%` }}
                  ></div>
                </div>
                <span
                  className={`text-sm w-12 text-right ${dept.isEmpty ? "text-gray-400" : "text-gray-600"}`}
                >
                  {dept.count}
                </span>
                <span
                  className={`text-xs w-12 text-right ${dept.isEmpty ? "text-gray-400" : "text-gray-500"}`}
                >
                  {dept.percentage}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Employee Distribution by Experience Level
          {departmentId !== "all" && (
            <span className="text-sm font-normal text-gray-500">({departmentId})</span>
          )}
        </h3>
        <div className="space-y-4">
          {jobLevels.map((level, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${level.color}`}></div>
                <span className="text-sm font-medium text-gray-700">{level.level}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1 w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${level.color}`}
                    style={{ width: `${level.percentage}%` }}
                  ></div>
                </div>
                <span className="text-sm text-gray-600 w-12 text-right">{level.count}</span>
                <span className="text-xs text-gray-500 w-12 text-right">{level.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const RecentActivities = ({
  employees,
  leaveApplications,
  interviews,
}: {
  employees: IEmployee[];
  leaveApplications: ILeaveRequest[];
  interviews: IInterview[];
}) => {
  const activities = useMemo(() => {
    const recentActivities: Array<{
      type: string;
      message: string;
      time: string;
      icon: any;
      color: string;
    }> = [];

    // Add recent hires (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentHires = Array.isArray(employees)
      ? employees
        .filter((emp) => {
          const joinDate = new Date(emp.date_of_joining);
          return joinDate > sevenDaysAgo;
        })
        .slice(0, 2)
      : [];

    recentHires.forEach((emp) => {
      const daysAgo = Math.floor(
        (Date.now() - new Date(emp.date_of_joining).getTime()) / (1000 * 60 * 60 * 24),
      );
      recentActivities.push({
        type: "hire",
        message: `${(emp.user as any)?.fullname || emp.email} joined ${emp.department?.name || "the company"}`,
        time: daysAgo === 0 ? "Today" : daysAgo === 1 ? "1 day ago" : `${daysAgo} days ago`,
        icon: UserCheck,
        color: "text-green-600",
      });
    });

    // Add recent leave applications
    const recentLeaveApps = Array.isArray(leaveApplications)
      ? leaveApplications
        .filter((app) => app.created_at && new Date(app.created_at) > sevenDaysAgo)
        .slice(0, 2)
      : [];

    recentLeaveApps.forEach((app) => {
      const daysAgo = app.created_at
        ? Math.floor((Date.now() - new Date(app.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      recentActivities.push({
        type: "leave",
        message: `${(app.employee as any)?.user?.fullname || "Employee"} submitted ${(app.leave_type as any)?.name || "leave"} request`,
        time: daysAgo === 0 ? "Today" : daysAgo === 1 ? "1 day ago" : `${daysAgo} days ago`,
        icon: Calendar,
        color: "text-blue-600",
      });
    });

    // Add recent interviews
    const recentInterviews = interviews
      .filter((interview) => {
        const interviewDate = new Date(interview.interview_date);
        return interviewDate > sevenDaysAgo;
      })
      .slice(0, 2);

    recentInterviews.forEach((interview) => {
      const daysAgo = Math.floor(
        (Date.now() - new Date(interview.interview_date).getTime()) / (1000 * 60 * 60 * 24),
      );
      recentActivities.push({
        type: "interview",
        message: `Interview ${interview.status} for ${interview.job_position_application_details?.applicant_name || "candidate"}`,
        time: daysAgo === 0 ? "Today" : daysAgo === 1 ? "1 day ago" : `${daysAgo} days ago`,
        icon: Users,
        color: interview.status === "completed" ? "text-green-600" : "text-blue-600",
      });
    });

    // Add fallback activities if no recent data
    if (recentActivities.length === 0) {
      recentActivities.push(
        {
          type: "system",
          message: "Dashboard data refreshed",
          time: "Just now",
          icon: Award,
          color: "text-blue-600",
        },
        {
          type: "info",
          message: "No recent activities found",
          time: "Today",
          icon: Clock,
          color: "text-gray-600",
        },
      );
    }

    return recentActivities.slice(0, 5);
  }, [employees, leaveApplications, interviews]);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <Clock className="h-5 w-5" />
        Recent Activities
      </h3>
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className={`p-2 rounded-full bg-gray-100 ${activity.color}`}>
              <activity.icon className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{activity.message}</p>
              <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const QuickActions = () => {
  const actions: Array<{
    title: string;
    icon: any;
    color: string;
    actionUrl?: string;
  }> = [
      { title: "Add New Employee", icon: UserPlus, color: "bg-blue-500 hover:bg-blue-600", actionUrl: "/employees/add-employee" },
      { title: "Leave Management", icon: Calendar, color: "bg-green-500 hover:bg-green-600", actionUrl: "/leave/leave-policy" },
      { title: "Schedule Interview", icon: Clock, color: "bg-orange-500 hover:bg-orange-600", actionUrl: "/job-interviews/create" },
      { title: "Post Job Opening", icon: Megaphone, color: "bg-purple-500 hover:bg-purple-600", actionUrl: "/job-adverts/create" },
      // {title: "View Reports", icon: BarChart3, color: "bg-indigo-500 hover:bg-indigo-600"},
      // {title: "Manage Policies", icon: Settings, color: "bg-gray-500 hover:bg-gray-600", actionUrl:"/leave/leave-policy"},
    ];

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <Zap className="h-5 w-5" />
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => (
          <Link href={action.actionUrl || "#"}
            key={index}
            className={`${action.color} text-white p-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 hover:transform hover:scale-105 hover:shadow-lg`}
          >
            <action.icon className="h-4 w-4" />
            <span className="hidden lg:inline">{action.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

const UpcomingEvents = () => {
  const events = [
    {
      title: "Team Building Workshop",
      date: "Jul 22, 2025",
      time: "10:00 AM",
      attendees: 25,
      type: "Workshop",
    },
    {
      title: "Monthly All-Hands Meeting",
      date: "Jul 28, 2025",
      time: "2:00 PM",
      attendees: 247,
      type: "Meeting",
    },
    {
      title: "New Employee Orientation",
      date: "Aug 1, 2025",
      time: "9:00 AM",
      attendees: 8,
      type: "Training",
    },
    {
      title: "Performance Review Deadline",
      date: "Aug 5, 2025",
      time: "End of Day",
      attendees: 45,
      type: "Deadline",
    },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case "Workshop":
        return "bg-blue-100 text-blue-800";
      case "Meeting":
        return "bg-green-100 text-green-800";
      case "Training":
        return "bg-purple-100 text-purple-800";
      case "Deadline":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <Calendar className="h-5 w-5" />
        Upcoming Events
      </h3>
      <div className="space-y-4">
        {events.map((event, index) => (
          <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">{event.title}</h4>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(event.type)}`}
              >
                {event.type}
              </span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>{event.date}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                <span>{event.time}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                <span>{event.attendees} people</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const NotificationsPanel = ({
  leaveApplications,
  interviews,
}: {
  leaveApplications: ILeaveRequest[];
  interviews: IInterview[];
}) => {
  const notifications = useMemo(() => {
    const notifs = [];

    const pendingLeaves = Array.isArray(leaveApplications)
      ? leaveApplications.filter((app) => app.status === "pending").length
      : 0;

    if (pendingLeaves > 0) {
      notifs.push({
        type: "leave",
        message: `${pendingLeaves} leave ${pendingLeaves === 1 ? "request" : "requests"} awaiting approval`,
        icon: "📅",
        color: "text-myOrange",
        urgent: true,
      });
    }

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const upcomingInterviews = interviews.filter((interview) => {
      const interviewDate = new Date(interview.interview_date);
      return (
        interview.status === "scheduled" && interviewDate >= today && interviewDate <= tomorrow
      );
    }).length;

    if (upcomingInterviews > 0) {
      notifs.push({
        type: "interview",
        message: `${upcomingInterviews} ${upcomingInterviews === 1 ? "interview" : "interviews"} scheduled soon`,
        icon: "👥",
        color: "text-blue-600",
        urgent: false,
      });
    }

    notifs.push(
      {
        type: "birthday",
        message: "5 employees have birthdays this week",
        icon: "🎂",
        color: "text-pink-600",
        urgent: false,
      },
      {
        type: "policy",
        message: "New HR policy update available",
        icon: "📋",
        color: "text-blue-600",
        urgent: false,
      },
    );

    return notifs.slice(0, 4);
  }, [leaveApplications, interviews]);

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <Bell className="h-5 w-5" />
        Notifications & Alerts
      </h3>
      <div className="space-y-4">
        {notifications.map((notification, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg border-l-4 ${notification.urgent ? "border-red-500 bg-red-50" : "border-blue-500 bg-blue-50"
              }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-lg">{notification.icon}</span>
              <div className="flex-1">
                <p className={`text-sm font-medium ${notification.color}`}>
                  {notification.message}
                </p>
                {notification.urgent && (
                  <span className="text-xs text-red-600 font-semibold">Urgent</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function HRDashboard() {
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [leaveApplications, setLeaveApplications] = useState<ILeaveRequest[]>([]);
  const [jobAdverts, setJobAdverts] = useState<JobPositionAdvert[]>([]);
  const [interviews, setInterviews] = useState<IInterview[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<ILeaveType[]>([]);
  const [departments, setDepartments] = useState<IDepartment[]>([]);
  const [leavePolicies, setLeavePolicies] = useState<LeavePolicy[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Redux selectors
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const institutionsAttached = useSelector(selectAttachedInstitutions) as IUserInstitution[];
  const [institutionId, setInstitutionId] = useState<string | null>(null);

  // Set institution ID
  useEffect(() => {
    if (selectedInstitution) {
      setInstitutionId(selectedInstitution.id.toString());
    } else if (institutionsAttached && institutionsAttached.length > 0) {
      const id = String(institutionsAttached[0].id);
      setInstitutionId(id);
    }
  }, [institutionsAttached, selectedInstitution]);

  useEffect(() => {
    const loadData = async () => {
      if (!selectedInstitution?.id) return;

      try {
        const institutionIdNumber = parseInt(selectedInstitution.id.toString(), 10);

        const [
          employeesResult,
          leaveAppsResult,
          jobAdvertsResult,
          interviewsResult,
          leaveTypesResult,
          leavePoliciesResult,
          departmentsResult,
        ] = await Promise.all([
          getPaginatedEmployees({ institutionId: institutionIdNumber }),
          getLeaveApplications({ institutionId: institutionIdNumber }),
          getJobPositionAdverts({ institutionId: institutionIdNumber }),
          getInterviews({ institutionId: institutionIdNumber }),
          getLeaveTypes({ institutionId: institutionIdNumber }),
          getLeavePolicies({ institutionId: institutionIdNumber }),
          getDepartments({ institutionId: institutionIdNumber }),
        ]);

        setEmployees(employeesResult.results || []); // Ensure results is an array

        setLeaveApplications(leaveAppsResult);

        setJobAdverts(jobAdvertsResult.results);

        setInterviews(interviewsResult);
        setLeaveTypes(leaveTypesResult);

        setDepartments(departmentsResult);

        setLeavePolicies((leavePoliciesResult as any) || []);

        setError(null);
      } catch (err) {
        setError("Failed to load data");
        setEmployees([]);
        setLeaveApplications([]);
        setJobAdverts([]);
        setInterviews([]);
        setLeaveTypes([]);
        setLeavePolicies([]);
        setDepartments([]);
      }
    };

    loadData();
  }, [institutionId]);



  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleDepartmentChange = (value: SetStateAction<string>) => {
    setSelectedDepartment(value);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg "
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 py-6">
        <div className="space-y-6">
          <WelcomeCard />

          {isMounted && (
            <>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
                <h1 className="text-xl lg:text-xl font-bold tracking-tight text-gray-900">HR Dashboard</h1>

                <div className="flex items-center gap-4">
                  <Select onValueChange={handleDepartmentChange} value={selectedDepartment}>
                    <SelectTrigger className="min-w-48 lg:min-w-64 w-full max-w-80">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent className="min-w-48 lg:min-w-64 w-full max-w-80">
                      <SelectItem value={"all"}>
                        All departments
                      </SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.id.toString()}>
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TasksCards branchId={null} />{" "}

              {/* Enhanced Stats Cards with fixed filtering and compact layout */}
              <StatsCards
                departmentId={selectedDepartment}
                employees={employees}
                leaveApplications={leaveApplications}
                jobAdverts={jobAdverts}
                interviews={interviews}
                leaveTypes={leaveTypes}
                leavePolicies={leavePolicies}
                departments={departments}
              />

              {/* Workforce Overview Charts with department filtering */}
              <WorkforceOverview
                employees={employees}
                departments={departments}
                departmentId={selectedDepartment}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <NotificationsPanel leaveApplications={leaveApplications} interviews={interviews} />
                <QuickActions />
              </div>

              {/* Recent Activities and Upcoming Events */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <RecentActivities
                  employees={employees}
                  leaveApplications={leaveApplications}
                  interviews={interviews}
                />
                <UpcomingEvents />
                <SimpleCalendarWidget />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
