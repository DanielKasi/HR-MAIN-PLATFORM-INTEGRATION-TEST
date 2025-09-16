"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { selectAccessToken } from "@/store/auth/selectors";
import { changePassword } from "@/lib/utils";
import { ChangePasswordData } from "@/types/types.utils";

export default function ProfilePage() {
	const [oldPassword, setOldPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmNewPassword, setConfirmNewPassword] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const { toast } = useToast();
	const router = useRouter();
	const accessToken = useSelector(selectAccessToken);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (newPassword !== confirmNewPassword) {
			toast({
				variant: "destructive",
				title: "Error",
				description: "New passwords do not match.",
			});

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

			toast({
				title: "Success",
				description: response.message,
			});

			// Reset fields
			setOldPassword("");
			setNewPassword("");
			setConfirmNewPassword("");

			// router.push("/dashboard");
		} catch (error: any) {
			const errorMessage =
				error.response?.data?.old_password?.[0] ||
				error.response?.data?.new_password?.[0] ||
				error.response?.data?.new_password_confirm?.[0] ||
				error.response?.data?.detail ||
				"Failed to change password.";

			toast({
				variant: "destructive",
				title: "Error",
				description: errorMessage,
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
