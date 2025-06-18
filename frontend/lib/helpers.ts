import {clsx, type ClassValue} from "clsx";
import {twMerge} from "tailwind-merge";
import {format} from "date-fns";

import apiRequest from "./apiRequest";

import {IMarketPlaceOrder, IPermission, IUser, Role} from "@/app/types";
import {store} from "@/store";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function capitalizeEachWord(str: string) {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function getDefaultInstitutionId() {
  if (typeof window !== "undefined") {
    // First try to get the selected Institution
    const selectedInstitution = store.getState().auth.selectedInstitution.value;

    if (selectedInstitution) {
      return selectedInstitution.id;
    }
    // Fallback to the first Institution in InstitutionsAttached
    const InstitutionsAttached = store.getState().auth.InstitutionsAttached.value;
    const InstitutionId = InstitutionsAttached.length ? InstitutionsAttached[0].id : null;

    return InstitutionId;
  }
}

export const fetchAndSetData = async <T>(
  fetchFn: () => Promise<any>,
  setFn: (data: T) => void,
  setErrorFn?: (msg: string) => void,
  errorMsg = "Failed to fetch data",
  extractData: (res: any) => T = (res) => res.data,
) => {
  try {
    const response = await fetchFn();
    const data = extractData(response);

    setFn(data);
  } catch (error) {
    console.error(errorMsg, error);
    if (setErrorFn) {
      setErrorFn(errorMsg);
    }
  }
};

export async function fetchCategoriesFromApi() {
  try {
    const response = await apiRequest.get(
      `product/category/institution/${getDefaultInstitutionId()}`,
    );

    return response;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
}

export async function fetchProductsFromApi(isApproved?: boolean) {
  try {
    let url = "product/";

    if (isApproved !== undefined) {
      url = `product/?is_approved=${isApproved}`;
    }

    const response = await apiRequest.get(url);

    return response;
  } catch (error: any) {
    console.error("Error fetching products:", error);
    throw error;
  }
}

export async function fetchProductsForSpecificBranchFromApi() {
  try {
    const branchId = getCurrentBranchId();

    if (!branchId) {
      throw new Error("Branch ID not found in local storage");
    }
    const response = await apiRequest.get(`/product/branch-product-store/by-branch/${branchId}/`);

    return response;
  } catch (error) {
    console.error("Error fetching products for specific branch:", error);
    throw error;
  }
}

export async function fetchAndUpdateProducts(setProducts: (data: any) => void) {
  try {
    const branchId = getCurrentBranchId();

    if (!branchId) {
      throw new Error("Branch ID not found in local storage");
    }

    // Fetch updated product data from API
    const response = await apiRequest.get(`/product/branch-product-store/by-branch/${branchId}/`);

    // Update the frontend state with the new product data
    setProducts(response.data.results);
  } catch (error) {
    console.error("Error fetching updated products for the branch:", error);
    throw error;
  }
}

export async function fetchUnitOfMeasuresFromApi() {
  try {
    const response = await apiRequest.get(
      `product/unit-of-measure/?Institution_id=${getDefaultInstitutionId()}`,
    );

    return response;
  } catch (error) {
    console.error("Error fetching unit of measures:", error);
    throw error;
  }
}

export async function fetchInstitutionBranchesFromAPI() {
  try {
    return await apiRequest.get(`institution/${getDefaultInstitutionId()}/branch`);
  } catch (error) {
    console.error("Error fetching Institution's branches:", error);
    throw error;
  }
}

export async function fetchInstitutionRoles() {
  try {
    return await apiRequest.get(`user/role/?Institution_id=${getDefaultInstitutionId()}`);
  } catch (error: any) {
    console.log("Error fetching  Institution roles ");
    throw error;
  }
}

export async function fetchUserTasks() {
  try {
    return await apiRequest.get("workflow/task/");
  } catch (error) {
    console.log("Error fetching  user tasks ");
    throw error;
  }
}

export function getCurrentBranchId() {
  const selectedBranch = store.getState().auth.selectedBranch.value;

  if (selectedBranch) {
    return selectedBranch.id;
  }

  return null;
}

export function formatCurrency(amount: any) {
  const numAmount = Number.parseFloat(amount);

  return numAmount % 1 === 0
    ? numAmount.toLocaleString("en-US")
    : numAmount.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
}

export function formatTransactionDate(dateString: any) {
  try {
    const date = new Date(dateString);

    return format(date, "MMMM dd, yyyy h:mm a");
  } catch {
    return dateString;
  }
}

export function getUserFromLocalStorage(): IUser | null {
  try {
    const userData = store.getState().auth.user.value;

    return userData;
  } catch (error) {
    console.error("Error getting user from localStorage:", error);

    return null;
  }
}

export function getInstitutionLogo(): string | null {
  try {
    const selectedInstitution = store.getState().auth.selectedInstitution.value;

    if (selectedInstitution) {
      return selectedInstitution.Institution_logo || null;
    }

    return null;
  } catch (error) {
    console.error("Error getting Institution logo:", error);

    return null;
  }
}

export function isInstitutionOwner(): boolean {
  try {
    const userData = store.getState().auth.user.value;
    const selectedInstitution = store.getState().auth.selectedInstitution.value;

    if (!userData || !selectedInstitution) {
      return false;
    }

    return userData.id === selectedInstitution.institution_owner_id;
  } catch (error) {
    console.error("Error checking if user is Institution owner:", error);

    return false;
  }
}

export function hasPermission(permissionCode: string): boolean {
  try {
    const state = store.getState();
    const userData = state.auth.user.value;
    const temporaryPermissions = state.auth.temporaryPermissions;

    if (!userData) return false;
    const userId = userData.id;

    // Check if user is the Institution owner
    const selectedInstitution = state.auth.selectedInstitution.value;

    if (selectedInstitution) {
      // If user is the Institution owner, grant all permissions
      if (selectedInstitution.institution_owner_id === userId) {
        return true;
      }
    }

    // Check temporary permissions first
    const hasTemporaryPermission = temporaryPermissions.some(
      (permission: IPermission) => permission.permission_code === permissionCode,
    );

    if (hasTemporaryPermission) {
      return true;
    }

    // Otherwise, check user's own permissions
    return (
      userData.roles?.some((role: Role) =>
        role.permissions_details?.some(
          (permission: any) => permission.permission_code === permissionCode,
        ),
      ) || false
    );
  } catch (error) {
    console.error("Error checking permission:", error);

    return false;
  }
}

export function extractRequiredPermissions(
  userRoles: Role[],
  requiredPermissionCodes: string[],
): IPermission[] {
  console.log("\n\nEXtracting permission codes : ", requiredPermissionCodes);
  const requiredPermissions: IPermission[] = [];

  userRoles.forEach((role) => {
    const matchingPermissions = role.permissions_details?.filter((permission) =>
      requiredPermissionCodes.includes(permission.permission_code),
    );

    if (matchingPermissions && matchingPermissions.length > 0) {
      // Create a new role object with only the required permissions
      requiredPermissions.push(...matchingPermissions);
    }
  });

  return requiredPermissions;
}

export function hasAnyRequiredPermissions(
  userRoles: Role[],
  requiredPermissionCodes: string[],
): boolean {
  return userRoles.some((role) =>
    role.permissions_details?.some((permission: any) =>
      requiredPermissionCodes.includes(permission.permission_code),
    ),
  );
}

export const fetchMarketPlaceOrders = async () => {
  try {
    const selectedBranch = store.getState().auth.selectedBranch.value;

    if (!selectedBranch) {
      return null;
    }
    const response = await apiRequest.get(`marketplace/orders/by-branch/${selectedBranch.id}`);

    return response.data as IMarketPlaceOrder[];
  } catch {
    // console.log("\nError fetching orders as : ", error)
    return null;
  }
};

export const getInstitutionById = async (InstitutionId: number) =>
  await apiRequest.get(`institution/${InstitutionId}/`);
