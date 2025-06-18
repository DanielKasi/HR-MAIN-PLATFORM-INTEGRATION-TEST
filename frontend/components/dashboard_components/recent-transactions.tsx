"use client";

import {useEffect, useState} from "react";
import {ArrowRight} from "lucide-react";
import {useRouter} from "next/navigation";

import {apiGet} from "@/lib/apiRequest";
import {formatCurrency, getDefaultInstitutionId} from "@/lib/helpers";

export function RecentTransactions({branchId}: {branchId: string | null}) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const InstitutionId = getDefaultInstitutionId();

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();

      params.append("type", "recent_transactions");

      if (branchId) {
        params.append("branch_id", branchId);
      } else if (InstitutionId) {
        params.append("Institution_id", InstitutionId as any);
      }

      const response = await apiGet(`sale/analysis/?${params.toString()}`);

      setTransactions(response.data);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (InstitutionId || branchId) {
      fetchTransactions();
    }
  }, [branchId, InstitutionId]);

  return (
    <div className="bg-white rounded-xl p-6 h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold">Recent Transactions</h2>
        <div
          className="text-green-500 flex items-center text-sm cursor-pointer hover:underline"
          onClick={() => router.push("/reports/sales")}
        >
          <span>View all transactions</span>
          <ArrowRight className="h-4 w-4 ml-1" />
        </div>
      </div>

      {isLoading ? (
        <div className="py-6 text-center text-gray-500 min-h-[200px] flex items-center justify-center">
          Loading...
        </div>
      ) : transactions.length > 0 ? (
        <table className="w-full">
          <thead>
            <tr className="text-gray-500 text-sm">
              <th className="text-left font-normal pb-2">Trans ID</th>
              <th className="text-left font-normal pb-2">Products</th>
              <th className="text-left font-normal pb-2">Amount</th>
              <th className="text-left font-normal pb-2">Date</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((transaction, index) => (
              <tr key={index} className="border-t">
                <td className="py-3 text-sm">{transaction.id}</td>
                <td className="py-3 text-sm">{transaction.products}</td>
                <td className="py-3 text-sm">{formatCurrency(transaction.amount)}</td>
                <td className="py-3 text-sm">{transaction.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="py-6 text-center text-gray-500 min-h-[200px] flex items-center justify-center">
          No recent transactions found.
        </div>
      )}
    </div>
  );
}
