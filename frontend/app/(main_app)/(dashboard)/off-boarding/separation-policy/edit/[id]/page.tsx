"use client";

import type React from "react";
import type { ISeparationType } from "@/types/types.utils";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import apiRequest from "@/lib/apiRequest";

interface SeparationPolicy {
	id: number;
	separation_type: number;
	policy_document: string | null;
	description: string;
	min_notice_days: number;
	max_notice_days: number;
	require_separation_letter: boolean;
	require_all_stages: boolean;
	is_active: boolean;
	enforce_policy: boolean;
	created_at: string;
	updated_at: string;
}

interface FormData {
	separation_type: string;
	policy_name: string;
	description: string;
	min_notice_days: string;
	max_notice_days: string;
	require_separation_letter: boolean;
	require_all_stages: boolean;
	is_active: boolean;
	enforce_policy: boolean;
}

interface FormErrors {
	separation_type?: string;
	policy_name?: string;
	description?: string;
	min_notice_days?: string;
	max_notice_days?: string;
}

export default function EditSeparationPolicyPage() {
	const router = useRouter();
	const params = useParams();
	const policyId = params.id as string;

	const [separationTypes, setSeparationTypes] = useState<ISeparationType[]>([]);
	const [policy, setPolicy] = useState<SeparationPolicy | null>(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState(false);

	const [formData, setFormData] = useState<FormData>({
		separation_type: "",
		policy_name: "",
		description: "",
		min_notice_days: "",
		max_notice_days: "",
		require_separation_letter: false,
		require_all_stages: false,
		is_active: true,
		enforce_policy: false,
	});

	const [errors, setErrors] = useState<FormErrors>({});

	const fetchData = async () => {
		try {
			const [typesResponse, policyResponse] = await Promise.all([
				apiRequest.get("/on-boarding/separation-types"),
				apiRequest.get(`/on-boarding/separation-policies/${policyId}/`),
			]);

			if (typesResponse.status === 200) {
				setSeparationTypes(typesResponse.data.results);
			}

			if (policyResponse.status === 200) {
				const policyData = policyResponse.data;

				setPolicy(policyData);

				// Populate form with existing data
				setFormData({
					separation_type: policyData.separation_type.toString(),
					policy_name: policyData.policy_name || "",
					description: policyData.description,
					min_notice_days: policyData.min_notice_days.toString(),
					max_notice_days: policyData.max_notice_days.toString(),
					require_separation_letter: policyData.require_separation_letter,
					require_all_stages: policyData.require_all_stages,
					is_active: policyData.is_active,
					enforce_policy: policyData.enforce_policy,
				});
			} else {
				throw new Error("Failed to fetch policy data");
			}
		} catch (error) {
			console.error("Error fetching data:", error);
			setError("Failed to load policy data");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (policyId) {
			fetchData();
		}
	}, [policyId]);

	const validateForm = (): boolean => {
		const newErrors: FormErrors = {};

		if (!formData.policy_name.trim()) {
			newErrors.policy_name = "Policy name is required";
		}

		if (!formData.description.trim()) {
			newErrors.description = "Description is required";
		}

		if (!formData.separation_type) {
			newErrors.separation_type = "Separation type is required";
		}

		if (!formData.min_notice_days || Number.parseInt(formData.min_notice_days) < 0) {
			newErrors.min_notice_days = "Valid minimum notice days required";
		}

		if (!formData.max_notice_days || Number.parseInt(formData.max_notice_days) < 0) {
			newErrors.max_notice_days = "Valid maximum notice days required";
		}

		if (
			formData.min_notice_days &&
			formData.max_notice_days &&
			Number.parseInt(formData.min_notice_days) > Number.parseInt(formData.max_notice_days)
		) {
			newErrors.max_notice_days = "Maximum days must be greater than minimum days";
		}

		setErrors(newErrors);

		return Object.keys(newErrors).length === 0;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!validateForm()) {
			return;
		}

		setSubmitting(true);
		setError(null);

		try {
			const payload = {
				separation_type: Number.parseInt(formData.separation_type),
				policy_document: null,
				policy_name: formData.policy_name.trim(),
				description: formData.description,
				min_notice_days: Number.parseInt(formData.min_notice_days),
				max_notice_days: Number.parseInt(formData.max_notice_days),
				require_separation_letter: formData.require_separation_letter,
				require_all_stages: formData.require_all_stages,
				is_active: formData.is_active,
				enforce_policy: formData.enforce_policy,
			};

			const response = await apiRequest.patch(
				`/on-boarding/separation-policies/${policyId}/`,
				payload,
			);

			if (response.status === 200) {
				setSuccess(true);
				setTimeout(() => {
					router.push("/off-boarding/separation-policy");
				}, 1500);
			} else {
				throw new Error("Failed to update policy");
			}
		} catch (error: any) {
			console.error("Error updating policy:", error);
			setError(error.response?.data?.message || "Failed to update policy. Please try again.");
		} finally {
			setSubmitting(false);
		}
	};

	const handleInputChange = (field: keyof FormData, value: string | boolean) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field as keyof FormErrors]) {
			setErrors((prev) => ({ ...prev, [field]: undefined }));
		}
	};

	const getSelectedSeparationType = () => {
		return separationTypes.find((type) => type.id.toString() === formData.separation_type);
	};

	if (loading) {
		return (
			<div className="container mx-auto py-6">
				<div className="flex items-center justify-center min-h-[400px]">
					<div className="flex items-center gap-2">
						<Loader2 className="h-6 w-6 animate-spin" />
						<span>Loading policy data...</span>
					</div>
				</div>
			</div>
		);
	}

	if (success) {
		return (
			<div className="container mx-auto py-6">
				<div className="max-w-2xl mx-auto">
					<Card>
						<CardContent className="pt-6">
							<div className="text-center">
								<div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
									<svg
										className="w-6 h-6 text-green-600"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M5 13l4 4L19 7"
										/>
									</svg>
								</div>
								<h2 className="text-xl font-semibold mb-2">Policy Updated Successfully!</h2>
								<p className="text-muted-foreground">Redirecting to policies list...</p>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	if (!policy) {
		return (
			<div className="container mx-auto py-6">
				<Alert variant="destructive">
					<AlertDescription>Policy not found or failed to load.</AlertDescription>
				</Alert>
			</div>
		);
	}

	return (
		<div className="container mx-auto py-6 space-y-6">
			<div className="flex items-center gap-4">
				<Link href="/off-boarding/separation-policy">
					<Button variant="ghost" size="sm">
						<ArrowLeft className="h-4 w-4 mr-2" />
					</Button>
				</Link>
				<div>
					<h1 className="text-3xl font-bold">Edit Separation Policy</h1>
					<p className="text-muted-foreground">Update the institutional separation policy</p>
				</div>
			</div>

			{error && (
				<Alert variant="destructive">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
			)}

			<form onSubmit={handleSubmit} className="max-w-full mx-auto space-y-6">
				{/* Basic Information */}
				<Card>
					<CardHeader>
						<CardTitle>Basic Information</CardTitle>
						<CardDescription>
							Update the fundamental details for this separation policy
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="policy_name">Policy Name *</Label>
								<Input
									id="policy_name"
									placeholder="e.g., Standard Resignation Policy v1.0"
									value={formData.policy_name}
									onChange={(e) => handleInputChange("policy_name", e.target.value)}
									className={errors.policy_name ? "border-red-500" : ""}
								/>
								{errors.policy_name && <p className="text-sm text-red-500">{errors.policy_name}</p>}
							</div>

							<div className="space-y-2">
								<Label htmlFor="separation_type">Separation Type *</Label>
								<Select
									value={formData.separation_type}
									onValueChange={(value) => handleInputChange("separation_type", value)}
								>
									<SelectTrigger className={errors.separation_type ? "border-red-500" : ""}>
										<SelectValue placeholder="Select separation type" />
									</SelectTrigger>
									<SelectContent>
										{separationTypes.map((type) => (
											<SelectItem key={type.id} value={type.id.toString()}>
												<div className="flex items-center gap-2">
													<span>{type.separation_type}</span>
													<Badge
														variant={type.is_active ? "default" : "secondary"}
														className="text-xs"
													>
														{type.category}
													</Badge>
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{errors.separation_type && (
									<p className="text-sm text-red-500">{errors.separation_type}</p>
								)}
								{getSelectedSeparationType() && (
									<p className="text-sm text-muted-foreground">
										{getSelectedSeparationType()?.description}
									</p>
								)}
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="description">Policy Description *</Label>
							<Textarea
								id="description"
								placeholder="Describe the purpose, scope, and key requirements of this policy..."
								value={formData.description}
								onChange={(e) => handleInputChange("description", e.target.value)}
								className={errors.description ? "border-red-500" : ""}
								rows={3}
							/>
							{errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
						</div>
					</CardContent>
				</Card>

				{/* Notice Period Configuration */}
				<Card>
					<CardHeader>
						<CardTitle>Notice Period Requirements</CardTitle>
						<CardDescription>
							Configure the minimum and maximum notice periods for this policy
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="min_notice_days">Minimum Notice Days *</Label>
								<Input
									id="min_notice_days"
									type="number"
									min="0"
									placeholder="e.g., 14"
									value={formData.min_notice_days}
									onChange={(e) => handleInputChange("min_notice_days", e.target.value)}
									className={errors.min_notice_days ? "border-red-500" : ""}
								/>
								{errors.min_notice_days && (
									<p className="text-sm text-red-500">{errors.min_notice_days}</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="max_notice_days">Maximum Notice Days *</Label>
								<Input
									id="max_notice_days"
									type="number"
									min="0"
									placeholder="e.g., 30"
									value={formData.max_notice_days}
									onChange={(e) => handleInputChange("max_notice_days", e.target.value)}
									className={errors.max_notice_days ? "border-red-500" : ""}
								/>
								{errors.max_notice_days && (
									<p className="text-sm text-red-500">{errors.max_notice_days}</p>
								)}
							</div>
						</div>
					</CardContent>
				</Card>

				{/* Policy Requirements */}
				<Card>
					<CardHeader>
						<CardTitle>Policy Requirements</CardTitle>
						<CardDescription>
							Configure specific requirements for this separation policy
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label>Require Separation Letter</Label>
								<p className="text-sm text-muted-foreground">
									Mandate a formal separation letter for this policy
								</p>
							</div>
							<Switch
								checked={formData.require_separation_letter}
								onCheckedChange={(checked) =>
									handleInputChange("require_separation_letter", checked)
								}
							/>
						</div>

						<Separator />

						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label>Require All Stages</Label>
								<p className="text-sm text-muted-foreground">
									All offboarding stages must be completed
								</p>
							</div>
							<Switch
								checked={formData.require_all_stages}
								onCheckedChange={(checked) => handleInputChange("require_all_stages", checked)}
							/>
						</div>
					</CardContent>
				</Card>

				{/* Policy Settings */}
				<Card>
					<CardHeader>
						<CardTitle>Policy Settings</CardTitle>
						<CardDescription>
							Configure how this policy should be applied and enforced
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label>Active Policy</Label>
								<p className="text-sm text-muted-foreground">
									Enable this policy to make it available for use
								</p>
							</div>
							<Switch
								checked={formData.is_active}
								onCheckedChange={(checked) => handleInputChange("is_active", checked)}
							/>
						</div>

						<Separator />

						<div className="flex items-center justify-between">
							<div className="space-y-0.5">
								<Label>Enforce Policy</Label>
								<p className="text-sm text-muted-foreground">
									Strictly enforce all policy requirements
								</p>
							</div>
							<Switch
								checked={formData.enforce_policy}
								onCheckedChange={(checked) => handleInputChange("enforce_policy", checked)}
							/>
						</div>
					</CardContent>
				</Card>

				{/* Policy Metadata */}
				{policy && (
					<Card>
						<CardHeader>
							<CardTitle>Policy Information</CardTitle>
							<CardDescription>Read-only information about this policy</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div className="space-y-2">
									<Label>Created At</Label>
									<p className="text-sm text-muted-foreground">
										{new Date(policy.created_at).toLocaleDateString("en-US", {
											year: "numeric",
											month: "long",
											day: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										})}
									</p>
								</div>
								<div className="space-y-2">
									<Label>Last Updated</Label>
									<p className="text-sm text-muted-foreground">
										{new Date(policy.updated_at).toLocaleDateString("en-US", {
											year: "numeric",
											month: "long",
											day: "numeric",
											hour: "2-digit",
											minute: "2-digit",
										})}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>
				)}

				{/* Form Actions */}
				<div className="flex items-center justify-end gap-4 pt-6">
					<Link href="/off-boarding/separation-policy">
						<Button variant="outline" disabled={submitting}>
							Cancel
						</Button>
					</Link>
					<Button type="submit" disabled={submitting}>
						{submitting ? (
							<>
								<Loader2 className="h-4 w-4 mr-2 animate-spin" />
								Updating Policy...
							</>
						) : (
							<>
								<Save className="h-4 w-4 mr-2" />
								Update Policy
							</>
						)}
					</Button>
				</div>
			</form>
		</div>
	);
}
