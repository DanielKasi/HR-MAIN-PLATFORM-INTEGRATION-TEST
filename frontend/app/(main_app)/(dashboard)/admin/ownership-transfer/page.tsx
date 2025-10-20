"use client";

import { useState, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Crown,
	Users,
	AlertTriangle,
	Calendar,
	Shield,
	ArrowRight,
	History,
	Clock,
	Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { selectSelectedInstitution, selectUser } from "@/store/auth/selectors";
import { useDispatch, useSelector } from "react-redux";
import type { IUser, Role } from "@/types/user.types";
import { logoutStart } from "@/store/auth/actions";
import { handleApiError } from "@/lib/apiErrorHandler";
import { institutionAPI, ROLES_API, showErrorToast, usersAPI } from "@/lib/utils";
import RoleSearchableSelect from "@/components/selects/role-searchable-select";
import { IOwnerShipHistory, IOwnershipTransferFormData } from "@/types/institution.types";
import UserSearchableSelect from "@/components/selects/user-searchable-select";

export default function InstitutionOwnershipTransferTab() {
	const [selectedNewOwner, setSelectedNewOwner] = useState<number | null>(null);
	const [newOwner, setNewOwner] = useState<IUser | null>(null);
	const [postTransferAction, setPostTransferAction] = useState<"new_role" | "deactivate" | "">("");
	const [newSelectedRole, setNewSelectedRole] = useState<number | null>(null);
	const [newRole, setNewRole] = useState<Role | null>(null);
	const [transferReason, setTransferReason] = useState("");
	const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
	// const [currentOwner, setCurrentOwner] = useState<IUser | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [isTransferring, setIsTransferring] = useState(false);
	const [ownershipHistory, setOwnershipHistory] = useState<IOwnerShipHistory[]>([]);
	const currentUser = useSelector(selectUser);

	const dispatch = useDispatch();

	const currentInstitution = useSelector(selectSelectedInstitution);

	useEffect(() => {
		if (newSelectedRole) {
			fetchRole();
		}
	}, [newSelectedRole]);

	useEffect(() => {
		if (selectedNewOwner) {
			fetchOwner();
		}
	}, [selectedNewOwner]);

	useEffect(() => {
		if (currentInstitution) {
			fetchInstitution();
		}
	}, [currentInstitution]);

	const fetchRole = async () => {
		if (!newSelectedRole) {
			return;
		}
		try {
			const role = await ROLES_API.getById({ roleId: newSelectedRole });
			setNewRole(role);
		} catch (error) {}
	};

	const fetchOwner = async () => {
		if (!selectedNewOwner) {
			return;
		}
		try {
			const user = await usersAPI.getById({ userId: selectedNewOwner });
			setNewOwner(user);
		} catch (error) {}
	};

	const fetchInstitution = async () => {
		if (!currentInstitution) {
			return;
		}
		setIsLoading(true);
		try {
			const fetchedInstitution = await institutionAPI.getById({
				institutionId: currentInstitution?.id,
			});
			setOwnershipHistory(fetchedInstitution.transfer_history);
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to get institution details" });
		} finally {
			setIsLoading(false);
		}
	};

	// useEffect(() => {
	//   const initializeData = async () => {
	//     setIsLoading(true);
	//     setIsLoading(false);
	//   };

	//   if (currentInstitution) {
	//     initializeData();
	//   }
	// }, [currentInstitution]);

	const handleTransferOwnership = async () => {
		if (!currentUser) {
			return;
		}
		if (
			currentInstitution?.institution_owner_id !== currentUser?.id ||
			!selectedNewOwner ||
			!postTransferAction ||
			!transferReason.trim()
		) {
			toast.error("Please fill in all required fields");
			return;
		}

		if (postTransferAction === "new_role" && !newSelectedRole) {
			toast.error("Please select a new role");
			return;
		}

		try {
			setIsTransferring(true);
			const transferData: IOwnershipTransferFormData = {
				institution: currentInstitution?.id,
				previous_owner_id: currentUser.id,
				new_owner_id: selectedNewOwner,
				account_fate: postTransferAction,
				transfer_reason: transferReason,
				...(postTransferAction === "new_role" && { new_role: newSelectedRole }),
			};

			await institutionAPI.transferOwnerShip({ transferData });

			toast.success("Ownership transferred successfully!");
			// await fetchShopContext();
			setSelectedNewOwner(null);
			setPostTransferAction("");
			setNewSelectedRole(null);
			setTransferReason("");
			setIsTransferDialogOpen(false);
			// logout user after transfer
			dispatch(logoutStart());
		} catch (error: any) {
			showErrorToast({ error, defaultMessage: "Failed to transfer ownership" });
			handleApiError(error);
		} finally {
			setIsTransferring(false);
		}
	};

	// const selectedMember = teamMembers.find((member) => member.id === selectedNewOwner);
	// const selectedRoleInfo = availableRoles.find((role) => role.id === newSelectedRole);
	const isFormValid =
		selectedNewOwner &&
		postTransferAction &&
		transferReason.trim() &&
		(postTransferAction === "deactivate" || newSelectedRole);

	const formatDate = (dateString: string) => {
		try {
			return new Date(dateString).toLocaleDateString();
		} catch {
			return dateString;
		}
	};

	if (isLoading) {
		return (
			<div className="container mx-auto p-4 sm:p-6 max-w-full">
				<div className="flex items-center justify-center min-h-[400px]">
					<div className="text-center space-y-4">
						<Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto" />
						<p className="text-muted-foreground">Loading ownership transfer page...</p>
					</div>
				</div>
			</div>
		);
	}

	// if (!currentOwner) {
	//   return (
	//     <div className="container mx-auto p-4 sm:p-6 max-w-full">
	//       <div className="text-center space-y-4">
	//         <AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 text-red-500 mx-auto" />
	//         <h2 className="text-xl sm:text-2xl font-bold">Unable to Load Owner Information</h2>
	//         <p className="text-muted-foreground">
	//           There was an error loading the current owner information. Please try again later.
	//         </p>
	//         <Button onClick={() => window.location.reload()}>Retry</Button>
	//       </div>
	//     </div>
	//   );
	// }

	return (
		<div className="w-full bg-white rounded-lg p-4">
			<div className="space-y-8">
				{/* Header */}
				<div className="space-y-2">
					<div className="flex items-center space-x-3">
						<h1 className="text-xl sm:text-2xl font-bold text-gray-900">Transfer Ownership</h1>
					</div>
					<p className="text-base sm:text-lg text-muted-foreground sm:px-0">
						Transfer ownership of your institution to another team member. Choose what happens to
						your account after the transfer.
					</p>
				</div>

				{/* Two Column Layout */}
				<div className="grid grid-cols-1 xl:grid-cols-4 gap-4 lg:gap-8">
					{/* Left Column - Main Content */}
					<div className="md:col-span-2 lg:col-span-3 space-y-8">
						{/* Current Owner Card */}
						<Card className="border-2 border-yellow-200 bg-yellow-50/50">
							<CardHeader>
								<CardTitle className="flex items-center space-x-2">
									<Shield className="h-5 w-5 text-yellow-600" />
									<span>Current Super User</span>
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="flex items-center space-x-4">
									<Avatar className="h-12 w-12 sm:h-16 sm:w-16 border-2 border-yellow-300">
										<AvatarImage
											src="/placeholder.svg?height=64&width=64"
											alt={currentUser?.fullname}
										/>
										<AvatarFallback className="bg-yellow-100">
											{currentUser?.fullname
												.split(" ")
												.map((n) => n[0])
												.join("")}
										</AvatarFallback>
									</Avatar>
									<div className="flex-1">
										<div className="flex items-center space-x-2">
											<h3 className="text-lg sm:text-xl font-semibold">
												{currentUser?.fullname || ""}
											</h3>
											<Badge className="bg-yellow-500 hover:bg-yellow-600">
												<Crown className="h-3 w-3 mr-1" />
												Owner
											</Badge>
										</div>
										<p className="text-muted-foreground">{currentUser?.email || ""}</p>
										<div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4 mt-2 text-sm text-muted-foreground">
											<div className="flex items-center space-x-1">
												<Calendar className="h-4 w-4" />
												<span>Active Account</span>
											</div>
										</div>
									</div>
								</div>
							</CardContent>
						</Card>

						{/* Transfer Form */}
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center space-x-2">
									<Users className="h-5 w-5" />
									<span>Transfer Details</span>
								</CardTitle>
								<CardDescription>
									Complete the form below to transfer ownership. All fields are required.
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4 sm:space-y-6">
								{/* Step 1: Select New Owner */}
								<div className="space-y-3">
									<Label className="text-base font-semibold">Step 1: Select New Super User</Label>
									<UserSearchableSelect
										value={selectedNewOwner ? [selectedNewOwner] : []}
										onValueChange={(values) => {
											if (values.length) {
												setSelectedNewOwner(Number(values[0]));
											}
										}}
									/>

									{/* <Select value={selectedNewOwner} onValueChange={setSelectedNewOwner}>
                    <SelectTrigger className="h-10 sm:h-11">
                      <SelectValue placeholder="Choose who will become the new owner" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id} className="p-2 sm:p-3">
                          <div className="flex items-center space-x-2 sm:space-x-3">
                            <Avatar className="h-6 w-6 sm:h-8 sm:w-8">
                              <AvatarImage
                                src="/placeholder.svg?height=32&width=32"
                                alt={member.name}
                              />
                              <AvatarFallback className="text-xs">
                                {member.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium truncate">{member.name}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {member.email}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {member.roles.join(", ")}
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select> */}
								</div>

								<Separator />

								{/* Step 2: Choose Your Fate */}
								<div className="space-y-4">
									<Label className="text-base font-semibold">
										Step 2: Choose Your Account Fate
									</Label>
									<RadioGroup
										value={postTransferAction}
										onValueChange={(value) =>
											setPostTransferAction(value as "new_role" | "deactivate")
										}
									>
										<div className="space-y-3">
											<div className="flex items-center space-x-2 p-3 sm:p-4 border rounded-lg hover:bg-muted/50">
												<RadioGroupItem value="new_role" id="new_role" />
												<Label htmlFor="new_role" className="flex-1 cursor-pointer">
													<div className="font-medium">Take on a new role</div>
													<div className="text-sm text-muted-foreground">
														Continue as a team member with a different role
													</div>
												</Label>
											</div>
											<div className="flex items-center space-x-2 p-3 sm:p-4 border rounded-lg hover:bg-muted/50">
												<RadioGroupItem value="deactivate" id="deactivate" />
												<Label htmlFor="deactivate" className="flex-1 cursor-pointer">
													<div className="font-medium text-red-600">Deactivate my account</div>
													<div className="text-sm text-muted-foreground">
														Permanently remove my access to the system
													</div>
												</Label>
											</div>
										</div>
									</RadioGroup>

									{/* Role Selection (only shown if "new_role" is selected) */}
									{postTransferAction === "new_role" && (
										<div className="ml-4 sm:ml-6 space-y-2">
											<Label>Select your new role</Label>
											<RoleSearchableSelect
												value={newSelectedRole ? [newSelectedRole] : []}
												onValueChange={(values) => {
													if (values.length) {
														setNewSelectedRole(Number(values[0]));
													}
												}}
											/>
											{/* <Select value={newSelectedRole} onValueChange={setNewSelectedRole}>
                        <SelectTrigger className="h-10 sm:h-11">
                          <SelectValue placeholder="Choose your new role" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRoles.map((role) => (
                            <SelectItem key={role.id} value={role.id} className="p-2 sm:p-3">
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{role.name}</div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {role.description}
                                </div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select> */}
										</div>
									)}
								</div>

								<Separator />

								{/* Step 3: Reason */}
								<div className="space-y-3">
									<Label className="text-base font-semibold">Step 3: Reason for Transfer</Label>
									<Textarea
										placeholder="Please provide a detailed reason for the ownership transfer..."
										value={transferReason}
										onChange={(e) => setTransferReason(e.target.value)}
										rows={4}
										className="resize-none rounded-xl"
									/>
								</div>

								{/* Transfer Preview */}
								{selectedNewOwner && postTransferAction && (
									<div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
										<h4 className="font-semibold text-blue-900 mb-2">Transfer Summary</h4>
										<div className="space-y-2 text-xs sm:text-sm">
											<div className="flex items-center space-x-2">
												<span className="text-blue-700">New Owner:</span>
												<span className="font-medium">{newOwner?.fullname || ""}</span>
											</div>
											<div className="flex items-center space-x-2">
												<span className="text-blue-700">Your Account:</span>
												<span className="font-medium">
													{postTransferAction === "new_role"
														? `Change to ${newRole?.name || "Selected Role"}`
														: "Will be deactivated"}
												</span>
											</div>
										</div>
									</div>
								)}

								{/* Transfer Button */}
								<Dialog open={isTransferDialogOpen} onOpenChange={setIsTransferDialogOpen}>
									<DialogTrigger asChild>
										<Button
											className="w-full text-base sm:text-lg rounded-full max-w-sm"
											disabled={!isFormValid || isTransferring}
											size="lg"
										>
											{isTransferring ? (
												<>
													<Loader2 className="h-5 w-5 mr-2 animate-spin" />
													Processing Transfer...
												</>
											) : (
												<>
													<ArrowRight className="h-5 w-5 mr-2" />
													Transfer Ownership
												</>
											)}
										</Button>
									</DialogTrigger>
									<DialogContent className="max-w-[90vw] sm:max-w-md mx-4 sm:mx-0">
										<DialogHeader>
											<DialogTitle className="flex items-center space-x-2">
												<AlertTriangle className="h-5 w-5 text-red-500" />
												<span>Confirm Ownership Transfer</span>
											</DialogTitle>
											<DialogDescription className="text-left space-y-2">
												<p>
													You are about to transfer ownership to{" "}
													<strong>{newOwner?.fullname || ""}</strong>.
												</p>
												{postTransferAction === "new_role" ? (
													<p>
														Your account will be changed to <strong>{newRole?.name}</strong> role.
													</p>
												) : (
													<p className="text-red-600 font-medium">
														Your account will be permanently deactivated.
													</p>
												)}
											</DialogDescription>
										</DialogHeader>
										<div className="bg-red-50 border border-red-200 rounded-lg p-4">
											<div className="flex items-start space-x-2">
												<AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
												<div className="text-sm">
													<p className="font-medium text-red-800 mb-1">
														This action cannot be undone!
													</p>
													<ul className="text-red-700 space-y-1">
														<li>• You will lose all owner privileges immediately</li>
														<li>• The new owner will have full control</li>
														{postTransferAction === "deactivate" && (
															<li>• Your account cannot be recovered after deactivation</li>
														)}
													</ul>
												</div>
											</div>
										</div>
										<DialogFooter className="w-full flex items-center justify-end gap-8">
											<Button
												variant="outline"
												onClick={() => setIsTransferDialogOpen(false)}
												className="w-full rounded-full"
												disabled={isTransferring}
											>
												Cancel
											</Button>
											<Button
												variant={"destructive"}
												onClick={handleTransferOwnership}
												className="w-full rounded-full"
												disabled={isTransferring}
											>
												{isTransferring ? (
													<>
														<Loader2 className="h-4 w-4 mr-2 animate-spin" />
														Transferring...
													</>
												) : (
													"Confirm Transfer"
												)}
											</Button>
										</DialogFooter>
									</DialogContent>
								</Dialog>
							</CardContent>
						</Card>
					</div>

					{/* Right Column - Ownership History */}
					<div className="md:col-span-2 lg:col-span-1">
						<Card className="lg:sticky lg:top-6 overflow-y-auto max-h-[400px] lg:max-h-[calc(90vh-6rem)]">
							<CardHeader>
								<CardTitle className="flex items-center space-x-2">
									<History className="h-5 w-5" />
									<span>Ownership History</span>
								</CardTitle>
								<CardDescription>Previous ownership transfers for this institution</CardDescription>
							</CardHeader>
							<CardContent>
								{
									<div className="space-y-6">
										{ownershipHistory?.map((transfer, index) => (
											<div key={transfer.id} className="relative">
												{/* Timeline line */}
												{index < ownershipHistory.length - 1 && (
													<div className="absolute left-4 top-12 w-0.5 h-16 bg-border" />
												)}
												<div className="flex items-start space-x-3">
													<div className="relative">
														<div className="w-8 h-8 bg-background border-2 border-green-500 rounded-full flex items-center justify-center">
															<Crown className="h-3 w-3 text-green-600" />
														</div>
													</div>
													<div className="flex-1 min-w-0">
														<div className="space-y-2">
															<div className="flex items-center space-x-2">
																<Avatar className="h-5 w-5 sm:h-6 sm:w-6">
																	<AvatarImage
																		src="/placeholder.svg?height=24&width=24"
																		alt={transfer.previous_owner?.fullname || "Previous Owner"}
																	/>
																	<AvatarFallback className="text-xs">
																		{transfer.previous_owner?.fullname
																			?.split(" ")
																			.map((n) => n[0])
																			.join("") || "PO"}
																	</AvatarFallback>
																</Avatar>
																<ArrowRight className="h-3 w-3 text-muted-foreground" />
																<Avatar className="h-5 w-5 sm:h-6 sm:w-6">
																	<AvatarImage
																		src="/placeholder.svg?height=24&width=24"
																		alt={transfer.new_owner?.fullname || "New Owner"}
																	/>
																	<AvatarFallback className="text-xs">
																		{transfer.new_owner?.fullname
																			?.split(" ")
																			.map((n) => n[0])
																			.join("") || "NO"}
																	</AvatarFallback>
																</Avatar>
															</div>
															<div>
																<p className="text-xs sm:text-sm font-medium">
																	{transfer.previous_owner?.fullname || "Unknown"} →{" "}
																	{transfer.new_owner?.fullname || "Unknown"}
																</p>
																<p className="text-xs text-muted-foreground">
																	{transfer.transfer_reason && transfer.transfer_reason !== "None"
																		? transfer.transfer_reason
																		: "No reason provided"}
																</p>
															</div>
															<div className="flex items-center space-x-1 text-xs text-muted-foreground">
																<Clock className="h-3 w-3" />
																<span>{formatDate(transfer.transfer_date)}</span>
															</div>
														</div>
													</div>
												</div>
											</div>
										))}
										{ownershipHistory.length === 0 && (
											<div className="text-center py-8 text-muted-foreground">
												<History className="h-8 w-8 mx-auto mb-2 opacity-50" />
												<p className="text-sm">No ownership transfers yet</p>
											</div>
										)}
									</div>
								}
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		</div>
	);
}
