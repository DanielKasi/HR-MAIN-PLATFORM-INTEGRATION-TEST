"use client";

import type {
	IInstitutionSpotCheckSetting,
	IInstitutionSpotCheckSettingFormData,
} from "@/types/types.utils";

import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useSelector } from "react-redux";

import { SpotcheckConfigModal } from "./spotcheck-config-modal";

import { Button } from "@/components/ui/button";
import { spotcheckAPI, showErrorToast } from "@/lib/utils";
import { selectSelectedInstitution } from "@/store/auth/selectors";

export const InstitutionSpotcheckConfigurations = () => {
	const institution = useSelector(selectSelectedInstitution);

	const [institutionSpotcheckSetting, setInstitutionSpotcheckSetting] =
		useState<IInstitutionSpotCheckSetting | null>(null);
	const [institutionSpotcheckFormData, setInstitutionSpotcheckFormData] =
		useState<IInstitutionSpotCheckSettingFormData>({
			lower_threshold: 0,
			upper_threshold: 0,
			expires_after_minutes: 0,
			late_starts_after_minutes: 0,
			institution: institution?.id || 0,
		});
	const [isInstitutionSpotcheckFormOpen, setIsInstitutionSpotcheckFormOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	// Institution Spotcheck Configuration helper functions
	const handleInstitutionSpotcheckInputChange = (
		field: keyof IInstitutionSpotCheckSettingFormData,
		value: number,
	) => {
		setInstitutionSpotcheckFormData((prev) => ({ ...prev, [field]: value }));
	};

	const resetInstitutionSpotcheckForm = () => {
		setInstitutionSpotcheckFormData({
			lower_threshold: 0,
			upper_threshold: 0,
			expires_after_minutes: 0,
			late_starts_after_minutes: 0,
			institution: institution?.id || 0,
		});
		setIsInstitutionSpotcheckFormOpen(false);
	};

	const handleCreateInstitutionSpotcheckConfig = () => {
		if (institutionSpotcheckSetting) {
			// Prefill form with existing data when updating
			setInstitutionSpotcheckFormData({
				lower_threshold: institutionSpotcheckSetting.lower_threshold,
				upper_threshold: institutionSpotcheckSetting.upper_threshold,
				expires_after_minutes: institutionSpotcheckSetting.expires_after_minutes,
				late_starts_after_minutes: institutionSpotcheckSetting.late_starts_after_minutes,
				institution: institution?.id || 0,
			});
		} else {
			// Reset form for new configuration
			resetInstitutionSpotcheckForm();
		}
		setIsInstitutionSpotcheckFormOpen(true);
	};

	const handleSaveInstitutionSpotcheckConfig = async () => {
		if (!institution?.id) return;

		setIsLoading(true);
		try {
			if (institutionSpotcheckSetting) {
				await spotcheckAPI.CONFIGS.INSTITUTION.update({
					institutionId: institution.id,
					data: institutionSpotcheckFormData,
				});
				toast.success("Institution spotcheck configuration updated successfully");
			} else {
				await spotcheckAPI.CONFIGS.INSTITUTION.create({
					institutionId: institution.id,
					data: institutionSpotcheckFormData,
				});
				toast.success("Institution spotcheck configuration created successfully");
			}
			resetInstitutionSpotcheckForm();
			// Refresh institution spotcheck setting
			await fetchInstitutionSpotcheckSetting();
		} catch (error) {
			showErrorToast({
				error,
				defaultMessage: "Failed to save institution spotcheck configuration",
			});
		} finally {
			setIsLoading(false);
		}
	};

	const fetchInstitutionSpotcheckSetting = async () => {
		if (!institution?.id) return;
		try {
			const setting = await spotcheckAPI.CONFIGS.INSTITUTION.getByInstitution({
				institutionId: institution.id,
			});

			setInstitutionSpotcheckSetting(setting);
			// Initialize form data with the fetched setting
			setInstitutionSpotcheckFormData({
				lower_threshold: setting.lower_threshold,
				upper_threshold: setting.upper_threshold,
				expires_after_minutes: setting.expires_after_minutes,
				late_starts_after_minutes: setting.late_starts_after_minutes,
				institution: institution.id,
			});
		} catch (error) {
			// Setting doesn't exist yet, that's okay
			setInstitutionSpotcheckSetting(null);
			// Reset form data to default values
			setInstitutionSpotcheckFormData({
				lower_threshold: 0,
				upper_threshold: 0,
				expires_after_minutes: 0,
				late_starts_after_minutes: 0,
				institution: institution.id,
			});
		}
	};

	useEffect(() => {
		if (institution) {
			fetchInstitutionSpotcheckSetting();
		}
	}, [institution]);

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between border-b pb-4">
				<h2 className="text-2xl font-bold text-gray-900">Institution Spotcheck Configuration</h2>
				<Button
					onClick={handleCreateInstitutionSpotcheckConfig}
					className="bg-primary hover:bg-primary text-white rounded-lg px-4 py-2 flex items-center space-x-2"
				>
					<Plus className="w-4 h-4" />
					<span>
						{institutionSpotcheckSetting ? "Update Configuration" : "Create Configuration"}
					</span>
				</Button>
			</div>

			{/* Current Configuration Display */}
			{institutionSpotcheckSetting ? (
				<div className="bg-green-50 border border-green-200 rounded-lg p-6">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center space-x-3">
							<Icon icon="hugeicons:check-circle" className="w-6 h-6 text-green-600" />
							<h3 className="text-lg font-semibold text-green-900">Current Configuration</h3>
						</div>
						{/* <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteInstitutionSpotcheckConfig}
              className="text-red-700 border-red-300 hover:bg-red-100"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button> */}
					</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="bg-white rounded-lg p-4 border border-green-200">
							<div className="text-sm text-gray-600 mb-1">
								Lower Threshold(Minimum spot check frequency)
							</div>
							<div className="text-lg font-semibold text-gray-900">
								{institutionSpotcheckSetting.lower_threshold}
							</div>
						</div>
						<div className="bg-white rounded-lg p-4 border border-green-200">
							<div className="text-sm text-gray-600 mb-1">
								Upper Threshold(Maximum spot check frequency)
							</div>
							<div className="text-lg font-semibold text-gray-900">
								{institutionSpotcheckSetting.upper_threshold}
							</div>
						</div>
						<div className="bg-white rounded-lg p-4 border border-green-200">
							<div className="text-sm text-gray-600 mb-1">Expires After</div>
							<div className="text-lg font-semibold text-gray-900">
								{institutionSpotcheckSetting.expires_after_minutes} minutes
							</div>
						</div>
						<div className="bg-white rounded-lg p-4 border border-green-200">
							<div className="text-sm text-gray-600 mb-1">
								Late Starts After(How long a respondant will be termed late)
							</div>
							<div className="text-lg font-semibold text-gray-900">
								{institutionSpotcheckSetting.late_starts_after_minutes}
							</div>
						</div>
					</div>
				</div>
			) : (
				<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
					<div className="flex items-center space-x-3">
						<Icon icon="hugeicons:warning-triangle" className="w-6 h-6 text-yellow-600" />
						<div>
							<h3 className="text-lg font-semibold text-yellow-900">No Configuration Found</h3>
							<p className="text-sm text-yellow-700">
								Create a spotcheck configuration for your institution to manage spotcheck settings.
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Institution Spotcheck Configuration Form Modal */}
			<SpotcheckConfigModal
				isOpen={isInstitutionSpotcheckFormOpen}
				onClose={resetInstitutionSpotcheckForm}
				onSave={handleSaveInstitutionSpotcheckConfig}
				formData={institutionSpotcheckFormData}
				onInputChange={handleInstitutionSpotcheckInputChange}
				isLoading={isLoading}
				isEditing={!!institutionSpotcheckSetting}
				title={
					institutionSpotcheckSetting
						? "Update Institution Spotcheck Configuration"
						: "Create Institution Spotcheck Configuration"
				}
			/>
		</div>
	);
};
