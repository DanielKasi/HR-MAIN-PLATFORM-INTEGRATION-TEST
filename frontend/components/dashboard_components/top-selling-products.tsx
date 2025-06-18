"use client";

import {useEffect, useState} from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {apiGet} from "@/lib/apiRequest";
import {getDefaultInstitutionId} from "@/lib/helpers";

// Top Selling Products Component
export function TopSellingProducts({branchId}: {branchId: string | null}) {
  const [products, setProducts] = useState<any[]>([]);
  const [period, setPeriod] = useState("month");
  const [isLoading, setIsLoading] = useState(true);
  const InstitutionId = getDefaultInstitutionId();

  const fetchTopProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();

      params.append("type", "top_products");
      params.append("period", period);

      if (branchId) {
        params.append("branch_id", branchId);
      } else if (InstitutionId) {
        params.append("Institution_id", InstitutionId as any);
      }

      const response = await apiGet(`sale/analysis/?${params.toString()}`);

      setProducts(response.data);
    } catch (error) {
      console.error("Error fetching top products:", error);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (branchId || InstitutionId) {
      fetchTopProducts();
    }
  }, [branchId, InstitutionId]);

  return (
    <div className="bg-white rounded-xl p-6 h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Top Selling Products</h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[120px] border rounded-full">
            <SelectValue placeholder="This week" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="week">This week</SelectItem>
            <SelectItem value="month">This month</SelectItem>
            <SelectItem value="year">This year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="h-[calc(100%-60px)] overflow-auto">
        {isLoading ? (
          <div className="py-8 text-center flex items-center justify-center h-full">
            Loading top products...
          </div>
        ) : products.length === 0 ? (
          <div className="py-8 text-center text-gray-500 flex items-center justify-center h-full">
            No top selling products found.
          </div>
        ) : (
          <div className="space-y-4 mt-6">
            {products.map((product, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-1">
                  <span>{product.name}</span>
                  <span className="font-medium">{product.total_sales.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 h-4 rounded-full">
                  <div
                    className={`h-4 rounded-full ${index === 0 ? "bg-green-500" : "bg-gray-400"}`}
                    style={{width: `${product.percentage}%`}}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
