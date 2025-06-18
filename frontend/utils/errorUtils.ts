import {AxiosError} from "axios";

import {CUSTOM_CODES} from "@/app/types/types.utils";
import {AuthError} from "@/store/auth/reducer";

export const getAuthError = (error: any): AuthError => {
  console.log("\n\nPassed in error on login : ", error);
  if (error instanceof AxiosError) {
    const errorData = error.response?.data;

    if (errorData["custom_code"] as CUSTOM_CODES) {
      return {
        customCode: errorData["custom_code"] as CUSTOM_CODES,
        message: errorData["detail"] || "Unkown error",
      };
    }
  }

  return {customCode: CUSTOM_CODES.OTHER, message: "Unkown error"};
};
