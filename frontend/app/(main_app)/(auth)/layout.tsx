"use client";

import { clearAuthError } from "@/store/auth/actions";
import { ReactNode, useEffect } from "react";
import { useDispatch } from "react-redux";

export default function AuthLayout({ children }: { children: ReactNode[] }) {
	const dispatch = useDispatch();
	useEffect(() => {
		return () => {
			dispatch(clearAuthError());
		};
	}, []);

	return <>{children}</>;
}
