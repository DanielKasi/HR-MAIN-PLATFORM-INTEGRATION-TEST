"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { Button } from "@/platform/v1/components";
import { Avatar, AvatarFallback, AvatarImage } from "@/platform/v1/components";
import { Edit, User, Lock } from "lucide-react";
import { selectUser } from "@/store/auth/selectors-context-aware";
import apiRequest from "@/lib/apiRequest";
import { handleApiError } from "@/lib/apiErrorHandler";
import { IUser } from "@/types/user.types";
import { PasswordInput } from "@/platform/v1/components";
import {} from "@/platform/v1/components";
import TextInput from "@/components/common/inputs/text-password-input";

export default function SettingsPage() {
	const currentUser = useSelector(selectUser) as IUser | null;
	const dispatch = useDispatch();
	const [activeTab, setActiveTab] = useState("personal");
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [isUpdating, setIsUpdating] = useState(false);

	const [oldPassword, setOldPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [isChangingPassword, setIsChangingPassword] = useState(false);

	const isPasswordFormValid = () => {
		// Check if all fields are filled
		if (!oldPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
			return false;
		}

		// Check if passwords match
		if (newPassword !== confirmPassword) {
			return false;
		}

		// Check password strength requirements
		const validation = {
			minLength: newPassword.length >= 8,
			hasUppercase: /[A-Z]/.test(newPassword),
			hasLowercase: /[a-z]/.test(newPassword),
			hasDigit: /\d/.test(newPassword),
			hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
		};

		return Object.values(validation).every(Boolean);
	};

	useEffect(() => {
		if (currentUser) {
			setName(currentUser.fullname || "");
			setEmail(currentUser.email || "");
		}
	}, [currentUser]);

	const getUserInitials = (fullname: string) => {
		return fullname
			.split(" ")
			.map((name) => name.charAt(0))
			.join("")
			.toUpperCase()
			.slice(0, 2);
	};

	const handleUpdateProfile = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!currentUser) {
			toast.error("User not found");
			return;
		}

		if (!name.trim() || !email.trim()) {
			toast.error("Name and email are required");
			return;
		}

		setIsUpdating(true);

		try {
			const updateData: { fullname?: string; email?: string } = {};

			if (name !== currentUser.fullname) {
				updateData.fullname = name.trim();
			}

			if (email !== currentUser.email) {
				updateData.email = email.trim();
			}

			if (Object.keys(updateData).length === 0) {
				toast.info("No changes to update");
				setIsUpdating(false);
				return;
			}

			const response = await apiRequest.patch(`user/${currentUser.id}/`, updateData);

			if (response) {
				const updatedUser = { ...currentUser, ...updateData };
				toast.success("Profile updated successfully");
			}
		} catch (error: any) {
			handleApiError(error);
		} finally {
			setIsUpdating(false);
		}
	};

	const handleChangePassword = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!currentUser) {
			toast.error("User not found");
			return;
		}

		if (!oldPassword || !newPassword || !confirmPassword) {
			toast.error("All password fields are required");
			return;
		}

		if (newPassword !== confirmPassword) {
			toast.error("New passwords do not match");
			return;
		}

		if (!isPasswordFormValid()) {
			toast.error("Please ensure your password meets all requirements");
			return;
		}

		setIsChangingPassword(true);

		try {
			const response = await apiRequest.post(`user/change-password/`, {
				old_password: oldPassword,
				new_password: newPassword,
				new_password_confirm: confirmPassword,
			});

			if (response.status === 200) {
				toast.success("Password changed successfully");
				setOldPassword("");
				setNewPassword("");
				setConfirmPassword("");
			}
		} catch (error: any) {
			handleApiError(error);
		} finally {
			setIsChangingPassword(false);
		}
	};

	const tabs = [
		{ id: "personal", label: "Personal Settings", icon: User },
		{ id: "password", label: "Password", icon: Lock },
	];

	return (
		<div className="min-h-screen bg-white -mt-5">
			<main className="max-w-full mx-auto px-4 md:px-6 py-8">
				<h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 md:mb-8">Settings</h1>

				<div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
					{/* Sidebar */}
					<div className="w-full lg:w-80 space-y-2">
						<div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
							{tabs.map((tab) => {
								const Icon = tab.icon;
								return (
									<button
										key={tab.id}
										onClick={() => setActiveTab(tab.id)}
										className={`flex-shrink-0 lg:w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all whitespace-nowrap ${
											activeTab === tab.id ? "bg-primary/10" : "text-gray-600 hover:bg-gray-100"
										}`}
									>
										<Icon className="w-5 h-5" />
										<span className="font-medium">{tab.label}</span>
									</button>
								);
							})}
						</div>
					</div>

					{/* Vertical Separator */}
					<div className="hidden lg:block w-px bg-gray-200"></div>

					{/* Main Content */}
					<div className="flex-1 lg:pl-8">
						{activeTab === "personal" && (
							<div>
								<div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8 mb-6 md:mb-8">
									{currentUser && (
										<div className="flex items-center gap-4">
											<div className="relative">
												<Avatar className="w-16 sm:w-20 h-16 sm:h-20">
													<AvatarImage
														src="/placeholder.svg?height=80&width=80"
														alt={currentUser.fullname}
													/>
													<AvatarFallback className="bg-primary text-white text-xl sm:text-2xl">
														{getUserInitials(currentUser.fullname)}
													</AvatarFallback>
												</Avatar>
												<Button
													size="icon"
													className="absolute -bottom-1 -right-1 w-7 sm:w-8 h-7 sm:h-8 bg-gray-800 hover:bg-gray-900 rounded-full border-2 border-white"
												>
													<Edit className="w-3 sm:w-4 h-3 sm:h-4 text-white" />
												</Button>
											</div>
											<div>
												<h2 className="text-xl sm:text-2xl font-bold text-gray-900">
													{currentUser.fullname}
												</h2>
												<p className="text-sm sm:text-base text-gray-500">{currentUser.email}</p>
											</div>
										</div>
									)}
								</div>

								<form onSubmit={handleUpdateProfile} className="w-full max-w-md space-y-6">
									<TextInput
										id="name"
										label="Full Name"
										placeholder={currentUser ? currentUser.fullname : "Enter your full name"}
										value={name}
										onChange={setName}
										className="bg-gray-50 border-gray-300 text-gray-900 focus:ring-primary focus:border-primary"
										labelClassName="text-gray-700 font-medium"
										wrapperClassName="space-y-2"
										required
									/>

									<TextInput
										id="email"
										label="Email"
										type="email"
										placeholder={currentUser ? currentUser.email : "Enter your email"}
										value={email}
										onChange={setEmail}
										className="bg-gray-100 border-gray-300 text-gray-900 focus:ring-primary] focus:border-primary cursor-not-allowed"
										labelClassName="text-gray-700 font-medium"
										wrapperClassName="space-y-2"
										disabled
										readOnly
									/>

									<div className="pt-4">
										<Button
											type="submit"
											className={`w-full text-white font-medium h-12 rounded-lg transition-all ${
												isUpdating ? "opacity-80" : "opacity-100"
											}`}
											disabled={isUpdating}
										>
											{isUpdating ? "Updating..." : "Save Changes"}
										</Button>
									</div>
								</form>
							</div>
						)}

						{activeTab === "password" && (
							<div>
								<h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
									Change Password
								</h2>
								<hr className="border-gray-200 mb-6 md:mb-8" />

								<form onSubmit={handleChangePassword} className="w-full max-w-md space-y-6">
									<PasswordInput
										id="old-password"
										label="Old Password"
										placeholder="Type your current password"
										value={oldPassword}
										onChange={setOldPassword}
										showValidation={false}
										className="bg-gray-50 border-gray-300 text-gray-900 focus:ring-primary focus:border-primary"
										labelClassName="text-gray-700 font-medium"
										wrapperClassName="space-y-2"
									/>

									<PasswordInput
										id="new-password"
										label="New Password"
										placeholder="Type a new password"
										value={newPassword}
										onChange={setNewPassword}
										showValidation={true}
										className="bg-gray-50 border-gray-300 text-gray-900 focus:ring-primary focus:border-primary"
										labelClassName="text-gray-700 font-medium"
										wrapperClassName="space-y-2"
										validationText="Password must contain at least 8 characters, including uppercase, lowercase, number, and special character"
									/>

									<PasswordInput
										id="confirm-password"
										label="Confirm New Password"
										placeholder="Re-type your new password"
										value={confirmPassword}
										onChange={setConfirmPassword}
										showValidation={false}
										className="bg-gray-50 border-gray-300 text-gray-900 focus:ring-primary focus:border-primary"
										labelClassName="text-gray-700 font-medium"
										wrapperClassName="space-y-2"
									/>

									{confirmPassword && newPassword !== confirmPassword && (
										<p className="text-red-500 text-sm mt-1 flex items-center gap-2 bg-red-50 p-2 rounded-lg">
											<span>Passwords do not match</span>
										</p>
									)}

									<div className="pt-2">
										<Button
											type="submit"
											className={`w-full text-white font-medium h-12 rounded-lg transition-all ${
												isChangingPassword || !isPasswordFormValid()
													? "opacity-50 cursor-not-allowed"
													: "opacity-100"
											}`}
											disabled={isChangingPassword || !isPasswordFormValid()}
										>
											{isChangingPassword ? "Saving..." : "Save Changes"}
										</Button>
									</div>
								</form>
							</div>
						)}
					</div>
				</div>
			</main>
		</div>
	);
}
