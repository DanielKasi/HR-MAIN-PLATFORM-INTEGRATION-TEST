"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WorkingDaysSkeleton } from "@/components/working-days-skeleton";
import { WorkingDaysManager } from "@/components/working-days-manager";
import { RotateCcw, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { branchesAPI, showErrorToast, systemAPI } from "@/lib/utils";
import type { ISystemWorkingDay, IBranchWorkingDays, IBranchDay } from "@/types/types.utils";
import { Branch } from "@/types";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

export default function BranchWorkingDaysTab() {
    const [systemWorkingDays, setSystemWorkingDays] = useState<ISystemWorkingDay[]>([]);
    const [branchWorkingDays, setBranchWorkingDays] = useState<IBranchWorkingDays | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const selectedInstitution = useSelector(selectSelectedInstitution);
    const branches = selectedInstitution?.branches || [];

    const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);

    useEffect(() => {
        if (selectedBranch) {
            fetchData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedBranch]);


    const fetchSystemWorkingDays = async () => {
        try {
            const systemDays = await systemAPI.getWorkingDays();
            setSystemWorkingDays(systemDays);
        } catch (error) {
            showErrorToast({ error, defaultMessage: "Failed to load system working days" });
            setSystemWorkingDays([]);
        }
    };

    const fetchBranchWorkingDays = async (branchId: number) => {
        try {
            const branchDays = await branchesAPI.WORKING_DAYS.getAll({ branchId });
            setBranchWorkingDays(branchDays);
        } catch (error) {
            showErrorToast({ error, defaultMessage: "Failed to load branch working days" });
            setBranchWorkingDays(null);
        }
    };

    const fetchData = async () => {
        if (!selectedBranch) { return; }
        setIsLoading(true);
        await fetchSystemWorkingDays();
        await fetchBranchWorkingDays(selectedBranch.id);
        setIsLoading(false);
    };

    const handleBranchWorkingDaysUpdate = async (args: any) => {
        if (!selectedBranch) {
            toast.error("No branch selected");
            return;
        }
        try {
            setIsSaving(true);
            let updated: IBranchWorkingDays | null = null;
            let currentDays = branchWorkingDays?.branch_days || [];
            let newDays: Omit<IBranchDay, "id" | "day_name">[] = [];
            if (args.action === "add") {
                newDays = [
                    ...currentDays.map(d => ({ day_id: d.id, day_type: d.day_type })),
                    {
                        day_id: args.dayId,
                        day_type: args.dayType,
                    },
                ];
            } else if (args.action === "remove") {
                newDays = currentDays.filter(d => d.day_name.toLowerCase() !== args.day_name.toLowerCase()).map(d => ({ day_id: d.id, day_type: d.day_type }));
            } else if (args.action === "save") {
                newDays = args.days;
            } else {
                return;
            }
            if (!branchWorkingDays) {
                const created = await branchesAPI.WORKING_DAYS.create({
                    branch_days: newDays.map(({ day_id, day_type }) => ({ day_id, day_type })),
                });
                if (created) {
                    setBranchWorkingDays(created);
                    toast.success("Branch working days created");
                }
            } else {
                updated = await branchesAPI.WORKING_DAYS.update(branchWorkingDays.id, {
                    branch_days: newDays.map(({ day_id, day_type }) => ({ day_id, day_type })),
                });
                if (updated) {
                    setBranchWorkingDays(updated);
                    toast.success("Branch working days updated");
                }
            }
        } catch (error: any) {
            toast.error(error?.message || error?.detail || "Failed to update branch working days");
            throw error;
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="p-6">
                <WorkingDaysSkeleton />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <div className="mt-4">
                    <Button onClick={fetchData} variant="outline">
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Retry
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto p-6 space-y-6 bg-white rounded-lg">
            <Card className="shadow-none border-none">
                <CardHeader className="border-b">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                Branch Working Days
                            </CardTitle>
                            <CardDescription className="text-gray-600 mt-2">
                                Configure which days of the week this branch operates, and whether each day is physical or remote.
                            </CardDescription>
                        </div>
                        {/* Branch Selector */}
                        <div className="flex items-center gap-2">
                            <Label htmlFor="branch-select" className="text-sm font-medium text-gray-700">Branch:</Label>
                            <Select
                                value={selectedBranch?.id.toString() || ''}
                                onValueChange={(val) => {
                                    const branch = branches.find(b => b.id === Number(val));
                                    setSelectedBranch(branch || null);
                                }}
                            >
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Select a branch" />
                                </SelectTrigger>
                                <SelectContent>
                                    {branches.map(branch => (
                                        <SelectItem key={branch.id} value={branch.id.toString()}>{branch.branch_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardHeader>
            </Card>
            {
                selectedBranch && (
                    <WorkingDaysManager
                        scope={{ type: "branch", branchId: selectedBranch.id, branchWorkingDays: branchWorkingDays }}
                        systemWorkingDays={systemWorkingDays}
                        onUpdate={handleBranchWorkingDaysUpdate}
                        isSaving={isSaving}
                    />
                )
            }
        </div>
    );
}
