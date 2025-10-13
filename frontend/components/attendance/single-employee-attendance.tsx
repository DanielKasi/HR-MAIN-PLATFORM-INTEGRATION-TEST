"use client";

import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";

import { AttendanceAPI, fetchAttendanceData, showErrorToast } from "@/lib/utils";
import { IAttendance, IEmployee } from "@/types/types.utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { AttendanceRecordsTable } from "@/components/attendance/_components/attendance-records-table";
import { CheckInModal } from "../checkin-modal";
import { CheckOutModal } from "../checkout-modal";
import { getCurrentUserLocation, isToday } from "@/lib/helpers";
import { toast } from "sonner";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import Link from "next/link";
import { PaginatedTable } from "../PaginatedTable";

interface SingleEmployeeAttendanceProps {
	searchTerm?: string;
	employee: IEmployee;
	showingOnDashboard?: boolean;
}

const SingleEmployeeAttendance: React.FC<SingleEmployeeAttendanceProps> = ({
	employee,
	searchTerm,
}) => {
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const [currentUserlocation, setCurrentUserLocation] = useState<GeolocationPosition | null>(null);
	const [checkInModalOpen, setCheckInModalOpen] = useState(false);
	const [checkOutModalOpen, setCheckOutModalOpen] = useState(false);
	const [selectedAttendanceRecord, setSelectedAttendanceRecord] = useState<IAttendance | null>(
		null,
	);
	const [attendanceRecords, setAttendanceRecords] = useState<IAttendance[]>([]);
	const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));

	useEffect(() => {
		if (employee) {
			handleFetchAttendanceRecords();
		}
	}, [employee]);

	// const attendanceRefreshRef = useRef<(() => Promise<void>) | null>(null);
	const handlePositionChange = (position: GeolocationPosition) => {
		setCurrentUserLocation(position);
	};

	const openCheckInModal = async () => {
		setCheckInModalOpen(true);
		await getCurrentUserLocation(handlePositionChange);
	};

	const openCheckOutModal = async () => {
		setCheckOutModalOpen(true);
		await getCurrentUserLocation(handlePositionChange);
	};

	const handleFetchAttendanceRecords = async () => {
		try {
			const response = await AttendanceAPI.fetchAttendanceRecordsByEmployee({
				employee_id: employee.id,
			});
			setAttendanceRecords(response.results);
		} catch (error) {}
	};

	const handleCheckIn = async (_date: string, checkInTime: string) => {
		if (!employee) return;
		if (!currentUserlocation) {
			toast.warning("You need to allow access to your location to be able to proceed !");

			return;
		}
		try {
			const response = await AttendanceAPI.createAttendanceRecord({
				employee: employee.id,
				check_in_time: checkInTime,
				check_in_latitude: currentUserlocation.coords.latitude,
				check_in_longitude: currentUserlocation.coords.longitude,
				status: "approved",
			});
			setSelectedAttendanceRecord(response);
			await handleFetchAttendanceRecords();
			setCheckInModalOpen(false);
		} catch (error: any) {
			showErrorToast({ error, defaultMessage: "Failed to check in!" });
		}
	};

	const handleCheckOut = async (_date: string, checkOutTime: string) => {
		if (!employee || !selectedAttendanceRecord) {
			return;
		}
		const checkInTime = selectedAttendanceRecord?.check_in_time || "";

		await getCurrentUserLocation(handlePositionChange);
		if (!currentUserlocation) {
			toast.warning("You need to allow access to your location to be able to proceed !");

			return;
		}

		try {
			await AttendanceAPI.updateAttendanceRecord(selectedAttendanceRecord.id, {
				employee: employee.id,
				check_in_time: checkInTime,
				check_out_time: checkOutTime,
				check_out_latitude: currentUserlocation.coords.latitude,
				check_out_longitude: currentUserlocation.coords.longitude,
				status: "approved",
			});

			await handleFetchAttendanceRecords();
		} catch (error: any) {
			showErrorToast({ error, defaultMessage: "Failed to check out!" });
		}
	};

	return (
		<>
			{selectedInstitution ? (
				<>
					<div className="flex items-center justify-between gap-6">
						<Input
							type="date"
							value={selectedDate}
							onChange={(e) => setSelectedDate(e.target.value)}
							className="rounded-lg px-3 py-2 text-gray-700 md:max-w-[8rem] w-full"
							style={{ minWidth: 140 }}
							max={new Date().toISOString().slice(0, 10)}
							title="Filter by date"
						/>
						<div className="flex items-center justify-end gap-8">
							<>
								{selectedAttendanceRecord?.check_in_time ? (
									<span className="text-sm text-gray-700">
										{selectedAttendanceRecord.check_in_time}
									</span>
								) : isToday(selectedDate) ? (
									<Button onClick={() => openCheckInModal()} className="rounded-full">
										Check In
									</Button>
								) : (
									<span className="text-sm text-gray-400">-</span>
								)}
							</>
							<>
								{selectedAttendanceRecord ? (
									selectedAttendanceRecord?.check_out_time ? (
										<span className="text-sm text-gray-700">
											{selectedAttendanceRecord.check_out_time}
										</span>
									) : isToday(selectedDate) ? (
										<Button
											size={"sm"}
											onClick={() => openCheckOutModal()}
											variant={"secondary"}
											className="rounded-full"
										>
											Check Out
										</Button>
									) : (
										<span className="text-sm text-gray-400">-</span>
									)
								) : null}
							</>
						</div>
					</div>

					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Date</TableHead>
								<TableHead>Checkin Time</TableHead>
								<TableHead>Checkout Time</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{attendanceRecords.map((record, idx) => (
								<TableRow key={record.id} className="hover:bg-gray-50">
									<TableCell>{record.date}</TableCell>

									<TableCell className="min-w-[6rem]">
										<span>{record?.check_in_time}</span>
									</TableCell>
									<TableCell className="min-w-[6rem]">
										<span>{record?.check_out_time}</span>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
					<CheckInModal
						isOpen={checkInModalOpen}
						onClose={() => setCheckInModalOpen(false)}
						onConfirm={handleCheckIn}
						employeeName={employee.name || employee?.user?.fullname || ""}
					/>

					<CheckOutModal
						isOpen={checkOutModalOpen}
						onClose={() => setCheckOutModalOpen(false)}
						onConfirm={handleCheckOut}
						employeeName={employee.name || employee?.user?.fullname || ""}
						checkInTime={selectedAttendanceRecord?.check_in_time || null}
					/>
				</>
			) : (
				<></>
			)}
		</>
	);
};

export default SingleEmployeeAttendance;
