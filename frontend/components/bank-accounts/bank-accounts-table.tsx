"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Search, Edit, Trash2, Loader2, Eye, MoreVertical } from "lucide-react"
import type { IBankAccount } from "@/types/types.utils"

interface BankAccountsTableProps {
    bankAccounts: IBankAccount[]
    loading: boolean
    bankAccountToDelete: IBankAccount | null
    onView: (account: IBankAccount) => void
    onEdit: (account: IBankAccount) => void
    onDelete: (account: IBankAccount) => void
    onCreate: () => void
    searchTerm: string
}

export function BankAccountsTable({
    bankAccounts,
    loading,
    bankAccountToDelete,
    onView,
    onEdit,
    onDelete,
    onCreate,
    searchTerm,
}: BankAccountsTableProps) {
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
                    <span className="text-gray-600">Loading bank accounts...</span>
                </div>
            </div>
        )
    }

    return (
        <Table>
            <TableHeader>
                <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="font-semibold text-gray-900 py-4 px-6">Account Name</TableHead>
                    <TableHead className="font-semibold text-gray-900 py-4 px-6">Account Number</TableHead>
                    <TableHead className="font-semibold text-gray-900 py-4 px-6">Created</TableHead>
                    <TableHead className="font-semibold text-gray-900 py-4 px-6 w-[100px] text-center">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {bankAccounts.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center py-12 text-gray-500 bg-white">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                                    <Search className="h-6 w-6 text-gray-400" />
                                </div>
                                {searchTerm ? "No bank accounts found matching your search." : "No bank accounts found."}
                            </div>
                        </TableCell>
                    </TableRow>
                ) : (
                    bankAccounts.map((account, index) => (
                        <TableRow
                            key={account.id}
                            className={`
                bg-white hover:bg-gray-50 transition-colors duration-150 border-b border-gray-100 last:border-b-0
                ${index % 2 === 0 ? "bg-white" : "bg-gray-50/30"}
              `}
                        >
                            <TableCell className="py-4 px-6">
                                <div className="font-medium text-gray-900">{account.account_name}</div>
                            </TableCell>
                            <TableCell className="py-4 px-6">
                                <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
                                    {account.account_number}
                                </Badge>
                            </TableCell>
                            <TableCell className="py-4 px-6">
                                <span className="text-gray-600">{new Date(account.created_at).toLocaleDateString()}</span>
                            </TableCell>
                            <TableCell className="py-4 px-6 text-center">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                                            disabled={bankAccountToDelete?.id === account.id}
                                        >
                                            {bankAccountToDelete?.id === account.id ? (
                                                <Loader2 className="h-4 w-4 animate-spin text-gray-600" />
                                            ) : (
                                                <MoreVertical className="h-4 w-4 text-gray-600" />
                                            )}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48 bg-white border border-gray-200 shadow-lg">
                                        <DropdownMenuItem
                                            onClick={() => onView(account)}
                                            className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer"
                                        >
                                            <Eye className="h-4 w-4 mr-3 text-gray-500" />
                                            View details
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => onEdit(account)}
                                            className="flex items-center px-3 py-2 text-gray-700 hover:bg-gray-50 cursor-pointer"
                                        >
                                            <Edit className="h-4 w-4 mr-3 text-gray-500" />
                                            Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => onDelete(account)}
                                            className="flex items-center px-3 py-2 text-red-600 hover:bg-red-50 cursor-pointer"
                                        >
                                            <Trash2 className="h-4 w-4 mr-3 text-red-500" />
                                            Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))
                )}
            </TableBody>
        </Table>
    )
}
