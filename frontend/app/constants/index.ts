import { IPenaltyType } from "@/types/types.utils";

export const LEAVE_CATEGORIES: Array<{ value: string, label: string }> = [
  { value: "annual", label: "Annual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "maternity", label: "Maternity Leave" },
  { value: "paternity", label: "Paternity Leave" },
  { value: "compassionate", label: "Compassionate Leave" },
  { value: "study", label: "Study Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
];


export const GENDER_CHOICES = [
  { value: "all", label: "All" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

export const PENALTY_TYPES: { value: IPenaltyType; label: string }[] = [
  { value: "late_coming", label: "Late Coming" },
  { value: "early_leaving", label: "Early Checkout" },
  { value: "absent", label: "Absent" },
  { value: "no_response_spotcheck", label: "Not responding to a spotcheck" },
  { value: "late_spotcheck_response", label: "Late spotcheck response" },
];

export const MAIN_DOMAIN_URL="https://peracosoft.com"