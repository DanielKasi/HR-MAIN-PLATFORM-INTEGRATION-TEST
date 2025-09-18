// components/settings/meetings-integrations.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Icon } from "@iconify/react";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { MEETINGS_INTEGRATION_API } from "@/lib/utils";
import type { IMeetingIntegration, IMeetingIntegrationFormData } from "@/types/types.utils";

const platformConfigs = [
	{
		value: "zoom" as const,
		label: "Zoom",
		icon: "logos:zoom",
		description: "Video communications platform",
	},
	{
		value: "microsoft_teams" as const,
		label: "Microsoft Teams",
		icon: "logos:microsoft-teams",
		description: "Collaboration platform",
	},
	{
		value: "google_meet" as const,
		label: "Google Meet",
		icon: "logos:google-meet",
		description: "Secure video meetings",
	},
] as const;

export const MeetingsIntegrations: React.FC = () => {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [integrations, setIntegrations] = useState<IMeetingIntegration[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [formData, setFormData] = useState<IMeetingIntegrationFormData>({
		is_active: true,
		platform: "zoom",
		api_key: "",
		api_secret: "",
		oauth_token: "",
		oauth_refresh_token: "",
		tenant_id: "",
	});

	useEffect(() => {
		if (currentInstitution) {
			loadIntegrations();
		}
	}, [currentInstitution]);

	const loadIntegrations = async () => {
		try {
			setLoading(true);
			const response = await MEETINGS_INTEGRATION_API.getPaginated({ page: 1 });
			setIntegrations(response.results || []);
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to load integrations" });
		} finally {
			setLoading(false);
		}
	};

	const handlePlatformSelect = (platform: typeof formData.platform) => {
		setFormData((prev) => ({ ...prev, platform }));
	};

	const handleInputChange = (field: keyof IMeetingIntegrationFormData, value: string | boolean) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async () => {
		if (!currentInstitution) return;

		try {
			setSaving(true);
			const submitData: IMeetingIntegrationFormData = {
				...formData,
				// institution is handled backend-side, or add if needed
			};

			let result: IMeetingIntegration;
			if (editingId) {
				result = await MEETINGS_INTEGRATION_API.update({
					integrationId: editingId,
					data: submitData,
				});
			} else {
				result = await MEETINGS_INTEGRATION_API.create({ data: submitData });
			}

			setIntegrations((prev) =>
				editingId ? prev.map((i) => (i.id === editingId ? result : i)) : [...prev, result],
			);
			resetForm();
			showSuccessToast(
				editingId ? "Integration updated successfully" : "Integration created successfully",
			);
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to save integration" });
		} finally {
			setSaving(false);
		}
	};

	const handleEdit = (integration: IMeetingIntegration) => {
		setEditingId(integration.id);
		setFormData({
			is_active: integration.is_active,
			platform: integration.platform,
			api_key: integration.api_key || "",
			api_secret: integration.api_secret || "",
			oauth_token: integration.oauth_token || "",
			oauth_refresh_token: integration.oauth_refresh_token || "",
			tenant_id: integration.tenant_id || "",
		});
	};

	const handleDelete = async (id: number) => {
		try {
			await MEETINGS_INTEGRATION_API.delete({ integrationId: id });
			setIntegrations((prev) => prev.filter((i) => i.id !== id));
			showSuccessToast("Integration deleted successfully");
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to delete integration" });
		}
	};

	const resetForm = () => {
		setEditingId(null);
		setFormData({
			is_active: true,
			platform: "zoom",
			api_key: "",
			api_secret: "",
			oauth_token: "",
			oauth_refresh_token: "",
			tenant_id: "",
		});
	};

	if (loading) {
		return <div className="flex items-center justify-center h-64">Loading...</div>;
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold">Meeting Integrations</h2>
					<p className="text-muted-foreground">
						Configure integrations with video conferencing platforms
					</p>
				</div>
				<Button onClick={resetForm} variant={editingId ? "outline" : "default"}>
					{editingId ? "Cancel Edit" : "Add New Integration"}
				</Button>
			</div>

			<Separator />

			{/* Form Card */}
			<Card>
				<CardHeader>
					<CardTitle>{editingId ? "Edit Integration" : "New Integration"}</CardTitle>
					<CardDescription>Configure your meeting platform settings</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Platform Selection */}
					<div>
						<Label className="text-sm font-medium mb-3 block">Select Platform</Label>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							{platformConfigs.map((config) => (
								<Card
									key={config.value}
									className={`cursor-pointer border-2 transition-all p-4 text-center ${
										formData.platform === config.value
											? "border-primary bg-primary/5"
											: "border-border hover:border-gray-300"
									}`}
									onClick={() => handlePlatformSelect(config.value)}
								>
									<Icon icon={config.icon} className="w-12 h-12 mx-auto mb-3 text-gray-700" />
									<h3 className="font-semibold">{config.label}</h3>
									<p className="text-xs text-muted-foreground">{config.description}</p>
								</Card>
							))}
						</div>
					</div>

					<Separator />

					{/* Form Fields */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<Label htmlFor="tenant_id">Tenant ID</Label>
							<Input
								id="tenant_id"
								placeholder="Enter your platform tenant ID"
								value={formData.tenant_id || ""}
								onChange={(e) => handleInputChange("tenant_id", e.target.value)}
							/>
						</div>

						<div className="flex items-center space-x-2">
							<Switch
								id="is_active"
								checked={formData.is_active}
								onCheckedChange={(checked) => handleInputChange("is_active", checked)}
							/>
							<Label htmlFor="is_active" className="cursor-pointer">
								Active
							</Label>
						</div>

						{/* Additional fields - show conditionally if needed, but for now all */}
						<div>
							<Label htmlFor="api_key">API Key (Optional)</Label>
							<Input
								id="api_key"
								placeholder="Enter API key"
								value={formData.api_key || ""}
								onChange={(e) => handleInputChange("api_key", e.target.value)}
							/>
						</div>

						<div>
							<Label htmlFor="api_secret">API Secret (Optional)</Label>
							<Input
								id="api_secret"
								type="password"
								placeholder="Enter API secret"
								value={formData.api_secret || ""}
								onChange={(e) => handleInputChange("api_secret", e.target.value)}
							/>
						</div>

						<div>
							<Label htmlFor="oauth_token">OAuth Token (Optional)</Label>
							<Input
								id="oauth_token"
								placeholder="Enter OAuth token"
								value={formData.oauth_token || ""}
								onChange={(e) => handleInputChange("oauth_token", e.target.value)}
							/>
						</div>

						<div>
							<Label htmlFor="oauth_refresh_token">OAuth Refresh Token (Optional)</Label>
							<Input
								id="oauth_refresh_token"
								placeholder="Enter refresh token"
								value={formData.oauth_refresh_token || ""}
								onChange={(e) => handleInputChange("oauth_refresh_token", e.target.value)}
							/>
						</div>
					</div>

					<div className="flex justify-end">
						<Button
							onClick={handleSubmit}
							disabled={saving || !formData.platform || !formData.tenant_id}
						>
							{saving ? "Saving..." : editingId ? "Update Integration" : "Create Integration"}
						</Button>
					</div>
				</CardContent>
			</Card>

			<Separator />

			{/* Existing Integrations List */}
			<Card>
				<CardHeader>
					<CardTitle>Existing Integrations</CardTitle>
					<CardDescription>Manage your configured meeting platforms</CardDescription>
				</CardHeader>
				<CardContent>
					{integrations.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">
							<Icon icon="hugeicons:plug-01" className="w-8 h-8 mx-auto mb-2 opacity-50" />
							<p>No integrations configured yet</p>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{integrations.map((integration) => {
								const config = platformConfigs.find((c) => c.value === integration.platform);
								return (
									<Card key={integration.id} className="relative">
										<div className="absolute top-2 right-2 flex gap-1">
											<Badge variant={integration.is_active ? "default" : "secondary"}>
												{integration.is_active ? "Active" : "Inactive"}
											</Badge>
										</div>
										<CardContent className="pt-6 pb-4">
											<Icon
												icon={config?.icon || "hugeicons:plug-01"}
												className="w-10 h-10 mx-auto mb-2 text-primary"
											/>
											<h3 className="font-semibold text-center">
												{config?.label || integration.platform}
											</h3>
											<p className="text-xs text-muted-foreground text-center mb-4">
												{integration.tenant_id
													? `Tenant: ${integration.tenant_id.substring(0, 8)}...`
													: "No tenant ID"}
											</p>
											<div className="flex gap-2 justify-center">
												<Button size="sm" variant="outline" onClick={() => handleEdit(integration)}>
													Edit
												</Button>
												<Button
													size="sm"
													variant="destructive"
													onClick={() => handleDelete(integration.id)}
												>
													Delete
												</Button>
											</div>
										</CardContent>
									</Card>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
};
