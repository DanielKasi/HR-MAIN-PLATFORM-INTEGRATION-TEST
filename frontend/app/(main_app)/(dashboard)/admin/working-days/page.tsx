"use client";

import {Tabs, TabsContent, TabsList, TabsTrigger} from "@/components/ui/tabs";
import InstitutionWorkingDays from "@/components/working-days/institution-working-days";
import BranchWorkingDaysTab from "@/components/working-days/branch-working-days-tab";
import {ArrowLeft} from "lucide-react";
import router from "next/router";
import {Button} from "@/components/ui/button";
import {useRouter} from "next/navigation";

export default function AllWorkingDaysPage() {
  const router = useRouter();

  return (
    <div className="p-4 rounded-xl bg-gray-50">
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
