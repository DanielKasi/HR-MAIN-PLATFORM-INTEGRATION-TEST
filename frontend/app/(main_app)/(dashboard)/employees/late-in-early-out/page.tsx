"use client";
import React from "react";

import { PERMISSION_CODES } from "@/constants";
import ProtectedPage from "@/components/ProtectedPage";
import { LateInEarlyOutRecordsTable } from "@/components/attendance/_components/late-in-early-out-records-tabley";

const LateInEarlyOutPage = () => {
	return (
		<ProtectedPage permissionCode={PERMISSION_CODES.CAN_VIEW_ATTENDANCE_RECORDS}>
			<div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-4 sm:py-6 md:py-8 min-h-screen">
				<div className="w-full">
					<div className="mb-8 sm:mb-12 md:mb-16">
						<div className="flex flex-col w-full">
							<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between w-full gap-4 sm:gap-8">
								<div className="flex-1">
									<h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2">
										Employee Attendance (Late checkin, Early checkout)
									</h1>
									<p className="text-muted-foreground text-sm sm:text-base">
										Manage daily attendance (late checkin , early checkout ) for your organization
									</p>
								</div>
							</div>
						</div>
					</div>
					<LateInEarlyOutRecordsTable scope={{ type: "default" }} />
				</div>
			</div>
		</ProtectedPage>
	);
};

export default LateInEarlyOutPage;
