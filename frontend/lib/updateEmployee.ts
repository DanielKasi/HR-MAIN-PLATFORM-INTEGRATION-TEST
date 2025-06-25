import { IEmployee } from "@/app/types/types.utils";
import apiRequest from "./apiRequest";

export const updateEmployee = async ({
  institutionId,
  employeeId,
  employeeData,
}: {
  institutionId: number;
  employeeId: number;
  employeeData: Partial<IEmployee>;
}): Promise<IEmployee | null> => {
  try {
    const endpoint = `employee/${institutionId}/employee/${employeeId}/update/`;
    const response = await apiRequest.put(endpoint, employeeData);
    return response.data;
  } catch (error) {
    throw error;
  }
};
