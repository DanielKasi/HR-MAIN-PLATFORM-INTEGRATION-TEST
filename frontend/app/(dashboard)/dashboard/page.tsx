"use client";

import {SetStateAction, useEffect, useState} from "react";
import {
  Users,
  UserCheck,
  UserX,
  TrendingUp,
  Calendar,
  Clock,
  DollarSign,
  Award,
  AlertTriangle,
  Building,
  GraduationCap,
  Heart,
  MapPin
} from "lucide-react";

// HR Dashboard Components
import { useSelector } from "react-redux";
import { selectUser } from "@/store/auth/selectors";

const WelcomeCard = () => {
  const userData = useSelector(selectUser);
  const now = new Date("2025-06-26T10:43:54+03:00");
  const hour = now.getHours();

  let greeting = "Hello";
  if (hour >= 5 && hour < 12) {
    greeting = "Good morning";
  } else if (hour >= 12 && hour < 17) {
    greeting = "Good afternoon";
  } else if (hour >= 17 && hour < 22) {
    greeting = "Good evening";
  } else {
    greeting = "Hello";
  }

  const fullName = userData?.fullname || "User";

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
      <h2 className="text-2xl font-bold mb-2">{greeting} {fullName}</h2>
      <p className="opacity-90">Here's your HR dashboard overview for today</p>
    </div>
  );
};

const StatsCards = ({ departmentId }: { departmentId: string }) => {
  const [stats, setStats] = useState({
    totalEmployees: 247,
    activeEmployees: 238,
    newHires: 12,
    turnoverRate: 8.5,
    avgSalary: 65000,
    pendingLeaves: 15,
    openPositions: 8,
    satisfactionScore: 4.2
  });

  const statsData = [
    {
      title: "Total Employees",
      value: stats.totalEmployees,
      change: "+12 this month",
      icon: Users,
      color: "bg-blue-50 text-blue-600",
      trend: "up"
    },
    {
      title: "Active Employees",
      value: stats.activeEmployees,
      change: "96.4% active",
      icon: UserCheck,
      color: "bg-green-50 text-green-600",
      trend: "up"
    },
    {
      title: "New Hires",
      value: stats.newHires,
      change: "This month",
      icon: TrendingUp,
      color: "bg-purple-50 text-purple-600",
      trend: "up"
    },
    {
      title: "Turnover Rate",
      value: `${stats.turnoverRate}%`,
      change: "-2.1% from last quarter",
      icon: UserX,
      color: "bg-orange-50 text-orange-600",
      trend: "down"
    },
    {
      title: "Avg. Salary",
      value: `$${stats.avgSalary.toLocaleString()}`,
      change: "+5.2% YoY",
      icon: DollarSign,
      color: "bg-emerald-50 text-emerald-600",
      trend: "up"
    },
    {
      title: "Pending Leaves",
      value: stats.pendingLeaves,
      change: "Requires approval",
      icon: Calendar,
      color: "bg-yellow-50 text-yellow-600",
      trend: "neutral"
    },
    {
      title: "Open Positions",
      value: stats.openPositions,
      change: "Actively recruiting",
      icon: AlertTriangle,
      color: "bg-red-50 text-red-600",
      trend: "neutral"
    },
    {
      title: "Satisfaction Score",
      value: `${stats.satisfactionScore}/5`,
      change: "+0.3 from last survey",
      icon: Heart,
      color: "bg-pink-50 text-pink-600",
      trend: "up"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statsData.map((stat, index) => (
        <div key={index} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <div className={`p-3 rounded-lg ${stat.color}`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div className={`text-sm font-medium ${
              stat.trend === 'up' ? 'text-green-600' : 
              stat.trend === 'down' ? 'text-red-600' : 'text-gray-500'
            }`}>
              {stat.trend === 'up' ? '↗' : stat.trend === 'down' ? '↘' : '→'}
            </div>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
          <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
          <p className="text-xs text-gray-500">{stat.change}</p>
        </div>
      ))}
    </div>
  );
};

const EmployeeDistribution = () => {
  const departments = [
    { name: "Engineering", count: 78, percentage: 31.6, color: "bg-blue-500" },
    { name: "Sales", count: 45, percentage: 18.2, color: "bg-green-500" },
    { name: "Marketing", count: 32, percentage: 13.0, color: "bg-purple-500" },
    { name: "HR", count: 18, percentage: 7.3, color: "bg-pink-500" },
    { name: "Finance", count: 22, percentage: 8.9, color: "bg-yellow-500" },
    { name: "Operations", count: 28, percentage: 11.3, color: "bg-indigo-500" },
    { name: "Legal", count: 8, percentage: 3.2, color: "bg-gray-500" },
    { name: "Others", count: 16, percentage: 6.5, color: "bg-orange-500" }
  ];

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Employee Distribution by Department</h3>
      <div className="space-y-4">
        {departments.map((dept, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${dept.color}`}></div>
              <span className="text-sm font-medium text-gray-700">{dept.name}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 w-24 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${dept.color}`}
                  style={{ width: `${dept.percentage}%` }}
                ></div>
              </div>
              <span className="text-sm text-gray-600 w-12 text-right">{dept.count}</span>
              <span className="text-xs text-gray-500 w-12 text-right">{dept.percentage}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const RecentActivities = () => {
  const activities = [
    {
      type: "hire",
      message: "John Smith joined Engineering team",
      time: "2 hours ago",
      icon: UserCheck,
      color: "text-green-600"
    },
    {
      type: "leave",
      message: "Sarah Johnson submitted vacation request",
      time: "4 hours ago",
      icon: Calendar,
      color: "text-blue-600"
    },
    {
      type: "performance",
      message: "Q1 performance reviews completed",
      time: "1 day ago",
      icon: Award,
      color: "text-purple-600"
    },
    {
      type: "training",
      message: "5 employees completed safety training",
      time: "2 days ago",
      icon: GraduationCap,
      color: "text-orange-600"
    },
    {
      type: "alert",
      message: "Contract renewal due for 3 employees",
      time: "3 days ago",
      icon: AlertTriangle,
      color: "text-red-600"
    }
  ];

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Recent Activities</h3>
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div key={index} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
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

const UpcomingEvents = () => {
  const events = [
    {
      title: "Team Building Workshop",
      date: "Jun 22, 2025",
      time: "10:00 AM",
      attendees: 25,
      type: "Workshop"
    },
    {
      title: "Monthly All-Hands Meeting",
      date: "Jun 28, 2025",
      time: "2:00 PM",
      attendees: 247,
      type: "Meeting"
    },
    {
      title: "New Employee Orientation",
      date: "Jul 1, 2025",
      time: "9:00 AM",
      attendees: 8,
      type: "Training"
    },
    {
      title: "Performance Review Deadline",
      date: "Jul 5, 2025",
      time: "End of Day",
      attendees: 45,
      type: "Deadline"
    }
  ];

  const getTypeColor = (type: string) => {
    switch(type) {
      case 'Workshop': return 'bg-blue-100 text-blue-800';
      case 'Meeting': return 'bg-green-100 text-green-800';
      case 'Training': return 'bg-purple-100 text-purple-800';
      case 'Deadline': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Upcoming Events</h3>
      <div className="space-y-4">
        {events.map((event, index) => (
          <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-gray-900">{event.title}</h4>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(event.type)}`}>
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

const QuickActions = () => {
  const actions = [
    { title: "Add New Employee", icon: Users, color: "bg-blue-500 hover:bg-blue-600" },
    { title: "Approve Leave Requests", icon: Calendar, color: "bg-green-500 hover:bg-green-600" },
    { title: "View Reports", icon: TrendingUp, color: "bg-purple-500 hover:bg-purple-600" },
    { title: "Schedule Interview", icon: Clock, color: "bg-orange-500 hover:bg-orange-600" }
  ];

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => (
          <button
            key={index}
            className={`${action.color} text-white p-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 hover:transform hover:scale-105`}
          >
            <action.icon className="h-4 w-4" />
            {action.title}
          </button>
        ))}
      </div>
    </div>
  );
};

export default function HRDashboard() {
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [departments, setDepartments] = useState([
    { id: "all", name: "All Departments" },
    { id: "engineering", name: "Engineering" },
    { id: "sales", name: "Sales" },
    { id: "marketing", name: "Marketing" },
    { id: "hr", name: "Human Resources" },
    { id: "finance", name: "Finance" },
    { id: "operations", name: "Operations" }
  ]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleDepartmentChange = (value: SetStateAction<string>) => {
    setSelectedDepartment(value);
  };

  const getDepartmentLabel = (deptId: string) => {
    const dept = departments.find((d) => d.id === deptId);
    return dept ? dept.name : "Select department";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 py-6 ">
        <div className="space-y-6">
          <WelcomeCard />

          {isMounted && (
            <>
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900">HR Dashboard</h1>
                
                <div className="flex items-center gap-4">
                  <select 
                    value={selectedDepartment} 
                    onChange={(e) => handleDepartmentChange(e.target.value)}
                    className="border-2 border-gray-200 rounded-lg px-4 py-2 hover:border-blue-500 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <StatsCards departmentId={selectedDepartment} />
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <EmployeeDistribution />
                </div>
                <div>
                  <QuickActions />
                </div>
              </div>


              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <RecentActivities />
                <UpcomingEvents />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}