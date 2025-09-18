"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { Icon } from "@iconify/react";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { showErrorToast, showSuccessToast } from "@/lib/utils";
import { EMAIL_PROVIDER_CONFIG_API } from "@/lib/utils";
import type { IEmailProviderConfig, IEmailProviderConfigFormData } from "@/types/types.utils";
import PasswordInput from "@/components/common/inputs/password-input";
import FormattedNumberInput from "@/components/common/inputs/formatted-number-input";

const platformConfigs = [
	{
		value: "cpanel" as const,
		label: "cPanel",
		icon: "logos:cpanel",
		description: "Web hosting control panel",
	},
	{
		value: "google_workspace" as const,
		label: "Google Workspace",
		icon: "logos:google-workspace",
		description: "Productivity and collaboration tools",
	},
	{
		value: "microsoft_365" as const,
		label: "Microsoft 365",
		icon: "logos:microsoft",
		description: "Cloud-based productivity suite",
	},
] as const;

export const EmailsIntegrations: React.FC = () => {
	const currentInstitution = useSelector(selectSelectedInstitution);
	const [configs, setConfigs] = useState<IEmailProviderConfig[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [showForm, setShowForm] = useState(false);
	const [editingId, setEditingId] = useState<number | null>(null);
	const [formData, setFormData] = useState<IEmailProviderConfigFormData>({
		provider: "cpanel",
		domain: "",
		format_template: "{first_name}.{last_name}",
		quota: 500,
		port: "2083",
		admin_email: "",
		api_url: "",
		api_username: "",
		api_password: "",
		api_client_id: "",
		api_client_secret: "",
		api_token: "",
	});

	useEffect(() => {
		if (currentInstitution) {
			loadConfigs();
		}
	}, [currentInstitution]);

	const loadConfigs = async () => {
		try {
			setLoading(true);
			const response = await EMAIL_PROVIDER_CONFIG_API.getPaginated({ page: 1 });
			setConfigs(response.results || []);
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to load email configurations" });
		} finally {
			setLoading(false);
		}
	};

	const handlePlatformSelect = (provider: typeof formData.provider) => {
		setFormData((prev) => ({ ...prev, provider }));
	};

	const handleInputChange = (field: keyof IEmailProviderConfigFormData, value: string | number) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async () => {
		if (!currentInstitution) return;

		try {
			setSaving(true);
			const submitData: IEmailProviderConfigFormData = {
				...formData,
			};

			let result: IEmailProviderConfig;
			if (editingId) {
				result = await EMAIL_PROVIDER_CONFIG_API.update({ configId: editingId, data: submitData });
			} else {
				result = await EMAIL_PROVIDER_CONFIG_API.create({ data: submitData });
			}

			setConfigs((prev) =>
				editingId ? prev.map((c) => (c.id === editingId ? result : c)) : [...prev, result],
			);
			resetForm();
			showSuccessToast(
				editingId
					? "Email configuration updated successfully"
					: "Email configuration created successfully",
			);
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to save email configuration" });
		} finally {
			setSaving(false);
		}
	};

	const handleEdit = (config: IEmailProviderConfig) => {
		setEditingId(config.id);
		setFormData({
			provider: config.provider,
			domain: config.domain,
			format_template: config.format_template,
			quota: config.quota,
			port: config.port,
			admin_email: config.admin_email || "",
			api_url: config.api_url || "",
			api_username: config.api_username || "",
			api_password: config.api_password || "",
			api_client_id: config.api_client_id || "",
			api_client_secret: config.api_client_secret || "",
			api_token: config.api_token || "",
		});
		setShowForm(true);
	};

	const handleDelete = async (id: number) => {
		try {
			await EMAIL_PROVIDER_CONFIG_API.delete({ configId: id });
			setConfigs((prev) => prev.filter((c) => c.id !== id));
			showSuccessToast("Email configuration deleted successfully");
		} catch (error) {
			showErrorToast({ error, defaultMessage: "Failed to delete email configuration" });
		}
	};

	const resetForm = () => {
		setEditingId(null);
		setFormData({
			provider: "cpanel",
			domain: "",
			format_template: "{first_name}.{last_name}",
			quota: 500,
			port: "2083",
			admin_email: "",
			api_url: "",
			api_username: "",
			api_password: "",
			api_client_id: "",
			api_client_secret: "",
			api_token: "",
		});
		setShowForm(false);
	};

	const handleAddNew = () => {
		setEditingId(null);
		resetForm();
		setShowForm(!showForm);
	};

	if (loading) {
		return <div className="flex items-center justify-center h-64">Loading...</div>;
	}

	const renderEmailFields = () => {
		switch (formData.provider) {
			case "cpanel":
				return (
					<>
						<div>
							<Label htmlFor="domain">Domain *</Label>
							<Input
								id="domain"
								placeholder="e.g., example.com"
								value={formData.domain}
								onChange={(e) => handleInputChange("domain", e.target.value)}
								required
							/>
						</div>

						<div>
							<Label htmlFor="format_template">Email Format Template</Label>
							<Input
								id="format_template"
								placeholder="{first_name}.{last_name}"
								value={formData.format_template}
								onChange={(e) => handleInputChange("format_template", e.target.value)}
							/>
							<p className="text-xs text-muted-foreground mt-1">
								Use placeholders like {`{first_name}, {last_name}, {initials}, {fullname}`}{" "}
								(lowercased and sanitized)
							</p>
						</div>

						<div>
							<Label htmlFor="quota">Quota (MB)</Label>
							<Input
								id="quota"
								type="number"
								placeholder="500"
								value={formData.quota}
								onChange={(e) => handleInputChange("quota", parseInt(e.target.value) || 0)}
							/>
						</div>

						<div>
							<Label htmlFor="port">Port</Label>
							<FormattedNumberInput
								id="port"
								type="number"
								maxLength={6}
								placeholder="2083"
								value={Number(formData.port) || ""}
								onValueChange={(val) => handleInputChange("port", val)}
							/>
						</div>

						<div>
							<Label htmlFor="api_url">API URL</Label>
							<Input
								id="api_url"
								type="url"
								placeholder="https://yourserver.com:2083"
								value={formData.api_url}
								onChange={(e) => handleInputChange("api_url", e.target.value)}
							/>
						</div>

						<div>
							<Label htmlFor="api_password">API Password</Label>
							<PasswordInput
								id="api_password"
								label=""
								value={formData.api_password || ""}
								onChange={(val) => handleInputChange("api_password", val)}
							/>
						</div>

						<div className="md:col-span-2">
							<Label htmlFor="api_token">API Token</Label>
							<Input
								id="api_token"
								placeholder="Enter API token"
								value={formData.api_token}
								onChange={(e) => handleInputChange("api_token", e.target.value)}
							/>
						</div>
					</>
				);
			case "google_workspace":
			case "microsoft_365":
				return (
					<>
						<div>
							<Label htmlFor="domain">Domain *</Label>
							<Input
								id="domain"
								placeholder="e.g., example.com"
								value={formData.domain}
								onChange={(e) => handleInputChange("domain", e.target.value)}
								required
							/>
						</div>

						<div>
							<Label htmlFor="format_template">Email Format Template</Label>
							<Input
								id="format_template"
								placeholder="{first_name}.{last_name}"
								value={formData.format_template}
								onChange={(e) => handleInputChange("format_template", e.target.value)}
							/>
							<p className="text-xs text-muted-foreground mt-1">
								Use placeholders like {`{first_name}, {last_name}, {initials}, {fullname}`}{" "}
								(lowercased and sanitized)
							</p>
						</div>

						<div>
							<Label htmlFor="admin_email">Admin Email</Label>
							<Input
								id="admin_email"
								type="email"
								placeholder="admin@yourdomain.com"
								value={formData.admin_email}
								onChange={(e) => handleInputChange("admin_email", e.target.value)}
							/>
						</div>

						<div>
							<Label htmlFor="api_client_id">API Client ID</Label>
							<Input
								id="api_client_id"
								placeholder="Enter client ID"
								value={formData.api_client_id}
								onChange={(e) => handleInputChange("api_client_id", e.target.value)}
							/>
						</div>

						<div>
							<Label htmlFor="api_client_secret">API Client Secret</Label>
							<PasswordInput
								id="api_client_secret"
								label=""
								value={formData.api_client_secret || ""}
								onChange={(val) => handleInputChange("api_client_secret", val)}
							/>
						</div>

						<div className="md:col-span-2">
							<Label htmlFor="api_token">API Token</Label>
							<Input
								id="api_token"
								placeholder="Enter API token"
								value={formData.api_token}
								onChange={(e) => handleInputChange("api_token", e.target.value)}
							/>
						</div>
					</>
				);
			default:
				return null;
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold">Email Integrations</h2>
					<p className="text-muted-foreground">
						Configure email service providers for your institution
					</p>
				</div>
				<Button
					onClick={handleAddNew}
					className="rounded-2xl"
					variant={showForm ? "outline" : "default"}
				>
					{showForm ? "Cancel" : "Add New Configuration"}
				</Button>
			</div>

			<Separator />

			{/* Form Card - Only show when showForm is true */}
			{showForm && (
				<Card className="bg-transparent border-none shadow-none !p-0">
					<CardHeader>
						<CardTitle>{editingId ? "Edit Configuration" : "New Configuration"}</CardTitle>
						<CardDescription>Configure your email provider settings</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Provider Selection */}
						<div>
							<Label className="text-sm font-medium mb-3 block">Select Provider</Label>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
								{platformConfigs.map((config) => (
									<Card
										key={config.value}
										className={`cursor-pointer border-2 transition-all p-4 text-center ${
											formData.provider === config.value
												? "border-primary bg-primary/5"
												: "border-border hover:border-gray-300"
										}`}
										onClick={() => handlePlatformSelect(config.value)}
									>
										<Icon icon={config.icon} className="w-24 h-12 mx-auto mb-3 text-gray-700" />
										<h3 className="font-semibold">{config.label}</h3>
										<p className="text-xs text-muted-foreground">{config.description}</p>
									</Card>
								))}
							</div>
						</div>

						<Separator />

						{/* Form Fields */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">{renderEmailFields()}</div>

						<div className="flex justify-end">
							<Button
								onClick={handleSubmit}
								disabled={saving || !formData.domain || !formData.provider}
								className="rounded-2xl"
							>
								{saving ? "Saving..." : editingId ? "Update Configuration" : "Create Configuration"}
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* Existing Configurations List */}
			<Card className="bg-transparent border-none shadow-none !p-0">
				<CardHeader>
					<CardTitle>Existing Configurations</CardTitle>
					<CardDescription>Manage your configured email providers</CardDescription>
				</CardHeader>
				<CardContent>
					{configs.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">
							<Icon icon="hugeicons:mail-02" className="w-8 h-8 mx-auto mb-2 opacity-50" />
							<p>No email configurations set up yet</p>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{configs.map((config) => {
								const platformConfig = platformConfigs.find((c) => c.value === config.provider);
								return (
									<Card key={config.id} className="">
										<div className="flex items-center p-2  justify-end">
											<DropdownMenu>
												<DropdownMenuTrigger asChild>
													<Button variant="ghost" className="h-8 w-8 p-0">
														<MoreHorizontal className="h-4 w-4" />
													</Button>
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													<DropdownMenuItem onClick={() => handleEdit(config)}>
														Edit
													</DropdownMenuItem>
													<DropdownMenuItem
														onClick={() => handleDelete(config.id)}
														className="text-destructive focus:text-destructive"
													>
														Delete
													</DropdownMenuItem>
												</DropdownMenuContent>
											</DropdownMenu>
										</div>
										<CardContent className="pt-8 pb-4">
											<Icon
												icon={platformConfig?.icon || "hugeicons:mail-02"}
												className="w-10 h-10 mx-auto mb-2 text-primary"
											/>
											<h3 className="font-semibold text-center">
												{platformConfig?.label || config.provider}
											</h3>
											<p className="text-xs text-muted-foreground text-center mb-4">
												Domain: {config.domain}
											</p>
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
