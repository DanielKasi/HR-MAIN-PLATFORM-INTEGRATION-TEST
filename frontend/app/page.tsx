"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, CheckCircle, Users, DollarSign, Calendar, Shield, Star, Award, Menu, X } from "lucide-react"
import { Bricolage_Grotesque } from "next/font/google"
import { useState } from "react"
import Link from "next/link"

const bricolage = Bricolage_Grotesque({ subsets: ["latin"] })

export default function HomePage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Background */}
      <div className="relative min-h-screen overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.08]"
          style={{
            backgroundImage: "url('/images/hero.jpg')",
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        />

        {/* Header */}
        <header className="relative z-10 mx-auto max-w-7xl px-6 py-5">
          <div className="flex items-center justify-between rounded-2xl bg-white px-6 py-4 shadow-sm">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <img src="/images/logo.png" alt="PERACOSOFT Logo" className="h-10 w-10" />
                <span className="text-2xl font-bold text-myblack">PERACOSOFT</span>
              </div>
            </div>

                         <div className="hidden md:flex items-center gap-4">
               <Button variant="ghost" className="text-myblack hover:bg-gray-50" asChild>
                 <Link href="/login">Login</Link>
               </Button>
               <Button className="bg-primary hover:bg-primary text-white rounded-full" asChild>
                 <Link href="/signup">Sign Up</Link>
               </Button>
             </div>

            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-myblack hover:bg-gray-50"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>

                     {isMobileMenuOpen && (
             <div className="md:hidden mt-2 rounded-2xl bg-white px-6 py-4 shadow-sm">
               <div className="flex flex-col gap-3">
                 <Button variant="ghost" className="text-myblack hover:bg-gray-50 justify-start" asChild>
                   <Link href="/login">Login</Link>
                 </Button>
                 <Button className="bg-primary hover:bg-primary text-white rounded-full" asChild>
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
                className={`text-3xl md:text-5xl font-extrabold leading-tight md:whitespace-nowrap text-center ${bricolage.className}`}
              >
                <span className="text-myblack">Transform the Way You </span>
                <span className="text-primary">Manage Your Workforce</span>
              </h1>
              <p className="mx-auto max-w-3xl text-base md:text-lg text-gray-700 md:whitespace-nowrap">
                PERACOSOFT empowers organizations to streamline HR processes, enhance employee engagement, and
                <br className="hidden md:block" />
                drive business growth through intelligent workforce management solutions.
              </p>
            </div>
            <Button
              size="lg"
              className="bg-primary hover:bg-primary text-white px-8 py-6 text-lg rounded-full shadow-lg"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="relative z-10 mx-auto max-w-6xl px-6 pb-20">
          <div className="rounded-t-3xl p-8 backdrop-blur-sm">
            <img
              src="/images/homepage.jpg"
              alt="PERACOSOFT Dashboard Preview"
              className="w-full rounded-t-2xl border-8 border-gray-200 shadow-2xl"
            />
          </div>
        </div>
      </div>

      {/* Stats and Testimonial Section */}
      <section className="bg-white py-20 -mt-[300px] relative z-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-24">
            {/* Stats */}
            <div className="space-y-8">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-3xl font-bold text-primary">500+</div>
                  <div className="text-myblack">Businesses</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary">50,000+</div>
                  <div className="text-myblack">Employees Managed</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary">99%</div>
                  <div className="text-myblack">Payroll Accuracy</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-primary">24/7</div>
                  <div className="text-myblack">Support Available</div>
                </div>
              </div>
            </div>

            {/* Testimonial */}
            <Card className="bg-[#F0F0F6] border-0 shadow-xl">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <p className="text-myblack">
                    "PERACOSOFT has completely transformed how we manage our workforce. The automation saves us hours
                    every week, and the insights help us make better decisions."
                  </p>
                  <div className="flex items-center gap-3">
                    <img src="/images/homepage.jpg" alt="Shamin Johnson" className="h-10 w-10 rounded-full" />
                    <div>
                      <div className="font-medium text-myblack">Shamin Johnson</div>
                      <div className="text-sm text-gray-600">Head HR, Baifam Group</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* HR Manager CTA */}
      <section className="bg-myblack py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <div className="space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              Enhance HR Operations with Your Dedicated HR Manager
            </h2>
            <p className="text-white/90">
              Our dedicated HR Manager service is designed to simplify and optimize your human resources processes. With
              a skilled HR professional at your disposal, you can focus on growing your business.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="space-y-12">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-myblack">Everything You Need to Manage Your Team</h2>
              <p className="mt-4 text-gray-600">
                From recruitment to retirement, our comprehensive platform handles every aspect of human resource
                management.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {/* Recruitment */}
              <Card className="bg-myblack text-white border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="inline-flex rounded-full bg-orange-500/10 p-4">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-medium">Recruitment</h3>
                    <p className="text-white/90">
                      Streamline hiring with applicant tracking, job postings, automated screening, and collaborative
                      tools to build winning teams.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Payroll */}
              <Card className="bg-white border shadow-lg">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="inline-flex rounded-full bg-orange-500/10 p-4">
                      <DollarSign className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-medium text-black">Payroll</h3>
                    <p className="text-gray-600">
                      Ensure accurate, timely payroll processing with tax compliance, automated calculations, and secure
                      employee salary management system.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Employee Management */}
              <Card className="bg-myblack text-white border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="inline-flex rounded-full bg-primary/10 p-4">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-medium">Employee Management</h3>
                    <p className="text-white/90">
                      Centralize employee data, performance records, and profiles to simplify workforce management,
                      improve productivity, and empower HR teams.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Asset Tracking */}
              <Card className="bg-white border shadow-lg">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="inline-flex rounded-full bg-primary/10 p-4">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-medium text-myblack">Asset Tracking</h3>
                    <p className="text-gray-600">
                      Easily manage company assets with real-time tracking, assignment, and recovery for improved
                      accountability and resource optimization.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Leaves & Attendance */}
              <Card className="bg-myblack text-white border-0 shadow-lg">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="inline-flex rounded-full bg-primary/10 p-4">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-medium">Leaves & Attendance</h3>
                    <p className="text-white/90">
                      Automate leave requests, approvals, and attendance tracking with smart calendars, ensuring
                      compliance and seamless employee scheduling.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Events & Holidays */}
              <Card className="bg-white border shadow-lg">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="inline-flex rounded-full bg-primary/10 p-4">
                      <Calendar className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-medium text-myblack">Events & Holidays</h3>
                    <p className="text-gray-600">
                      Plan, track, and celebrate events, holidays, and milestones with shared calendars that boost
                      workplace culture and engagement.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-20">
            <div>
              <img src="/images/teams.jpg" alt="HR Team Collaboration" className="rounded-3xl shadow-lg" />
            </div>
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold text-myblack">Empowering HR Teams, Engaging Employees</h2>
                <p className="text-gray-600">
                  Transform your workplace with intelligent automation and employee-centric features
                </p>
              </div>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-medium text-myblack">Save Time with Automation</h3>
                    <p className="text-gray-600">Reduce manual tasks by 80% with intelligent workflows</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-medium text-myblack">Real-Time Analytics</h3>
                    <p className="text-gray-600">Make data-driven decisions with comprehensive reporting</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-medium text-myblack">Scalable & Secure</h3>
                    <p className="text-gray-600">Grows with your business while maintaining enterprise security</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-xl font-medium text-myblack">Employee Self-Service</h3>
                    <p className="text-gray-600">Empower employees with self-service portals and mobile access</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Culture Section */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="space-y-12">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-myblack">
                Beyond HR, A Platform for People & Culture
              </h2>
              <p className="mt-4 text-gray-600">
                Foster a positive workplace culture with integrated tools for celebrations, events, and team engagement.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
              <Card className="bg-violet-50 border-0">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-bold text-myblack">Company Events</h3>
                      <p className="text-gray-700">Never miss important dates, celebrations, and team events</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-myblack">Team Building</span>
                      <Badge variant="secondary" className="bg-violet-100 text-violet-700">
                        Dec 15
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-0">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-bold text-myblack">Birthday Reminders</h3>
                      <p className="text-gray-700">Celebrate your team with automated birthday notifications</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-blue-500" />
                      <span className="text-myblack">{"John's birthday today! 🎉"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-sky-50 border-0">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-bold text-myblack">Recognition</h3>
                      <p className="text-gray-700">Acknowledge achievements and boost team morale</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-primary fill-current" />
                      <span className="text-myblack">Employee of the Month</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="bg-gray-100 py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div className="text-center">
              <Shield className="mx-auto h-6 w-6 text-myblack mb-2" />
              <h3 className="font-medium text-myblack">GDPR Compliant</h3>
              <p className="text-sm text-gray-600">Full compliance with data protection regulations</p>
            </div>
            <div className="text-center">
              <Shield className="mx-auto h-6 w-6 text-myblack mb-2" />
              <h3 className="font-medium text-myblack">End-to-End Encryption</h3>
              <p className="text-sm text-gray-600">Bank-grade security for all data</p>
            </div>
            <div className="text-center">
              <Award className="mx-auto h-6 w-6 text-myblack mb-2" />
              <h3 className="font-medium text-myblack">ISO Certified</h3>
              <p className="text-sm text-gray-600">Meets international security standards</p>
            </div>
            <div className="text-center">
              <CheckCircle className="mx-auto h-6 w-6 text-myblack mb-2" />
              <h3 className="font-medium text-myblack">Regular Audits</h3>
              <p className="text-sm text-gray-600">Continuous security monitoring</p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA and Footer with Background */}
      <div className="relative">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('/images/world.png')",
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        />

        <section className=" py-20 relative z-10">
          <div className="mx-auto max-w-4xl px-6 text-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h2 className="text-3xl md:text-4xl font-bold text-white">Ready to Simplify HR Management?</h2>
                <p className="text-white/90">
                  Join thousands of companies that have transformed their HR operations with PERACOSOFT. Start for free
                  today.
                </p>
              </div>
              <Button size="lg" className="bg-primary hover:bg-primary/80 text-white px-8 py-6 text-lg rounded-full">
                Join Now Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className=" py-8 relative z-10">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-white/70">© 2025 BAISOFT. All rights reserved.</p>
              <div className="flex gap-6">
                <a
                  href="#"
                  className="h-6 w-6 bg-white/20 rounded flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="h-6 w-6 bg-white/20 rounded flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href="#"
                  className="h-6 w-6 bg-white/20 rounded flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
