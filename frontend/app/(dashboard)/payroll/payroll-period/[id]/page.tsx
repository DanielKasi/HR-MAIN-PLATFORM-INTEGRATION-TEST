"use client";

import {useEffect, useState, useRef, useCallback} from "react";
import {useParams, useRouter} from "next/navigation";
import {Card, CardContent, CardHeader, CardTitle, CardDescription} from "@/components/ui/card";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {Badge} from "@/components/ui/badge";
import {
  Loader2,
  Eye,
  Coins,
  User,
  Calendar,
  Info,
  Building,
  RefreshCcw,
  Download,
  MoreVertical,
} from "lucide-react";
import {Button} from "@/components/ui/button";
import {toast} from "sonner";
import apiRequest from "@/lib/apiRequest";
import {IPayslip, IPayrollPeriod, PaginatedResponse} from "@/app/types/types.utils";
import {useSelector} from "react-redux";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {PDFDownloadLink} from "@react-pdf/renderer";
import PayslipPDF from "@/components/payroll/payslip-pdf";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Skeleton loader component with shimmer effect
const PayrollSkeleton = () => (
  <div className="mx-auto py-8">
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-3 w-full max-w-[60%]">
            {/* Title skeleton with shimmer */}
            <div className="relative h-8 w-3/4 overflow-hidden rounded-lg bg-gray-100">
              <div className="animate-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100" />
            </div>
            {/* Description skeleton with shimmer */}
            <div className="relative h-4 w-full overflow-hidden rounded-lg bg-gray-100">
              <div className="animate-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100" />
            </div>
          </div>
          {/* Branch selector skeleton */}
          <div className="relative h-10 w-[200px] overflow-hidden rounded-lg bg-gray-100">
            <div className="animate-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Table header skeleton */}
          <div className="relative h-12 w-full overflow-hidden rounded-lg bg-gray-100">
            <div className="animate-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100" />
          </div>
          {/* Table rows skeleton */}
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="relative h-16 w-full overflow-hidden rounded-lg bg-gray-100">
                <div className="animate-shimmer absolute inset-0 -translate-x-full bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default function PayrollPeriodDetails() {
  const params = useParams();
  const payrollId = params?.id;

  const [payslips, setPayslips] = useState<IPayslip[]>([]);
  const [filteredPayslips, setFilteredPayslips] = useState<IPayslip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payrollPeriod, setPayrollPeriod] = useState<IPayrollPeriod | null>(null);
  const [selectedBranchId, setSelectedBranchId] = useState<string>("all");
  const [hasMore, setHasMore] = useState(true);
  const [nextPage, setNextPage] = useState<string | null>(null);

  const selectedInstitution = useSelector(selectSelectedInstitution);
  const branches = selectedInstitution?.branches || [];

  const router = useRouter();

  // Intersection Observer setup
  const observer = useRef<IntersectionObserver>(null);
  const lastPayslipElementRef = useCallback(
    (node: HTMLElement | null) => {
      if (loading) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore && nextPage) {
          fetchMorePayslips();
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, hasMore, nextPage],
  );

  useEffect(() => {
    if (payrollId) {
      fetchPayslips();
    }
  }, [payrollId]);

  // Filter payslips when branch selection changes
  useEffect(() => {
    if (selectedBranchId === "all") {
      setFilteredPayslips(payslips);
    } else {
      setFilteredPayslips(
        payslips.filter(
          (payslip) => payslip.employee.payroll_branch?.id.toString() === selectedBranchId,
        ),
      );
    }
  }, [selectedBranchId, payslips]);

  const fetchPayslips = async (resetData: boolean = true) => {
    setLoading(true);
    try {
      const res = await apiRequest.get(`/payroll/payslips/by-payroll/${payrollId}/`);
      const paginatedData = res.data as PaginatedResponse<IPayslip>;

      if (resetData) {
        setPayslips(paginatedData.results);
        setFilteredPayslips(paginatedData.results);
      } else {
        setPayslips((prev) => [...prev, ...paginatedData.results]);
        setFilteredPayslips((prev) => [...prev, ...paginatedData.results]);
      }

      setNextPage(paginatedData.next);
      setHasMore(!!paginatedData.next);

      // Set payroll period details
      const periodRes = await apiRequest.get(`/payroll/payroll-periods/${payrollId}/`);
      setPayrollPeriod(periodRes.data);
    } catch (err) {
      toast.error("Failed to load payslips");
      if (resetData) {
        setPayslips([]);
        setFilteredPayslips([]);
      }
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 1000);
      setRefreshing(false);
    }
  };

  const fetchMorePayslips = async () => {
    if (!nextPage || loading) return;

    try {
      const res = await apiRequest.get(nextPage);
      const paginatedData = res.data as PaginatedResponse<IPayslip>;

      setPayslips((prev) => [...prev, ...paginatedData.results]);
      setNextPage(paginatedData.next);
      setHasMore(!!paginatedData.next);
    } catch (err) {
      toast.error("Failed to load more payslips");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPayslips(true);
  };

  function formatDate(dateStr: string) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {year: "numeric", month: "short", day: "numeric"});
  }

  if (loading) {
    return <PayrollSkeleton />;
  }

  return (
    <div className="mx-auto py-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Coins className="w-6 h-6 text-primary" />
                Payroll Period:{" "}
                <span className="text-primary">{payrollPeriod?.name || `#${payrollId}`}</span>
              </CardTitle>
              <CardDescription>
                {payrollPeriod && (
                  <span>
                    <Calendar className="inline w-4 h-4 mr-1" />
                    {formatDate(payrollPeriod.start_date)} - {formatDate(payrollPeriod.end_date)}
                    <span className="mx-2">|</span>
                    <Info className="inline w-4 h-4 mr-1" />
                    Pay Date: {formatDate(payrollPeriod.pay_date)}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="w-[200px]">
              <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                <SelectTrigger>
                  <Building className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id.toString()}>
                      {b.branch_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {loading && payslips.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
            </div>
          ) : filteredPayslips.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              No payslips found for this payroll period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Gross Pay</TableHead>
                    <TableHead>Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Pay Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayslips.map((payslip, index) => (
                    <TableRow
                      key={payslip.id}
                      ref={index === filteredPayslips.length - 1 ? lastPayslipElementRef : null}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">
                            {payslip.employee.user?.fullname || payslip.employee.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-gray-900">
                          UGX {parseFloat(payslip.gross_salary).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-primary">
                          UGX {parseFloat(payslip.net_salary).toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={payslip.is_paid ? "default" : "secondary"}
                          className={
                            payslip.is_paid
                              ? "bg-green-100 text-green-800 border-green-200"
                              : "bg-yellow-100 text-yellow-800 border-yellow-200"
                          }
                        >
                          {payslip.is_paid ? "Paid" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {formatDate(payslip.payroll_period.pay_date)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="flex items-center gap-1"
                                  onClick={() => {
                                    router.push(`/payroll/payslip/${payslip.id}/items`);
                                  }}
                                >
                                  <Eye className="w-4 h-4" />
                                  View
                                </Button>
                            </DropdownMenuItem>

                            <PDFDownloadLink
                              document={<PayslipPDF payslip={payslip} />}
                              fileName={`payslip-${payslip.employee.user?.fullname}-${payslip.payroll_period.name}.pdf`}
                            >
                              {({blob, url, loading, error}) => (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="flex items-center gap-1"
                                  disabled={loading}
                                >
                                  <Download className="w-4 h-4" />
                                  {loading ? "Generating..." : "Download PDF"}
                                </Button>
                              )}
                            </PDFDownloadLink>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <div className="flex items-center gap-2"></div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {loading && payslips.length > 0 && (
                <div className="flex justify-center items-center py-4">
                  <Loader2 className="animate-spin w-6 h-6 text-muted-foreground" />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
