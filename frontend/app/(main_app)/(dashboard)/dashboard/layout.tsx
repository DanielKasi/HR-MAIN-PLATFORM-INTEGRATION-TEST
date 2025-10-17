"use client";

import { useSelector } from "react-redux";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { PERMISSION_CODES } from "@/constants";
import ProtectedPage from "@/components/ProtectedPage";
import {
	selectRelatedEmployee,
	selectRelatedEmployeeLoading,
	selectSelectedInstitution,
	selectUser,
} from "@/store/auth/selectors";
import FixedLoader from "@/components/fixed-loader";
import { hasPermission } from "@/lib/helpers";
import { useDispatch } from "react-redux";
import { fetchRelatedEmployeeStart } from "@/store/auth/actions";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	const currentUser = useSelector(selectUser);
	const currentInstitution = useSelector(selectSelectedInstitution);
	const relatedEmployee = useSelector(selectRelatedEmployee);
	const relatedEmployeeloading = useSelector(selectRelatedEmployeeLoading);

	const router = useRouter();
	const dispatch = useDispatch();

	useEffect(() => {
		if (currentUser && !relatedEmployeeloading && !relatedEmployee) {
			// if (currentUser.id !== currentInstitution.institution_owner_id) {
			dispatch(fetchRelatedEmployeeStart({ userId: currentUser.id }));
			// }
		}
	}, [currentUser, relatedEmployee]);

	useEffect(() => {
		console.log("\n\n Related employee at layout mount : ", relatedEmployee);
		if (relatedEmployee && !hasPermission(PERMISSION_CODES.CAN_VIEW_ADMIN_DASHBOARD)) {
			router.push(`employees/profile/${relatedEmployee.id}`);
		}
	}, [relatedEmployee]);

	if (!currentInstitution || !currentUser) {
		return <FixedLoader className="bg-white/70" />;
	}

	return (
		<ProtectedPage permissionCode={PERMISSION_CODES.CAN_VIEW_ADMIN_DASHBOARD}>
			{children}
		</ProtectedPage>
	);
}
