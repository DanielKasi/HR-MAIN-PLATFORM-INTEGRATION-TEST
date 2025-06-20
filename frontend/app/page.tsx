"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ArrowUp,
  Award,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Heart,
  LineChart,
  Lock,
  MoreHorizontal,
  PlayCircle,
  Shield,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  Trophy,
  User,
  UserPlus,
  Users,
} from "lucide-react";

// Add custom animations
defineAnimation();

function defineAnimation() {
  if (typeof window === 'undefined') return;
  const style = document.createElement('style');
  style.textContent = `
    @keyframes float {
      0% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-20px) rotate(2deg); }
      100% { transform: translateY(0px) rotate(0deg); }
    }
    @keyframes float-slow {
      0% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-10px) rotate(1deg); }
      100% { transform: translateY(0px) rotate(0deg); }
    }
    @keyframes float-medium {
      0% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-15px) rotate(-1deg); }
      100% { transform: translateY(0px) rotate(0deg); }
    }
    .animate-float { animation: float 6s ease-in-out infinite; }
    .animate-float-slow { animation: float-slow 8s ease-in-out infinite; }
    .animate-float-medium { animation: float-medium 7s ease-in-out infinite; }
    .animate-fade-in-up {
      animation: fadeInUp 0.8s ease-out forwards;
      opacity: 0;
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

import { useSelector } from "react-redux";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { selectAccessToken } from "@/store/auth/selectors";
import FixedLoader from "@/components/fixed-loader";

export default function LandingPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const accessToken = useSelector(selectAccessToken);

  useEffect(() => {
    const token = accessToken;

    if (token) {
      setIsLoggedIn(true);
      router.push("/dashboard");
    }
  }, [router, accessToken]);

  if (isLoggedIn) {
    return <FixedLoader />;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold">BAIFAM HR SYSTEM</span>
          </div>
          <nav className="hidden gap-6 md:flex">
            <Link
              className="text-sm font-medium transition-colors hover:text-primary relative group"
              href="#features"
            >
              Features
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </Link>
            <Link
              className="text-sm font-medium transition-colors hover:text-primary relative group"
              href="#benefits"
            >
              Benefits
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </Link>
            <Link
              className="text-sm font-medium transition-colors hover:text-primary relative group"
              href="#pricing"
            >
              Pricing
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button className="rounded-full" variant="ghost">
                Login
              </Button>
            </Link>
            <Link href="/signup">
              <Button className="rounded-full">Sign Up</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-16 md:py-24 lg:py-32 xl:py-48 relative overflow-hidden bg-gradient-to-b from-background to-muted/20">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-20 left-20 w-40 h-40 rounded-full bg-primary/5 animate-float-slow" />
            <div className="absolute top-1/3 right-40 w-32 h-32 rounded-full bg-primary/10 animate-float-medium" />
            <div className="absolute bottom-1/4 left-1/4 w-48 h-48 rounded-full bg-primary/5 animate-float-slow" />
            <div className="absolute bottom-1/3 right-1/4 w-24 h-24 rounded-full bg-primary/10 animate-float-medium" />
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-3xl max-h-3xl rounded-full bg-primary/5 animate-pulse" />
          </div>
          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 xl:grid-cols-2 items-center">
              <div className="flex flex-col justify-center space-y-6 animate-fade-in-up">
                <div className="space-y-4">
                  {/* <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="inline-flex items-center rounded-full border border-primary/20 bg-background/80 backdrop-blur-sm px-4 py-1.5 text-sm shadow-sm"
                  >
                    <Sparkles className="h-4 w-4 mr-2 text-primary" />
                    <span className="font-medium text-primary">Trusted by 500+ Companies</span>
                    <span className="mx-2 text-muted-foreground">•</span>
                    <span className="text-muted-foreground">30-Day Free Trial</span>
                  </motion.div> */}
                  <motion.h1
                    className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl/none bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                  >
                    Transform Your <span className="text-primary">HR Operations</span> with Ease
                  </motion.h1>
                  <motion.p
                    className="max-w-[600px] text-muted-foreground text-lg md:text-xl leading-relaxed"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    BAIFAM HR System empowers organizations to streamline HR processes, enhance employee engagement, and drive business growth through intelligent workforce management solutions.
                  </motion.p>
                </div>
                <motion.div
                  className="flex flex-col sm:flex-row gap-4 pt-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Link href="/signup" className="w-full sm:w-auto">
                    <Button
                      className="w-full gap-2 rounded-full px-8 py-6 text-base font-semibold shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105"
                      size="lg"
                    >
                      Start Free Trial
                      <ArrowRight className="h-5 w-5" />
                    </Button>
                  </Link>
                  {/* <Link href="/login" className="w-full sm:w-auto">
                    <Button
                      className="w-full gap-2 rounded-xl px-8 py-6 text-base font-medium shadow-sm transition-all duration-300 hover:scale-105"
                      size="lg"
                      variant="outline"
                    >
                      <PlayCircle className="h-5 w-5" />
                      Watch Demo
                    </Button>
                  </Link> */}
                </motion.div>
                <motion.div
                  className="flex items-center gap-4 pt-4 text-sm text-muted-foreground"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <div className="flex -space-x-2">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-8 w-8 rounded-full border-2 border-background bg-foreground/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-foreground" />
                      </div>
                    ))}
                  </div>
                  <span>Join 10,000+ HR professionals who trust our platform</span>
                </motion.div>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative h-[350px] w-[350px] sm:h-[450px] sm:w-[450px] lg:h-[550px] lg:w-[550px]">
                  <div className="absolute inset-0 bg-primary/5 rounded-3xl" />
                  <div className="relative w-full h-full">
                    {/* Main HRMIS Illustration */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      {/* Recruitment & Onboarding */}
                      <div className="absolute top-1/4 left-1/4 w-1/3 h-1/3">
                        <div className="absolute -left-6 -top-6 bg-background rounded-full p-2.5 shadow-lg transition-transform hover:scale-105">
                          <UserPlus className="h-7 w-7 text-primary" />
                          <div className="absolute top-0 left-0 -mt-1 -ml-1 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                        </div>
                        <div className="absolute -right-6 -bottom-6 bg-background rounded-full p-2.5 shadow-lg transition-transform hover:scale-105">
                          <Users className="h-7 w-7 text-primary" />
                          <div className="absolute top-0 left-0 -mt-1 -ml-1 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                        </div>
                        <div className="absolute -left-10 -bottom-10 bg-background rounded-full p-2.5 shadow-lg transition-transform hover:scale-105">
                          <Star className="h-7 w-7 text-primary" />
                          <div className="absolute top-0 left-0 -mt-1 -ml-1 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                        </div>
                      </div>
                      
                      {/* HR Analytics & Management */}
                      <div className="absolute bottom-1/4 right-1/4 w-1/3 h-1/3">
                        <div className="absolute -left-6 -top-6 bg-background rounded-full p-2.5 shadow-lg transition-transform hover:scale-105">
                          <BarChart3 className="h-7 w-7 text-primary" />
                          <div className="absolute top-0 left-0 -mt-1 -ml-1 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                        </div>
                        <div className="absolute -right-6 -bottom-6 bg-background rounded-full p-2.5 shadow-lg transition-transform hover:scale-105">
                          <FileText className="h-7 w-7 text-primary" />
                          <div className="absolute top-0 left-0 -mt-1 -ml-1 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                        </div>
                        <div className="absolute -left-10 -bottom-10 bg-background rounded-full p-2.5 shadow-lg transition-transform hover:scale-105">
                          <Shield className="h-7 w-7 text-primary" />
                          <div className="absolute top-0 left-0 -mt-1 -ml-1 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                        </div>
                      </div>

                      {/* Central HRMIS Hub */}
                      <div className="relative w-32 h-32">
                        <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse-fast" />
                        <div className="absolute inset-0 rounded-full bg-primary/5 animate-scale" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-background rounded-full p-4 animate-rotate-slow">
                            <div className="flex flex-col items-center gap-2">
                              <div className="flex items-center gap-2">
                                <UserPlus className="h-5 w-5 text-primary" />
                                <Users className="h-5 w-5 text-primary" />
                              </div>
                              <span className="text-primary font-semibold">HRMIS</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* HR Process Flow */}
                      <div className="absolute inset-0">
                        <div className="absolute top-1/3 left-1/3 w-1/3 h-1 bg-primary/20 rounded-full animate-pulse-slow" />
                        <div className="absolute bottom-1/3 right-1/3 w-1/3 h-1 bg-primary/20 rounded-full animate-pulse-slow delay-100" />
                        <div className="absolute top-1/3 right-1/3 h-1/3 w-1 bg-primary/20 rounded-full animate-pulse-slow delay-200" />
                        <div className="absolute bottom-1/3 left-1/3 h-1/3 w-1 bg-primary/20 rounded-full animate-pulse-slow delay-300" />
                      </div>

                      {/* Background Elements */}
                      <div className="absolute inset-0">
                        <div className="absolute top-1/5 left-1/5 w-24 h-24 bg-primary/5 rounded-full blur-xl animate-fade-in-out" />
                        <div className="absolute bottom-1/5 right-1/5 w-28 h-28 bg-primary/10 rounded-full blur-2xl animate-fade-in-out delay-200" />
                        <div className="absolute top-1/2 left-1/2 w-32 h-32 bg-primary/5 rounded-full blur-xl animate-fade-in-out delay-300" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section
          className="w-full bg-muted py-12 md:py-24 lg:py-32 relative overflow-hidden"
          id="features"
        >
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/4" />

          <div className="container mx-auto px-4 md:px-6 relative">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <Badge className="px-4 py-1 rounded-full bg-background" variant="outline">
                <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
                Features
              </Badge>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Everything You Need for HR Management
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Comprehensive tools to manage your workforce efficiently with automated processes and insightful analytics
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-3 rounded-3xl border p-6 shadow-sm bg-background transition-transform hover:scale-105 hover:shadow-md">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <UserPlus className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Employee Management</h3>
                <p className="text-center text-muted-foreground">
                  Comprehensive employee profiles, onboarding workflows, and document management system.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-3 rounded-3xl border p-6 shadow-sm bg-background transition-transform hover:scale-105 hover:shadow-md">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <Clock className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Time & Attendance</h3>
                <p className="text-center text-muted-foreground">
                  Track working hours, manage leave requests, and monitor attendance with real-time reporting.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-3 rounded-3xl border p-6 shadow-sm bg-background transition-transform hover:scale-105 hover:shadow-md">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <DollarSign className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Payroll Management</h3>
                <p className="text-center text-muted-foreground">
                  Automated payroll processing, tax calculations, and salary slip generation.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-3 rounded-3xl border p-6 shadow-sm bg-background transition-transform hover:scale-105 hover:shadow-md">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <BarChart3 className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Performance Analytics</h3>
                <p className="text-center text-muted-foreground">
                  Track employee performance, set goals, and generate detailed analytics reports.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-3 rounded-3xl border p-6 shadow-sm bg-background transition-transform hover:scale-105 hover:shadow-md">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <Calendar className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Leave Management</h3>
                <p className="text-center text-muted-foreground">
                  Streamlined leave application process with approval workflows and balance tracking.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-3 rounded-3xl border p-6 shadow-sm bg-background transition-transform hover:scale-105 hover:shadow-md">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <FileText className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Document Management</h3>
                <p className="text-center text-muted-foreground">
                  Secure storage and management of employee documents, contracts, and HR files.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Performance Management Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 relative" id="performance">
          <div className="absolute top-1/2 left-0 w-24 h-24 bg-primary/5 rounded-full -translate-x-1/2" />
          <div className="container mx-auto px-4 md:px-6 relative">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <Badge className="px-4 py-1 rounded-full bg-background" variant="outline">
                <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
                Performance
              </Badge>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Data-Driven Performance Management
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Make informed decisions about your workforce with comprehensive analytics, performance tracking, and actionable insights that drive organizational growth.
                </p>
              </div>
            </div>
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:grid-cols-2 items-center">
              <div className="flex items-center justify-center order-2 lg:order-1">
                <div className="relative h-[500px] w-full max-w-2xl">
                  {/* Main Card */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-3xl shadow-2xl p-6 border border-border/20 overflow-hidden"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-semibold">Team Performance</h3>
                        <p className="text-sm text-muted-foreground">Last 30 days • <span className="text-orange-500">+5.2%</span> vs last period</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <LineChart className="h-5 w-5 text-primary" />
                        </div>
                        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                          <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
                        </button>
                      </div>
                    </div>

                    {/* Timeframe Selector */}
                    <div className="flex items-center gap-2 mb-6 p-1 bg-muted rounded-xl w-fit">
                      {['1H', '4H', '1D', '1W', '1M', '3M', '1Y'].map((period) => (
                        <button
                          key={period}
                          className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${period === '1M' ? 'bg-white dark:bg-gray-800 shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          {period}
                        </button>
                      ))}
                    </div>

                    {/* Forex-style Chart */}
                    <div className="relative h-64 w-full mb-6 bg-background rounded-xl p-4 border border-border/20">
                      {/* Chart Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                            <span className="text-lg font-semibold">Team Performance</span>
                            <span className="text-orange-500 text-sm flex items-center">
                              <TrendingUp className="h-4 w-4 mr-1" />
                              5.2%
                            </span>
                          </div>
                          <div className="text-2xl font-bold">87.4</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">Current</div>
                          <div className="font-medium">+2.1% today</div>
                        </div>
                      </div>
                      {/* Chart Area */}
                      <div className="relative h-40 w-full">
                        <svg className="w-full h-full" viewBox="0 0 400 150" preserveAspectRatio="none">
                          {/* Grid Lines */}
                          <line x1="0" y1="30" x2="400" y2="30" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 2" />
                          <line x1="0" y1="75" x2="400" y2="75" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 2" />
                          <line x1="0" y1="120" x2="400" y2="120" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 2" />
                          {/* Main Line */}
                          <path
                            d="M0,100 C50,90 100,110 150,80 C200,50 250,70 300,40 C350,10 400,30 400,30"
                            fill="none"
                            stroke="#FE5D26"
                            strokeWidth="2"
                            strokeLinecap="round"
                          />
                          {/* Area Gradient */}
                          <defs>
                            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                              <stop offset="0%" stopColor="#FE5D26" stopOpacity="0.2" />
                              <stop offset="100%" stopColor="#FE5D26" stopOpacity="0" />
                            </linearGradient>
                          </defs>
                          {/* Area Fill */}
                          <path
                            d="M0,100 C50,90 100,110 150,80 C200,50 250,70 300,40 C350,10 400,30 400,150 L0,150 Z"
                            fill="url(#areaGradient)"
                          />
                          {/* Current Price Line */}
                          <line x1="0" y1="30" x2="400" y2="30" stroke="#FE5D26" strokeWidth="1" strokeDasharray="4 2" />
                          {/* Current Price Dot */}
                          <circle cx="400" cy="30" r="4" fill="#FE5D26" />
                        </svg>
                        {/* X-Axis Labels */}
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>1M</span>
                          <span>15M</span>
                          <span>1M</span>
                          <span>15M</span>
                          <span>1M</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
              <div className="flex flex-col justify-center space-y-4 order-1 lg:order-2">
                <div className="space-y-2">
                  
                  <ul className="space-y-3 pt-4">
                    <li className="flex items-center gap-3 bg-background p-3 rounded-2xl shadow-sm">
                      <div className="bg-primary/10 p-1.5 rounded-full">
                        <CheckCircle className="h-4 w-4 text-primary" />
                      </div>
                      <span>Real-time performance dashboards and KPI tracking</span>
                    </li>
                    <li className="flex items-center gap-3 bg-background p-3 rounded-2xl shadow-sm">
                      <div className="bg-primary/10 p-1.5 rounded-full">
                        <CheckCircle className="h-4 w-4 text-primary" />
                      </div>
                      <span>360-degree feedback and performance reviews</span>
                    </li>
                    <li className="flex items-center gap-3 bg-background p-3 rounded-2xl shadow-sm">
                      <div className="bg-primary/10 p-1.5 rounded-full">
                        <CheckCircle className="h-4 w-4 text-primary" />
                      </div>
                      <span>Goal setting and progress tracking capabilities</span>
                    </li>
                    <li className="flex items-center gap-3 bg-background p-3 rounded-2xl shadow-sm">
                      <div className="bg-primary/10 p-1.5 rounded-full">
                        <CheckCircle className="h-4 w-4 text-primary" />
                      </div>
                      <span>Automated reporting and analytics insights</span>
                    </li>
                  </ul>
                </div>
                <div className="pt-4">
                  <Link href="/signup">
                    <Button
                      className="gap-1 rounded-full shadow-lg transition-transform hover:scale-105"
                      size="lg"
                    >
                      Start Tracking Performance
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section
          className="w-full bg-white py-16 md:py-28 lg:py-36 relative overflow-hidden"
          id="benefits"
        >
          {/* Decorative Elements */}
          {/* Decorative background elements with transforms */}
          <div className="absolute top-0 left-1/2 w-64 h-64 bg-primary/5 rounded-full blur-3xl" style={{ transform: 'translate(-50%, -50%)' }} />
          <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-primary/5 rounded-full blur-3xl" style={{ transform: 'translateY(50%)' }} />
          <div className="absolute top-1/4 -left-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />

          <div className="container mx-auto px-4 md:px-6 relative">
            <motion.div
              className="flex flex-col items-center justify-center space-y-4 text-center mb-16"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <Badge className="px-4 py-1.5 rounded-full bg-background shadow-sm border border-border/20 mb-2" variant="outline">
                <Sparkles className="h-4 w-4 mr-1.5 text-primary" />
                <span className="font-medium">Key Benefits</span>
              </Badge>
              <div className="space-y-4 max-w-4xl">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl lg:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/80">
                  Transform Your HR Operations
                </h2>
                <p className="text-lg text-muted-foreground md:text-xl/relaxed">
                  Join thousands of companies that trust BAIFAM to streamline their HR processes and drive business growth
                </p>
              </div>
            </motion.div>

            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Boost Productivity",
                  description: "Automate routine tasks and reduce manual work by up to 70%, allowing your team to focus on strategic initiatives.",
                  icon: <BarChart3 className="h-6 w-6 text-primary" />,
                  stats: "70% time saved",
                  color: "from-orange-500 to-orange-600"
                },
                {
                  title: "Enhance Experience",
                  description: "Delight employees with intuitive self-service tools and seamless HR processes that improve satisfaction scores.",
                  icon: <Users className="h-6 w-6 text-primary" />,
                  stats: "4.8/5 satisfaction",
                  color: "from-orange-500 to-orange-600"
                },
                {
                  title: "Ensure Compliance",
                  description: "Stay ahead of regulations with automated compliance tracking and real-time reporting features.",
                  icon: <Shield className="h-6 w-6 text-primary" />,
                  stats: "100% compliance",
                  color: "from-orange-500 to-orange-600"
                },
                {
                  title: "Protect Data",
                  description: "Enterprise-grade security with end-to-end encryption and role-based access controls for complete peace of mind.",
                  icon: <Lock className="h-6 w-6 text-primary" />,
                  stats: "99.99% uptime",
                  color: "from-orange-500 to-orange-600"
                },
                {
                  title: "Scale Effortlessly",
                  description: "From 10 to 10,000+ employees, our solution grows with your business needs without missing a beat.",
                  icon: <TrendingUp className="h-6 w-6 text-primary" />,
                  stats: "10,000+ companies",
                  color: "from-orange-500 to-orange-600"
                },
                {
                  title: "Save Costs",
                  description: "Reduce HR operational costs by up to 40% while improving efficiency and employee experience.",
                  icon: <DollarSign className="h-6 w-6 text-primary" />,
                  stats: "40% cost reduction",
                  color: "from-orange-500 to-orange-600"
                },
              ].map((benefit, index) => (
                <motion.div
                  key={index}
                  className="group relative overflow-hidden rounded-2xl bg-background p-6 shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border border-border/20"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-500 ${benefit.color}`}></div>
                  <div className="relative z-10">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      {benefit.icon}
                    </div>
                    <h3 className="mb-2 text-xl font-bold text-foreground">{benefit.title}</h3>
                    <p className="mb-4 text-muted-foreground">{benefit.description}</p>
                    <div className="text-sm font-medium text-primary">{benefit.stats}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Client Logos */}
            <motion.div
              className="mt-20 pt-16 border-t border-gray-100 flex flex-col items-center justify-center gap-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >

              <Badge className="px-4 py-1 rounded-full bg-background" variant="outline">
                <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
                Our Partners
              </Badge>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 items-center justify-center w-full max-w-5xl mx-auto">
                {/* Microsoft Logo */}
                <div className="group relative flex items-center justify-center h-16 w-40">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-emerald-600/10 rounded-2xl -rotate-1 group-hover:rotate-0 transition-transform duration-300" />
                  <div className="relative z-10 p-3 bg-white/5 backdrop-blur-sm rounded-xl border border-orange-100/20 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                    <svg viewBox="0 0 23 23" className="h-8 w-24 opacity-90 group-hover:opacity-100 transition-opacity">
                      <path d="M0 0h10.5v10.5H0z" className="group-hover:opacity-90 transition-opacity" fill="#f25022"/>
                      <path d="M12.5 0H23v10.5H12.5z" className="group-hover:opacity-90 transition-opacity" fill="#7fba00"/>
                      <path d="M0 12.5h10.5V23H0z" className="group-hover:opacity-90 transition-opacity" fill="#00a4ef"/>
                      <path d="M12.5 12.5H23V23H12.5z" className="group-hover:opacity-90 transition-opacity" fill="#ffb900"/>
                    </svg>
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-emerald-500 h-0.5 w-8 rounded-full group-hover:w-16 transition-all duration-300" />
                </div>
                {/* Google Logo */}
                <div className="group relative flex items-center justify-center h-16 w-40">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-emerald-600/10 rounded-2xl -rotate-1 group-hover:rotate-0 transition-transform duration-300" />
                  <div className="relative z-10 p-3 bg-white/5 backdrop-blur-sm rounded-xl border border-orange-100/20 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                    <svg viewBox="0 0 24 24" className="h-8 w-24 opacity-90 group-hover:opacity-100 transition-opacity">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" className="group-hover:drop-shadow-[0_0_8px_rgba(66,133,244,0.4)] transition-all" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" className="group-hover:drop-shadow-[0_0_8px_rgba(52,168,83,0.4)] transition-all" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" className="group-hover:drop-shadow-[0_0_8px_rgba(251,188,5,0.4)] transition-all" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" className="group-hover:drop-shadow-[0_0_8px_rgba(234,67,53,0.4)] transition-all" fill="#EA4335"/>
                    </svg>
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-emerald-500 h-0.5 w-8 rounded-full group-hover:w-16 transition-all duration-300" />
                </div>
                {/* Amazon Logo */}
                <div className="group relative flex items-center justify-center h-16 w-40">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-emerald-600/10 rounded-2xl -rotate-1 group-hover:rotate-0 transition-transform duration-300" />
                  <div className="relative z-10 p-3 bg-white/5 backdrop-blur-sm rounded-xl border border-orange-100/20 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                    <svg viewBox="0 0 24 24" className="h-8 w-24 opacity-90 group-hover:opacity-100 transition-opacity">
                      <path d="M6.43 18.57c0 .8.66 1.43 1.47 1.43h8.62c.81 0 1.47-.64 1.47-1.43v-1.14h-11.56v1.14zm17.14-9.14c0-1.14-.15-2.08-.43-2.85-.28-.77-.7-1.38-1.28-1.86-.57-.48-1.28-.72-2.12-.72h-3.85c-.85 0-1.62.24-2.3.72-.7.48-1.25 1.14-1.66 1.98v-2.42h-3.42v15.42h3.42v-7.13c0-.64.1-1.2.32-1.7.2-.5.5-.9.85-1.2.37-.3.8-.45 1.28-.45h2.13c.48 0 .91.15 1.28.45.37.3.66.7.85 1.2.2.5.32 1.06.32 1.7v7.13h3.42v-7.99c0-1.02.05-1.96.15-2.85.1-.89.21-1.66.32-2.3h-3.1c-.1.32-.16.74-.16 1.28 0 .8.24 1.5.74 2.08.5.58 1.17.86 2.02.86h1.6c.43 0 .8-.15 1.12-.43.32-.3.54-.7.64-1.2.1-.5.15-1.02.15-1.56v-1.56z" className="group-hover:drop-shadow-[0_0_8px_rgba(255,153,0,0.4)] transition-all" fill="#FF9900"/>
                      <path d="M0 23.99h24v-24h-24v24z" fill="none"/>
                    </svg>
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-emerald-500 h-0.5 w-8 rounded-full group-hover:w-16 transition-all duration-300" />
                </div>
                {/* Netflix Logo */}
                <div className="group relative flex items-center justify-center h-16 w-40">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-emerald-600/10 rounded-2xl -rotate-1 group-hover:rotate-0 transition-transform duration-300" />
                  <div className="relative z-10 p-3 bg-white/5 backdrop-blur-sm rounded-xl border border-orange-100/20 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300">
                    <svg viewBox="0 0 111 30" className="h-8 w-24 opacity-90 group-hover:opacity-100 transition-opacity">
                      <path d="M105.06 13.19c0-.93-.03-1.75-.16-2.48-.12-.72-.35-1.33-.7-1.81-.35-.48-.83-.85-1.45-1.1-.62-.26-1.4-.38-2.35-.38h-5.35v11.31h2.22v-4.41h2.67l2.22 4.41h2.44l-2.38-4.62c.72-.12 1.27-.34 1.67-.64.4-.3.7-.68.88-1.14.18-.46.27-.96.27-1.5v-.6zm-2.6-.16c0 .5-.1.91-.3 1.21-.2.3-.5.46-.91.46h-2.54v-3.42h2.54c.4 0 .71.15.91.46.2.3.3.73.3 1.29v.46zM94.9 7.42h-2.38v11.31h2.38V7.42zm-5.45 0h-2.38v11.31h2.38V7.42zm-2.54-5.93c0-.3.1-.55.32-.74.22-.2.5-.3.86-.3.35 0 .64.1.83.3.2.2.3.45.3.74 0 .3-.1.55-.3.74-.2.2-.48.3-.83.3-.36 0-.64-.1-.86-.3-.22-.2-.33-.45-.33-.74zm2.22 5.93h-2.38v11.31h2.38V7.42zM81.6 7.42h-2.7l-3.07 8.02-3.14-8.02h-2.7l4.2 10.67-1.07 2.6c-.1.3-.2.54-.3.74-.1.2-.24.36-.42.48-.18.12-.4.18-.67.18-.12 0-.26-.02-.4-.04-.14-.02-.27-.04-.38-.04v1.61c.24.04.5.06.78.06.9 0 1.6-.21 2.12-.64.52-.43.9-1.04 1.17-1.8l4.78-11.98zM68.8 7.42h-2.38v11.31h2.38V7.42zM63.3 7.42h-3.2l-2.7 6.4v4.91h2.38v-4.53l2.7-6.4h-2.7l-2.7 6.4v-6.4h-2.38v11.31h2.38l2.7-6.4v6.4h2.38V7.42h.64z" className="group-hover:drop-shadow-[0_0_8px_rgba(229,9,20,0.4)] transition-all" fill="#E50914"/>
                      <path d="M52.48 7.42h-2.7v11.31h2.7v-4.4c.8 1.6 2.3 2.4 4.5 2.4 1.2 0 2.2-.2 3.1-.6.9-.4 1.6-1 2.1-1.8.5-.8.8-1.8.8-3v-4.9h-2.7v4.9c0 .6-.2 1.1-.5 1.5-.3.4-.7.7-1.2.9-.5.2-1 .3-1.6.3-1.1 0-1.9-.3-2.4-.9-.5-.6-.8-1.4-.8-2.5v-4.2zM37.4 7.42h-2.7v11.31h2.7v-4.4c.8 1.6 2.3 2.4 4.5 2.4 1.2 0 2.2-.2 3.1-.6.9-.4 1.6-1 2.1-1.8.5-.8.8-1.8.8-3v-4.9h-2.7v4.9c0 .6-.2 1.1-.5 1.5-.3.4-.7.7-1.2.9-.5.2-1 .3-1.6.3-1.1 0-1.9-.3-2.4-.9-.5-.6-.8-1.4-.8-2.5v-4.2z" className="group-hover:drop-shadow-[0_0_8px_rgba(229,9,20,0.4)] transition-all" fill="#E50914"/>
                      <path d="M30.3 12.9c0 1.1-.2 2-.5 2.9-.3.9-.8 1.6-1.4 2.1-.6.5-1.4 1-2.3 1.2-.9.2-1.9.3-3 .3h-6.4V7.4h6.5c1 0 2 .1 2.9.3.9.2 1.7.7 2.3 1.2.6.5 1.1 1.2 1.4 2.1.3.9.5 1.8.5 2.9v.1zm-2.6 0c0-1.8-.6-3.1-1.7-3.8-1.1-.7-2.8-1.1-5-1.1h-3.4v9.9h3.4c2.2 0 3.9-.4 5-1.1 1.1-.7 1.7-2 1.7-3.9z" className="group-hover:drop-shadow-[0_0_8px_rgba(229,9,20,0.4)] transition-all" fill="#E50914"/>
                    </svg>
                  </div>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-emerald-500 h-0.5 w-8 rounded-full group-hover:w-16 transition-all duration-300" />
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full bg-muted py-12 md:py-24 lg:py-32 relative overflow-hidden" id="pricing">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 to-transparent opacity-70" />
          <div className="container mx-auto px-4 md:px-6 relative">
            <div className="flex flex-col items-center justify-center space-y-6 text-center">
              <div className="inline-flex p-1 bg-background rounded-full shadow-sm">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Ready to Transform Your HR?
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Join hundreds of organizations already using BAIFAM HR System to streamline their human resource operations and improve employee satisfaction.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Link href="/signup">
                  <Button
                    className="gap-1 rounded-full shadow-lg transition-transform hover:scale-105"
                    size="lg"
                  >
                    Start Free Trial
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="#features">
                  <Button
                    className="rounded-full shadow-sm transition-transform hover:scale-105"
                    size="lg"
                    variant="outline"
                  >
                    <PlayCircle className="h-5 w-5" />
                      Watch Demo
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-background">
        <div className="container mx-auto flex flex-col gap-6 py-8 md:flex-row md:items-center md:justify-between md:py-12">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-bold">BAIFAM HR SYSTEM</span>
          </div>
          <nav className="flex gap-6">
            <Link
              className="text-sm font-medium transition-colors hover:text-primary relative group"
              href="#features"
            >
              Features
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </Link>
            <Link
              className="text-sm font-medium transition-colors hover:text-primary relative group"
              href="#performance"
            >
              Performance
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </Link>
            <Link
              className="text-sm font-medium transition-colors hover:text-primary relative group"
              href="#benefits"
            >
              Benefits
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </Link>
          </nav>
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} BAIFAM HR SYSTEM. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
