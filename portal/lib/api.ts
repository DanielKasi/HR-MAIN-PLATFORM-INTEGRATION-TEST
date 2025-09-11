import { JobApplication, JobPositionAdvert } from "./types";
import { IPaginatedResponse } from "./types";


const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const apiRequest = {
  get: async (endpoint: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('API request failed:', error);
      throw error;
    }
  },
  
  post: async (endpoint: string, data: unknown, contentType: string = 'application/json') => {
    try {
      const headers: Record<string, string> = {};
      
      if (contentType === 'application/json') {
        headers['Content-Type'] = 'application/json';
      } else if (contentType === 'multipart/form-data') {
        // Don't set Content-Type for FormData, let the browser set it with boundary
      } else {
        headers['Content-Type'] = contentType;
      }
      
      let body: string | FormData;
      if (data instanceof FormData) {
        body = data;
      } else {
        body = JSON.stringify(data);
      }
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP ${response.status} error for ${endpoint}:`, errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('API POST request failed:', error);
      throw error;
    }
  }
};

export const JobAdvertsAPI = {
  getPaginated: async ({ 
    page = 1, 
    search, 
    status, 
    category 
  }: { 
    page?: number;
    search?: string;
    status?: string;
    category?: string;
  }): Promise<IPaginatedResponse<JobPositionAdvert>> => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
      });

      if (search) {
        params.append("search", search);
      }
      if (status && status !== "all") {
        params.append("status", status);
      }
      if (category && category !== "all") {
        params.append("category", category);
      }
      
      const endpoint = `/recruitment/job-openings/?${params.toString()}`;
  
      
      const response = await apiRequest.get(endpoint);
    // console.log(response)

      
      return response as IPaginatedResponse<JobPositionAdvert>;
    } catch (error) {
      console.warn("Error fetching paginated job openings:", error);
      throw error;
    }
  },

  getPaginatedFromUrl: async ({ url }: { url: string }): Promise<IPaginatedResponse<JobPositionAdvert>> => {
    try {
      // Extract the path from the full URL
      const urlObj = new URL(url);
      const endpoint = urlObj.pathname + urlObj.search;
      const response = await apiRequest.get(endpoint);
      return response as IPaginatedResponse<JobPositionAdvert>;
    } catch (error) {
      console.warn("Error fetching paginated job openings from URL:", error);
      throw error;
    }
  },

  getAll: async (): Promise<JobPositionAdvert[]> => {
    try {
      const response = await apiRequest.get('/recruitment/job-openings/');
      return response.results as JobPositionAdvert[];
    } catch (error) {
      console.warn("Error fetching all job openings:", error);
      throw error;
    }
  },

  getById: async (id: string | number): Promise<JobPositionAdvert | null> => {
    try {
      const response = await apiRequest.get(`/recruitment/job-advert/${id}/`);
      return response as JobPositionAdvert;
    } catch (error) {
      console.warn("Error fetching job opening by ID:", error);
      return null;
    }
  },
};



export const JobApplicationApi = {
  create: async (applicationData: Partial<JobApplication> & { resume?: File | null; cover_letter?: File | null }, institutionId: number = 1): Promise<JobApplication> => {
    try {
      const endpoint = `/recruitment/institution/${institutionId}/job-application/`;
    // console.log('[Portal API] Creating job application:', {
        endpoint: `${API_BASE_URL}${endpoint}`,
        institutionId,
        applicationData
      });
      
      // Use the same FormData approach as the frontend
      const formData = new FormData();
      
      // Log what we're appending to FormData
      Object.entries(applicationData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Handle file uploads specially
          if (key === 'resume' && value instanceof File) {
            formData.append('resume', value);
          } else if (key === 'cover_letter' && value instanceof File) {
            formData.append('cover_letter', value);
          } else {
            formData.append(key, String(value));
          }
        }
      });
      
    // console.log('[Portal API] FormData contents:');
      for (const [key, value] of formData.entries()) {
      // console.log(`${key}: ${value}`);
      }
      
      // Send as multipart/form-data (same as frontend)
      const response = await apiRequest.post(endpoint, formData, 'multipart/form-data');
    // console.log('[Portal API] Application created successfully:', response);
      return response as JobApplication;
    } catch (error) {
      console.warn("Error creating job application:", error);
      throw error;
    }
  }
};