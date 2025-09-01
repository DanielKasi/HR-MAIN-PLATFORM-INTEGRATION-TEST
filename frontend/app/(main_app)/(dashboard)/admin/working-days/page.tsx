"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InstitutionWorkingDays from "@/components/working-days/institution-working-days";
import BranchWorkingDaysTab from "@/components/working-days/branch-working-days-tab";
export default function AllWorkingDaysPage() {
  return (
    <div className="p-4 rounded-xl bg-gray-50">
      <div className="my-4 ">
        <h1 className="text-xl md:text-3xl font-bold text-gray-900">
          Working Days Management
        </h1>
      </div>
      <Tabs defaultValue="institution" className="w-full">
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
