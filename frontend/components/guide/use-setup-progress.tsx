"use client";

import type { SetupStep } from "./types";

import { useEffect, useState } from "react";

import { SETUP_STEPS } from "./setup-steps";

import apiRequest from "@/lib/apiRequest";

export function useSetupProgress(InstitutionId?: string) {
	const [steps, setSteps] = useState<SetupStep[]>(SETUP_STEPS);
	const [isLoading, setIsLoading] = useState(true);
	const [InstitutionSetupComplete, setInstitutionSetupComplete] = useState(false);

	useEffect(() => {
		const checkSetupStatus = async () => {
			if (!InstitutionId) {
				setIsLoading(false);

				return;
			}

			try {
				// First, check if Institution setup is already marked as complete
				const InstitutionEndpoint = `institution/${InstitutionId}/`;

				try {
					const InstitutionResponse = await apiRequest.get(InstitutionEndpoint);

					// Check if Institution setup is complete - silently set state without console logs
					if (
						InstitutionResponse.data.Institution_setup === "true" ||
						InstitutionResponse.data.Institution_setup === true
					) {
						setInstitutionSetupComplete(true);
						setIsLoading(false);

						return;
					}
				} catch (error) {
					// Continue to check individual steps even if Institution data fetch fails
					// No console.error to avoid unnecessary logs
				}

				// If Institution setup isn't marked complete, check individual step statuses
				const updatedSteps = await Promise.all(
					steps.map(async (step) => {
						try {
							// Replace {InstitutionId} placeholder in endpoint with actual InstitutionId
							// Remove /api prefix from all endpoints
							const endpoint = step.endpoint_to_check
								.replace("{InstitutionId}", InstitutionId)
								.replace(/^\/api\//, "");

							try {
								const response = await apiRequest.get(endpoint);
								const data = response.data;

								// Special handling for different step types
								switch (step.id) {
									case "add-staff":
										// Staff step requires at least 3 users
										const isStaffCompleted = Array.isArray(data) && data.length >= 3;

										return {
											...step,
											status: isStaffCompleted ? "completed" : "pending",
										};

									case "create-products":
										// Products step is completed if there are any products
										const hasProducts = Array.isArray(data.results) && data.results.length > 0;

										return {
											...step,
											status: hasProducts ? "completed" : "pending",
										};

									case "approve-products":
										// Check if there are any unapproved products
										if (Array.isArray(data.results) && data.results.length > 0) {
											// Find products that need approval (is_approved is false)
											const unapprovedProducts = data.results.filter(
												(product: { is_approved: boolean }) => product.is_approved === false,
											);

											if (unapprovedProducts.length === 0) {
												// All products are approved
												return {
													...step,
													status: "completed",
												};
											} else if (unapprovedProducts.length > 0) {
												// If there are unapproved products, update the link to point to the first one
												const productId = unapprovedProducts[0].id;

												return {
													...step,
													to_complete_step_page_link: `/inventory/products/${productId}`,
													status: "pending",
												};
											}
										}

										return { ...step, status: "pending" };

									case "create-suppliers":
										// Suppliers step is completed if there are any suppliers
										const hasSuppliers = Array.isArray(data) && data.length > 0;

										return {
											...step,
											status: hasSuppliers ? "completed" : "pending",
										};

									case "create-purchase-orders":
										// Purchase orders step is completed if there are any orders
										const hasOrders = Array.isArray(data.results) && data.results.length > 0;

										return {
											...step,
											status: hasOrders ? "completed" : "pending",
										};

									case "approve-purchase-orders":
										// Check if there are any pending purchase orders
										if (Array.isArray(data.results) && data.results.length > 0) {
											// Find orders that need approval (order_status is PENDING)
											const pendingOrders = data.results.filter(
												(order: { order_status: string }) => order.order_status === "PENDING",
											);

											if (pendingOrders.length === 0) {
												// All orders are approved/completed
												return {
													...step,
													status: "completed",
												};
											} else if (pendingOrders.length > 0) {
												// If there are pending orders, update the link to point to the first one
												const orderId = pendingOrders[0].id;

												return {
													...step,
													to_complete_step_page_link: `/inventory/purchase-orders/${orderId}`,
													status: "pending",
												};
											}
										}

										return { ...step, status: "pending" };

									case "move-stock-to-branches":
										// Branch stock movement step is completed if there are any movements
										const hasBranchMovements = Array.isArray(data) && data.length > 0;

										return {
											...step,
											status: hasBranchMovements ? "completed" : "pending",
										};

									case "approve-branch-stock":
										// Check if there are any pending branch stock movements
										if (Array.isArray(data) && data.length > 0) {
											// Find movements that need approval (status is pending)
											const pendingMovements = data.filter(
												(movement) => movement.status === "pending",
											);

											if (pendingMovements.length === 0) {
												// All movements are approved/allocated
												return {
													...step,
													status: "completed",
												};
											} else if (pendingMovements.length > 0) {
												// If there are pending movements, update the link to point to the first one
												const movementId = pendingMovements[0].id;

												return {
													...step,
													to_complete_step_page_link: `/main-branch-allocations/${movementId}`,
													status: "pending",
												};
											}
										}

										return { ...step, status: "pending" };

									case "move-stock-to-shelf":
										// Shelf stock movement step is completed if there are any movements
										const hasShelfMovements = Array.isArray(data) && data.length > 0;

										return {
											...step,
											status: hasShelfMovements ? "completed" : "pending",
										};

									case "approve-shelf-stock":
										// Check if there are any pending shelf stock movements
										if (Array.isArray(data) && data.length > 0) {
											// Find movements that need approval (status is pending)
											const pendingMovements = data.filter(
												(movement) => movement.status === "pending",
											);

											if (pendingMovements.length === 0) {
												// All movements are approved/allocated
												return {
													...step,
													status: "completed",
												};
											} else if (pendingMovements.length > 0) {
												// If there are pending movements, update the link to point to the first one
												const movementId = pendingMovements[0].id;

												return {
													...step,
													to_complete_step_page_link: `/branches/stock-to-shelf/allocations/${movementId}`,
													status: "pending",
												};
											}
										}

										return { ...step, status: "pending" };

									default:
										// Default handling for other steps
										const isCompleted = Array.isArray(data) && data.length > 0;

										return {
											...step,
											status: isCompleted ? "completed" : "pending",
										};
								}
							} catch (error) {
								return { ...step, status: "pending" };
							}
						} catch (error) {
							return step;
						}
					}),
				);

				// After checking all steps, see if all required steps are complete
				const allRequiredStepsComplete = updatedSteps.every(
					(step) => step.status === "completed" || step.id === "point-of-sale",
				);

				// If all required steps are complete, automatically mark the Institution setup as complete
				if (allRequiredStepsComplete) {
					try {
						const formData = new FormData();

						formData.append("Institution_setup", "true");

						await apiRequest.patch(`institution/${InstitutionId}/`, formData);

						setInstitutionSetupComplete(true);
						setSteps(updatedSteps as SetupStep[]);
						setIsLoading(false);

						return;
					} catch (error) {
						// Continue with normal flow if the update fails
						// No console.error to avoid unnecessary logs
					}
				}

				// Find the first incomplete step and mark it as in-progress
				const firstIncompleteStepIndex = updatedSteps.findIndex(
					(step) => step.status !== "completed" && step.id !== "point-of-sale",
				);

				if (firstIncompleteStepIndex !== -1) {
					updatedSteps[firstIncompleteStepIndex] = {
						...updatedSteps[firstIncompleteStepIndex],
						status: "in-progress",
					};
				}

				setSteps(updatedSteps as SetupStep[]);
				setIsLoading(false);
			} catch (error) {
				// Minimize unnecessary error logging
				setIsLoading(false);
			}
		};

		checkSetupStatus();
	}, [InstitutionId]);

	// Calculate completion percentage
	const getCompletionPercentage = () => {
		if (InstitutionSetupComplete) return 100;

		// Exclude the optional POS step from calculation
		const requiredSteps = steps.filter((step) => step.id !== "point-of-sale");
		const completedSteps = requiredSteps.filter((step) => step.status === "completed");

		return Math.round((completedSteps.length / requiredSteps.length) * 100);
	};

	// Check if setup is complete
	const isSetupComplete = () => {
		if (InstitutionSetupComplete) return true;

		// All required steps must be completed (POS is optional)
		return steps.every((step) => step.status === "completed" || step.id === "point-of-sale");
	};

	// Get the next incomplete step
	const getNextStep = () => {
		if (InstitutionSetupComplete) return null;

		return steps.find((step) => step.status !== "completed" && step.id !== "point-of-sale");
	};

	// Mark setup as complete
	const markSetupAsComplete = async () => {
		if (!InstitutionId) return;

		try {
			const formData = new FormData();

			formData.append("Institution_setup", "true");

			await apiRequest.patch(`institution/${InstitutionId}/`, formData);
			setInstitutionSetupComplete(true);

			return true;
		} catch (error) {
			return false;
		}
	};

	return {
		steps,
		isLoading,
		InstitutionSetupComplete,
		getCompletionPercentage,
		isSetupComplete,
		getNextStep,
		markSetupAsComplete,
	};
}
