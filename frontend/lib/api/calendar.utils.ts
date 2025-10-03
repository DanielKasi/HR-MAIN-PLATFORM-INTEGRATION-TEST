import { ICalendar } from "@/types/types.utils";
import apiRequest from "../apiRequest";

export const CALENDAR_API = {
	getCalendar: async ({ year }: { year: number }): Promise<ICalendar> => {
		const response = await apiRequest.get(`/calendar/institutions-calendar/?year=${year}`);
		return response.data;
	},
};
