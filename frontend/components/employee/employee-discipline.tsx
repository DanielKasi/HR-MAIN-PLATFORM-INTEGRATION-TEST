"use client";

import {useState, useEffect} from "react";
import {Card, CardContent} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {getDisciplinaryActions} from "@/lib/utils";
import {transformDisciplinaryActionData, DisciplinaryAction} from "@/types/types.utils";
import {Calendar, User, AlertCircle, CheckCircle, Clock, XCircle} from "lucide-react";
import {toast} from "sonner";

interface EmployeeDisciplineProps {
  employeeId: string;
  institutionId: number;
}

export default function EmployeeDiscipline({employeeId, institutionId}: EmployeeDisciplineProps) {
  const [disciplinaryActions, setDisciplinaryActions] = useState<DisciplinaryAction[]>([]);
  const [loadingDiscipline, setLoadingDiscipline] = useState(false);

  const fetchDisciplinaryActions = async () => {
    if (!employeeId || !institutionId) return;

    setLoadingDiscipline(true);
    try {
      const response = await getDisciplinaryActions({
        institutionId: institutionId,
        employeeId: employeeId, // Pass employeeId to let backend filter
        page: 1,
      });

      if (response?.results) {
        // Backend already filters by employeeId, so we can use the data directly
        const transformedData = transformDisciplinaryActionData(response.results);
        setDisciplinaryActions(transformedData);
      }
    } catch (error: any) {
      toast.error("Failed to fetch disciplinary actions");
      console.error("Error fetching disciplinary actions:", error);
    } finally {
      setLoadingDiscipline(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "critical":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "in_progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "dismissed":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    const iconClasses = "h-4 w-4";
    switch (status) {
      case "completed":
        return <CheckCircle className={iconClasses} />;
      case "in_progress":
        return <Clock className={iconClasses} />;
      case "pending":
        return <AlertCircle className={iconClasses} />;
      case "dismissed":
        return <XCircle className={iconClasses} />;
      default:
        return <Clock className={iconClasses} />;
    }
  };

  useEffect(() => {
    fetchDisciplinaryActions();
  }, [employeeId, institutionId]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-[#f0f0f6] border-[#e8e8f2]">
          <CardContent className="p-3 md:p-4">
            <div className="text-xs md:text-sm text-[#848496] mb-1">Total Cases</div>
            <div className="text-lg md:text-2xl font-bold text-[#162032]">
              {disciplinaryActions.length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#f0f0f6] border-[#e8e8f2]">
          <CardContent className="p-3 md:p-4">
            <div className="text-xs md:text-sm text-[#848496] mb-1">Pending</div>
            <div className="text-lg md:text-2xl font-bold text-[#e21732]">
              {disciplinaryActions.filter((action) => action.status === "pending").length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#f0f0f6] border-[#e8e8f2]">
          <CardContent className="p-3 md:p-4">
            <div className="text-xs md:text-sm text-[#848496] mb-1">In Progress</div>
            <div className="text-lg md:text-2xl font-bold text-[#0ca0f5]">
              {disciplinaryActions.filter((action) => action.status === "in_progress").length}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-[#f0f0f6] border-[#e8e8f2]">
          <CardContent className="p-3 md:p-4">
            <div className="text-xs md:text-sm text-[#848496] mb-1">Completed</div>
            <div className="text-lg md:text-2xl font-bold text-[#3cb371]">
              {disciplinaryActions.filter((action) => action.status === "completed").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <h3 className="text-lg md:text-xl font-semibold text-[#162032] mb-4">Disciplinary Actions</h3>

      {/* Disciplinary Actions Table */}
      <div className="bg-white rounded-lg overflow-hidden border border-[#e8e8f2]">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#f7f7fb] hover:bg-[#f7f7fb]">
                <TableHead className="font-semibold text-[#162032] py-3 md:py-4 px-2 md:px-6 min-w-[120px] text-xs md:text-sm">
                  Type & Severity
                </TableHead>
                <TableHead className="font-semibold text-[#162032] px-2 md:px-6 min-w-[100px] text-xs md:text-sm">
                  Incident Date
                </TableHead>
                <TableHead className="font-semibold text-[#162032] px-2 md:px-6 min-w-[80px] text-xs md:text-sm">
                  Status
                </TableHead>
                <TableHead className="font-semibold text-[#162032] px-2 md:px-6 min-w-[100px] text-xs md:text-sm">
                  Assigned To
                </TableHead>
                <TableHead className="font-semibold text-[#162032] px-2 md:px-6 min-w-[80px] text-xs md:text-sm">
                  Follow-up
                </TableHead>
                <TableHead className="font-semibold text-[#162032] px-2 md:px-6 min-w-[150px] text-xs md:text-sm">
                  Description
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingDiscipline ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#4426da]"></div>
                      <span className="text-[#848496] text-xs md:text-sm">
                        Loading disciplinary actions...
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : disciplinaryActions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-[#848496] text-xs md:text-sm">
                      No disciplinary actions found for this employee
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                disciplinaryActions.map((action) => (
                  <TableRow key={action.id} className="hover:bg-[#f7f7fb]/50">
                    <TableCell className="py-3 md:py-4 px-2 md:px-6">
                      <div className="space-y-1">
                        <div className="font-medium text-[#162032] text-xs md:text-sm">
                          {action.discipline_type}
                        </div>
                        <Badge
                          variant="outline"
                          className={getSeverityColor(action.discipline_severity)}
                        >
                          {action.discipline_severity.toUpperCase()}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-[#162032] px-2 md:px-6 text-xs md:text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(action.incident_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell className="px-2 md:px-6">
                      <Badge
                        variant="outline"
                        className={`${getStatusColor(action.status)} flex items-center gap-1 w-fit`}
                      >
                        {getStatusIcon(action.status)}
                        {action.status.replace("_", " ").toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-[#162032] px-2 md:px-6 text-xs md:text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {action.assigned_to}
                      </div>
                    </TableCell>
                    <TableCell className="px-2 md:px-6 text-xs md:text-sm">
                      {action.follow_up_required ? (
                        <Badge
                          variant="outline"
                          className="bg-orange-100 text-orange-800 border-orange-200"
                        >
                          {action.follow_up_date
                            ? new Date(action.follow_up_date).toLocaleDateString()
                            : "Required"}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell className="text-[#162032] px-2 md:px-6 text-xs md:text-sm max-w-[200px]">
                      <div className="truncate" title={action.description}>
                        {action.description}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Show Action Taken and Notes for Completed Actions */}
      {disciplinaryActions.some(
        (action) => action.status === "completed" && (action.action_taken || action.notes),
      ) && (
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-[#162032]">Completed Actions</h4>
          {disciplinaryActions
            .filter(
              (action) => action.status === "completed" && (action.action_taken || action.notes),
            )
            .map((action) => (
              <Card key={`completed-${action.id}`} className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h5 className="font-medium text-[#162032]">{action.discipline_type}</h5>
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      {new Date(action.incident_date).toLocaleDateString()}
                    </Badge>
                  </div>
                  {action.action_taken && (
                    <div className="mb-2">
                      <span className="text-sm font-medium text-[#848496]">Action Taken: </span>
                      <span className="text-sm text-[#162032]">{action.action_taken}</span>
                    </div>
                  )}
                  {action.notes && (
                    <div>
                      <span className="text-sm font-medium text-[#848496]">Notes: </span>
                      <span className="text-sm text-[#162032]">{action.notes}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
