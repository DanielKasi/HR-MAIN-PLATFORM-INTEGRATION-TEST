"use client";

import {useState, useEffect} from "react";
import {useParams, useRouter, usePathname} from "next/navigation";
import {Coins, TrendingUp, TrendingDown, ArrowLeft} from "lucide-react";

import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {toast} from "sonner";

import {getPayslipItems} from "@/lib/utils";
import {IPayslip, IPayslipItem} from "@/types/types.utils";



export default function PayslipItems() {
  const params = useParams();
  const router = useRouter();

  const payslipId = params?.payslipId as string;

  const [items, setItems] = useState<IPayslipItem[]>([]);
  const [payslipInfo, setPayslipInfo] = useState<IPayslip | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPayslipItems();
  }, [payslipId]);

  const fetchPayslipItems = async () => {
    if (!payslipId || payslipId === "undefined" || payslipId === "null") {
      setError("No valid payslip ID provided");
      return;
    }

    try {
      setError(null);
      const response = await getPayslipItems(parseInt(payslipId));
      setItems(response);
      setPayslipInfo(response[0].payslip);
    } catch (error: any) {
      setError(error.message || "Failed to load payslip items");
      toast.error("Failed to load payslip items");
      setItems([]);
      setPayslipInfo(null);
    }
  };

  const getItemTypeIcon = (type: IPayslipItem["item_type"]) => {
    switch (type) {
      case "allowance":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "deduction":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case "overtime":
        return <Coins className="h-4 w-4 text-orange-600" />;
    }
  };

  const getItemTypeBadge = (type: IPayslipItem["item_type"]) => {
    switch (type) {
      case "allowance":
        return (
          <Badge className="capitalize bg-green-100 text-green-800 border-green-200">{type}</Badge>
        );
      case "deduction":
        return <Badge className="capitalize bg-red-100 text-red-800 border-red-200">{type}</Badge>;
      case "overtime":
        return (
          <Badge className="capitalize bg-orange-100 text-orange-800 border-orange-200">
            {type}
          </Badge>
        );
    }
  };

  const formatCurrency = (amount: number) => {
    const cleanAmount = amount % 1 === 0 ? Math.floor(amount) : amount;
    return `UGX ${cleanAmount.toLocaleString()}`;
  };

  const getTotals = () => {
    const allowances = items
      .filter((item) => item.item_type === "allowance")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const deductions = items
      .filter((item) => item.item_type === "deduction")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const overtime = items
      .filter((item) => item.item_type === "overtime")
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);

    return {allowances, deductions, overtime, net: allowances + overtime - deductions};
  };

  const totals = getTotals();

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Payslip Items</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-2">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Payslips
            </Button>
            <Button
              onClick={() => window.location.reload()}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full p-3 sm:p-4 md:p-6 lg:p-8 bg-white rounded-lg py-8">
      {/* Header with Employee Info */}
      <div className="flex items-center justify-between">
        <div>
          {payslipInfo ? (
            <div>
              <div className="flex items-center justify-start gap-6">
                <Button
                  variant="outline"
                  onClick={() => router.back()}
                  className="rounded-full aspect-square"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold text-gray-900">
                  {payslipInfo.employee.user?.fullname} - {payslipInfo.payroll_period.name}
                </h1>
              </div>
              <p className="text-gray-600">
                {payslipInfo.employee.position.name} • {payslipInfo.employee.department.name}
              </p>
              <div className="text-sm text-gray-500 mt-1">
                Period: {new Date(payslipInfo.payroll_period.start_date).toLocaleDateString()} -{" "}
                {new Date(payslipInfo.payroll_period.end_date).toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-700 mt-2 font-medium">
                Status:{" "}
                <span className={payslipInfo.is_paid ? "text-green-600" : "text-yellow-600"}>
                  {payslipInfo.is_paid ? "Paid" : "Unpaid"}
                </span>
                {payslipInfo.paid_date && (
                  <span className="text-gray-500 ml-2">
                    (Paid on: {new Date(payslipInfo.paid_date).toLocaleDateString()})
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.back()}
                  className="flex items-center gap-2 rounded-full aspect-square"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold text-gray-900">Payslip Items</h1>
              </div>
              <p className="text-gray-600">No payslip information available</p>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12">
        {payslipInfo && (
          <>
            <Card className="bg-white border">
              <CardContent className="p-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Gross Salary</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(parseFloat(payslipInfo.gross_salary))}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border">
              <CardContent className="p-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Taxable Salary</p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(parseFloat(payslipInfo.gross_salary||'0')+ parseFloat(payslipInfo.taxable_allowances||'0'))}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border">
              <CardContent className="p-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Net Salary</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(parseFloat(payslipInfo.net_salary))}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border">
              <CardContent className="p-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Days Worked</p>
                  <p className="text-lg font-bold text-gray-900">{payslipInfo.days_worked} days</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
        <Card className="bg-white border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black">Allowances</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(totals.allowances)}
                </p>
              </div>
              <div className="p-2 bg-green-200 rounded-full">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black">Taxable allowances
                </p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(Number(payslipInfo?.taxable_allowances || 0))}
                </p>
              </div>
              <div className="p-2 bg-green-200 rounded-full">
                <Coins className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black">Non taxable allowances
                </p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(Number(payslipInfo?.non_taxable_allowances || 0))}
                </p>
              </div>
              <div className="p-2 bg-green-200 rounded-full">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black">Deductions</p>
                <p className="text-xl font-bold text-red-600">
                  {formatCurrency(totals.deductions)}
                </p>
              </div>
              <div className="p-2 bg-red-200 rounded-full">
                <TrendingDown className="h-4 w-4 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black">Overtime</p>
                <p className="text-xl font-bold text-orange-600">
                  {formatCurrency(totals.overtime)}
                </p>
              </div>
              <div className="p-2 bg-orange-200 rounded-full">
                <Coins className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* <Card className="bg-white border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-black">Net Amount</p>
                <p
                  className={`text-xl font-bold ${totals.net >= 0 ? "text-blue-600" : "text-rose-600"}`}
                >
                  {formatCurrency(totals.net)}
                </p>
              </div>
              <div
                className={`p-2 rounded-full ${totals.net >= 0 ? "bg-blue-200" : "bg-rose-200"}`}
              >
                <Coins
                  className={`h-4 w-4 ${totals.net >= 0 ? "text-blue-600" : "text-rose-600"}`}
                />
              </div>
            </div>
          </CardContent>
        </Card> */}
        
      </div>

      {/* Items Table */}
      <div className="mt-8">
        <CardHeader>
          <div>
            <CardTitle>Payslip Items Breakdown</CardTitle>
            <CardDescription>
              Detailed breakdown of allowances, deductions, and overtime for this payslip
              {items.length > 0 && ` (${items.length} items)`}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Type</TableHead>
                  <TableHead className="font-bold">Name</TableHead>
                  <TableHead className="font-bold">Description</TableHead>
                  <TableHead className="text-right font-bold">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      <div className="flex flex-col items-center space-y-2">
                        <Coins className="h-8 w-8 text-gray-400" />
                        <p>No payslip items found.</p>
                        <p className="text-sm">
                          This payslip doesn't have any specific allowances, deductions, or overtime
                          items.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item, index) => (
                    <TableRow
                      key={item.id}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50/30"}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getItemTypeIcon(item.item_type)}
                          {getItemTypeBadge(item.item_type)}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.description || "—"}
                      </TableCell>
                      <TableCell className="text-right text-black font-semibold">
                        <span
                          className={
                            item.item_type === "allowance" || item.item_type === "overtime"
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          {item.item_type === "deduction" ? "-" : "+"}
                          {formatCurrency(Number(item.amount))}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Summary totals at bottom of table */}
          {items.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-gray-600">Total Allowances</p>
                  <p className="font-semibold text-green-600">
                    {formatCurrency(totals.allowances)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600">Total Deductions</p>
                  <p className="font-semibold text-red-600">-{formatCurrency(totals.deductions)}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-600">Total Overtime</p>
                  <p className="font-semibold text-orange-600">{formatCurrency(totals.overtime)}</p>
                </div>
                <div className="text-center border-l">
                  <p className="text-gray-600">Net Items Total</p>
                  <p className={`font-bold ${totals.net >= 0 ? "text-blue-600" : "text-rose-600"}`}>
                    {formatCurrency(totals.net)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </div>
    </div>
  );
}
