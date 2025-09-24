"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { TerminationInitiationsAPI } from "@/lib/utils";
import { ITermination } from "@/types/types.utils";
import FixedLoader from "@/components/fixed-loader";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ["application/pdf", "image/png", "image/jpeg"];

const formSchema = z.object({
	termination_letter: z
		.any()
		.refine((file) => !file || file instanceof File, "Please upload a valid file")
		.refine((file) => !file || file.size <= MAX_FILE_SIZE, "File size should be less than 5MB")
		.refine(
			(file) => !file || ACCEPTED_FILE_TYPES.includes(file.type),
			"Only PDF, PNG, and JPEG files are accepted",
		)
		.optional()
		.nullable(),
	comments: z.string().min(1, "Comments are required"),
	last_working_day: z.string().min(1, "Last working day is required"),
});

export default function EditTerminationPage() {
	const params = useParams();
	const terminationId = params.id as string;
	const [termination, setTermination] = useState<ITermination | null>(null);
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			termination_letter: null,
			comments: "",
			last_working_day: "",
		},
	});

	useEffect(() => {
		const fetchTermination = async () => {
			try {
				const data = await TerminationInitiationsAPI.getById(parseInt(terminationId));

				setTermination(data);
				form.reset({
					comments: data?.comments,
					last_working_day: data ? new Date(data.last_working_day).toISOString().split("T")[0] : "",
					termination_letter: null,
				});
			} catch (error) {
				toast.error("Failed to fetch termination details");
				router.push("/off-boarding/terminations");
			}
		};

		fetchTermination();
	}, [params.id, form]);

	const handleSubmit = async (values: z.infer<typeof formSchema>) => {
		if (!termination) return;

		setLoading(true);
		try {
			await TerminationInitiationsAPI.update({
				terminationId: termination.id,
				terminationData: {
					termination_letter: values.termination_letter,
					comments: values.comments,
					last_working_day: values.last_working_day,
				},
			});
			toast.success("Termination updated successfully");
			router.push("/off-boarding/terminations");
		} catch (error) {
			toast.error("Failed to update termination");
		}
		setLoading(false);
	};

	if (!termination) {
		return <FixedLoader />;
	}

	return (
		<div className="w-full p-6">
			<div className="flex justify-between items-center mb-6">
				<div>
					<h1 className="text-3xl font-bold tracking-tight">Edit Termination</h1>
					<p className="text-muted-foreground mt-2">Update termination details</p>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Termination Details</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="mb-6">
						<h3 className="font-medium mb-2">Employee</h3>
						<p className="text-muted-foreground">{termination.separation.employee?.name}</p>
					</div>

					<Form {...form}>
						<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
							<FormField
								control={form.control}
								name="termination_letter"
								render={({ field: { value, onChange, ...field } }) => (
									<FormItem>
										<FormLabel>Termination Letter</FormLabel>
										<FormControl>
											<Input
												type="file"
												accept={ACCEPTED_FILE_TYPES.join(",")}
												onChange={(e) => {
													const file = e.target.files?.[0];

													onChange(file);
												}}
												{...field}
											/>
										</FormControl>
										<FormDescription>
											{termination.termination_letter ? (
												<span>
													Current file:{" "}
													<a
														href={termination.termination_letter}
														target="_blank"
														rel="noopener noreferrer"
														className="text-blue-500 hover:underline"
													>
														View current letter
													</a>
												</span>
											) : (
												"Upload termination letter (PDF, PNG, or JPEG, max 5MB)"
											)}
										</FormDescription>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="last_working_day"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Last Working Day</FormLabel>
										<FormControl>
											<Input type="date" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="comments"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Comments</FormLabel>
										<FormControl>
											<Textarea placeholder="Enter comments about the termination" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<div className="flex justify-end space-x-4">
								<Button variant="outline" onClick={() => router.push("/off-boarding/terminations")}>
									Cancel
								</Button>
								<Button type="submit" disabled={loading}>
									{loading ? "Updating..." : "Update Termination"}
								</Button>
							</div>
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	);
}
