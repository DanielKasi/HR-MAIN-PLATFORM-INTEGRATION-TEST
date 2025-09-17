"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { Calendar, Target, Users, MessageSquare, Video, ArrowRight, BarChart3 } from "lucide-react";
import Link from "next/link";

import { selectSelectedInstitution } from "@/store/auth/selectors";
import { PERFORMANCE_ANALYTICS_API } from "@/lib/utils";
import { PerformanceStatsCard } from "@/components/performance/common/performance-stats-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PerformancePage() {
	const [analytics, setAnalytics] = useState<any>(null);
	const [loading, setLoading] = useState(true);

	const currentInstitution = useSelector(selectSelectedInstitution);

	const fetchAnalytics = async () => {
		if (!currentInstitution) return;

		setLoading(true);
		try {
			const data = await PERFORMANCE_ANALYTICS_API.get();

			setAnalytics(data);
		} catch (error) {
			toast.error("Failed to fetch performance analytics");
			console.error("Error fetching analytics:", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchAnalytics();
	}, [currentInstitution]);

	const modules = [
		{
			title: "Performance Periods",
			description: "Manage performance review cycles and evaluation periods",
			icon: <Calendar className="h-6 w-6" />,
			href: "/performance/periods",
			color: "bg-blue-500",
			stats: analytics?.periods || { total: 0, active: 0 },
		},
		{
			title: "Objectives",
			description: "Define and manage performance objectives and goals",
			icon: <Target className="h-6 w-6" />,
			href: "/performance/objectives",
			color: "bg-green-500",
			stats: analytics?.objectives || { total: 0, with_assignees: 0 },
		},
		{
			title: "Employee Objectives",
			description: "Assign and track individual employee objectives",
			icon: <Users className="h-6 w-6" />,
			href: "/performance/employee-objectives",
			color: "bg-purple-500",
			stats: analytics?.employee_objectives || { total: 0, on_track: 0 },
		},
		{
			title: "360° Feedback",
			description: "Collect and manage multi-source performance feedback",
			icon: <MessageSquare className="h-6 w-6" />,
			href: "/performance/feedback",
			color: "bg-orange-500",
			stats: analytics?.feedback || { total: 0, average_rating: 0 },
		},
		{
			title: "Meetings",
			description: "Schedule and manage performance review meetings",
			icon: <Video className="h-6 w-6" />,
			href: "/performance/meetings",
			color: "bg-indigo-500",
			stats: analytics?.meetings || { total: 0, upcoming: 0 },
		},
	];

	return (
		<div className="min-h-screen p-6 bg-white">
			<div className="">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
								Performance Management
							</h1>
							<p className="text-slate-600 text-lg mt-2">
								Comprehensive OKR and 360-degree feedback system
							</p>
						</div>
					</div>
				</div>

				{/* Overview Stats */}
				{analytics && (
					<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
						<PerformanceStatsCard
							title="Active Periods"
							value={analytics.periods?.active || 0}
							icon={<Calendar className="h-5 w-5" />}
							description="Current review cycles"
						/>
						<PerformanceStatsCard
							title="Total Objectives"
							value={analytics.objectives?.total || 0}
							icon={<Target className="h-5 w-5" />}
							description="Defined goals"
						/>
						<PerformanceStatsCard
							title="Employee Assignments"
							value={analytics.employee_objectives?.total || 0}
							icon={<Users className="h-5 w-5" />}
							description="Active assignments"
						/>
						<PerformanceStatsCard
							title="Feedback Entries"
							value={analytics.feedback?.total || 0}
							icon={<MessageSquare className="h-5 w-5" />}
							description="360° feedback"
						/>
					</div>
				)}

				{/* Module Cards */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{modules.map((module) => (
						<Link key={module.href} href={module.href}>
							<Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
								<CardHeader className="pb-3">
									<div className="flex items-center justify-between">
										<div className={`p-3 rounded-lg ${module.color} text-white`}>{module.icon}</div>
										<ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
									</div>
									<CardTitle className="text-xl font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
										{module.title}
									</CardTitle>
								</CardHeader>
								<CardContent>
									<p className="text-slate-600 mb-4 leading-relaxed">{module.description}</p>

									{/* Module-specific stats */}
									<div className="flex items-center justify-between text-sm">
										<div className="flex items-center gap-4">
											{module.title === "Performance Periods" && (
												<>
													<span className="text-slate-500">
														Total:{" "}
														<span className="font-medium text-slate-700">{module.stats.total}</span>
													</span>
													<span className="text-slate-500">
														Active:{" "}
														<span className="font-medium text-green-600">
															{module.stats.active}
														</span>
													</span>
												</>
											)}

											{module.title === "Objectives" && (
												<>
													<span className="text-slate-500">
														Total:{" "}
														<span className="font-medium text-slate-700">{module.stats.total}</span>
													</span>
													<span className="text-slate-500">
														Assigned:{" "}
														<span className="font-medium text-blue-600">
															{module.stats.with_assignees}
														</span>
													</span>
												</>
											)}

											{module.title === "Employee Objectives" && (
												<>
													<span className="text-slate-500">
														Total:{" "}
														<span className="font-medium text-slate-700">{module.stats.total}</span>
													</span>
													<span className="text-slate-500">
														On Track:{" "}
														<span className="font-medium text-green-600">
															{module.stats.on_track}
														</span>
													</span>
												</>
											)}

											{module.title === "360° Feedback" && (
												<>
													<span className="text-slate-500">
														Total:{" "}
														<span className="font-medium text-slate-700">{module.stats.total}</span>
													</span>
													<span className="text-slate-500">
														Avg Rating:{" "}
														<span className="font-medium text-yellow-600">
															{module.stats.average_rating}/10
														</span>
													</span>
												</>
											)}

											{module.title === "Meetings" && (
												<>
													<span className="text-slate-500">
														Total:{" "}
														<span className="font-medium text-slate-700">{module.stats.total}</span>
													</span>
													<span className="text-slate-500">
														Upcoming:{" "}
														<span className="font-medium text-blue-600">
															{module.stats.upcoming}
														</span>
													</span>
												</>
											)}
										</div>
									</div>
								</CardContent>
							</Card>
						</Link>
					))}
				</div>

				{/* Quick Actions */}
				<div className="mt-12 p-6 bg-slate-50 rounded-xl">
					<h2 className="text-xl font-semibold text-slate-900 mb-4">Quick Actions</h2>
					<div className="flex flex-wrap gap-3">
						<Link href="/performance/periods">
							<Button variant="outline" className="flex items-center gap-2 bg-transparent">
								<Calendar className="h-4 w-4" />
								Create Period
							</Button>
						</Link>
						<Link href="/performance/objectives">
							<Button variant="outline" className="flex items-center gap-2 bg-transparent">
								<Target className="h-4 w-4" />
								Add Objective
							</Button>
						</Link>
						<Link href="/performance/feedback">
							<Button variant="outline" className="flex items-center gap-2 bg-transparent">
								<MessageSquare className="h-4 w-4" />
								Give Feedback
							</Button>
						</Link>
						<Link href="/performance/meetings">
							<Button variant="outline" className="flex items-center gap-2 bg-transparent">
								<Video className="h-4 w-4" />
								Schedule Meeting
							</Button>
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
