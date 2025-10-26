"use client";

import { useState } from "react";
import { useSelector } from "react-redux";

import { Button } from "@/platform/v1/components";
import { Input } from "@/platform/v1/components";
import { Label } from "@/platform/v1/components";
import { toast } from "sonner";
import { selectAccessToken } from "@/store/auth/selectors-context-aware";
import { changePassword, showErrorToast } from "@/lib/utils";
import { ChangePasswordData } from "@/types/types.utils";
import { useModuleNavigation } from "@/hooks/use-module-navigation";

export default function ProfilePage() {
	const [oldPassword, setOldPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmNewPassword, setConfirmNewPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const router = useModuleNavigation();
	const accessToken = useSelector(selectAccessToken);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (newPassword !== confirmNewPassword) {
			toast.error("New passwords do not match.");

			return;
		}

		const payload: ChangePasswordData = {
			old_password: oldPassword,
			new_password: newPassword,
			new_password_confirm: confirmNewPassword,
		};

		setIsLoading(true);
		try {
			const response = await changePassword(payload);

			toast.success("Password changed successfully");

			setOldPassword("");
			setNewPassword("");
			setConfirmNewPassword("");
		} catch (error: any) {
			showErrorToast({
				error,
				defaultMessage: "Failed to change password!",
			});
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-lg shadow-md">
			<h1 className="text-2xl font-bold mb-6">Change Password</h1>
			<form onSubmit={handleSubmit} className="space-y-4">
				<div>
					<Label htmlFor="old_password">Old Password</Label>
					<Input
						id="old_password"
						type="password"
						value={oldPassword}
						onChange={(e) => setOldPassword(e.target.value)}
						required
					/>
				</div>
				<div>
					<Label htmlFor="new_password">New Password</Label>
					<Input
						id="new_password"
						type="password"
						value={newPassword}
						onChange={(e) => setNewPassword(e.target.value)}
						required
					/>
				</div>
				<div>
					<Label htmlFor="new_password_confirm">Confirm New Password</Label>
					<Input
						id="new_password_confirm"
						type="password"
						value={confirmNewPassword}
						onChange={(e) => setConfirmNewPassword(e.target.value)}
						required
					/>
				</div>
				<Button type="submit" disabled={isLoading} className="w-full">
					{isLoading ? "Changing..." : "Change Password"}
				</Button>
			</form>
		</div>
	);
}
