"use client";

import {useEffect, useState} from "react";
import {ArrowRight, Building} from "lucide-react";
import {useRouter} from "next/navigation";

import {apiGet} from "@/lib/apiRequest";
import {getDefaultInstitutionId} from "@/lib/helpers";

export function LowStockItems({branchId}: {branchId: string | null}) {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [branchName, setBranchName] = useState<string | null>(null);
  const [viewingAllBranches, setViewingAllBranches] = useState(false);
  const router = useRouter();

  const InstitutionId = getDefaultInstitutionId();

  const fetchLowStockItems = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();

      params.append("type", "low_stock_products");

      if (branchId) {
        params.append("branch_id", branchId);
      } else if (InstitutionId) {
        params.append("Institution_id", InstitutionId as any);
      }

      const response = await apiGet(`sale/analysis/?${params.toString()}`);

      setItems(response.data);
      setViewingAllBranches(branchId === null);

      if (branchId) {
        try {
          const branchResponse = await apiGet(`institution/branch/${branchId}`);

          setBranchName(branchResponse.data.branch_name);
        } catch (error) {
          console.error("Error fetching branch details:", error);
          setBranchName(null);
        }
      } else {
        setBranchName(null);
      }
    } catch (error) {
      console.error("Error fetching low stock items:", error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (branchId || InstitutionId) {
      fetchLowStockItems();
    }
  }, [branchId, InstitutionId]);

  return (
    <div className="bg-white rounded-xl p-6 h-full">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-bold">Low Stock Items</h2>
          {branchName && <p className="text-sm text-gray-500">Branch: {branchName}</p>}
          {viewingAllBranches && <p className="text-sm text-gray-500">Viewing all branches</p>}
        </div>
        <div
          className="text-green-500 flex items-center text-sm cursor-pointer hover:underline"
          onClick={() => router.push("/products-mgt")}
        >
          <span>View all stock</span>
          <ArrowRight className="h-4 w-4 ml-1" />
        </div>
      </div>

      {/* Add pr-4 to create spacing between content and scrollbar */}
      <div className="h-[calc(100%-60px)] overflow-auto pr-4">
        {isLoading ? (
          <div className="py-8 text-center flex items-center justify-center h-full">
            Loading low stock items...
          </div>
        ) : items.length === 0 ? (
          <div className="py-8 text-center text-gray-500 flex items-center justify-center h-full">
            No low stock items found.
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="flex justify-between items-center py-2">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-500">{item.stock}</div>
                  {viewingAllBranches && item.branch_name && (
                    <div className="text-xs text-gray-500 flex items-center mt-1">
                      <Building className="h-3 w-3 mr-1" />
                      {item.branch_name}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end">
                  <div className={`${item.color} font-medium`}>{item.remaining} Left</div>
                  {item.remaining < 5 && (
                    <span className="mt-1 bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                      Critical
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
