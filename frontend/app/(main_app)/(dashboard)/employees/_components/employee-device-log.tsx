import { Input } from "@/components/ui/input";
import { IEmployee } from "@/types/types.utils";
import DevicesLogsTable from "../logs/_components/device-logs-table";
import { useState } from "react";
import { Label } from "@/components/ui/label";

interface IEmployeeDeviceLogs {
	employee: IEmployee;
}

export default function EmployeeDevicesLogs({ employee }: IEmployeeDeviceLogs) {
	const [selectedDate, setSelectedDate] = useState("");

	return (
		<div className="">
			<div className="flex items-center justify-start pb-4 pt-2">
				<div className="space-x-2 flex flex-col md:flex-row md:items-center md:justify-start gap-4 ">
					<Label>Filter by date</Label>
					<Input
						type="date"
						value={selectedDate}
						onChange={(e) => setSelectedDate(e.target.value)}
						className="rounded-lg px-3 py-2 text-gray-700 md:max-w-[8rem] w-full"
						style={{ minWidth: 140 }}
						max={new Date().toISOString().slice(0, 10)}
						title="Filter by date"
					/>
				</div>
			</div>
			<DevicesLogsTable employee={employee} date={selectedDate} />
		</div>
	);
}
