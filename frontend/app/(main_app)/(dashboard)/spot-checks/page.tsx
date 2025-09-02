"use client";

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { 
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { useRouter } from "next/navigation";
import { showErrorToast, spotcheckAPI } from "@/lib/utils";
import type { ISpotCheck, ISpotCheckStatus } from "@/types/types.utils";
import { Icon } from "@iconify/react"
import SpotchecksTable from "@/components/common/tables/spotchecks/spotcheck-table";


const SpotchecksPage = () => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [spotcheckStatuses, setSpotcheckStatuses] = useState<Array<ISpotCheckStatus>>([]);
  const [summaryData, setSummaryData] = useState({
    totalSpotChecks: 0,
    totalMissed: 0,
    missedThisMonth: 0,
    missedThisWeek: 0,
    missedToday: 0,
  });
  const selectedInstitution = useSelector(selectSelectedInstitution);

  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const statuses = await spotcheckAPI.getStatuses();
        setSpotcheckStatuses(statuses);
      } catch (error) {
        showErrorToast({error, defaultMessage:"Error fetching spotcheck statuses"});
      }
    };

    fetchStatuses();
  }, []);

  const handleViewSpotcheckDetails = (spotcheck: ISpotCheck) => {
    router.push(`/spotcheck/${spotcheck.id}`);
  };

  return (
    <div className="space-y-6">

      {/* Header and Filters */}
      <div className="bg-white rounded-lg border shadow-sm min-h-screen">
        <div className="p-6 border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Spot Checks</h1>
            </div>
          </div>
        </div>
        <div className="p-6 border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4 justify-between">
              <div className="relative flex-1 max-w-sm">
                <Icon icon="hugeicons:search-01" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 !h-5 !w-5" />
                <Input
                  placeholder="Search spot checks"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[130px] border-none bg-transparent focus:outline-none focus:ring-0 shadow-none">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  {
                    spotcheckStatuses.map((status) => (
                      <SelectItem key={status.id} value={status.code}>
                        {status.status_name}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="p-6">
                <SpotchecksTable searchTerm={searchTerm} scope={{type:"default"}} />
        </div>
      </div>
    </div>
  );
};

export default SpotchecksPage;
