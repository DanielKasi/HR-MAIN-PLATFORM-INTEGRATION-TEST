"use client";

import {useEffect, useState} from "react";
import {ShoppingCart, Package2, FileBarChart, ArrowUpRight} from "lucide-react";

import {apiGet} from "@/lib/apiRequest";
import {getDefaultInstitutionId} from "@/lib/helpers";

export function StatsCards({branchId}: {branchId: string | null}) {
  const [stats, setStats] = useState({
    salesToday: "0",
    transactionsToday: "0",
    activeInventory: "0",
    lowStockItems: "0",
  });
  const [isLoading, setIsLoading] = useState(true);
  const InstitutionId = getDefaultInstitutionId();

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();

      params.append("type", "dashboard_stats");

      if (branchId) {
        params.append("branch_id", branchId);
      } else if (InstitutionId) {
        params.append("Institution_id", InstitutionId as any);
      }

      const response = await apiGet(`sale/analysis/?${params.toString()}`);

      setStats({
        salesToday: response.data?.sales_today?.formatted,
        transactionsToday: response.data?.transactions_today?.formatted,
        activeInventory: response.data?.active_inventory?.formatted,
        lowStockItems: response.data?.low_stock_items?.formatted,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (branchId || InstitutionId) {
      fetchStats();
    }
  }, [branchId, InstitutionId]);

  return (
    <div className="bg-white rounded-xl mb-6 flex">
      <div className="flex-1 p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
              <FileBarChart className="text-white h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-600">Sales Today</span>
              <div className="text-xl font-bold">{isLoading ? "Loading..." : stats.salesToday}</div>
            </div>
          </div>
          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
            <ArrowUpRight className="text-gray-400 h-4 w-4" />
          </div>
        </div>
      </div>

      <div className="w-px bg-gray-200" />

      <div className="flex-1 p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gray-500 rounded-md flex items-center justify-center">
              <ShoppingCart className="text-white h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-600">Transactions Today</span>
              <div className="text-xl font-bold">
                {isLoading ? "Loading..." : stats.transactionsToday}
              </div>
            </div>
          </div>
          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
            <ArrowUpRight className="text-gray-400 h-4 w-4" />
          </div>
        </div>
      </div>

      <div className="w-px bg-gray-200" />

      <div className="flex-1 p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
              <Package2 className="text-white h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-600">Active Inventory</span>
              <div className="text-xl font-bold">
                {isLoading ? "Loading..." : stats.activeInventory}
              </div>
            </div>
          </div>
          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
            <ArrowUpRight className="text-gray-400 h-4 w-4" />
          </div>
        </div>
      </div>

      <div className="w-px bg-gray-200" />

      <div className="flex-1 p-4">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
              <Package2 className="text-white h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-gray-600">Low Stock Items</span>
              <div className="text-xl font-bold">
                {isLoading ? "Loading..." : stats.lowStockItems}
              </div>
            </div>
          </div>
          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
            <ArrowUpRight className="text-gray-400 h-4 w-4" />
          </div>
        </div>
      </div>
    </div>
  );
}
