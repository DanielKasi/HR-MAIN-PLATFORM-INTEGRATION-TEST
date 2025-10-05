"use client";
import React from "react";

import { PERMISSION_CODES } from "@/constants";
import ProtectedPage from "@/components/ProtectedPage";
import { LateInEarlyOutRecordsTable } from "@/components/attendance/_components/late-in-early-out-records-tabley";

const LateInEarlyOutPage = () => {
	return (
		<ProtectedPage permissionCode={PERMISSION_CODES.CAN_VIEW_ATTENDANCE_RECORDS}>
			<div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8 min-h-screen">
				<div className="w-full">
					<div className="mb-16">
						<div className="flex flex-col w-full">
							<div className="flex items-center justify-between w-full gap-8">
								<h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-2">
									Employee Attendance (Late checkin, Early checkout)
								</h1>
							</div>
							<p className="text-muted-foreground">
								Manage daily attendance (late checkin , early checkout ) for your organization
							</p>
						</div>
					</div>
					<LateInEarlyOutRecordsTable scope={{ type: "default" }} />
				</div>
			</div>
		</ProtectedPage>
	);
};

export default LateInEarlyOutPage;
