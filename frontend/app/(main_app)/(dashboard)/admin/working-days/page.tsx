"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InstitutionWorkingDays from "@/components/working-days/institution-working-days";
import BranchWorkingDaysTab from "@/components/working-days/branch-working-days";
import { Button } from "@/components/ui/button";

export default function AllWorkingDaysPage() {
	const router = useRouter();

	return (
		<div className="p-4 rounded-xl min-h-screen">
			<div className="flex items-start gap-2">
				<Button
					size="sm"
					className="rounded-full aspect-square"
					variant="outline"
					onClick={() => router.push("/admin")}
				>
					<ArrowLeft />
					<span className="sr-only">Go back</span>
				</Button>

				<div className="flex flex-col ml-4">
					<h1 className="text-xl md:text-3xl font-bold text-gray-900">Working Days Management</h1>
					<p className="text-muted-foreground text-sm">
						Configure and manage your company’s working schedule
					</p>
				</div>
			</div>

			<Tabs defaultValue="institution" className="w-full mt-6">
				<TabsList className="mb-6">
					<TabsTrigger value="institution">Institution</TabsTrigger>
					<TabsTrigger value="branches">Branches</TabsTrigger>
				</TabsList>
				<TabsContent className="bg-transparent" value="institution">
					<InstitutionWorkingDays />
				</TabsContent>
				<TabsContent className="bg-transparent" value="branches">
					<BranchWorkingDaysTab />
				</TabsContent>
			</Tabs>
		</div>
	);
}
