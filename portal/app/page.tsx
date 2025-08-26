"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Icon } from "@iconify/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PaginatedTableWrapper } from "@/components/paginated-table"
import { JobAdvertsAPI } from "@/lib/api"
import type { JobPositionAdvert } from "@/lib/types"
import Link from "next/link";

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const JobPortal = () => {
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter] = useState<string>("all")
  const [categoryFilter] = useState<string>("all")
  const refreshTableRef = useRef<(() => void) | null>(null)



 

  const hasFilters = searchTerm || statusFilter !== "all" || categoryFilter !== "all"

  // Fetch functions for PaginatedTableWrapper
  const fetchFirstPage = async (query?: unknown) => {
    const search = typeof query === "string" ? query : searchTerm
    return JobAdvertsAPI.getPaginated({
      page: 1,
      search: search || undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      category: categoryFilter !== "all" ? categoryFilter : undefined,
    })
  }

  const fetchFromUrl = async ({ url }: { url: string }) => {
    return JobAdvertsAPI.getPaginatedFromUrl({ url })
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header Section */}
      <div className="py-10 w-full relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{
            backgroundImage: "url('/images/bg.png')",
          }}
        />
        <div className="absolute inset-0" />
        <div className="w-6/12 max-lg:w-full max-lg:px-4 mx-auto text-start relative z-10">
          <div className="flex items-center justify-start gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="flex items-center justify-start">
              <img src="/images/logo.png" alt="Logo" className="w-8 h-8" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-800">PERACOSOFT</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 max-w-2xl leading-relaxed">
            Search tailored job listings designed to match your expertise and ambitions. Find the role that aligns with
            your goals effortlessly.
          </p>
        </div>
      </div>

      {/* Search Section */}
      <div className="w-6/12 max-lg:w-full max-lg:px-4 mx-auto -mt-6 sm:-mt-8 mb-8 sm:mb-12 relative z-20">
        <div className="w-full mx-auto">
          <div className="bg-white w-full rounded-xl shadow-lg border border-gray-200 p-3 sm:p-4 ">
            <div className="flex flex-col md:flex-row gap-3 sm:gap-4 ">
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search jobs, companies, or keywords…"
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="w-full px-3 sm:px-4 py-3 sm:py-3 text-sm sm:text-base text-gray-600 bg-transparent border-none outline-none"
                />
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <div className="hidden sm:block w-px h-10 bg-gray-200"></div>
                <div className="flex items-center justify-between sm:justify-start gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer border sm:border-none">
                  <span className="text-sm sm:text-base text-gray-600">All Industries</span>
                  <Icon icon="hugeicons:arrow-down-01" className="w-4 h-4 text-gray-400" />
                </div>
                <Button className="bg-myOrange hover:bg-myOrange text-white p-3 rounded-lg transition-colors w-full sm:w-auto">
                  <Icon icon="hugeicons:search-01" className="w-5 h-5" />
                  <span className="ml-2 sm:hidden">Search Jobs</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Jobs Section */}
      <div className="px-4 sm:px-6 lg:px-8 pb-16">
        <div className=" w-9/12 mx-auto max-lg:w-full">
          {/* Header and Filters */}
          <div className="flex flex-col gap-4 mb-6 sm:mb-8">
            <div className="flex items-center justify-between w-full">
              <h2 className="text-lg sm:text-xl font-medium text-gray-700">Open Job Positions</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm sm:text-base text-gray-700">Sort By:</span>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer border sm:border-none">
                    <span className="text-sm text-gray-600">Default</span>
                    <Icon icon="hugeicons:arrow-down-01" className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Paginated Job Cards */}
          <PaginatedTableWrapper<JobPositionAdvert>
            fetchFirstPage={fetchFirstPage}
            fetchFromUrl={fetchFromUrl}
            deps={[searchTerm, statusFilter, categoryFilter]}
            className="space-y-4"
            footerClassName="pt-4"
            onError={(error) => {
              console.error("Error in paginated table:", error)
            }}
          >
            {({ data, loading, refresh }) => {
              if (refreshTableRef.current !== refresh) {
                refreshTableRef.current = refresh
              }

              if (loading) {
                return (
                  <div className="p-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading jobs...</p>
                  </div>
                )
              }

              if (!data || data.results.length === 0) {
                return (
                  <div className="text-center py-12">
                    <Icon icon="hugeicons:briefcase-01" className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
                    <p className="text-gray-500">
                      {searchTerm || hasFilters
                        ? "No jobs match your search criteria."
                        : "Get started by posting your first job."}
                    </p>
                  </div>
                )
              }

              // Apply client-side filtering for status and category
              const filteredResults = data.results.filter((job) => {
                const matchesStatus = statusFilter === "all" || job.job_position_advert_status === statusFilter
                const matchesCategory =
                  categoryFilter === "all" || job.job_position_details.department.toString() === categoryFilter
                return matchesStatus && matchesCategory
              })

              if (filteredResults.length === 0) {
                return (
                  <div className="text-center py-12">
                    <Icon icon="hugeicons:briefcase-01" className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No jobs found</h3>
                    <p className="text-gray-500">No jobs match the selected filters.</p>
                  </div>
                )
              }

              return (
                <>
                  {/* Job Grid - Responsive grid layout */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {filteredResults.map((job) => (
                      <div
                        key={job.id}
                        className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="space-y-4 sm:space-y-6">
                          {/* Job Info */}
                          <div className="space-y-2 sm:space-y-3">
                            <div>
                              <h3 className="text-lg sm:text-xl font-medium text-gray-800 leading-tight">
                                {job.job_position_details.name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1 text-base text-gray-600">
                                <span>{job.institution.name || "Unknown Institution"}</span>
                                <span className="hidden sm:inline">•</span>
                                <span className="text-gray-400">{formatDate(job.published_date)}</span>
                              </div>
                            </div>

                            {/* Job Details */}
                            <div className="flex items-center justify-between gap-2 text-sm text-gray-600">
                              <div className="flex items-center gap-4 sm:gap-6">
                                <div className="flex items-center gap-1">
                                  <Icon icon="hugeicons:location-user-03" className="w-4 h-4" />
                                  <span>On-site</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Icon icon="hugeicons:briefcase-01" className="w-4 h-4" />
                                  <span>Full-Time</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 text-myOrange">
                                <Icon icon="hugeicons:calendar-remove-01" className="w-4 h-4" />
                                <span>{formatDate(job.expiry_date)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                         <div className="flex items-center w-full gap-4">
                            <Link href={`/job/${job.id}/apply`} className="flex-1">
                              <Button className="w-full bg-gray-800 hover:bg-gray-900 text-white py-2.5 sm:py-2">
                                Apply
                              </Button>
                            </Link>
                            <Link href={`/job/${job.id}`} className="flex-1">
                              <Button
                                variant="outline"
                                className="w-full py-2.5 sm:py-2 bg-transparent"
                              >
                                View Details
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )
            }}
          </PaginatedTableWrapper>
        </div>
      </div>
    </div>
  )
}

export default JobPortal
