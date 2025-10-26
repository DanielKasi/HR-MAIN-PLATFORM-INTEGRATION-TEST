"use client";

import {
	ArrowRight,
	CheckCircle,
	Star,
	Menu,
	X,
	CheckSquare,
	Clock,
	Target,
	Zap,
	BarChart3,
	FileText,
} from "lucide-react";
import { Inter } from "next/font/google";
import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/platform/v1/components";
import { Button } from "@/platform/v1/components";

const inter = Inter({ subsets: ["latin"] });

export default function HomePage() {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
			{/* Hero Section with Purple Gradient Background */}
			<div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
				{/* Header */}
				<header className="relative z-10 mx-auto max-w-7xl px-6 py-5">
					<div className="flex items-center justify-between rounded-2xl bg-white/10 backdrop-blur-md px-6 py-4 border border-white/20">
						<div className="flex items-center gap-6">
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 bg-gradient-to-br from-pink-400 to-blue-600 rounded-lg flex items-center justify-center">
									<CheckSquare className="h-6 w-6 text-white" />
								</div>
								<span className="text-2xl font-bold text-white">Task Mangement</span>
							</div>
						</div>

						<div className="hidden md:flex items-center gap-4">
							<Link href="/login">
								<Button
									variant="ghost"
									className="text-white hover:bg-white/10 !flex !items-center !justify-center !text-center"
								>
									{" "}
									Login
								</Button>
							</Link>

							<Link href="/signup">
								<Button className="bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700 text-white rounded-full border-0">
									Sign Up
								</Button>
							</Link>
						</div>

						<div className="md:hidden">
							<Button
								variant="ghost"
								size="sm"
								onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
								className="text-white hover:bg-white/10"
							>
								{isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
							</Button>
						</div>
					</div>

					{isMobileMenuOpen && (
						<div className="md:hidden mt-2 rounded-2xl bg-white/10 backdrop-blur-md px-6 py-4 border border-white/20">
							<div className="flex flex-col gap-3">
								<Button
									variant="ghost"
									className="text-white hover:bg-white/10 justify-start"
									asChild
								>
									<Link href="/login">Login</Link>
								</Button>
								<Button
									className="bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700 text-white rounded-full border-0"
									asChild
								>
									<Link href="/signup">Sign Up</Link>
								</Button>
							</div>
						</div>
					)}
				</header>

				{/* Hero Content */}
				<div className="relative z-10 mx-auto max-w-4xl px-6 text-center flex items-center justify-center mt-[50px]">
					<div className="space-y-8">
						<div className="space-y-4">
							<h1
								className={`text-3xl lg:text-4xl xl:text-5xl font-extrabold leading-tight text-center text-white ${inter.className}`}
							>
								<span className="text-white">Maximize Your </span>
								<span className="bg-gradient-to-r from-pink-300 to-blue-300 bg-clip-text text-transparent">
									Productivity
								</span>
							</h1>
							<p className="mx-auto max-w-3xl text-base md:text-lg text-white/90">
								Conquer Your Tasks and Take Control with
								<br className="hidden md:block" />
								Our Task Manager App
							</p>
						</div>
						<Button
							size="lg"
							className="bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700 text-white px-8 py-6 text-lg rounded-full shadow-lg border-0"
						>
							Learn More
							<ArrowRight className="ml-2 h-5 w-5" />
						</Button>
					</div>
				</div>

				{/* Dashboard Preview */}
				<div className="relative z-10 mx-auto max-w-6xl px-6 pb-20">
					<div className="rounded-t-3xl p-8">
						<div className="w-full max-w-md mx-auto">
							<div className="bg-white rounded-3xl p-6 shadow-2xl">
								<div className="space-y-4">
									<div className="flex items-center justify-between">
										<span className="text-lg font-semibold text-gray-900">Task Mangement</span>
										<Menu className="h-5 w-5 text-gray-600" />
									</div>
									<div className="space-y-3">
										<div className="text-2xl font-bold text-gray-900">
											Hello,
											<br />
											John Doe 👋
										</div>
										<div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 text-white">
											<div className="flex items-center gap-2 mb-2">
												<div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
													<CheckSquare className="h-4 w-4" />
												</div>
												<span className="font-medium">Brand New Website Design</span>
											</div>
											<div className="text-sm text-white/80">Start</div>
										</div>
										<div className="space-y-2">
											<div className="text-sm font-medium text-gray-600">UPCOMING</div>
											<div className="space-y-2">
												<div className="flex items-center gap-3 p-2">
													<div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
														<FileText className="h-4 w-4 text-blue-600" />
													</div>
													<div>
														<div className="font-medium text-gray-900">Redesign Builder</div>
														<div className="text-sm text-gray-500">Today 10:00</div>
													</div>
													<div className="ml-auto text-sm text-blue-600">+25%</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Stats and Features Section */}
			<section className="bg-white py-20 -mt-[300px] relative z-20">
				<div className="mx-auto max-w-7xl px-6">
					<div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
						{/* Stats */}
						<div className="space-y-8">
							<div className="grid grid-cols-2 gap-8">
								<div>
									<div className="text-3xl font-bold text-blue-600">29M+</div>
									<div className="text-gray-700">Tasks completed</div>
								</div>
								<div>
									<div className="text-3xl font-bold text-blue-600">100M+</div>
									<div className="text-gray-700">Projects managed</div>
								</div>
								<div>
									<div className="text-3xl font-bold text-blue-600">Data Sync and Backup</div>
									<div className="text-gray-700">
										Users' tasks and app settings are synchronized across multiple devices.
									</div>
								</div>
								<div>
									<div className="text-3xl font-bold text-blue-600">Task Attachments</div>
									<div className="text-gray-700">
										Users can attach files, documents, or links to tasks, providing additional
										context or reference material.
									</div>
								</div>
							</div>
						</div>

						{/* Task Collaboration Feature */}
						<div className="space-y-6">
							<div>
								<h3 className="text-2xl font-bold text-gray-900 mb-4">Task Collaboration</h3>
								<p className="text-gray-600 mb-6">
									Users can collaborate with others on tasks, allowing team members to comment.
								</p>
							</div>

							{/* Task List Preview */}
							<div className="bg-gray-50 rounded-2xl p-6">
								<div className="space-y-4">
									<div className="flex items-center gap-3">
										<div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
											<span className="text-white font-bold text-sm">R</span>
										</div>
										<span className="font-medium">Tasks List</span>
										<span className="ml-auto text-sm text-gray-500">Add Task</span>
									</div>

									<div className="space-y-3">
										<div className="flex items-center gap-3 p-3 bg-white rounded-lg">
											<CheckSquare className="h-4 w-4 text-green-500" />
											<span className="text-sm">Create Brand New Guide</span>
										</div>
										<div className="flex items-center gap-3 p-3 bg-white rounded-lg">
											<CheckSquare className="h-4 w-4 text-green-500" />
											<span className="text-sm">Create Brand New Guide Brand</span>
										</div>
										<div className="flex items-center gap-3 p-3 bg-white rounded-lg">
											<CheckSquare className="h-4 w-4 text-gray-400" />
											<span className="text-sm text-gray-500">
												Create Brand New Guide Brand New Milestone
											</span>
										</div>
									</div>

									{/* Team avatars */}
									<div className="flex items-center gap-2 mt-4">
										<div className="flex -space-x-2">
											<div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white"></div>
											<div className="w-6 h-6 bg-green-500 rounded-full border-2 border-white"></div>
											<div className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white"></div>
											<div className="w-6 h-6 bg-pink-500 rounded-full border-2 border-white"></div>
										</div>
										<span className="text-sm text-gray-500 ml-2">4+</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Ready to Start Section */}
			<section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 py-20">
				<div className="mx-auto max-w-4xl px-6">
					<div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
						{/* Mobile Preview */}
						<div className="order-2 lg:order-1">
							<div className="relative">
								<div className="bg-white rounded-3xl p-6 shadow-2xl max-w-sm mx-auto">
									<div className="space-y-4">
										<div className="flex items-center justify-between">
											<span className="text-lg font-semibold text-gray-900">Task Mangement</span>
											<div className="flex gap-1">
												<div className="w-1 h-1 bg-gray-400 rounded-full"></div>
												<div className="w-1 h-1 bg-gray-400 rounded-full"></div>
												<div className="w-1 h-1 bg-gray-400 rounded-full"></div>
											</div>
										</div>
										<div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-4 text-white">
											<div className="flex items-center gap-2 mb-2">
												<div className="w-6 h-6 bg-white/20 rounded flex items-center justify-center">
													<Zap className="h-4 w-4" />
												</div>
												<span className="font-medium">Brand New Website Design</span>
											</div>
											<div className="text-sm text-white/80 mb-3">Project Overview</div>
											<div className="space-y-2 text-sm">
												<div>• Create wireframes and mockups</div>
												<div>• Design user interface components</div>
												<div>• Develop responsive layouts</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* Content */}
						<div className="order-1 lg:order-2 text-white space-y-6">
							<div>
								<h2 className="text-3xl md:text-4xl font-bold mb-4">
									Ready? Let's Start with Task Mangement and Get Awesome Experience
								</h2>
								<p className="text-white/90 text-lg">
									Define all true issues orders for each team. Use our online the whole online and
									schedule task online. Start building your team's productivity with our powerful
									task management platform and achieve more together.
								</p>
							</div>
							<Button
								size="lg"
								className="bg-gradient-to-r from-pink-500 to-blue-600 hover:from-pink-600 hover:to-blue-700 text-white px-8 py-6 text-lg rounded-full shadow-lg border-0"
							>
								Learn More
								<ArrowRight className="ml-2 h-5 w-5" />
							</Button>
						</div>
					</div>
				</div>
			</section>

			{/* Features Section */}
			<section className="bg-white py-20">
				<div className="mx-auto max-w-7xl px-6">
					<div className="space-y-12">
						<div className="mx-auto max-w-3xl text-center">
							<h2 className="text-3xl md:text-4xl font-bold text-gray-900">
								Learn More Things about The Task Management From Our Blog
							</h2>
							<p className="mt-4 text-gray-600">
								Discover productivity tips, best practices, and insights to help you and your team
								accomplish more with better task management.
							</p>
						</div>

						<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
							<Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-0 shadow-lg">
								<CardContent className="p-6">
									<div className="space-y-4">
										<div className="inline-flex rounded-full bg-blue-500/10 p-4">
											<Target className="h-6 w-6 text-blue-600" />
										</div>
										<h3 className="text-xl font-medium text-gray-900">
											Latest Released Interesting Features in 2024!
										</h3>
										<p className="text-gray-600">
											Discover the newest productivity features that will transform how you manage
											tasks and collaborate with your team.
										</p>
										<div className="text-sm text-blue-600 font-medium">Dec 2024 • 5 min read</div>
									</div>
								</CardContent>
							</Card>

							<Card className="bg-gradient-to-br from-blue-50 to-pink-100 border-0 shadow-lg">
								<CardContent className="p-6">
									<div className="space-y-4">
										<div className="inline-flex rounded-full bg-blue-500/10 p-4">
											<BarChart3 className="h-6 w-6 text-blue-600" />
										</div>
										<h3 className="text-xl font-medium text-gray-900">
											Project management interface very easy to use!
										</h3>
										<p className="text-gray-600">
											Learn how our intuitive interface makes project management simple and
											efficient for teams of all sizes.
										</p>
										<div className="text-sm text-blue-600 font-medium">Nov 2024 • 3 min read</div>
									</div>
								</CardContent>
							</Card>

							<Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-0 shadow-lg">
								<CardContent className="p-6">
									<div className="space-y-4">
										<div className="inline-flex rounded-full bg-green-500/10 p-4">
											<Clock className="h-6 w-6 text-green-600" />
										</div>
										<h3 className="text-xl font-medium text-gray-900">
											Latest Released Interesting Features in 2024!
										</h3>
										<p className="text-gray-600">
											Explore time-saving automation features and smart scheduling tools that boost
											your team's productivity.
										</p>
										<div className="text-sm text-green-600 font-medium">Oct 2024 • 4 min read</div>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</section>

			{/* Comprehensive Feature Set */}
			<section className="bg-gray-50 py-20">
				<div className="mx-auto max-w-7xl px-6">
					<div className="grid gap-16 lg:grid-cols-2 lg:gap-20">
						<div>
							<div className="bg-gradient-to-br from-blue-100 to-indigo-200 rounded-3xl p-8 h-96 flex items-center justify-center">
								<div className="text-center space-y-4">
									<div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center">
										<CheckSquare className="h-12 w-12 text-white" />
									</div>
									<div className="text-lg font-semibold text-gray-700">
										Task Management Dashboard
									</div>
								</div>
							</div>
						</div>
						<div className="space-y-8">
							<div className="space-y-4">
								<h2 className="text-3xl md:text-4xl font-bold text-gray-900">
									Comprehensive Feature Set of a Task Manager App
								</h2>
								<p className="text-gray-600">
									Everything you need to organize, prioritize, and complete your tasks efficiently
								</p>
							</div>
							<div className="space-y-6">
								<div className="flex gap-4">
									<CheckCircle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
									<div>
										<h3 className="text-xl font-medium text-gray-900">Smart Task Organization</h3>
										<p className="text-gray-600">
											Organize tasks with projects, tags, and custom categories for better workflow
											management
										</p>
									</div>
								</div>
								<div className="flex gap-4">
									<CheckCircle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
									<div>
										<h3 className="text-xl font-medium text-gray-900">Real-Time Collaboration</h3>
										<p className="text-gray-600">
											Work together seamlessly with team members through shared projects and instant
											updates
										</p>
									</div>
								</div>
								<div className="flex gap-4">
									<CheckCircle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
									<div>
										<h3 className="text-xl font-medium text-gray-900">Cross-Platform Sync</h3>
										<p className="text-gray-600">
											Access your tasks anywhere with automatic synchronization across all your
											devices
										</p>
									</div>
								</div>
								<div className="flex gap-4">
									<CheckCircle className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
									<div>
										<h3 className="text-xl font-medium text-gray-900">Advanced Analytics</h3>
										<p className="text-gray-600">
											Track productivity trends and optimize your workflow with detailed insights
											and reports
										</p>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Testimonial Section */}
			<section className="bg-white py-20">
				<div className="mx-auto max-w-4xl px-6 text-center">
					<div className="space-y-8">
						<Card className="bg-gradient-to-br from-blue-50 to-pink-50 border-0 shadow-xl max-w-2xl mx-auto">
							<CardContent className="p-8">
								<div className="space-y-6">
									<div className="flex justify-center">
										<Star className="h-5 w-5 text-yellow-400 fill-current" />
										<Star className="h-5 w-5 text-yellow-400 fill-current" />
										<Star className="h-5 w-5 text-yellow-400 fill-current" />
										<Star className="h-5 w-5 text-yellow-400 fill-current" />
										<Star className="h-5 w-5 text-yellow-400 fill-current" />
									</div>
									<p className="text-lg text-gray-700 italic">
										"We had an excellent experience working with XYZ Web Design Agency. Their team
										delivered a visually stunning and user-friendly website that exceeded our
										expectations."
									</p>
									<div className="flex items-center justify-center gap-3">
										<div className="h-12 w-12 bg-gradient-to-br from-blue-400 to-pink-400 rounded-full flex items-center justify-center">
											<span className="text-white font-semibold">AW</span>
										</div>
										<div className="text-left">
											<div className="font-medium text-gray-900">
												Alan Walker, Senior Executive, The Ford
											</div>
											<div className="text-sm text-gray-600">Trustpilot</div>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</section>

			{/* Footer Section */}
			<section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 py-16">
				<div className="mx-auto max-w-7xl px-6">
					<div className="grid gap-12 lg:grid-cols-2 items-center">
						{/* Company Info */}
						<div className="space-y-6 text-white">
							<div className="flex items-center gap-3">
								<div className="h-12 w-12 bg-gradient-to-br from-pink-400 to-blue-600 rounded-lg flex items-center justify-center">
									<CheckSquare className="h-7 w-7 text-white" />
								</div>
								<span className="text-2xl font-bold">Task Mangement</span>
							</div>
							<div className="space-y-4">
								<div>
									<h3 className="font-semibold mb-2">Head Office</h3>
									<p className="text-white/80">
										Kampala, Ug
										<br />
										Phone: +25670000000
									</p>
								</div>
							</div>
						</div>

						{/* Quick Notice & Updates */}
						<div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
							<div className="space-y-4">
								<h3 className="text-xl font-semibold text-white">Quick Notice & Updates</h3>
								<p className="text-white/80">
									Stay updated with the latest features, tips, and productivity insights from the
									Task Mangement team.
								</p>
								<Link href={"/signup"}>
									<Button className="bg-white text-blue-600 hover:bg-gray-100 rounded-full w-full">
										Get in Touch
									</Button>
								</Link>
							</div>
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
