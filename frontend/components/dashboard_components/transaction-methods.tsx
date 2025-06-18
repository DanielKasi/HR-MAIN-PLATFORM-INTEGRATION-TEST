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

// Donut Chart Component
function DonutChart({cashPercentage}: {cashPercentage: number}) {
  return (
    <svg height="200" viewBox="0 0 100 100" width="200">
      {/* Background circle */}
      <circle cx="50" cy="50" fill="transparent" r="40" stroke="#e5e7eb" strokeWidth="15" />

      {/* Green segment (dynamic percentage) */}
      <circle
        cx="50"
        cy="50"
        fill="transparent"
        r="40"
        stroke="#22c55e"
        strokeDasharray={`${cashPercentage * 2.51} ${(100 - cashPercentage) * 2.51}`}
        strokeDashoffset="0"
        strokeWidth="15"
        transform="rotate(-90 50 50)"
      />
    </svg>
  );
}

// Transaction Methods Component
export function TransactionMethods({branchId}: {branchId: string | null}) {
  const [paymentData, setPaymentData] = useState({
    totalTransactions: 0,
    cashPercentage: 0,
    cardPercentage: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [year, setYear] = useState("2025");
  const InstitutionId = getDefaultInstitutionId();

  const fetchPaymentMethods = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();

      params.append("type", "payment_methods");
      params.append("year", String(year));

      if (branchId) {
        params.append("branch_id", branchId);
      } else if (InstitutionId) {
        params.append("Institution_id", InstitutionId as any);
      }

      const response = await apiGet(`sale/analysis/?${params.toString()}`);

      const methods = response.data.payment_methods || [];
      const cashMethod = methods.find((m: any) => m.name.toLowerCase().includes("cash")) || {
        percentage: 0,
      };
      const cardMethod = methods.find((m: any) => m.name.toLowerCase().includes("card")) || {
        percentage: 0,
      };

      setPaymentData({
        totalTransactions: response.data.total_transactions,
        cashPercentage: cashMethod.percentage || 0,
        cardPercentage: cardMethod.percentage || 0,
      });
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!branchId && !InstitutionId) return;

    fetchPaymentMethods();
  }, [branchId, InstitutionId, year]);

  return (
    <div className="bg-white rounded-xl p-6 h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Transaction Methods</h2>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-[100px] border rounded-full">
            <SelectValue placeholder="2025" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2024">2024</SelectItem>
            <SelectItem value="2023">2023</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-center items-center" style={{minHeight: "200px"}}>
        {isLoading ? (
          <div>Loading payment data...</div>
        ) : (
          <div className="relative w-[200px] h-[200px]">
            <DonutChart cashPercentage={paymentData.cashPercentage} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-sm text-gray-500">Total Transactions</div>
              <div className="text-2xl font-bold">
                {paymentData.totalTransactions.toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-8 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>Cash</span>
          <span className="font-bold ml-1">{paymentData.cashPercentage}%</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-200" />
          <span>Card</span>
          <span className="font-bold ml-1">{paymentData.cardPercentage}%</span>
        </div>
      </div>
    </div>
  );
}
