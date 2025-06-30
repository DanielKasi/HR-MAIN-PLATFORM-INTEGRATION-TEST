import apiRequest from "./apiRequest";

// Create a branch for an institution
// branchData should match your backend's expected payload for creating a branch
export const createBranch = async ({ institutionId, branchData }: { institutionId: number; branchData: any }) => {
  try {
    // Adjust the endpoint and payload as needed for your backend
    const response = await apiRequest.post(`/institutions/${institutionId}/branches/`, branchData);
    return response.data;
  } catch (error) {
    console.error("Error creating branch:", error);
    throw error;
  }
};

// Attach a branch to an employee (matches your screenshot's API)
export const attachEmployeeBranch = async ({ employee_id, branches }: { employee_id: number; branches: { branch_id: number; is_default: boolean }[] }) => {
  try {
    const response = await apiRequest.post(`/employee/branches/attach/`, {
      employee_id,
      branches,
    });
    return response.data;
  } catch (error) {
    console.error("Error attaching branch to employee:", error);
    throw error;
  }
};
