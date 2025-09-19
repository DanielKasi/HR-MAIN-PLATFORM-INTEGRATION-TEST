"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { toast } from "sonner";
import { Calendar, Target, Users, MessageSquare, Video } from "lucide-react";
import Link from "next/link";

import { selectSelectedInstitution } from "@/store/auth/selectors";
import { PERFORMANCE_ANALYTICS_API } from "@/lib/utils";
import { PerformanceStatsCard } from "@/components/performance/common/performance-stats-card";
import { Button } from "@/components/ui/button";
import PieChart from "./piechart";

export default function PerformancePage() {
	const [analytics, setAnalytics] = useState<any>({
		periods: {
			total: 0,
			closed: 0,
			open: 0,
		},
		objectives: {
			total: 0,
			average_duration_days: 0,
		},
		employee_objectives: {
			total: 0,
			status_distribution: {
				not_sarted: 0,
				on_track: 0,
				closed: 0,
			},
		},
		key_results: {
			total: 0,
			average_target_value: 0,
		},
		feedback_360: {
			total: 0,
			average_rating: 0,
		},
		employee_bonus_points: {
			total: 0,
			total_points: 0,
			redeemed: 0,
		},
		question_templates: {
			total: 0,
			category_distribution: {
				general: 0,
				performance_review: 0,
			},
		},
		bonus_point_settings: {
			total: 0,
			average_points: 0,
		},
		meetings: {
			total: 0,
			mode_distribution: {
				online: 0,
				hybrid: 0,
				physical: 0,
			},
		},
	});
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
			title: "360° Feedback",
			description: "Collect and manage multi-source performance feedback",
			icon: <MessageSquare className="h-6 w-6" />,
			href: "/performance/feedback",
			color: "bg-orange-500",
			stats: analytics?.feedback || { total: 0, average_rating: 0 },
		},
	];

	const cards = [
		{
			title: "Active Periods",
			value: analytics.periods?.active || 0,
			icon: <Calendar className="h-5 w-5" />,
			description: "Current review cycles",
			link: "/performance/periods",
		},
		{
			title: "Total Objectives",
			value: analytics.objectives?.total || 0,
			icon: <Target className="h-5 w-5" />,
			description: "Defined goals",
			link: "/performance/objectives",
		},
		{
			title: "Employee Assignments",
			value: analytics.employee_objectives?.total || 0,
			icon: <Users className="h-5 w-5" />,
			description: "Active assignments",
			link: "/performance/employee-objectives",
		},
		{
			title: "Feedback Entries",
			value: analytics.feedback?.total || 0,
			icon: <MessageSquare className="h-5 w-5" />,
			description: "360° feedback",
			link: "/performance/feedback",
		},
	];

	const graphs = [
		{
			title: "Employee Objectives",
			description: "Assign and track individual employee objectives",
			icon: <Users className="h-6 w-6" />,
			href: "/performance/employee-objectives",
			color: "bg-purple-500",
			stats: analytics?.employee_objectives?.status_distribution || {
				not_started: 0,
				on_track: 0,
				closed: 0,
			},
		},
		{
			title: "Meetings",
			description: "Schedule and manage performance review meetings",
			icon: <Video className="h-6 w-6" />,
			href: "/performance/meetings",
			color: "bg-indigo-500",
			stats: analytics?.meetings?.mode_distribution || {
				online: 0,
				hybrid: 0,
				physical: 0,
			},
		},
		{
			title: "Question Templates",
			description: "",
			href: "#",
			color: "bg-purple-500",
			stats: analytics?.question_templates?.category_distribution || {
				general: 0,
				performance_review: 0,
			},
		},
	];

	return (
		<div className="min-h-screen bg-white p-6">
			<div className="space-y-6">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center justify-between mb-4">
						<div>
							<h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
								Performance Management
							</h1>
							<p className="text-slate-600 text-lg mt-2">
								Comprehensive OKR and 360-degree feedback system with gamification
							</p>
						</div>
						<div className="flex-grow flex items-center justify-end">
							{/* Quick Actions */}
							<div>
								<h2 className="text-xl text-right font-semibold text-slate-900 mb-4">
									Quick Actions
								</h2>
								<div className="flex flex-wrap gap-3 justify-end">
									<Link href="/performance/periods">
										<Button variant="outline" className="flex items-center gap-2">
											<Calendar className="h-4 w-4" />
											Create Period
										</Button>
									</Link>
									<Link href="/performance/objectives">
										<Button variant="outline" className="flex items-center gap-2">
											<Target className="h-4 w-4" />
											Add Objective
										</Button>
									</Link>
									<Link href="/performance/feedback">
										<Button variant="outline" className="flex items-center gap-2">
											<MessageSquare className="h-4 w-4" />
											Give Feedback
										</Button>
									</Link>
									<Link href="/performance/meetings">
										<Button variant="outline" className="flex items-center gap-2">
											<Video className="h-4 w-4" />
											Schedule Meeting
										</Button>
									</Link>
								</div>
							</div>
						</div>
					</div>
				</div>

				{/* Overview Stats */}
				{analytics && (
					<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
						{cards.map((c) => (
							<PerformanceStatsCard
								title={c.title}
								link={c.link}
								value={c.value}
								icon={c.icon}
								description={c.description}
							/>
						))}
					</div>
				)}

				{/* Module Cards */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					{graphs.map((g) => (
						<PieChart title={g.title} data={g.stats}></PieChart>
					))}
				</div>
			</div>
		</div>
	);
}
