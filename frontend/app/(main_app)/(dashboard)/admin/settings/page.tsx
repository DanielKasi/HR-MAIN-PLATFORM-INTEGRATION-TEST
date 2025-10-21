"use client";

import type React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

import { Icon } from "@iconify/react";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { ArrowLeft } from "lucide-react";

import { KYCDocuments } from "@/components/settings/kycdocuments";
import { InstitutionSettings } from "@/components/settings/institution-settings";
import { PenaltyConfigurations } from "@/components/settings/penalty-configurations";
import { BranchPenaltyConfigurations } from "@/components/settings/branch-penalty-configurations";
import { InstitutionSpotcheckConfigurations } from "@/components/settings/institution-spotcheck-configurations";
import { BranchSpotcheckConfigurations } from "@/components/settings/branch-spotcheck-configurations";
import { LocationComparisonConfigurations } from "@/components/settings/location-comparison-configurations";
import { InstitutionBonusPointSettingsTable } from "@/components/performance/bonus-points/institution-bonus-points-settings-table";
import { Integrations } from "@/components/integrations/integrations";
import InstitutionOwnershipTransferTab from "../ownership-transfer/page";

export default function SettingsPage() {
	const [activeTab, setActiveTab] = useState<
		| "institution"
		| "kyc"
		| "penalties"
		| "branch_penalties"
		| "location_comparison"
		| "institution_spotcheck"
		| "branch_spotcheck"
		| "bonus_point_settings"
		| "integrations"
		| "superuser_transfer"
	>("institution");
	const [confirmationDialog, setConfirmationDialog] = useState({
		isOpen: false,
		title: "",
		description: "",
		onConfirm: () => {},
	});
	const [documentsRefreshTrigger, setDocumentsRefreshTrigger] = useState(0);
	const searchParams = useSearchParams();
	const destinationTabParam = searchParams.get("tab") as typeof activeTab;
	const router = useRouter();

	const renderKYCDocuments = () => (
		<KYCDocuments
			documentsRefreshTrigger={documentsRefreshTrigger}
			onDocumentChange={() => setDocumentsRefreshTrigger((prev) => prev + 1)}
		/>
	);

	useEffect(() => {
		if (searchParams && destinationTabParam === "superuser_transfer") {
			setActiveTab("superuser_transfer");
		}
	}, [searchParams]);

	const renderInstitutionSettings = () => <InstitutionSettings />;

	const renderPenaltyConfigurations = () => <PenaltyConfigurations />;

	const renderBranchPenaltyConfigurations = () => <BranchPenaltyConfigurations />;

	const renderInstitutionSpotcheckConfigurations = () => <InstitutionSpotcheckConfigurations />;

	const renderBranchSpotcheckConfigurations = () => <BranchSpotcheckConfigurations />;

	const renderLocationComparisonConfigurations = () => <LocationComparisonConfigurations />;

	const renderBonusPointSettings = () => <InstitutionBonusPointSettingsTable />;

	const renderIntegrations = () => <Integrations />;

	const renderOwnershipTransfer = () => <InstitutionOwnershipTransferTab />;

	return (
		<div className="min-h-screen bg-gray-50 rounded-lg">
			{/* Header */}
			<div className="bg-white border-gray-200 px-4 md:px-6 py-4">
				<div className="flex items-center gap-4">
					<Button
						size="sm"
						className="border rounded-full h-10 w-10 flex items-center justify-center"
						variant="outline"
						onClick={() => router.push("/admin")}
					>
						<ArrowLeft />
					</Button>
					<h1 className="text-xl md:text-2xl font-bold text-gray-900">Settings</h1>
				</div>
			</div>

			<div className="flex flex-col lg:flex-row">
				{/* Left Sub-navigation Panel */}
				<div className="lg:flex-[3.0] bg-white border-r border-gray-200 lg:min-h-screen">
					<div className="p-4 md:p-6">
						<div className="flex lg:flex-col space-x-2 lg:space-x-0 lg:space-y-2 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
							<button
								onClick={() => setActiveTab("institution")}
								className={`flex-shrink-0 lg:w-full flex items-start space-x-3 p-3 lg:p-4 rounded-lg text-left transition-colors ${
									activeTab === "institution"
										? "bg-red-50 border border-red-200"
										: "hover:bg-gray-50"
								}`}
							>
								<Icon
									icon="hugeicons:building-06"
									className={`!w-6 !h-6 ${activeTab === "institution" ? "text-primary" : "text-gray-900"}`}
								/>
								<div className="whitespace-nowrap lg:whitespace-normal">
									<div
										className={`font-medium text-sm lg:text-base ${
											activeTab === "institution" ? "text-primary" : "text-gray-900"
										}`}
									>
										Institution Settings
									</div>
									<div
										className={`text-xs lg:text-sm hidden lg:block ${
											activeTab === "institution" ? "text-[#6B7280]" : "text-[#6B7280]"
										}`}
									>
										Manage details of your institution.
									</div>
								</div>
							</button>

							<button
								onClick={() => setActiveTab("superuser_transfer")}
								className={`flex-shrink-0 lg:w-full flex items-start space-x-3 p-3 lg:p-4 rounded-lg text-left transition-colors ${
									activeTab === "superuser_transfer"
										? "bg-red-50 border border-red-200"
										: "hover:bg-gray-50"
								}`}
							>
								<Icon
									icon="hugeicons:crown-03"
									className={`!w-6 !h-6 ${activeTab === "superuser_transfer" ? "text-primary" : "text-gray-900"}`}
								/>
								<div className="whitespace-nowrap lg:whitespace-normal">
									<div
										className={`font-medium text-sm lg:text-base ${
											activeTab === "superuser_transfer" ? "text-primary" : "text-gray-900"
										}`}
									>
										Institution Ownership Transfer
									</div>
									<div
										className={`text-xs lg:text-sm hidden lg:block ${
											activeTab === "superuser_transfer" ? "text-[#6B7280]" : "text-[#6B7280]"
										}`}
									>
										Change the super user of this institution, who will have full previledges
									</div>
								</div>
							</button>

							<button
								onClick={() => setActiveTab("kyc")}
								className={`flex-shrink-0 lg:w-full flex items-start space-x-3 p-3 lg:p-4 rounded-lg text-left transition-colors ${
									activeTab === "kyc" ? "bg-red-50 border border-red-200" : "hover:bg-gray-50"
								}`}
							>
								<Icon
									icon="hugeicons:document-attachment"
									className={`!w-6 !h-6 ${activeTab === "kyc" ? "text-primary" : "text-gray-500"}`}
								/>
								<div className="whitespace-nowrap lg:whitespace-normal">
									<div
										className={`font-medium text-sm lg:text-base ${
											activeTab === "kyc" ? "text-primary" : "text-gray-900"
										}`}
									>
										KYC Documents
									</div>
									<div
										className={`text-xs lg:text-sm hidden lg:block ${
											activeTab === "kyc" ? "text-[#6B7280]" : "text-[#6B7280]"
										}`}
									>
										Submit and review your KYC files
									</div>
								</div>
							</button>

							<button
								onClick={() => setActiveTab("penalties")}
								className={`flex-shrink-0 lg:w-full flex items-start space-x-3 p-3 lg:p-4 rounded-lg text-left transition-colors ${
									activeTab === "penalties" ? "bg-red-50 border border-red-200" : "hover:bg-gray-50"
								}`}
							>
								<Icon
									icon="hugeicons:settings-02"
									className={`!w-6 !h-6 ${activeTab === "penalties" ? "text-primary" : "text-gray-500"}`}
								/>
								<div className="whitespace-nowrap lg:whitespace-normal">
									<div
										className={`font-medium text-sm lg:text-base ${
											activeTab === "penalties" ? "text-primary" : "text-gray-900"
										}`}
									>
										Institution Penalties
									</div>
									<div
										className={`text-xs lg:text-sm hidden lg:block ${
											activeTab === "penalties" ? "text-[#6B7280]" : "text-[#6B7280]"
										}`}
									>
										Manage institution-level penalty settings
									</div>
								</div>
							</button>

							<button
								onClick={() => setActiveTab("branch_penalties")}
								className={`flex-shrink-0 lg:w-full flex items-start space-x-3 p-3 lg:p-4 rounded-lg text-left transition-colors ${
									activeTab === "branch_penalties"
										? "bg-red-50 border border-red-200"
										: "hover:bg-gray-50"
								}`}
							>
								<Icon
									icon="hugeicons:building-04"
									className={`!w-6 !h-6 ${activeTab === "branch_penalties" ? "text-primary" : "text-gray-500"}`}
								/>
								<div className="whitespace-nowrap lg:whitespace-normal">
									<div
										className={`font-medium text-sm lg:text-base ${
											activeTab === "branch_penalties" ? "text-primary" : "text-gray-900"
										}`}
									>
										Branch Penalties
									</div>
									<div
										className={`text-xs lg:text-sm hidden lg:block ${
											activeTab === "branch_penalties" ? "text-[#6B7280]" : "text-[#6B7280]"
										}`}
									>
										Manage branch-specific penalty settings
									</div>
								</div>
							</button>

							<button
								onClick={() => setActiveTab("location_comparison")}
								className={`flex-shrink-0 lg:w-full flex items-start space-x-3 p-3 lg:p-4 rounded-lg text-left transition-colors ${
									activeTab === "location_comparison"
										? "bg-red-50 border border-red-200"
										: "hover:bg-gray-50"
								}`}
							>
								<Icon
									icon="hugeicons:location-01"
									className={`!w-6 !h-6 ${activeTab === "location_comparison" ? "text-primary" : "text-gray-500"}`}
								/>
								<div className="whitespace-nowrap lg:whitespace-normal">
									<div
										className={`font-medium text-sm lg:text-base ${
											activeTab === "location_comparison" ? "text-primary" : "text-gray-900"
										}`}
									>
										Location Comparison
									</div>
									<div
										className={`text-xs lg:text-sm hidden lg:block ${
											activeTab === "location_comparison" ? "text-[#6B7280]" : "text-[#6B7280]"
										}`}
									>
										Manage branch location comparison settings
									</div>
								</div>
							</button>

							<button
								onClick={() => setActiveTab("institution_spotcheck")}
								className={`flex-shrink-0 lg:w-full flex items-start space-x-3 p-3 lg:p-4 rounded-lg text-left transition-colors ${
									activeTab === "institution_spotcheck"
										? "bg-red-50 border border-red-200"
										: "hover:bg-gray-50"
								}`}
							>
								<Icon
									icon="hugeicons:clock-01"
									className={`!w-6 !h-6 ${activeTab === "institution_spotcheck" ? "text-primary" : "text-gray-500"}`}
								/>
								<div className="whitespace-nowrap lg:whitespace-normal">
									<div
										className={`font-medium text-sm lg:text-base ${
											activeTab === "institution_spotcheck" ? "text-primary" : "text-gray-900"
										}`}
									>
										Institution Spotcheck
									</div>
									<div
										className={`text-xs lg:text-sm hidden lg:block ${
											activeTab === "institution_spotcheck" ? "text-[#6B7280]" : "text-[#6B7280]"
										}`}
									>
										Manage institution-level spotcheck settings
									</div>
								</div>
							</button>

							<button
								onClick={() => setActiveTab("branch_spotcheck")}
								className={`flex-shrink-0 lg:w-full flex items-start space-x-3 p-3 lg:p-4 rounded-lg text-left transition-colors ${
									activeTab === "branch_spotcheck"
										? "bg-red-50 border border-red-200"
										: "hover:bg-gray-50"
								}`}
							>
								<Icon
									icon="hugeicons:clock-02"
									className={`!w-6 !h-6 ${activeTab === "branch_spotcheck" ? "text-primary" : "text-gray-500"}`}
								/>
								<div className="whitespace-nowrap lg:whitespace-normal">
									<div
										className={`font-medium text-sm lg:text-base ${
											activeTab === "branch_spotcheck" ? "text-primary" : "text-gray-900"
										}`}
									>
										Branch Spotcheck
									</div>
									<div
										className={`text-xs lg:text-sm hidden lg:block ${
											activeTab === "branch_spotcheck" ? "text-[#6B7280]" : "text-[#6B7280]"
										}`}
									>
										Manage branch-specific spotcheck settings
									</div>
								</div>
							</button>

							<button
								onClick={() => setActiveTab("bonus_point_settings")}
								className={`flex-shrink-0 lg:w-full flex items-start space-x-3 p-3 lg:p-4 rounded-lg text-left transition-colors ${
									activeTab === "bonus_point_settings"
										? "bg-red-50 border border-red-200"
										: "hover:bg-gray-50"
								}`}
							>
								<Icon
									icon="hugeicons:award-02"
									className={`!w-6 !h-6 ${activeTab === "bonus_point_settings" ? "text-primary" : "text-gray-500"}`}
								/>
								<div className="whitespace-nowrap lg:whitespace-normal">
									<div
										className={`font-medium text-sm lg:text-base ${
											activeTab === "bonus_point_settings" ? "text-primary" : "text-gray-900"
										}`}
									>
										Bonus Point Settings
									</div>
									<div
										className={`text-xs lg:text-sm hidden lg:block ${
											activeTab === "bonus_point_settings" ? "text-[#6B7280]" : "text-[#6B7280]"
										}`}
									>
										Manage institution-level bonus point settings
									</div>
								</div>
							</button>

							<button
								onClick={() => setActiveTab("integrations")}
								className={`flex-shrink-0 lg:w-full flex items-start space-x-3 p-3 lg:p-4 rounded-lg text-left transition-colors ${
									activeTab === "integrations"
										? "bg-red-50 border border-red-200"
										: "hover:bg-gray-50"
								}`}
							>
								<Icon
									icon="hugeicons:plug-01"
									className={`!w-6 !h-6 ${activeTab === "integrations" ? "text-primary" : "text-gray-500"}`}
								/>
								<div className="whitespace-nowrap lg:whitespace-normal">
									<div
										className={`font-medium text-sm lg:text-base ${
											activeTab === "integrations" ? "text-primary" : "text-gray-900"
										}`}
									>
										Integrations
									</div>
									<div
										className={`text-xs lg:text-sm hidden lg:block ${
											activeTab === "integrations" ? "text-[#6B7280]" : "text-[#6B7280]"
										}`}
									>
										Configure third-party service integrations
									</div>
								</div>
							</button>
						</div>
					</div>
				</div>

				<div className="lg:flex-[7.0] p-4 md:p-6 bg-white">
					{activeTab === "institution"
						? renderInstitutionSettings()
						: activeTab === "kyc"
							? renderKYCDocuments()
							: activeTab === "penalties"
								? renderPenaltyConfigurations()
								: activeTab === "branch_penalties"
									? renderBranchPenaltyConfigurations()
									: activeTab === "location_comparison"
										? renderLocationComparisonConfigurations()
										: activeTab === "institution_spotcheck"
											? renderInstitutionSpotcheckConfigurations()
											: activeTab === "branch_spotcheck"
												? renderBranchSpotcheckConfigurations()
												: activeTab === "bonus_point_settings"
													? renderBonusPointSettings()
													: activeTab === "integrations"
														? renderIntegrations()
														: activeTab === "superuser_transfer"
															? renderOwnershipTransfer()
															: renderBonusPointSettings()}
				</div>
			</div>

			<ConfirmationDialog
				isOpen={confirmationDialog.isOpen}
				onClose={() => setConfirmationDialog((prev) => ({ ...prev, isOpen: false }))}
				onConfirm={confirmationDialog.onConfirm}
				title={confirmationDialog.title}
				description={confirmationDialog.description}
				confirmText="Confirm"
				cancelText="Cancel"
			/>
		</div>
	);
}
