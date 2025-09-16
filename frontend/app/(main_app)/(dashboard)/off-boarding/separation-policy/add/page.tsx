"use client";

import type React from "react";
import type { ISeparationType } from "@/types/types.utils";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import { Icon } from "@iconify/react";

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
import FormatNumberInput from "@/components/format-number-input";

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

export default function AddSeparationPolicyPage() {
	const router = useRouter();
	const [separationTypes, setSeparationTypes] = useState<ISeparationType[]>([]);
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

	const fetchSeparationTypes = async () => {
		try {
			const response = await apiRequest.get("/on-boarding/separation-types");

			if (response.status === 200) {
				setSeparationTypes(response.data.results);
			} else {
				throw new Error("Failed to fetch separation types");
			}
		} catch (error) {
			console.error("Error fetching separation types:", error);
			setError("Failed to load separation types");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchSeparationTypes();
	}, []);

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
				description: formData.description,
				min_notice_days: Number.parseInt(formData.min_notice_days),
				max_notice_days: Number.parseInt(formData.max_notice_days),
				require_separation_letter: formData.require_separation_letter,
				require_all_stages: formData.require_all_stages,
				is_active: formData.is_active,
				enforce_policy: formData.enforce_policy,
				policy_name: formData.policy_name,
			};

			const response = await apiRequest.post("/on-boarding/separation-policies/", payload);

			if (response.status === 201 || response.status === 200) {
				setSuccess(true);
				setTimeout(() => {
					router.push("/off-boarding/separation-policy");
				}, 1500);
			} else {
				throw new Error("Failed to create policy");
			}
		} catch (error: any) {
			console.error("Error creating policy:", error);
			setError(error.response?.data?.message || "Failed to create policy. Please try again.");
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
						<span>Loading separation types...</span>
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
								<h2 className="text-xl font-semibold mb-2">Policy Created Successfully!</h2>
								<p className="text-muted-foreground">Redirecting to policies list...</p>
							</div>
						</CardContent>
					</Card>
				</div>
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
					<h1 className="text-3xl font-bold">Create Separation Policy</h1>
					<p className="text-muted-foreground">Define a new institutional separation policy</p>
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
							Provide the fundamental details for this separation policy
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

							<div className="space-y-2 ">
								<Label htmlFor="separation_type">Separation Type *</Label>
								<div className="flex items-center gap-4">
									<Select
										value={formData.separation_type}
										onValueChange={(value: string) => handleInputChange("separation_type", value)}
									>
										<SelectTrigger className={errors.separation_type ? "border-primary" : ""}>
											<SelectValue placeholder="Select separation type" />
										</SelectTrigger>
										<SelectContent>
											{separationTypes.map((type: ISeparationType) => (
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
									<button
										type="button"
										className="text-[16-px] hover:underline border border-gray-300 rounded-md p-2"
										onClick={() =>
											router.push(
												"/off-boarding/separation-types?from=/off-boarding/separation-policy/add",
											)
										}
									>
										<Icon icon="hugeicons:add-01" className="inline-block mr-1" />
									</button>
								</div>
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
								<FormatNumberInput
									id="min_notice_days"
									min="0"
									placeholder="e.g., 14"
									value={formData.min_notice_days?.toString() || ""}
									onChange={(formatted, numeric) =>
										handleInputChange("min_notice_days", numeric.toString())
									}
									className={errors.min_notice_days ? "border-red-500" : ""}
								/>
								{errors.min_notice_days && (
									<p className="text-sm text-red-500">{errors.min_notice_days}</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="max_notice_days">Maximum Notice Days *</Label>
								<FormatNumberInput
									id="max_notice_days"
									min="0"
									placeholder="e.g., 30"
									value={formData.max_notice_days}
									onChange={(formatted, numeric) =>
										handleInputChange("max_notice_days", numeric.toString())
									}
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
								onCheckedChange={(checked: boolean) =>
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
								onCheckedChange={(checked: boolean) =>
									handleInputChange("require_all_stages", checked)
								}
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
								onCheckedChange={(checked: boolean) => handleInputChange("is_active", checked)}
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
								onCheckedChange={(checked: boolean) => handleInputChange("enforce_policy", checked)}
							/>
						</div>
					</CardContent>
				</Card>

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
								Creating Policy...
							</>
						) : (
							<>
								<Save className="h-4 w-4 mr-2" />
								Create Policy
							</>
						)}
					</Button>
				</div>
			</form>
		</div>
	);
}
