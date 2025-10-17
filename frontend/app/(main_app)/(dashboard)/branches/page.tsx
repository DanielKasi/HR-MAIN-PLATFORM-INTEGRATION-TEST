"use client";

import type { Branch, BranchFormData } from "@/types/branch.types";
import { Icon } from "@iconify/react";

import { useEffect, useState } from "react";
import {
	Edit,
	MapPin,
	Plus,
	Search,
	Trash,
	Loader2,
	MoreVertical,
	ArrowLeft,
	Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import apiRequest from "@/lib/apiRequest";
import ProtectedComponent from "@/components/ProtectedComponent";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import { PERMISSION_CODES } from "@/constants";
import { fetchUpToDateInstitution } from "@/store/auth/actions";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { BankAccountSearchableSelect } from "@/components/selects/bank-accounts-select";

export default function BranchesPage() {
	const [searchQuery, setSearchQuery] = useState("");
	const [branches, setBranches] = useState<Branch[]>([]);
	const [errorMessage, setErrorMessage] = useState("");
	const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [gettingCurrentLocation, setGettingCurrentLocation] = useState(false);
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const router = useRouter();
	const dispatch = useDispatch();

	const [newBranch, setNewBranch] = useState<BranchFormData>({
		branch_name: "",
		branch_location: "",
		branch_latitude: "",
		branch_longitude: "",
		branch_phone_number: "",
		branch_email: "",
		branch_opening_time: "",
		branch_closing_time: "",
		institution: selectedInstitution?.id ?? 0,
	});
	const [editBranch, setEditBranch] = useState<Branch | null>(null);

	const fetchBranches = async () => {
		if (!selectedInstitution?.id) {
			setBranches([]);
			setIsLoading(false);

			return;
		}

		setIsLoading(true);
		try {
			const response = await apiRequest.get(`institution/${selectedInstitution.id}/branch`);

			if (response.data && typeof response.data === "object") {
				if (Array.isArray(response.data)) {
					setBranches(response.data);
				} else if (Array.isArray(response.data.results)) {
					setBranches(response.data.results);
				} else {
					setBranches([]);
				}
			} else {
				setBranches([]);
			}

			setErrorMessage("");
		} catch (error) {
			setBranches([]);
			setErrorMessage("Failed to fetch branches");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (selectedInstitution?.id) {
			setNewBranch((prev) => ({ ...prev, institution: selectedInstitution.id }));
			fetchBranches();
		}
	}, [selectedInstitution?.id]);

	useEffect(() => {
		setNewBranch({
			branch_name: editBranch?.branch_name || "",
			branch_location: editBranch?.branch_location || "",
			branch_latitude: editBranch?.branch_latitude || "",
			branch_longitude: editBranch?.branch_longitude || "",
			branch_phone_number: editBranch?.branch_phone_number || "",
			branch_email: editBranch?.branch_email || "",
			branch_opening_time: editBranch?.branch_opening_time || "",
			branch_closing_time: editBranch?.branch_closing_time || "",
			institution: selectedInstitution?.id ?? 0,
			paying_bank_account: editBranch?.paying_bank_account,
		});
	}, [editBranch]);

	const resetBranchFormData = () => {
		setNewBranch({
			branch_name: "",
			branch_location: "",
			branch_latitude: "",
			branch_longitude: "",
			branch_phone_number: "",
			branch_email: "",
			branch_opening_time: "",
			branch_closing_time: "",
			institution: selectedInstitution?.id ?? 0,
		});
	};

	// Ensure branches is always an array before filtering
	const safeBranches = Array.isArray(branches) ? branches : [];

	const filteredBranches = safeBranches.filter(
		(branch) =>
			searchQuery === "" ||
			branch.branch_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			branch.branch_location.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	const handleAddBranch = async () => {
		if (!selectedInstitution?.id) {
			toast.error("No institution selected");

			return;
		}

		try {
			const branchData: BranchFormData = {
				...newBranch,
				institution: selectedInstitution.id,
				paying_bank_account: newBranch.paying_bank_account || undefined,
			};
			console.log("\n\n Sent branch data : ", branchData);
			// return;

			const response = await apiRequest.post("institution/branch/", branchData);

			if (response.status === 201) {
				setIsAddDialogOpen(false);
				setNewBranch({
					branch_name: "",
					branch_location: "",
					branch_latitude: "",
					branch_longitude: "",
					branch_phone_number: "",
					branch_email: "",
					branch_opening_time: "",
					branch_closing_time: "",
					institution: selectedInstitution.id,
					paying_bank_account: 0,
				});
				toast.success("The branch has been successfully added.");
				// Refresh branches list
				await fetchBranches();
				dispatch(fetchUpToDateInstitution());
			} else {
				setErrorMessage("Failed to add branch");
			}
		} catch (error: any) {
			toast.error("An unexpected error occurred while adding the branch.");
		} finally {
			setIsAddDialogOpen(false);
		}
	};

	const handleEditBranch = async () => {
		if (!editBranch) return;
		try {
			const response = await apiRequest.patch(`institution/branch/${editBranch.id}/`, newBranch);

			if (response.status === 200) {
				setIsAddDialogOpen(false);
				toast.success("The branch has been successfully updated.");

				fetchBranches();
			} else {
				setErrorMessage("Failed to update branch");
			}
		} catch (error) {
			toast.error("Error updating branch");
		}
	};

	const handleDeleteBranch = async (id: number) => {
		try {
			const response = await apiRequest.delete(`institution/branch/${id}/`);

			if (response.status === 204) {
				setBranches((prev) => (Array.isArray(prev) ? prev.filter((b) => b.id !== id) : []));
				toast.success("The branch has been successfully deleted.");
			} else {
				toast.info("Failed to delete Branch");
			}
		} catch (error) {
			toast.error("An unexpected error occurred while deleting the branch.");
		}
	};

	const getCurrentLocation = () => {
		if (!navigator.geolocation) {
			toast.info("Your browser does not support geolocation.");

			return;
		}

		setGettingCurrentLocation(true);

		navigator.geolocation.getCurrentPosition(
			async (position) => {
				try {
					const { latitude, longitude } = position.coords;

					// Use Geoapify reverse geocoding API
					const response = await fetch(
						`https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&apiKey=12a8608da7914f4c96cbbc76c7ca954c`,
					);

					if (!response.ok) {
						throw new Error("Failed to reverse geocode location");
					}

					const data = await response.json();

					if (data.features && data.features.length > 0) {
						const address = data.features[0].properties.formatted;

						if (editBranch) {
							setEditBranch({
								...editBranch,
								branch_location: address,
								branch_latitude: latitude.toString(),
								branch_longitude: longitude.toString(),
							});
						} else {
							setNewBranch((prev) => ({
								...prev,
								branch_location: address,
								branch_latitude: latitude.toString(),
								branch_longitude: longitude.toString(),
							}));
						}
						toast.info("Your current location has been set.");
					} else {
						toast.error("No address found for your location");
					}
				} catch (error) {
					toast.error("Failed to get your current location");
				} finally {
					setGettingCurrentLocation(false);
				}
			},
			(error) => {
				let errorMessage = "Failed to get your location";

				switch (error.code) {
					case error.PERMISSION_DENIED:
						errorMessage = "Location permission denied. Please enable location services.";
						break;
					case error.POSITION_UNAVAILABLE:
						errorMessage = "Location information is unavailable.";
						break;
					case error.TIMEOUT:
						errorMessage = "Location request timed out.";
						break;
				}

				toast.error("Location error:" + errorMessage);

				setGettingCurrentLocation(false);
			},
			{ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
		);
	};

	return (
		<div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8 -mt-5">
			<div className="flex items-center">
				<div className="flex items-center gap-2">
					<Button
						size="sm"
						className="rounded-full aspect-square -mt-4"
						variant="outline"
						onClick={() => router.push("/admin")}
					>
						<ArrowLeft />
					</Button>

					<div className="ml-2">
						<h1 className="text-2xl font-bold tracking-tight mt-5">Branches</h1>
						<p className="text-muted-foreground mt-4 -ml-14">Manage your business locations</p>
					</div>
				</div>
			</div>

			{errorMessage && (
				<div className="mb-4 p-3 text-sm font-medium text-white bg-red-500 rounded-md flex items-center">
					<span className="mr-2">⚠️</span> {errorMessage}
				</div>
			)}

			<div>
				<CardContent className="p-0">
					{/* Search bar and Add Branch button on same line */}
					<div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between mt-12">
						<div className="flex flex-1 items-center gap-4">
							<div className="relative flex-1 max-w-2xl">
								<Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									className="w-full pl-8"
									placeholder="Search branches by name or location..."
									type="search"
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
								/>
							</div>
							<Badge variant="outline">
								{filteredBranches.length} {filteredBranches.length === 1 ? "branch" : "branches"}
							</Badge>
						</div>

						<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_ADD_BRANCH}>
							<Button className="flex-shrink-0" onClick={() => setIsAddDialogOpen(true)}>
								<Plus className="mr-2 h-4 w-4" />
								{"Add Branch"}
							</Button>
						</ProtectedComponent>
					</div>

					<div className="overflow-hidden mt-12">
						<Table>
							<TableHeader>
								<TableRow className="bg-muted/50">
									<TableHead>Branch</TableHead>
									<TableHead className="hidden md:table-cell">Location</TableHead>
									<TableHead>Phone Number</TableHead>
									<TableHead>Email</TableHead>
									<TableHead>Operating Time</TableHead>
									<TableHead className="text-center">Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{isLoading ? (
									<TableRow>
										<TableCell className="h-24 text-center" colSpan={6}>
											<div className="flex items-center justify-center">
												<Loader2 className="h-6 w-6 animate-spin mr-2" />
												<span>Loading branches...</span>
											</div>
										</TableCell>
									</TableRow>
								) : filteredBranches.length === 0 ? (
									<TableRow>
										<TableCell className="h-24 text-center" colSpan={6}>
											{searchQuery ? (
												<div className="flex flex-col items-center justify-center text-muted-foreground">
													<Search className="h-8 w-8 mb-2" />
													<p>No branches found matching "{searchQuery}"</p>
													<Button
														className="mt-2"
														variant="link"
														onClick={() => setSearchQuery("")}
													>
														Clear search
													</Button>
												</div>
											) : (
												<div className="flex flex-col items-center justify-center text-muted-foreground">
													<p>No branches found</p>
													<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_ADD_BRANCH}>
														<Button
															className="mt-2"
															variant="link"
															onClick={() => setIsAddDialogOpen(true)}
														>
															Add your first branch
														</Button>
													</ProtectedComponent>
												</div>
											)}
										</TableCell>
									</TableRow>
								) : (
									filteredBranches.map((branch) => (
										<TableRow key={branch.id} className="group">
											<TableCell className="font-medium">{branch.branch_name}</TableCell>
											<TableCell className="hidden md:table-cell max-w-xs">
												<div className="flex items-start">
													<MapPin className="mr-2 h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />
													<span className="truncate" title={branch.branch_location}>
														{branch.branch_location}
													</span>
												</div>
											</TableCell>
											<TableCell>{branch.branch_phone_number}</TableCell>
											<TableCell>{branch.branch_email}</TableCell>
											<TableCell>
												Opens: {branch.branch_opening_time}, Closes: {branch.branch_closing_time}
											</TableCell>
											<TableCell className="text-center">
												<DropdownMenu>
													<DropdownMenuTrigger asChild>
														<Button variant="ghost" className="h-8 w-8 p-0">
															<MoreVertical className="h-4 w-4" />
															<span className="sr-only">Open menu</span>
														</Button>
													</DropdownMenuTrigger>
													<DropdownMenuContent align="end">
														<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_VIEW_BRANCHES}>
															<DropdownMenuItem
																onClick={() => {
																	router.push(`/branches/${branch.id}`);
																}}
															>
																<Eye className="mr-2 h-4 w-4" />
																View Details
															</DropdownMenuItem>
														</ProtectedComponent>
														<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_EDIT_BRANCH}>
															<DropdownMenuItem
																onClick={() => {
																	setEditBranch(branch);
																	setIsAddDialogOpen(true);
																}}
															>
																<Edit className="mr-2 h-4 w-4" />
																Edit Branch
															</DropdownMenuItem>
														</ProtectedComponent>
														<ProtectedComponent permissionCode={PERMISSION_CODES.CAN_DELETE_BRANCH}>
															<DropdownMenuItem
																onClick={() => handleDeleteBranch(branch.id)}
																className="text-red-600 focus:text-red-600"
															>
																<Trash className="mr-2 h-4 w-4" />
																Delete Branch
															</DropdownMenuItem>
														</ProtectedComponent>
													</DropdownMenuContent>
												</DropdownMenu>
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</div>

			<Dialog
				open={isAddDialogOpen}
				onOpenChange={(open) => {
					if (!open) {
						setIsAddDialogOpen(false);
						setEditBranch(null);
						resetBranchFormData();
					}
				}}
			>
				<DialogContent className="max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col">
					<DialogHeader>
						<DialogTitle>{editBranch ? "Edit Branch" : "Add New Branch"}</DialogTitle>
						<DialogDescription>
							{editBranch ? "Edit branch details" : "Create a new branch record"} .
						</DialogDescription>
					</DialogHeader>
					<ScrollArea className="flex-1 pr-4">
						<div className="grid gap-4 py-4">
							{["branch_name", "branch_phone_number", "branch_email"].map((field) => (
								<div key={field} className="grid grid-cols-4 items-center gap-4">
									<Label className="text-right" htmlFor={field}>
										{field
											.split("_")
											.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
											.join(" ")}
									</Label>
									<Input
										className="col-span-3"
										id={field}
										value={(newBranch as any)[field] || ""}
										onChange={(e) =>
											setNewBranch({
												...newBranch,
												[field]: e.target.value,
											})
										}
									/>
								</div>
							))}

							{/* Opening Time */}
							<div className="grid grid-cols-4 items-center gap-4">
								<Label className="text-right" htmlFor="branch_opening_time">
									Opening Time
								</Label>
								<Input
									className="col-span-3"
									id="branch_opening_time"
									type="time"
									value={newBranch.branch_opening_time || ""}
									onChange={(e) =>
										setNewBranch({
											...newBranch,
											branch_opening_time: e.target.value,
										})
									}
								/>
							</div>

							{/* Closing Time */}
							<div className="grid grid-cols-4 items-center gap-4">
								<Label className="text-right" htmlFor="branch_closing_time">
									Closing Time
								</Label>
								<Input
									className="col-span-3"
									id="branch_closing_time"
									type="time"
									value={newBranch.branch_closing_time || ""}
									onChange={(e) =>
										setNewBranch({
											...newBranch,
											branch_closing_time: e.target.value,
										})
									}
								/>
							</div>

							<div key="branch_location" className="grid grid-cols-4 items-start gap-4">
								<Label className="text-right pt-2" htmlFor="branch_location">
									Location
								</Label>
								<div className="col-span-3 flex flex-col gap-2">
									<LocationAutocomplete
										placeholder="Search for a location..."
										value={newBranch.branch_location || ""}
										onChange={(location) =>
											setNewBranch((prev) => ({
												...prev,
												branch_location: location,
											}))
										}
										onCoordinatesChange={(lat, lon) =>
											setNewBranch((prev) => ({
												...prev,
												branch_latitude: lat,
												branch_longitude: lon,
											}))
										}
									/>
									<Button
										className="self-start mt-1 flex items-center"
										disabled={gettingCurrentLocation}
										size="sm"
										type="button"
										variant="outline"
										onClick={getCurrentLocation}
									>
										{gettingCurrentLocation ? (
											<Icon icon="hugeicons:loading-02" className="mr-2 h-4 w-4 animate-spin" />
										) : (
											<Icon icon="hugeicons:navigation-05" className="mr-2 !h-4 !w-4" />
										)}
										Get Current Location
									</Button>
								</div>
							</div>

							<div className="grid grid-cols-4 items-center gap-4">
								<Label className="text-right">Bank account</Label>
								<BankAccountSearchableSelect
									className="col-span-3"
									value={newBranch.paying_bank_account ? [newBranch.paying_bank_account] : []}
									onValueChange={(values) => {
										if (values.length) {
											setNewBranch((prev) => ({
												...prev,
												paying_bank_account: Number(values[0]),
											}));
										}
									}}
								/>
							</div>
						</div>
					</ScrollArea>
					<DialogFooter className="pt-4 flex items-center">
						<Button
							className="w-full rounded-full"
							onClick={editBranch ? handleEditBranch : handleAddBranch}
						>
							Save Branch
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
