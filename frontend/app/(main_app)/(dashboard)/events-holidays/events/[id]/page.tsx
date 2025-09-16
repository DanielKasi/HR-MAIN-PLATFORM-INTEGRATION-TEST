"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	ArrowLeft,
	Edit,
	Users,
	Calendar,
	MapPin,
	Video,
	Clock,
	User,
	Building,
	Repeat,
	Star,
	Share2,
	Download,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { apiGet } from "@/lib/apiRequest";
import FixedLoader from "@/components/fixed-loader";

interface IEvent {
	id: number;
	institution: number;
	title: string;
	description: string;
	date: string;
	target_audience: "all" | "department" | "individual" | "specific_employees";
	event_mode: "physical" | "online" | "hybrid";
	department: any;
	specific_employees: any[];
	frequency: string;
	repeat_until: string;
	created_at: string;
	updated_at: string;
	created_by: any;
	updated_by: any;
}

const getEventModeIcon = (mode: string) => {
	switch (mode) {
		case "online":
			return <Video className="h-5 w-5" />;
		case "physical":
			return <MapPin className="h-5 w-5" />;
		case "hybrid":
			return <Users className="h-5 w-5" />;
		default:
			return <Calendar className="h-5 w-5" />;
	}
};

const getEventModeColor = (mode: string) => {
	switch (mode) {
		case "online":
			return "bg-blue-50 text-blue-700 border-blue-200";
		case "physical":
			return "bg-green-50 text-green-700 border-green-200";
		case "hybrid":
			return "bg-purple-50 text-purple-700 border-purple-200";
		default:
			return "bg-gray-50 text-gray-700 border-gray-200";
	}
};

const getTargetAudienceColor = (audience: string) => {
	switch (audience) {
		case "all":
			return "bg-indigo-50 text-indigo-700 border-indigo-200";
		case "department":
			return "bg-orange-50 text-orange-700 border-orange-200";
		case "individual":
			return "bg-pink-50 text-pink-700 border-pink-200";
		case "specific_employees":
			return "bg-cyan-50 text-cyan-700 border-cyan-200";
		default:
			return "bg-gray-50 text-gray-700 border-gray-200";
	}
};

export default function EventDetailsPage() {
	const params = useParams();
	const [event, setEvent] = useState<IEvent | null>(null);
	const [loading, setLoading] = useState(true);

	const fetchEvent = async () => {
		try {
			const response = await apiGet(`/calendar/events/${params.id}/`);
			setEvent(response.data);
		} catch (error) {
			console.error("Error fetching event:", error);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (params.id) {
			fetchEvent();
		}
	}, [params.id]);

	if (loading) {
		return <FixedLoader />;
	}

	if (!event) {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<div className="text-lg">Event not found</div>
			</div>
		);
	}

	const isUpcoming = new Date(event.date) >= new Date();
	const isPast = new Date(event.date) < new Date();
	const isRecurring = event.frequency && event.frequency !== "once";

	// Mock data for attendees - in real app, fetch from API
	const attendees = [
		{ id: 1, name: "John Doe", email: "john@company.com", status: "accepted", avatar: null },
		{ id: 2, name: "Jane Smith", email: "jane@company.com", status: "pending", avatar: null },
		{ id: 3, name: "Mike Johnson", email: "mike@company.com", status: "declined", avatar: null },
		{ id: 4, name: "Sarah Wilson", email: "sarah@company.com", status: "accepted", avatar: null },
	];

	const getStatusColor = (status: string) => {
		switch (status) {
			case "accepted":
				return "bg-green-100 text-green-800 border-green-200";
			case "pending":
				return "bg-yellow-100 text-yellow-800 border-yellow-200";
			case "declined":
				return "bg-red-100 text-red-800 border-red-200";
			default:
				return "bg-gray-100 text-gray-800 border-gray-200";
		}
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
			<div className="max-w-full mx-auto space-y-8">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-6">
						<Link href="/events-holidays/events">
							<Button variant="outline" size="sm" className="shadow-sm bg-transparent">
								<ArrowLeft className="h-4 w-4 mr-2" />
							</Button>
						</Link>
						<div className="space-y-2">
							<h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-transparent">
								{event.title}
							</h1>
							<div className="flex items-center gap-3">
								<Badge className={`${getEventModeColor(event.event_mode)} border`}>
									{getEventModeIcon(event.event_mode)}
									<span className="ml-2">{event.event_mode}</span>
								</Badge>
								<Badge className={`${getTargetAudienceColor(event.target_audience)} border`}>
									{event.target_audience.replace("_", " ")}
								</Badge>
								{isUpcoming && (
									<Badge className="bg-green-100 text-green-800 border-green-200">Upcoming</Badge>
								)}
								{isPast && (
									<Badge className="bg-gray-100 text-gray-800 border-gray-200">Past Event</Badge>
								)}
								{isRecurring && (
									<Badge className="bg-purple-100 text-purple-800 border-purple-200">
										<Repeat className="h-3 w-3 mr-1" />
										Recurring
									</Badge>
								)}
							</div>
						</div>
					</div>
					<div className="flex gap-3">
						<Button variant="outline" className="shadow-sm bg-transparent">
							<Share2 className="h-4 w-4 mr-2" />
							Share
						</Button>
						<Button variant="outline" className="shadow-sm bg-transparent">
							<Download className="h-4 w-4 mr-2" />
							Export
						</Button>
						<Link href={`/events-holidays/events/edit/${event.id}`}>
							<Button>
								<Edit className="h-4 w-4 mr-2" />
								Edit Event
							</Button>
						</Link>
					</div>
				</div>

				{/* Stats Cards */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					<Card className="border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
						<CardContent className="p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-blue-100 text-sm font-medium">Total Attendees</p>
									<p className="text-3xl font-bold">{attendees.length}</p>
								</div>
								<Users className="h-8 w-8 text-blue-200" />
							</div>
						</CardContent>
					</Card>

					<Card className="border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
						<CardContent className="p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-green-100 text-sm font-medium">Accepted</p>
									<p className="text-3xl font-bold">
										{attendees.filter((a) => a.status === "accepted").length}
									</p>
								</div>
								<User className="h-8 w-8 text-green-200" />
							</div>
						</CardContent>
					</Card>

					<Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
						<CardContent className="p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-yellow-100 text-sm font-medium">Pending</p>
									<p className="text-3xl font-bold">
										{attendees.filter((a) => a.status === "pending").length}
									</p>
								</div>
								<Clock className="h-8 w-8 text-yellow-200" />
							</div>
						</CardContent>
					</Card>

					<Card className="border-0 shadow-lg bg-gradient-to-br from-red-500 to-red-600 text-white">
						<CardContent className="p-6">
							<div className="flex items-center justify-between">
								<div>
									<p className="text-red-100 text-sm font-medium">Declined</p>
									<p className="text-3xl font-bold">
										{attendees.filter((a) => a.status === "declined").length}
									</p>
								</div>
								<User className="h-8 w-8 text-red-200" />
							</div>
						</CardContent>
					</Card>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					{/* Main Content */}
					<div className="lg:col-span-2 space-y-6">
						{/* Event Details */}
						<Card className="border-0 shadow-lg">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-xl">
									<Calendar className="h-5 w-5" />
									Event Details
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-6">
								<div>
									<h4 className="font-semibold text-slate-900 mb-2">Description</h4>
									<p className="text-slate-600 leading-relaxed">
										{event.description || "No description provided for this event."}
									</p>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div>
										<h4 className="font-semibold text-slate-900 mb-3">Event Information</h4>
										<div className="space-y-3">
											<div className="flex items-center gap-3">
												<Calendar className="h-4 w-4 text-slate-500" />
												<div>
													<p className="text-sm font-medium text-slate-900">Date</p>
													<p className="text-sm text-slate-600">
														{new Date(event.date).toLocaleDateString()}
													</p>
												</div>
											</div>

											<div className="flex items-center gap-3">
												{getEventModeIcon(event.event_mode)}
												<div>
													<p className="text-sm font-medium text-slate-900">Event Mode</p>
													<p className="text-sm text-slate-600 capitalize">{event.event_mode}</p>
												</div>
											</div>

											<div className="flex items-center gap-3">
												<Users className="h-4 w-4 text-slate-500" />
												<div>
													<p className="text-sm font-medium text-slate-900">Target Audience</p>
													<p className="text-sm text-slate-600 capitalize">
														{event.target_audience.replace("_", " ")}
													</p>
												</div>
											</div>

											{isRecurring && (
												<div className="flex items-center gap-3">
													<Repeat className="h-4 w-4 text-slate-500" />
													<div>
														<p className="text-sm font-medium text-slate-900">Frequency</p>
														<p className="text-sm text-slate-600 capitalize">{event.frequency}</p>
													</div>
												</div>
											)}
										</div>
									</div>

									<div>
										<h4 className="font-semibold text-slate-900 mb-3">Event Management</h4>
										<div className="space-y-3">
											<div className="flex items-center gap-3">
												<User className="h-4 w-4 text-slate-500" />
												<div>
													<p className="text-sm font-medium text-slate-900">Created By</p>
													<p className="text-sm text-slate-600">
														{event.created_by?.user?.fullname || "System"}
													</p>
												</div>
											</div>

											<div className="flex items-center gap-3">
												<Clock className="h-4 w-4 text-slate-500" />
												<div>
													<p className="text-sm font-medium text-slate-900">Created On</p>
													<p className="text-sm text-slate-600">
														{new Date(event.created_at).toLocaleDateString()}
													</p>
												</div>
											</div>

											{event.updated_at !== event.created_at && (
												<div className="flex items-center gap-3">
													<Edit className="h-4 w-4 text-slate-500" />
													<div>
														<p className="text-sm font-medium text-slate-900">Last Updated</p>
														<p className="text-sm text-slate-600">
															{new Date(event.updated_at).toLocaleDateString()}
														</p>
													</div>
												</div>
											)}
										</div>
									</div>
								</div>

								{event.event_mode === "online" && (
									<div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
										<h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
											<Video className="h-4 w-4" />
											Online Meeting Details
										</h4>
										<div className="space-y-2 text-sm">
											<div className="flex justify-between">
												<span className="text-blue-700">Meeting ID:</span>
												<span className="font-mono text-blue-900">123-456-789</span>
											</div>
											<div className="flex justify-between">
												<span className="text-blue-700">Join URL:</span>
												<Button variant="link" className="h-auto p-0 text-blue-600">
													Join Meeting
												</Button>
											</div>
										</div>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Attendees */}
						<Card className="border-0 shadow-lg">
							<CardHeader>
								<div className="flex items-center justify-between">
									<CardTitle className="flex items-center gap-2 text-xl">
										<Users className="h-5 w-5" />
										Attendees ({attendees.length})
									</CardTitle>
									<Button variant="outline" size="sm" className="shadow-sm bg-transparent">
										<Users className="h-4 w-4 mr-2" />
										Manage Attendees
									</Button>
								</div>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									{attendees.map((attendee) => (
										<div
											key={attendee.id}
											className="flex items-center justify-between p-4 border border-slate-200 rounded-lg bg-white"
										>
											<div className="flex items-center gap-3">
												<Avatar className="h-10 w-10">
													<AvatarImage
														src={attendee.avatar || `/placeholder.svg?height=40&width=40`}
													/>
													<AvatarFallback>
														{attendee.name
															.split(" ")
															.map((n) => n[0])
															.join("")}
													</AvatarFallback>
												</Avatar>
												<div>
													<p className="font-medium text-slate-900">{attendee.name}</p>
													<p className="text-sm text-slate-600">{attendee.email}</p>
												</div>
											</div>
											<Badge className={`${getStatusColor(attendee.status)} border text-xs`}>
												{attendee.status}
											</Badge>
										</div>
									))}

									{attendees.length === 0 && (
										<div className="text-center py-8">
											<Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
											<h3 className="text-lg font-semibold text-slate-900 mb-2">
												No attendees yet
											</h3>
											<p className="text-slate-600 mb-4">Invite people to this event</p>
											<Button>
												<Users className="mr-2 h-4 w-4" />
												Add Attendees
											</Button>
										</div>
									)}
								</div>
							</CardContent>
						</Card>
					</div>

					{/* Sidebar */}
					<div className="space-y-6">
						{/* Quick Actions */}
						<Card className="border-0 shadow-lg">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Star className="h-5 w-5" />
									Quick Actions
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-3">
								<Link href={`/calendar/events/edit/${event.id}`}>
									<Button variant="outline" className="w-full justify-start bg-transparent">
										<Edit className="mr-2 h-4 w-4" />
										Edit Event
									</Button>
								</Link>
								<Button variant="outline" className="w-full justify-start bg-transparent">
									<Users className="mr-2 h-4 w-4" />
									Manage Attendees
								</Button>
								<Button variant="outline" className="w-full justify-start bg-transparent">
									<Share2 className="mr-2 h-4 w-4" />
									Share Event
								</Button>
								<Button variant="outline" className="w-full justify-start bg-transparent">
									<Download className="mr-2 h-4 w-4" />
									Export to Calendar
								</Button>
								<Button
									variant="outline"
									className="w-full justify-start text-red-600 hover:text-red-700 bg-transparent"
								>
									<Trash2 className="mr-2 h-4 w-4" />
									Delete Event
								</Button>
							</CardContent>
						</Card>

						{/* Event Statistics */}
						<Card className="border-0 shadow-lg">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Calendar className="h-5 w-5" />
									Event Statistics
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div className="text-center p-3 bg-green-50 rounded-lg">
										<p className="text-2xl font-bold text-green-600">
											{Math.round(
												(attendees.filter((a) => a.status === "accepted").length /
													attendees.length) *
													100,
											) || 0}
											%
										</p>
										<p className="text-xs text-green-700">Acceptance Rate</p>
									</div>
									<div className="text-center p-3 bg-blue-50 rounded-lg">
										<p className="text-2xl font-bold text-blue-600">{attendees.length}</p>
										<p className="text-xs text-blue-700">Total Invited</p>
									</div>
								</div>

								<div className="space-y-2">
									<div className="flex justify-between text-sm">
										<span className="text-slate-600">Response Rate</span>
										<span className="font-medium">
											{Math.round(
												(attendees.filter((a) => a.status !== "pending").length /
													attendees.length) *
													100 || 0,
											)}
											%
										</span>
									</div>
									<div className="w-full bg-slate-200 rounded-full h-2">
										<div
											className="bg-blue-600 h-2 rounded-full"
											style={{
												width: `${Math.round(
													(attendees.filter((a) => a.status !== "pending").length /
														attendees.length) *
														100 || 0,
												)}%`,
											}}
										></div>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Related Events */}
						{isRecurring && (
							<Card className="border-0 shadow-lg">
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										<Repeat className="h-5 w-5" />
										Recurring Series
									</CardTitle>
								</CardHeader>
								<CardContent>
									<div className="space-y-3">
										<div className="p-3 bg-slate-50 rounded-lg">
											<p className="text-sm font-medium text-slate-900">Next Occurrence</p>
											<p className="text-sm text-slate-600">
												{new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}
											</p>
										</div>
										<div className="p-3 bg-slate-50 rounded-lg">
											<p className="text-sm font-medium text-slate-900">Frequency</p>
											<p className="text-sm text-slate-600 capitalize">{event.frequency}</p>
										</div>
										{event.repeat_until && (
											<div className="p-3 bg-slate-50 rounded-lg">
												<p className="text-sm font-medium text-slate-900">Ends On</p>
												<p className="text-sm text-slate-600">
													{new Date(event.repeat_until).toLocaleDateString()}
												</p>
											</div>
										)}
									</div>
								</CardContent>
							</Card>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
