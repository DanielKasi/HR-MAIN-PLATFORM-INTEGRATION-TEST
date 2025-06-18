"use client";

import {useEffect, useState} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle,
  Globe,
  Heart,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
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
              <ShoppingCart className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold">APP TITLE</span>
          </div>
          <nav className="hidden gap-6 md:flex">
            <Link
              className="text-sm font-medium transition-colors hover:text-primary relative group"
              href="#features"
            >
              Tab
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </Link>
            <Link
              className="text-sm font-medium transition-colors hover:text-primary relative group"
              href=""
            >
              Tab
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all group-hover:w-full" />
            </Link>
            <Link
              className="text-sm font-medium transition-colors hover:text-primary relative group"
              href="#benefits"
            >
              Tab
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
                    <span className="font-medium text-primary">Super Fast</span>
                    <span className="mx-1">•</span>
                    <span>No Credit Card Required</span>
                  </div>
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                    Application Catch line
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Application Description Text
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
                    alt="APPLICATION NAME Dashboard"
                    className="rounded-3xl object-cover shadow-xl"
                    src="/supamax-cover.jpg?height=550&width=550"
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
                  Powerful Features at No Cost
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Everything you need to manage your organisation efficiently in one integrated
                  platform
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 py-12 md:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-3 rounded-3xl border p-6 shadow-sm bg-background transition-transform hover:scale-105 hover:shadow-md">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <ShoppingCart className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Point of Sale</h3>
                <p className="text-center text-muted-foreground">
                  Fast and intuitive POS system with barcode scanning, receipt printing, and
                  multiple payment options.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-3 rounded-3xl border p-6 shadow-sm bg-background transition-transform hover:scale-105 hover:shadow-md">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <Package className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Inventory Management</h3>
                <p className="text-center text-muted-foreground">
                  Track stock levels, set reorder points, and manage product categories with ease.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-3 rounded-3xl border p-6 shadow-sm bg-background transition-transform hover:scale-105 hover:shadow-md">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <Globe className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Online Marketplace</h3>
                <p className="text-center text-muted-foreground">
                  Showcase your products online and reach more customers through our integrated
                  marketplace.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-3 rounded-3xl border p-6 shadow-sm bg-background transition-transform hover:scale-105 hover:shadow-md">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <BarChart className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Reports & Analytics</h3>
                <p className="text-center text-muted-foreground">
                  Gain insights with detailed sales, inventory, and online performance reports.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-3 rounded-3xl border p-6 shadow-sm bg-background transition-transform hover:scale-105 hover:shadow-md">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <Store className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Multi-Branch Support</h3>
                <p className="text-center text-muted-foreground">
                  Manage multiple locations with centralized control and branch-specific reporting.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-3 rounded-3xl border p-6 shadow-sm bg-background transition-transform hover:scale-105 hover:shadow-md">
                <div className="p-3 bg-primary/10 rounded-2xl">
                  <ShoppingBag className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold">E-commerce Integration</h3>
                <p className="text-center text-muted-foreground">
                  Sync your inventory with our marketplace for seamless online and offline sales
                  management.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Online Marketplace Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 relative" id="marketplace">
          <div className="absolute top-1/2 left-0 w-24 h-24 bg-primary/5 rounded-full -translate-x-1/2" />
          <div className="container mx-auto px-4 md:px-6 relative">
            <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 xl:grid-cols-2 items-center">
              <div className="flex items-center justify-center order-2 lg:order-1">
                <div className="relative h-[350px] w-[350px] sm:h-[450px] sm:w-[450px]">
                  <div className="absolute inset-0 border-4 border-primary/10 rounded-3xl -rotate-3" />
                  <img
                    alt="Online Marketplace"
                    className="rounded-3xl object-cover shadow-xl rotate-3"
                    src="/online-market.jpg?height=450&width=450"
                  />
                  <div className="absolute -top-4 -right-4 bg-background rounded-full p-2 shadow-lg">
                    <Star className="h-5 w-5 text-primary" fill="currentColor" />
                  </div>
                </div>
              </div>
              <div className="flex flex-col justify-center space-y-4 order-1 lg:order-2">
                <Badge
                  className="px-4 py-1 rounded-full bg-background self-start"
                  variant="outline"
                >
                  <Globe className="h-3.5 w-3.5 mr-1.5 text-primary" />
                  Marketplace
                </Badge>
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                    Boost Your Sales with Our Online Marketplace
                  </h2>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    When you use our POS system, your products are automatically showcased on our
                    online marketplace, helping you reach more customers and increase sales without
                    any additional effort.
                  </p>
                  <ul className="space-y-3 pt-4">
                    <li className="flex items-center gap-3 bg-background p-3 rounded-2xl shadow-sm">
                      <div className="bg-primary/10 p-1.5 rounded-full">
                        <CheckCircle className="h-4 w-4 text-primary" />
                      </div>
                      <span>Automatic product listing on our marketplace</span>
                    </li>
                    <li className="flex items-center gap-3 bg-background p-3 rounded-2xl shadow-sm">
                      <div className="bg-primary/10 p-1.5 rounded-full">
                        <CheckCircle className="h-4 w-4 text-primary" />
                      </div>
                      <span>Expand your customer base beyond physical location</span>
                    </li>
                    <li className="flex items-center gap-3 bg-background p-3 rounded-2xl shadow-sm">
                      <div className="bg-primary/10 p-1.5 rounded-full">
                        <CheckCircle className="h-4 w-4 text-primary" />
                      </div>
                      <span>Integrated order management for online sales</span>
                    </li>
                    <li className="flex items-center gap-3 bg-background p-3 rounded-2xl shadow-sm">
                      <div className="bg-primary/10 p-1.5 rounded-full">
                        <CheckCircle className="h-4 w-4 text-primary" />
                      </div>
                      <span>Real-time inventory sync between online and offline</span>
                    </li>
                  </ul>
                </div>
                <div className="pt-4">
                  <Link href="/signup">
                    <Button
                      className="gap-1 rounded-full shadow-lg transition-transform hover:scale-105"
                      size="lg"
                    >
                      Start Selling Online
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
                  Why Choose Our Solution?
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Discover how our system can transform your organisation operations and boost your
                  online presence.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 py-12 md:grid-cols-2">
              <div className="flex flex-col gap-2 bg-background p-5 rounded-3xl shadow-sm transition-transform hover:scale-105 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Increased Online Visibility</h3>
                </div>
                <p className="text-muted-foreground pl-10">
                  Get your products seen by thousands of online Institutionpers through our
                  marketplace.
                </p>
              </div>
              <div className="flex flex-col gap-2 bg-background p-5 rounded-3xl shadow-sm transition-transform hover:scale-105 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Expanded Customer Reach</h3>
                </div>
                <p className="text-muted-foreground pl-10">
                  Attract customers beyond your physical location through our online platform.
                </p>
              </div>
              <div className="flex flex-col gap-2 bg-background p-5 rounded-3xl shadow-sm transition-transform hover:scale-105 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Better Inventory Control</h3>
                </div>
                <p className="text-muted-foreground pl-10">
                  Prevent stockouts and overstock situations with real-time inventory tracking.
                </p>
              </div>
              <div className="flex flex-col gap-2 bg-background p-5 rounded-3xl shadow-sm transition-transform hover:scale-105 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Data-Driven Decisions</h3>
                </div>
                <p className="text-muted-foreground pl-10">
                  Make informed business decisions based on comprehensive sales and inventory data.
                </p>
              </div>
              <div className="flex flex-col gap-2 bg-background p-5 rounded-3xl shadow-sm transition-transform hover:scale-105 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Enhanced Customer Experience</h3>
                </div>
                <p className="text-muted-foreground pl-10">
                  Provide faster service and personalized offers to increase customer satisfaction.
                </p>
              </div>
              <div className="flex flex-col gap-2 bg-background p-5 rounded-3xl shadow-sm transition-transform hover:scale-105 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-full">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Zero Cost Implementation</h3>
                </div>
                <p className="text-muted-foreground pl-10">
                  Get all the benefits of a premium POS system without any subscription fees or
                  hidden costs.
                </p>
              </div>
            </div>
          </div>
        </section>
        {/* CTA Section */}
        <section className="w-full bg-muted py-12 md:py-24 lg:py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 to-transparent opacity-70" />
          <div className="container mx-auto px-4 md:px-6 relative">
            <div className="flex flex-col items-center justify-center space-y-6 text-center">
              <div className="inline-flex p-1 bg-background rounded-full shadow-sm">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Ready to Boost Your Sales?
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Join thousands of organisations already using our platform to streamline
                  operations and sell online.
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
                <Link href="#marketplace">
                  <Button
                    className="rounded-full shadow-sm transition-transform hover:scale-105"
                    size="lg"
                    variant="outline"
                  >
                    Learn About Our Marketplace
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
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xl font-bold">APPLICATION NAME</span>
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
              href="#marketplace"
            >
              Marketplace
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
            © {new Date().getFullYear()} APPLICATION NAME. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

function Package(props: any) {
  return (
    <svg
      {...props}
      fill="none"
      height="24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

function Store(props: any) {
  return (
    <svg
      {...props}
      fill="none"
      height="24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
      <path d="M2 7h20" />
      <path d="M22 7v3a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V7" />
      <path d="M18 12v0a2 2 0 0 1-2-2V7" />
      <path d="M14 7v3a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V7" />
      <path d="M10 12v0a2 2 0 0 1-2-2V7" />
      <path d="M6 7v3a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V7" />
    </svg>
  );
}

function BarChart(props: any) {
  return (
    <svg
      {...props}
      fill="none"
      height="24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  );
}
