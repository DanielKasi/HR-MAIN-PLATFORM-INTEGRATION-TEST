"use client";

import type { IAssetRequest } from "@/types/types.utils";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { ArrowLeft, RefreshCw, Package, User, ArrowDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { assetsAPI } from "@/lib/utils";
import { EditAssetRequestDialog } from "@/components/asset-requests/edit-asset-request-dialog";
import { DeleteAssetRequestDialog } from "@/components/asset-requests/delete-asset-request-dialog";
import { ApprovalWorkflow } from "@/components/approvals/approval-workflow";

const getStatusColor = (status: string) => {
	switch (status) {
		case "pending":
			return "bg-yellow-100 text-yellow-800 border-yellow-200";
		case "approved":
			return "bg-green-100 text-green-800 border-green-200";
		case "rejected":
			return "bg-red-100 text-red-800 border-red-200";
		case "cancelled":
			return "bg-gray-100 text-gray-800 border-gray-200";
		default:
			return "bg-gray-100 text-gray-800 border-gray-200";
	}
};

const getStatusDisplay = (status: string) => {
	switch (status) {
		case "pending":
			return "Pending";
		case "approved":
			return "Approved";
		case "rejected":
			return "Rejected";
		case "cancelled":
			return "Cancelled";
		default:
			return status;
	}
};

const formatDate = (dateString: string) => {
	return new Date(dateString).toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

const AssetRequestDetailPage = () => {
	const params = useParams();
	const router = useRouter();
	const [request, setRequest] = useState<IAssetRequest | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
	const [isApproving, setIsApproving] = useState(false);
	const [approvalComments, setApprovalComments] = useState<{ [key: number]: string }>({});
	const [showCommentInput, setShowCommentInput] = useState<{ [key: number]: boolean }>({});

	// console.log("requests", request);

	const selectedInstitution = useSelector(selectSelectedInstitution);
	const requestId = params.id as string;

	const fetchRequestDetails = async () => {
		try {
			setIsLoading(true);
			const response = await assetsAPI.getAssetRequestById(parseInt(requestId));

			setRequest(response);
		} catch (error) {
			console.error("Error fetching request details:", error);
			toast.error("Failed to load request details");
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (requestId) {
			fetchRequestDetails();
		}
	}, [requestId]);

	const handleEditSuccess = (updatedRequest: IAssetRequest) => {
		setRequest(updatedRequest);
		setIsEditDialogOpen(false);
		toast.success("Request updated successfully");
	};

	const handleDeleteSuccess = () => {
		toast.success("Request deleted successfully");
		router.push("/assets/asset-requests");
	};

	const handleApproval = async (taskId: number, action: "completed" | "rejected") => {
		if (!request) return;

		const comment = approvalComments[taskId] || "";

		try {
			setIsApproving(true);
			await assetsAPI.approveAssetRequest(taskId, action, comment);

			// Refresh the request details to get updated workflow status
			await fetchRequestDetails();

			// Clear comment and hide input for this task
			setApprovalComments((prev) => ({ ...prev, [taskId]: "" }));
			setShowCommentInput((prev) => ({ ...prev, [taskId]: false }));

			toast.success(`Asset request ${action}d successfully`);
		} catch (error) {
			console.error(`Error ${action}ing asset request:`, error);
			toast.error(`Failed to ${action} asset request`);
		} finally {
			setIsApproving(false);
		}
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="flex items-center space-x-2">
					<RefreshCw className="h-6 w-6 animate-spin text-orange-500" />
					<span className="text-lg text-gray-600">Loading request details...</span>
				</div>
			</div>
		);
	}

	if (!request) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
					<h2 className="text-xl font-semibold text-gray-900 mb-2">Request Not Found</h2>
					<p className="text-gray-600 mb-4">
						The request you're looking for doesn't exist or has been removed.
					</p>
					<Button onClick={() => router.push("/assets/asset-requests")}>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Requests
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4 md:space-y-6 p-4 md:p-6 bg-white rounded-lg">
			{/* Header */}
			<div className="">
				<div className="p-4">
					<div className="flex items-center gap-4">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => router.push("/assets/asset-requests")}
							className="p-2 hover:bg-gray-100 rounded-full border"
						>
							<ArrowLeft className="h-4 w-4" />
						</Button>
						<p className="text-gray-800 text-lg md:text-[24px] break-all">
							{request.request_reference_code}
						</p>
					</div>
				</div>
			</div>

			<div className="flex flex-col lg:flex-row justify-between gap-6">
				<div
					className={` gap-6 ${request?.approval_status !== "active" && request?.approvals?.length ? "!grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-3" : ""}`}
				>
					{request?.approvals && request.approvals.length > 0 && (
						<div className="order-1 lg:order-2">
							<ApprovalWorkflow
								approvals={request.approvals}
								instance_approval_status={request.approval_status}
								onRefresh={fetchRequestDetails}
							/>
						</div>
					)}

					<div
						className={`${request?.approval_status !== "active" && request?.approvals?.length ? "lg:col-span-2 xl:col-span-3 order-2 lg:order-1" : ""}`}
					>
						{/* Main Content */}
						<div className="flex flex-col w-full lg:flex-[0.7] space-y-4 lg:space-y-6">
							{/* Asset Card */}
							<div className="border rounded-[20px] p-4 my-2 lg:my-4">
								<div className="">
									<div className="flex items-center justify-between">
										<h3 className="text-lg font-semibold text-gray-900">Asset</h3>
									</div>
								</div>
								<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
									<div>
										<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
											<p className="text-sm font-medium text-gray-900">
												{request.asset?.asset_name}
											</p>
											<Badge className={getStatusColor(request.asset_request_status)}>
												{getStatusDisplay(request.asset_request_status)}
											</Badge>
										</div>

										<p className="text-sm text-gray-500">{request.asset?.serial_number}</p>
									</div>
									<div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
										<div>
											<p className="text-sm text-gray-500">Batch No</p>
											<p className="text-base font-mono break-all">{request.asset?.batch_number}</p>
										</div>
										<div>
											<p className="text-sm text-gray-500">Category</p>
											<p className="text-base font-mono break-all">
												{request.asset?.category?.category_name || "Unknown"}
											</p>
										</div>
									</div>
								</div>
							</div>

							{/* Connection Line - Dotted with Arrow */}
							<div className="flex justify-center">
								<div
									className="w-0.5 h-8 bg-gray-300 relative"
									style={{
										backgroundImage:
											"repeating-linear-gradient(0deg, transparent, transparent 2px, #d1d5db 2px, #d1d5db 4px)",
									}}
								>
									<ArrowDown className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 h-4 w-4 text-gray-400" />
								</div>
							</div>

							{/* Requested By Card */}
							<div className="border rounded-[20px] p-4 my-2 lg:my-4">
								<h3 className="text-lg font-semibold text-gray-900">Requested By</h3>
								<div className="">
									<div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
										<div className="flex items-center gap-2 ">
											<User className="h-5 w-5 text-gray-600" />
											<div className="flex flex-col">
												<p className="font-medium text-gray-900">
													{request.requester?.user.fullname}
												</p>
												<p className="text-sm text-gray-500">EMP-{request.requester?.user.id}</p>
											</div>
										</div>
										<div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
											<div>
												<p className="text-sm text-gray-500">Position</p>
												<p className="text-sm text-gray-500">
													{request.requester?.user.roles?.[0]?.name || "Not specified"}
												</p>
											</div>
											<div className="flex flex-col">
												<p className="text-sm text-gray-500">Department</p>
												<p className="text-sm text-gray-500">Not specified</p>
											</div>
										</div>
									</div>
								</div>
							</div>

							{/* Notes Card (if exists) */}
							{request.notes && (
								<div className="rounded-[20px] p-4 my-2 lg:my-4">
									<h3 className="text-lg font-semibold text-gray-900">Notes</h3>
									<div className="">
										<div>
											<p className="text-sm text-gray-600">{request.notes}</p>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			{/* Dialogs */}
			{request && (
				<>
					<EditAssetRequestDialog
						request={request}
						isOpen={isEditDialogOpen}
						onClose={() => setIsEditDialogOpen(false)}
						onSuccess={handleEditSuccess}
					/>

					<DeleteAssetRequestDialog
						request={request}
						isOpen={isDeleteDialogOpen}
						onClose={() => setIsDeleteDialogOpen(false)}
						onSuccess={handleDeleteSuccess}
					/>
				</>
			)}
		</div>
	);
};

export default AssetRequestDetailPage;
