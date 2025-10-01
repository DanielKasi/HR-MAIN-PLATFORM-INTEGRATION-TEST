"use client";

import { useSelector, useDispatch } from "react-redux";
import { useEffect, useRef, useState } from "react";

import { Button } from "../ui/button";

import { selectLogoutWarningVisible } from "@/store/auth/selectors";
import { cancelLogout, confirmLogout } from "@/store/auth/actions";

const LogoutWarningPopup: React.FC = () => {
	const [timer, setTimer] = useState<number>(60000);
	const visible = useSelector(selectLogoutWarningVisible);
	const timerRef = useRef<NodeJS.Timeout | null>(null);
	const dispatch = useDispatch();

	useEffect(() => {
		if (timer < 60000 && timerRef.current) {
			setTimer(60000);
		}
	}, [timerRef.current]);

	useEffect(() => {
		if (visible) {
			timerRef.current = setInterval(() => {
				if (timer >= 1000) {
					setTimer((prev) => prev - 1000);
				}
			}, 1000);
		}

		return () => {
			if (timerRef.current) {
				clearInterval(timerRef.current);
			}
		};
	}, [visible]);

	if (!visible) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[250] pointer-events-none">
			<div className="bg-white p-6 rounded-lg shadow-lg">
				<p className="mb-4">
					You will be logged out in {timer / 1000} seconds due to inactivity. Stay logged in?
				</p>
				<div className="flex justify-end gap-4">
					<Button
						className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
						onClick={(e) => {
							e.stopPropagation();
							dispatch(cancelLogout());
						}}
					>
						Stay Logged In
					</Button>
					<Button
						className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
						onClick={(e) => {
							e.stopPropagation();
							dispatch(confirmLogout());
						}}
					>
						Log Out
					</Button>
				</div>
			</div>
		</div>
	);
};

export default LogoutWarningPopup;
