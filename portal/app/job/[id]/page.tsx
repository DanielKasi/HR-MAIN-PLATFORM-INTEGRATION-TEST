"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Icon } from "@iconify/react"
import { Button } from "@/components/ui/button"
import { JobAdvertsAPI } from "@/lib/api"
import type { JobPositionAdvert } from "@/lib/types"


const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}



const PortalDetails = () => {
  const params = useParams()
  const jobId = params.id as string
  const [job, setJob] = useState<JobPositionAdvert | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchJob = async () => {
      if (!jobId) return
      
      try {
        setLoading(true)
        setError(null)
        
        const jobData = await JobAdvertsAPI.getById(jobId)
        setJob(jobData)
      } catch (err) {
        console.error("Error fetching job:", err)
        setError("Failed to load job details. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchJob()
  }, [jobId])

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-white">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading job details...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="w-full min-h-screen bg-white">
        <div className=" px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Icon icon="hugeicons:alert-circle" className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Job</h2>
              <p className="text-gray-600 mb-4">
                {error || "Job not found or has been removed."}
              </p>
              <Button 
                onClick={() => window.history.back()}
                variant="outline"
                className="px-6 py-3"
              >
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full min-h-screen bg-white">
      <div className="mx-auto px-4 w-9/12 max-lg:w-full py-10 max-lg:py-4">
        <div className="flex flex-col gap-8">
          {/* Header Section */}
          <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div className="flex flex-col  gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="">
                      <Link href="/">
                      <Icon icon="hugeicons:arrow-left-02" className="size-6" />
                      </Link> 
                    </div>
                    <div className="text-sm text-gray-600">
                      Posted: {formatDate(job.published_date)}
                    </div>
                    
                  </div>
                  <div className="flex flex-col gap-2">
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight">
                      {job.job_position_details.name}
                    </h1>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-base text-gray-600">
                      <div>{job.institution.name || "Unknown Institution"}</div>
                      <span className="hidden sm:inline">·</span>
                      <div>{formatDate(job.published_date)}</div>
                    </div>
                  </div>
                </div>
              
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 text-base text-gray-600">
                  <div className="flex items-center gap-2">
                    <Icon icon="hugeicons:location-user-03" className="w-5 h-5" />
                    <span>On-site</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon icon="hugeicons:briefcase-01" className="w-5 h-5" />
                    <span>Full-Time</span>
                  </div>
                  <div className="flex items-center gap-2 text-red-600">
                    <Icon icon="hugeicons:calendar-remove-01" className="w-5 h-5" />
                    <span>Deadline: {formatDate(job.expiry_date)}</span>
                  </div>
                </div>
                
               
              </div>
              
              <Link href={`/job/${jobId}/apply`}>
                <Button className="w-full sm:w-auto px-10 py-5 bg-myOrange hover:bg-myOrange text-white rounded-lg font-medium transition-colors">
                  Apply Now
                </Button>
              </Link>
            </div>
            <div className="border-t border-gray-200" />
          </div>

          {/* Job Description Section */}
          <div className="max-w-4xl flex flex-col gap-8">
            <div className="prose prose-gray max-w-none">
              <p className="font-medium text-gray-900">Job Description</p>
              {/* Additional Job Details */}
              {job.job_position_details.description && (
                <>                  <p className="text-gray-600">
                    {job.job_position_details.description}
                  </p>
                </>
              )}

              
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href={`/job/${jobId}/apply`}>
                <Button className="w-full sm:w-auto px-10 py-5 bg-myOrange hover:bg-myOrange text-white rounded-lg font-medium transition-colors">
                  Apply for this Position
                </Button>
              </Link>
            
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PortalDetails

