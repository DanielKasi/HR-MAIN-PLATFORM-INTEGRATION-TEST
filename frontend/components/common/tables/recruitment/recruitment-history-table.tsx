import { IOnBoarding } from "@/types/types.utils";
import { PaginatedTableWrapper } from "../paginated-table-wrapper";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, getInitials } from "@/lib/helpers";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

import { Briefcase, CheckCircle, XCircle, Calendar, Phone, MapPin, MoreVertical, Eye, Users, Mail, FileText } from "lucide-react";
import { TableSkeleton } from "../../table-skeleton";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { useSelector } from "react-redux";
import { getPaginatedOnBoardings, getPaginatedOnBoardingsFromUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";


interface RecruitmentHistoryTableProps {
    searchTerm?: string;
}

export function RecruitmentHistoryTable({searchTerm}:RecruitmentHistoryTableProps) {

    const selectedInstitution = useSelector(selectSelectedInstitution);

const getApplicationData = (onboarding: IOnBoarding) => {
  const applicationData = onboarding.application_details;

  if (!applicationData) {
    return {
      applicantName: "N/A",
      applicantEmail: "N/A",
      jobDesc: "N/A",
      applicantPhone: "N/A",
      applicantAddress: "N/A",
      applicantPositions: "N/A",
      department: "N/A",
    };
  }

  const jobDetails = applicationData.job_position_advert_job_details;
  const jobName = jobDetails?.name || "N/A";
  const jobDescription = jobDetails?.description || "N/A";
  const department = jobDetails?.department || "N/A";

  return {
    applicantName: applicationData.applicant_name || "N/A",
    applicantEmail: applicationData.applicant_email || "N/A",
    jobDesc: jobName !== "N/A" ? jobName : jobDescription,
    applicantPhone: applicationData.applicant_phone || "N/A",
    applicantAddress: applicationData.address || "N/A",
    applicantPositions: applicationData.positions?.toString() || "N/A",
    department: department,
  };
};

    return (

        <PaginatedTableWrapper<IOnBoarding>
            fetchFirstPage={async () => {
                if(!selectedInstitution) {throw new Error("No organisation found !")};
                return await getPaginatedOnBoardings({institutionId:selectedInstitution.id, search:searchTerm})
            }}

            fetchFromUrl={async (args:{url: string}) => {
                return await getPaginatedOnBoardingsFromUrl({url:args.url})
            }}
            deps={[selectedInstitution?.id, searchTerm]}
            className="space-y-4"
            footerClassName="pt-4"
         >
            {({data, loading, refresh}) => {

                if(loading){
                    return (
                        <TableSkeleton rows={10} columns={7} />
                    )
                }


return (
                <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Candidate</TableHead>
                        <TableHead>Position Applied</TableHead>
                        {/* <TableHead>Current Employee</TableHead> */}
                        <TableHead>Recruitment Date</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead className="w-[80px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data?.results.map((onboarding) => {
                        const {
                          applicantName,
                          applicantEmail,
                          jobDesc,
                          applicantPhone,
                          applicantAddress,
                          department: jobDepartment,
                        } = getApplicationData(onboarding);

                        return (
                          <TableRow key={onboarding.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs">
                                    {getInitials(applicantName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{applicantName}</p>
                                  <p className="text-xs text-muted-foreground">{applicantEmail}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium text-sm">{jobDesc}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                {formatDate(onboarding.updated_at)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {applicantPhone}
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                  <MapPin className="h-3 w-3" />
                                  <span className="truncate max-w-[100px]">{applicantAddress}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm max-w-[150px] truncate">
                                {onboarding.remarks || "Successfully recruited"}
                              </div>
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  {/* {currentEmployee && (
                                    <DropdownMenuItem>
                                      <Users className="h-4 w-4 mr-2" />
                                      View Employee Profile
                                    </DropdownMenuItem>
                                  )} */}
                                  <DropdownMenuItem>
                                    <Mail className="h-4 w-4 mr-2" />
                                    Send Email
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>
                                    <FileText className="h-4 w-4 mr-2" />
                                    Export Record
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
)
            }}  

        </PaginatedTableWrapper>

    );
}