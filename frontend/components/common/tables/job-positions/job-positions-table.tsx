"use client";

import {useState, useEffect, RefObject, useRef} from "react";
import {useRouter} from "next/navigation";
import {useSelector} from "react-redux";
import {Badge} from "@/components/ui/badge";
import {Button} from "@/components/ui/button";

import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";

import {Skeleton} from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  MoreVertical,
  Edit,
  Trash2,
} from "lucide-react";

import {selectSelectedInstitution} from "@/store/auth/selectors";
import {
  getPaginatedJobPositionsFromUrl,
  getPaginatedJobPositions,
  showErrorToast,
  deleteJobPosition,
} from "@/lib/utils";
import {
  type IJobPosition,
  PERMISSION_CODES,
} from "@/types/types.utils";
import {toast} from "sonner";
import {formatCurrency} from "@/lib/helpers";
import {PaginatedTableWrapper} from "@/components/common/tables/paginated-table-wrapper";

import ProtectedComponent from "@/components/ProtectedComponent";
import {ConfirmationDialog} from "@/components/confirmation-dialog";


interface IJobPositionsTableProps {
  searchTerm?: string;
  setCurrentJobPostions: (positions: IJobPosition[]) => void;
  setJobPositionsCount?: (count: number) => void;
  refreshFunctionRef?: RefObject<(() => Promise<void>) | null>;
}

export function JobPositionsTable({
  searchTerm,
  setCurrentJobPostions,
  setJobPositionsCount,
  refreshFunctionRef,
}: IJobPositionsTableProps) {
  const selectedInstitution = useSelector(selectSelectedInstitution);
  const localRefreshRef = refreshFunctionRef || useRef<(() => Promise<void>) | null>(null);
  const [positionToDelete, setPositionToDelete] = useState<IJobPosition | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleEditJobPosition = (position: IJobPosition) => {
    router.push(`/job-positions/${position.id}/edit`);
  };

  const handleDeleteJobPosition = (position: IJobPosition) => {
    setPositionToDelete(position);
  };

  const confirmDelete = async () => {
    if (!positionToDelete?.id) return;
    setIsDeleting(true);
    try {
      await deleteJobPosition({jobPositionId: positionToDelete.id});
      toast.success("Job position deleted successfully");
      localRefreshRef.current?.()
    } catch (error) {
      showErrorToast({error, defaultMessage: "Failed to delete job position"});
    } finally {
      setPositionToDelete(null);
      setIsDeleting(false);
    }
  };

  const handleViewJobPosition = (position: IJobPosition) => {
    router.push(`/job-positions/${position.id}`);
  };

  return (
    <>
      <PaginatedTableWrapper<IJobPosition>
        fetchFirstPage={async () => {
          if (!selectedInstitution) {
            throw new Error("No institution found !");
          }
          return await getPaginatedJobPositions({
            institutionId: selectedInstitution.id,
            search: searchTerm,
          });
        }}
        fetchFromUrl={async (args: {url: string}) => getPaginatedJobPositionsFromUrl(args.url)}
        deps={[selectedInstitution?.id, searchTerm]}
        className="space-y-4"
        footerClassName="pt-4"
      >
        {({data, loading, refresh}) => {
          useEffect(() => {
            setCurrentJobPostions(data?.results || []);
            if(data?.count){
              setJobPositionsCount?.(data.count);
            }
          }, [data]);

          localRefreshRef.current = refresh;

          if (loading) {
            return (
              <Table className="min-w-[800px] mt-10">
                <TableHeader>
                  <TableRow className="border-b">
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Salary Range</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reports To</TableHead>
                    <TableHead>Templates</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...Array(5)].map((_, i) => (
                    <TableRow key={i} className="border-b">
                      <TableCell>
                        <Skeleton className="h-6 w-3/4" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-1/2" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            );
          }

          return (
            <div className="overflow-x-auto">
              <Table className="min-w-[800px]">
                <TableHeader>
                  <TableRow className="border-b bg-muted/30">
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Salary Range</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reports To</TableHead>
                    <TableHead>Templates</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.results.map((position) => (
                    <TableRow
                      key={position.id}
                      className="hover:bg-muted/50 transition-colors border-b"
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <span>{position.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{position.department_details?.name}</Badge>
                      </TableCell>
                      <TableCell>
                        {position?.salary_min && position?.salary_max ? (
                          <span>
                            {formatCurrency(position.salary_min)} -{" "}
                            {formatCurrency(position.salary_max)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            position.job_position_status === "active" ? "success" : "destructive"
                          }
                        >
                          {position.job_position_status}
                        </Badge>
                      </TableCell>
                      <TableCell>{position.reports_to_details?.name || "-"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {position.contract_template && (
                            <Badge variant="outline" className="text-xs">
                              Contract
                            </Badge>
                          )}
                          {position.offer_letter_template && (
                            <Badge variant="outline" className="text-xs">
                              Offer Letter
                            </Badge>
                          )}
                          {!position.contract_template && !position.offer_letter_template && "-"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <ProtectedComponent
                              permissionCode={PERMISSION_CODES.CAN_VIEW_JOB_POSITIONS}
                            >
                              <DropdownMenuItem onClick={() => handleViewJobPosition(position)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                            </ProtectedComponent>
                            <ProtectedComponent
                              permissionCode={PERMISSION_CODES.CAN_EDIT_JOB_POSITIONS}
                            >
                              <DropdownMenuItem onClick={() => handleEditJobPosition(position)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            </ProtectedComponent>
                            <ProtectedComponent
                              permissionCode={PERMISSION_CODES.CAN_DELETE_JOB_POSITIONS}
                            >
                              <DropdownMenuItem
                                onClick={() => handleDeleteJobPosition(position)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </ProtectedComponent>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          );
        }}
      </PaginatedTableWrapper>

      {/* Delete Confirmation Dialog */}

      <ConfirmationDialog
        description={`Are you sure you want to delete ${positionToDelete?.name || "this job position"} ? This action cannot be undone.`}
        disabled={isDeleting}
        isOpen={!!positionToDelete}
        title={`Delete ${positionToDelete?.name || "Job position"}`}
        onConfirm={confirmDelete}
        onClose={() => {
          setPositionToDelete(null);
        }}
      />
    </>
  );
}
