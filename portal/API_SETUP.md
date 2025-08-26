# Portal API Setup Guide

## Overview
The portal now fetches job data from the Django backend instead of using mock data.

## Backend Endpoint
The portal uses the following backend endpoint:
- **URL**: `/job-openings/`
- **View**: `JobPositionAdvertListAPI.as_view()`
- **File**: `backend/recruitment/urls.py`

## Configuration Options

### Option 1: Environment Variable (Recommended)
Create a `.env.local` file in the portal root directory:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Option 2: Direct Code Update
Update the `API_BASE_URL` in `portal/lib/api.ts`:
```typescript
const API_BASE_URL = 'http://localhost:8000'; // Your backend URL
```

### Option 3: System Environment Variable
Set the environment variable before running the portal:
```bash
export NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

## Backend Requirements

1. **Django Backend Running**: Ensure your Django backend is running on the configured port
2. **CORS Configuration**: The backend should allow requests from the portal domain
3. **Job Data**: The `/job-openings/` endpoint should return paginated job data

## Expected API Response Format

The backend should return data in this format:
```json
{
  "count": 10,
  "next": "http://localhost:8000/job-openings/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "job_position_details": {
        "name": "Job Title",
        "description": "Job Description",
        "department_details": {
          "name": "Department Name"
        },
        "salary_min": "50000",
        "salary_max": "70000"
      },
      "job_position_advert_status": "active",
      "published_date": "2025-01-01T00:00:00Z",
      "expiry_date": "2025-02-01T00:00:00Z"
    }
  ]
}
```

## Testing

1. Start your Django backend
2. Configure the API URL in the portal
3. Run `npm run dev` in the portal directory
4. Navigate to the portal page to see real job data

## Troubleshooting

- **Connection Refused**: Check if backend is running and port is correct
- **CORS Errors**: Ensure backend allows requests from portal domain
- **404 Errors**: Verify the `/job-openings/` endpoint exists in backend
- **Data Format Errors**: Check if backend response matches expected format
