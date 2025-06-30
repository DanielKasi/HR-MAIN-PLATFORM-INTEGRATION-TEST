import apiRequest from "./apiRequest";

export interface AttendanceRecordPayload {
  employee: number;
  check_in_time: string;
  check_out_time?: string;
  status: string;
}

export async function createAttendanceRecord(data: AttendanceRecordPayload) {
  const response = await apiRequest.post("/employee/attendance/", data);
  return response.data;
}
