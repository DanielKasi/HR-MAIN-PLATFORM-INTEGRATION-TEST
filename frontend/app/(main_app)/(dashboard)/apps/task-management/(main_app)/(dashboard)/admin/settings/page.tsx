"use client";

import type React from "react";
import { useModuleNavigation } from "@/hooks/use-module-navigation";
import { useState } from "react";
import { Button } from "@/platform/v1/components";

import { Icon } from "@iconify/react";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { ArrowLeft } from "lucide-react";
import { InstitutionSettings } from "@/components/settings/institution-settings";

import { Integrations } from "@/components/integrations/integrations";

export default function SettingsPage() {
	const [activeTab, setActiveTab] = useState<"institution" | "integrations">("institution");
	const [confirmationDialog, setConfirmationDialog] = useState({
		isOpen: false,
		title: "",
		description: "",
		onConfirm: () => {},
	});

	const router = useModuleNavigation("/apps/task-management");

	const renderInstitutionSettings = () => <InstitutionSettings />;

	const renderIntegrations = () => <Integrations />;

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
								className={`flex-shrink-0 lg:w-full flex items-center space-x-3 p-3 lg:p-4 rounded-lg text-left transition-colors ${
									activeTab === "institution"
										? "bg-red-50 border border-red-200"
										: "hover:bg-gray-50"
								}`}
							>
								<Icon
									icon="hugeicons:building-06"
									className={`w-5 h-5 ${activeTab === "institution" ? "text-primary" : "text-gray-900"}`}
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
								onClick={() => setActiveTab("integrations")}
								className={`flex-shrink-0 lg:w-full flex items-center space-x-3 p-3 lg:p-4 rounded-lg text-left transition-colors ${
									activeTab === "integrations"
										? "bg-red-50 border border-red-200"
										: "hover:bg-gray-50"
								}`}
							>
								<Icon
									icon="hugeicons:plug-01"
									className={`w-5 h-5 ${activeTab === "integrations" ? "text-primary" : "text-gray-500"}`}
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
					{activeTab === "institution" ? renderInstitutionSettings() : renderIntegrations()}
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
