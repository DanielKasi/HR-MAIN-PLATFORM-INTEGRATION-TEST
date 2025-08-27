"use client"

import { toast } from 'sonner';
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Icon } from "@iconify/react"
import { Button } from "@/components/ui/button"
import { JobAdvertsAPI, JobApplicationApi } from "@/lib/api"
import type { JobPositionAdvert, JobApplication } from "@/lib/types"

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const ApplicationPage = () => {
  const params = useParams()
  const router = useRouter()
  const jobId = params.id as string
  
  const [job, setJob] = useState<JobPositionAdvert | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  
  // Form state
  const [formData, setFormData] = useState({
    applicant_name: "",
    applicant_email: "",
    applicant_phone: "",
    gender: "male" as "male" | "female",
    address: "",
    country: "Uganda",
    state: "",
    source: "website" as JobApplication["source"],
    resume: null as File | null,
    cover_letter: null as File | null,
  })

  // Fetch job details
  useEffect(() => {
    const fetchJob = async () => {
      if (!jobId) return
      
      try {
        setLoading(true)
        setError(null)
        
        const jobData = await JobAdvertsAPI.getById(jobId)
        if (jobData) {
          setJob(jobData)
        } else {
          setError("Job not found")
        }
      } catch (err) {
        console.error("Error fetching job:", err)
        setError("Failed to load job details. Please try again.")
      } finally {
        setLoading(false)
      }
    }

    fetchJob()
  }, [jobId])

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle radio button changes
  const handleRadioChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Handle file uploads
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'resume' | 'cover_letter') => {
    const file = e.target.files?.[0] || null
    setFormData(prev => ({
      ...prev,
      [field]: file
    }))
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!job) return
    
    try {
      setSubmitting(true)
      setError(null)
      
      // Prepare application data - matching frontend structure exactly
      const applicationData = {
        job_position_advert: job.id,
        applicant_name: formData.applicant_name,
        applicant_email: formData.applicant_email,
        applicant_phone: formData.applicant_phone,
        gender: formData.gender,
        address: formData.address,
        country: formData.country,
        state: formData.state,
        source: formData.source,
        application_date: new Date().toISOString().split("T")[0],
        // Add optional fields that might be expected
        recommended_by: formData.source === "head_hunt" ? undefined : undefined,
        address_latitude: "",
        address_longitude: ""
      }
      
      // Create a separate object for API submission that includes files
      const apiSubmissionData: Partial<JobApplication> & { resume?: File | null; cover_letter?: File | null } = {
        ...applicationData,
        resume: formData.resume,
        cover_letter: formData.cover_letter
      }

      
      // Validate required fields
      const requiredFields = ['applicant_name', 'applicant_email', 'applicant_phone', 'gender', 'address', 'country'];
      const missingFields = requiredFields.filter(field => !applicationData[field as keyof typeof applicationData]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
      
      // Validate that resume file is present
      if (!formData.resume) {
        throw new Error('Resume file is required');
      }
      
 
      
      // Submit application
      const institutionId = job.job_position_details.department_details?.institution || 1;
      
      await JobApplicationApi.create(apiSubmissionData, institutionId);
      
      toast.success("application submitted successfully")
      router.push(`/job/${jobId}`)
      
    } catch (err) {
      console.error("Error submitting application:", err)
      setError("Failed to submit application. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="container w-full min-h-screen bg-white p-4 md:p-8 lg:p-12">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading job details...</p>
          </div>
        </div>
      </div>
    )
  }

 

  return (
    <div className="w-9/12 max-lg:w-full mx-auto min-h-screen bg-white py-10 max-lg:px-4 max-lg:py-4">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="w-10 h-10 border rounded-full flex items-center justify-center flex-shrink-0">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 border rounded-full flex items-center justify-center hover:bg-gray-100"
          >
            <Icon icon="hugeicons:arrow-left-02" className="w-6 h-6" />
          </button>
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Submit Your Application</h1>
      </div>

      {/* Job Details */}
      <div className="mb-8 sm:mb-10">
        <div className="mb-6 sm:mb-8">
          <div className="mb-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{job?.job_position_details.name}</h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-gray-600 text-sm sm:text-base">
              <span>{job?.job_position_details.department_details?.name || "Unknown Department"}</span>
              <span className="hidden sm:inline">·</span>
              <span>{formatDate(job?.published_date ?? "")}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 sm:gap-6 mb-6 sm:mb-8">
            <div className="flex items-center gap-1">
              <Icon icon="hugeicons:location-user-03" className="w-5 h-5 text-gray-500" />
              <span className="text-gray-600 text-sm sm:text-base">On-site</span>
            </div>
            <div className="flex items-center gap-1">
              <Icon icon="hugeicons:briefcase-01" className="w-5 h-5 text-gray-500" />
              <span className="text-gray-600 text-sm sm:text-base">Full-Time</span>
            </div>
            <div className="flex items-center gap-1">
              <Icon icon="hugeicons:calendar-remove-01" className="w-5 h-5 text-red-500" />
              <span className="text-red-600 text-sm sm:text-base">Deadline: {formatDate(job?.expiry_date ?? "")}</span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200"></div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}
      

      {/* Application Form */}
      <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6 sm:gap-8 lg:gap-12 mb-8 sm:mb-12">
        {/* Left Column - Personal Details */}
        <div className="space-y-4 sm:space-y-6 flex-1">
          {/* Name Field */}
          <div>
            <label className="block text-gray-700 mb-2 text-sm sm:text-base">Name *</label>
            <input
              type="text"
              name="applicant_name"
              value={formData.applicant_name}
              onChange={handleInputChange}
              placeholder="Your name"
              required
              className="w-full px-3 py-3 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base"
            />
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-gray-700 mb-2 text-sm sm:text-base">Email *</label>
            <input
              type="email"
              name="applicant_email"
              value={formData.applicant_email}
              onChange={handleInputChange}
              placeholder="email@example.com"
              required
              className="w-full px-3 py-3 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base"
            />
          </div>

          {/* Phone Field */}
          <div>
            <label className="block text-gray-700 mb-2 text-sm sm:text-base">Phone Number *</label>
            <input
              type="tel"
              name="applicant_phone"
              value={formData.applicant_phone}
              onChange={handleInputChange}
              placeholder="e.g., +256 712 345 67"
              required
              className="w-full px-3 py-3 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base"
            />
          </div>

          {/* Gender Field */}
          <div>
            <label className="block text-gray-700 mb-3 text-sm sm:text-base">Gender *</label>
            <div className="flex gap-4 sm:gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="gender" 
                  value="male" 
                  checked={formData.gender === "male"}
                  onChange={() => handleRadioChange("gender", "male")}
                  className="w-4 sm:w-5 h-4 sm:h-5 text-myOrange" 
                />
                <span className="text-gray-900 text-sm sm:text-base">Male</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="gender" 
                  value="female" 
                  checked={formData.gender === "female"}
                  onChange={() => handleRadioChange("gender", "female")}
                  className="w-4 sm:w-5 h-4 sm:h-5 text-myOrange" 
                />
                <span className="text-gray-900 text-sm sm:text-base">Female</span>
              </label>
            </div>
          </div>

          {/* Address Field */}
          <div>
            <label className="block text-gray-700 mb-2 text-sm sm:text-base">Address *</label>
            <div className="relative">
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleInputChange}
                placeholder="Your location"
                required
                className="w-full px-3 py-3 pl-10 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base"
              />
              <Icon
                icon="hugeicons:location-01"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              />
            </div>
          </div>

          {/* State Field */}
          <div>
            <label className="block text-gray-700 mb-2 text-sm sm:text-base">State/Province</label>
            <input
              type="text"
              name="state"
              value={formData.state}
              onChange={handleInputChange}
              placeholder="Your state or province"
              className="w-full px-3 py-3 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base"
            />
          </div>

          {/* Country Field */}
          <div>
            <label className="block text-gray-700 mb-2 text-sm sm:text-base">Country *</label>
            <input
              type="text"
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              placeholder="Your country"
              required
              className="w-full px-3 py-3 border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm sm:text-base"
            />
          </div>
        </div>

        {/* Right Column - File Uploads */}
        <div className="space-y-6 sm:space-y-8 flex-1">
          {/* Cover Letter Upload */}
          <div>
            <label className="block text-gray-700 mb-2 text-sm sm:text-base">Cover Letter</label>
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-4 sm:p-6 lg:p-8 text-center hover:border-orange-300 transition-colors cursor-pointer">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt"
                onChange={(e) => handleFileChange(e, 'cover_letter')}
                className="hidden"
                id="cover-letter-upload"
              />
              <label htmlFor="cover-letter-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 bg-orange-100 rounded-full flex items-center justify-center">
                    <Icon icon="hugeicons:upload-04" className="w-5 h-5 sm:w-6 sm:h-6 text-myOrange" />
                  </div>
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-center gap-1 text-xs sm:text-sm">
                      <span className="font-medium text-myOrange">Click to Upload</span>
                      <span className="text-gray-500">or drag and drop</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {formData.cover_letter ? formData.cover_letter.name : "(Max. File size: 25 MB)"}
                    </p>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Resume Upload */}
          <div>
            <label className="block text-gray-700 mb-2 text-sm sm:text-base">Resume *</label>
            <div className="border-2 border-dashed border-gray-300 rounded-2xl p-4 sm:p-6 lg:p-8 text-center hover:border-orange-300 transition-colors cursor-pointer">
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => handleFileChange(e, 'resume')}
                className="hidden"
                id="resume-upload"
                required
              />
              <label htmlFor="resume-upload" className="cursor-pointer">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 bg-orange-100 rounded-full flex items-center justify-center">
                    <Icon icon="hugeicons:upload-04" className="w-5 h-5 sm:w-6 sm:h-6 text-myOrange" />
                  </div>
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-center gap-1 text-xs sm:text-sm">
                      <span className="font-medium text-myOrange">Click to Upload</span>
                      <span className="text-gray-500">or drag and drop</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {formData.resume ? formData.resume.name : "(Max. File size: 25 MB)"}
                    </p>
                  </div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </form>

      {/* Submit Button */}
      <div className="flex justify-start">
        <Button 
          type="submit"
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-myOrange hover:bg-myOrange text-white font-medium px-6 sm:px-8 py-3 sm:py-4 rounded-full w-full sm:w-auto min-w-[200px] md:w-[566px] h-[44px] sm:h-[48px] text-sm sm:text-base "
        >
          {submitting ? "Submitting..." : "Submit Application"}
        </Button>
        
      </div>
    </div>
  )
}

export default ApplicationPage
