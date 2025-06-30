import apiRequest from "./apiRequest";

export interface AttendanceRecordPayload {
  employee: number;
  check_in_time: string;
  check_out_time?: string;
  status: string;
}

// Create a new attendance record
export async function createAttendanceRecord(data: AttendanceRecordPayload) {
  const response = await apiRequest.post("/employee/attendance/", data);
  return response.data;
}

// Fetch attendance records for a specific date (YYYY-MM-DD)
export async function fetchAttendanceRecords(date: string) {
  const response = await apiRequest.get(`/employee/attendance/?date=${date}`);
  return response.data;
}

// Update an attendance record by ID
export async function updateAttendanceRecord(id: number, data: Partial<AttendanceRecordPayload>) {
  const response = await apiRequest.put(`/employee/attendance/${id}/`, data);
  return response.data;
}

// Delete an attendance record by ID
export async function deleteAttendanceRecord(id: number) {
  const response = await apiRequest.delete(`/employee/attendance/${id}/`);
  return response.data;
}
