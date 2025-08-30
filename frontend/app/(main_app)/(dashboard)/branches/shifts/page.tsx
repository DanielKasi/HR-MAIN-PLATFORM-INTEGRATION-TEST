import {Icon} from "@iconify/react";

interface IBranchDay {
  id: number;
  day_id: number;
  day_name: string;
  day_type: "PHYSICAL" | "REMOTE";
}

interface IBranchShift {
  id: number;
  branch: number;
  name: string;
  shift_day: IBranchDay;
  start_time: string;
  end_time: string;
  description: string;
}

interface IBranchWorkingDays {
  id: number;
  day_name: string;
  day_type: "PHYSICAL" | "REMOTE";
}
