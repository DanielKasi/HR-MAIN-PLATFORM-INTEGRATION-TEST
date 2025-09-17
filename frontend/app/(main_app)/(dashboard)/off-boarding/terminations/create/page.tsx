"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useSelector } from "react-redux";
import { ArrowLeft } from "lucide-react";

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
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { getPaginatedEmployees, TerminationInitiationsAPI } from "@/lib/utils";
import { IEmployee } from "@/types/types.utils";
import EmployeeSearchableSelect from "@/components/selects/employee-searchable-select";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FILE_TYPES = ["application/pdf", "image/png", "image/jpeg"];

const formSchema = z.object({
	employee_id: z.string().min(1, "Please select an employee"),
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

export default function CreateTerminationInitiationPage() {
	const [employees, setEmployees] = useState<IEmployee[]>([]);
	const [loading, setLoading] = useState(false);
	const router = useRouter();
	const selectedInstitution = useSelector(selectSelectedInstitution);
	const institutionId = selectedInstitution?.id;

	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			employee_id: "",
			termination_letter: null,
			comments: "",
			last_working_day: "",
		},
	});

	useEffect(() => {
		const fetchEmployees = async () => {
			if (!institutionId) return;
			try {
				const data = await getPaginatedEmployees({ institutionId });

				setEmployees(data.results || []);
			} catch (error) {
				toast.error("Failed to fetch employees");
			}
		};

		fetchEmployees();
	}, [institutionId]);

	const handleSubmit = async (values: z.infer<typeof formSchema>) => {
		setLoading(true);
		try {
			await TerminationInitiationsAPI.create({
				terminationData: {
					employee_id: parseInt(values.employee_id),
					termination_letter: values.termination_letter,
					comments: values.comments,
					last_working_day: values.last_working_day,
				},
			});
			toast.success("Termination initiation created successfully");
			router.push("/off-boarding/terminations");
		} catch (error) {
			toast.error("Failed to create termination initiation");
		}
		setLoading(false);
	};

	return (
		<div className="w-full p-6 bg-white">
			<div className="flex justify-between items-center mb-6">
				<div className="flex items-center gap-2">
					<Button
						size="sm"
						className="rounded-full aspect-square"
						variant="outline"
						onClick={() => router.push("/off-boarding/terminations")}
					>
						<ArrowLeft />
					</Button>
					<div className="mt-5 ml-3">
						<h1 className="text-3xl font-bold tracking-tight">Initiate Termination</h1>
						<p className="text-muted-foreground mt-2">Create a new termination initiation</p>
					</div>
				</div>
			</div>

			<Card className="border-none">
				<CardHeader>
					<CardTitle>Termination Details</CardTitle>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
							<FormField
								control={form.control}
								name="employee_id"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Employee</FormLabel>
										{/* <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id.toString()}>
                            {employee.user?.fullname}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select> */}
										{/* <EmployeeSearchableSelect
                    value={[field.value]}
                    onValueChange={field.onChange}
                    /> */}
										<EmployeeSearchableSelect
											value={[field.value]}
											// onValueChange={field.onChange}
											onValueChange={(values) => {
												const numberValues = values.map((v) => Number(v));
												const uniqueValues = [...new Set(numberValues)];

												// console.log("\n\n Values changed as : ", values);
												form.setValue("employee_id", uniqueValues[0].toString());
											}}
											disabled={loading}
											placeholder="Select an employee"
											showEmployeeId={false}
											showDepartment={false}
											multiple={false}
										/>
										<FormMessage />
									</FormItem>
								)}
							/>

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
											Upload termination letter (PDF, PNG, or JPEG, max 5MB)
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
									{loading ? "Creating..." : "Create Termination"}
								</Button>
							</div>
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	);
}
