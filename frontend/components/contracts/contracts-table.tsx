import {handleDownload, getFileUrl, getFileName, formatDate} from "@/lib/helpers";
import {
  getContracts,
  getPaginatedContractsFromUrl,
  updateContract,
  approveContract,
} from "@/lib/utils";
import {selectSelectedInstitution} from "@/store/auth/selectors";
import {IContract} from "@/types/types.utils";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  CheckCircle2,
  Clock,
  Calendar,
  Download,
  Upload,
  MoreVertical,
  Edit,
} from "lucide-react";
import {Badge} from "../ui/badge";
import {Input} from "../ui/input";
import {useState, useEffect} from "react";
import {Button} from "../ui/button";
import {useSelector} from "react-redux";
import {toast} from "sonner";
import {TableSkeleton} from "../common/table-skeleton";
import {PaginatedTableWrapper} from "../common/tables/paginated-table-wrapper";
import {Card, CardContent} from "../ui/card";
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from "../ui/dialog";
import {TableHeader, TableRow, TableHead, TableBody, TableCell, Table} from "../ui/table";

interface ContractsTableProps {
  searchTerm?: string;
  scope: {type: "default"} | {type: "employee"; employeeId: number | string};
}

export function ContractsTable({searchTerm, scope}: ContractsTableProps) {
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const institutionId = selectedInstitution?.id;

  const [uploadingId, setUploadingId] = useState<number | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [selectedContract, setSelectedContract] = useState<IContract | null>(null);
  const [isDifferenceDialogShwown, setIsDifferenceDialogShown] = useState(false);

  useEffect(() => {
    if (!isDifferenceDialogShwown) {
      setSelectedContract(null);
    }
  }, [isDifferenceDialogShwown]);

  const getContractName = (contract: IContract) => {
    if (contract.employee) {
      return contract.employee.user?.fullname || "—";
    }
    if (contract.applicant) {
      return contract.applicant.applicant_name || "—";
    }
    return "—";
  };

  return (
    <PaginatedTableWrapper<IContract>
      fetchFirstPage={async () => {
        if (!institutionId) throw new Error("No institution selected");
        if (scope.type === "employee") {
          return await getContracts({
            institutionId: Number(institutionId),
            page: 1,
            search: searchTerm || undefined,
            employeeId: Number(scope.employeeId),
          });
        }
        return await getContracts({
          institutionId: Number(institutionId),
          page: 1,
          search: searchTerm || undefined,
        });
      }}
      fetchFromUrl={async ({url}) => await getPaginatedContractsFromUrl({url})}
      deps={[institutionId, searchTerm]}
      className="space-y-4"
    >
      {({data, loading, refresh}) => {
        const contracts = data?.results || [];

        const handleFileUpload = async (contractId: number, file: File) => {
          setUploadingId(contractId);
          try {
            const result = await updateContract({
              contractId,
              contractData: {signed_contract: file},
            });

            if (result) {
              toast.success("Upload successful", {
                description: "Signed contract has been uploaded successfully.",
              });
              await refresh();
            } else {
              throw new Error("Upload failed");
            }
          } catch (error) {
            toast.error("Upload failed", {
              description: "Failed to upload the signed contract. Please try again.",
            });
          } finally {
            setUploadingId(null);
          }
        };

        const handleApproval = async (contractId: number) => {
          setApprovingId(contractId);
          try {
            const result = await approveContract({contractId});
            if (result) {
              toast.success("Contract approved", {
                description: "Contract has been approved and marked as active.",
              });
              await refresh();
            } else {
              throw new Error("Approval failed");
            }
          } catch (error) {
            toast.error("Approval failed", {
              description: "Failed to approve the contract. Please try again.",
            });
          } finally {
            setApprovingId(null);
          }
        };

        if (loading) {
          return (
            <Card className="border-none shadow-none">
              <TableSkeleton rows={8} columns={7} />
            </Card>
          );
        }

        if (contracts.length === 0) {
          return (
            <Card className="border-none shadow-none">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No contracts found</h3>
                <p className="text-muted-foreground text-center">
                  There are no contracts available at the moment.
                </p>
              </CardContent>
            </Card>
          );
        }

        return (
          <Card className="overflow-hidden border-none shadow-none">
            <div className="w-full max-w-full overflow-x-auto bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contract Reference</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="min-w-[8rem]">Original Contract</TableHead>
                    <TableHead>Signed Contract</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contracts.map((contract) => (
                    <TableRow
                      key={contract.id}
                      className="bg-white hover:bg-gray-50 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{contract.contract_reference}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{getContractName(contract)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {contract.is_active ? (
                            <Badge
                              variant="default"
                              className="bg-green-100 text-green-800 hover:bg-green-200"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge
                              variant="secondary"
                              className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{formatDate(contract.created_at)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[8rem]">
                        {contract.original_contract ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDownload(
                                getFileUrl(contract.original_contract as string),
                                getFileName(contract.original_contract as string),
                              )
                            }
                            className="h-8 !text-xs"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            <span> {getFileName(contract.original_contract as string)}</span>
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">Not available</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contract.signed_contract ? (
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleDownload(
                                  getFileUrl(contract.signed_contract as string),
                                  getFileName(contract.signed_contract as string),
                                )
                              }
                              className="h-8 !text-xs"
                            >
                              <Download className="h-3 w-3 mr-1" />
                              <span>{getFileName(contract.signed_contract as string)}</span>
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 min-w-[140px]">
                            <Input
                              type="file"
                              accept=".pdf,.doc,.docx"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleFileUpload(contract.id, file);
                                }
                              }}
                              disabled={uploadingId === contract.id}
                              id={`file-upload-${contract.id}`}
                            />
                            <div className="flex items-center gap-2">
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={uploadingId === contract.id}
                                className="h-8"
                                onClick={() => {
                                  const input = document.getElementById(
                                    `file-upload-${contract.id}`,
                                  ) as HTMLInputElement;
                                  input?.click();
                                }}
                              >
                                <Upload className="h-3 w-3 mr-1" />
                                {uploadingId === contract.id ? (
                                  <>
                                    <span className="animate-spin mr-1">⌛</span>
                                    Uploading...
                                  </>
                                ) : (
                                  "Choose & Upload"
                                )}
                              </Button>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Accepts PDF, DOC, or DOCX
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-muted/50"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem
                              disabled={!!contract.is_active}
                              className="hover:bg-muted/50"
                            >
                              {!contract.is_active ? (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleApproval(contract.id)}
                                  disabled={
                                    approvingId === contract.id || !contract.signed_contract
                                  }
                                  className="h-8 w-full"
                                >
                                  {approvingId === contract.id ? "Approving..." : "Approve"}
                                </Button>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-green-600 border-green-600"
                                >
                                  Approved
                                </Badge>
                              )}
                            </DropdownMenuItem>
                            {!!contract.differences && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setIsDifferenceDialogShown(true);
                                  setSelectedContract(contract);
                                }}
                                className="hover:bg-muted/50"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                View differences
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {selectedContract && (
              <Dialog open={isDifferenceDialogShwown} onOpenChange={setIsDifferenceDialogShown}>
                <DialogContent className="w-full max-w-[500px] md:max-w-2xl lg:max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>See Differences between the contract documents</DialogTitle>
                    <DialogDescription>
                      See here the differences found between the contract documents
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4  p-8 overflow-y-auto max-h-[70svh]">
                    <div className="space-y-2">{selectedContract.differences}</div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </Card>
        );
      }}
    </PaginatedTableWrapper>
  );
}

export default ContractsTable;
("");
