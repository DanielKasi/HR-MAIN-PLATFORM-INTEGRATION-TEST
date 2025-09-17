"use client";

import { ReactNode, useEffect } from "react";
import { useDispatch } from "react-redux";

import { clearAuthError } from "@/store/auth/actions";

export default function AuthLayout({ children }: { children: ReactNode[] }) {
	const dispatch = useDispatch();

	useEffect(() => {
		return () => {
			dispatch(clearAuthError());
		};
	}, []);

	return <>{children}</>;
}
