"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, Eye, Coins, User, Calendar, Info } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import apiRequest from "@/lib/apiRequest"
import { IPayslip, IPayrollPeriod } from "@/app/types/types.utils"

export default function PayrollPeriodDetails() {
    const params = useParams()
    const payrollId = params?.id

    const [payslips, setPayslips] = useState<IPayslip[]>([])
    const [loading, setLoading] = useState(true)
    const [payrollPeriod, setPayrollPeriod] = useState<IPayrollPeriod | null>(null)

    useEffect(() => {
        if (payrollId) {
            fetchPayslips()
        }
    }, [payrollId])

    const fetchPayslips = async () => {
        setLoading(true)
        try {
            // Fetch payslips for this payroll period
            const res = await apiRequest.get(`/payroll/payslips/by-payroll/${payrollId}`)
            const data = res.data
            setPayslips(data.results || [])

            // Set payroll period details from the first payslip if available
            if (data.results && data.results.length > 0) {
                setPayrollPeriod(data.results[0].payroll_period)
            }
        } catch (err) {
            toast.error("Failed to load payslips")
            setPayslips([])
        } finally {
            setLoading(false)
        }
    }

    function formatDate(dateStr: string) {
        if (!dateStr) return ""
        const d = new Date(dateStr)
        return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    }

    return (
        <div className="max-w-5xl mx-auto py-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Coins className="w-6 h-6 text-primary" />
                        Payroll Period: <span className="text-primary">{payrollPeriod?.name || `#${payrollId}`}</span>
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
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
                        </div>
                    ) : payslips.length === 0 ? (
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
                                    {payslips.map((payslip) => (
                                        <TableRow key={payslip.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-muted-foreground" />
                                                    <span className="font-medium">{payslip.employee.user?.fullname || payslip.employee.email}</span>
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
                                                    variant={
                                                        payslip.is_paid
                                                            ? "default"
                                                            : "secondary"
                                                    }
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
                                                <span className="text-sm">{formatDate(payslip.payroll_period.pay_date)}</span>
                                            </TableCell>
                                            <TableCell>
                                                <Link href={`/payroll/payslip/${payslip.id}/items`} passHref legacyBehavior>
                                                    <Button variant="ghost" size="sm" className="flex items-center gap-1">
                                                        <Eye className="w-4 h-4" />
                                                        View
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
