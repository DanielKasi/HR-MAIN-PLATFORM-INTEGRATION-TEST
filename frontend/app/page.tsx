"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  Users,
  Heart,
  Calendar,
  Clock,
  Sparkles,
  Star,
  UserPlus,
  FileText,
  DollarSign,
  BarChart3,
  Shield,
  Award
} from "lucide-react";
import {useSelector} from "react-redux";

import {Button} from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import {selectAccessToken} from "@/store/auth/selectors";
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
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-5">
            <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-primary" />
            <div className="absolute top-40 right-20 w-16 h-16 rounded-full bg-primary" />
            <div className="absolute bottom-20 left-1/4 w-24 h-24 rounded-full bg-primary" />
            <div className="absolute bottom-40 right-1/3 w-12 h-12 rounded-full bg-primary" />
          </div>
          <div className="container mx-auto px-4 md:px-6 relative">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:grid-cols-2 items-center">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center rounded-full border bg-background px-3 py-1 text-sm shadow-sm">
                    <Sparkles className="h-3.5 w-3.5 mr-1 text-primary" />
                    <span className="font-medium text-primary">Complete HR Solution</span>
                    <span className="mx-1">•</span>
                    <span>Free Trial Available</span>
                  </div>
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                    Streamline Your HR Operations
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Comprehensive human resource management system designed to simplify employee management, payroll, attendance, and performance tracking all in one platform.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Link href="/signup">
                    <Button
                      className="gap-1 rounded-full shadow-lg transition-transform hover:scale-105"
                      size="lg"
                    >
                      Get Started
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button
                      className="rounded-full shadow-sm transition-transform hover:scale-105"
                      size="lg"
                      variant="outline"
                    >
                      Live Demo
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="relative h-[350px] w-[350px] sm:h-[450px] sm:w-[450px] lg:h-[550px] lg:w-[550px]">
                  <div className="absolute -inset-4 rounded-full bg-primary/5 animate-pulse" />
                  <img
                    alt="BAIFAM HR SYSTEM Dashboard"
                    className="rounded-3xl object-cover shadow-xl"
                    src="/hr-dashboard.jpg?height=550&width=550"
                  />
                  <div className="absolute -bottom-4 -right-4 bg-background rounded-full p-3 shadow-lg">
                    <Heart className="h-6 w-6 text-primary" fill="currentColor" />
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
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:grid-cols-2 items-center">
              <div className="flex items-center justify-center order-2 lg:order-1">
                <div className="relative h-[350px] w-[350px] sm:h-[450px] sm:w-[450px]">
                  <div className="absolute inset-0 border-4 border-primary/10 rounded-3xl -rotate-3" />
                  <img
                    alt="Performance Analytics Dashboard"
                    className="rounded-3xl object-cover shadow-xl rotate-3"
                    src="/performance-analytics.jpg?height=450&width=450"
                  />
                  <div className="absolute -top-4 -right-4 bg-background rounded-full p-2 shadow-lg">
                    <Award className="h-5 w-5 text-primary" fill="currentColor" />
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-center space-y-4 order-1 lg:order-2">
                <Badge
                  className="px-4 py-1 rounded-full bg-background self-start"
                  variant="outline"
                >
                  <BarChart3 className="h-3.5 w-3.5 mr-1.5 text-primary" />
                  Performance
                </Badge>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                    Data-Driven Performance Management
                  </h2>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Make informed decisions about your workforce with comprehensive analytics, performance tracking, and actionable insights that drive organizational growth.
                  </p>
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
          className="w-full bg-muted py-12 md:py-24 lg:py-32 relative overflow-hidden"
          id="benefits"
        >
          <div className="absolute top-0 left-1/2 w-32 h-32 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-1/4 w-24 h-24 bg-primary/5 rounded-full translate-y-1/2" />

          <div className="container mx-auto px-4 md:px-6 relative">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <Badge className="px-4 py-1 rounded-full bg-background" variant="outline">
                <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
                Benefits
              </Badge>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Why Choose BAIFAM HR System?
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Transform your HR operations with our comprehensive solution designed to increase efficiency and employee satisfaction.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 py-12 md:grid-cols-2">
              <div className="flex flex-col gap-2 bg-background p-5 rounded-3xl shadow-sm transition-transform hover:scale-105 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Increased Productivity</h3>
                </div>
                <p className="text-muted-foreground pl-10">
                  Automate routine HR tasks and free up time for strategic initiatives and employee development.
                </p>
              </div>
              <div className="flex flex-col gap-2 bg-background p-5 rounded-3xl shadow-sm transition-transform hover:scale-105 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Enhanced Employee Experience</h3>
                </div>
                <p className="text-muted-foreground pl-10">
                  Self-service portals and streamlined processes improve employee satisfaction and engagement.
                </p>
              </div>
              <div className="flex flex-col gap-2 bg-background p-5 rounded-3xl shadow-sm transition-transform hover:scale-105 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Compliance Management</h3>
                </div>
                <p className="text-muted-foreground pl-10">
                  Stay compliant with labor laws and regulations through automated compliance tracking and reporting.
                </p>
              </div>
              <div className="flex flex-col gap-2 bg-background p-5 rounded-3xl shadow-sm transition-transform hover:scale-105 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Data Security</h3>
                </div>
                <p className="text-muted-foreground pl-10">
                  Enterprise-grade security ensures your sensitive HR data is protected with encryption and access controls.
                </p>
              </div>
              <div className="flex flex-col gap-2 bg-background p-5 rounded-3xl shadow-sm transition-transform hover:scale-105 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Scalable Solution</h3>
                </div>
                <p className="text-muted-foreground pl-10">
                  Grows with your organization from startup to enterprise with flexible modules and pricing.
                </p>
              </div>
              <div className="flex flex-col gap-2 bg-background p-5 rounded-3xl shadow-sm transition-transform hover:scale-105 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Cost Effective</h3>
                </div>
                <p className="text-muted-foreground pl-10">
                  Reduce HR operational costs while improving efficiency with our affordable, all-in-one solution.
                </p>
              </div>
            </div>
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
                    Learn More About Features
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