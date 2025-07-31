"use client";

import {useState, useEffect} from "react";
import Link from "next/link";
import {Plus, Search, Eye, Edit, Trash2} from "lucide-react";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {ISeparationPolicy} from "@/app/types/types.utils";
import apiRequest from "@/lib/apiRequest";

export default function SeparationPoliciesPage() {
  const [separationPolicies, setSeparationPolicies] = useState<ISeparationPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    policy: ISeparationPolicy | null;
  }>({
    open: false,
    policy: null,
  });

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const response = await apiRequest.get("/on-boarding/separation-policies/");
      if (response.status !== 200) {
        throw new Error("Failed to fetch separation policies");
      }
      const data = await response.data.results;
      setSeparationPolicies(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (policy: ISeparationPolicy) => {
    try {
      await apiRequest.delete(`/on-boarding/separation-policies/${policy.id}/`);
      setDeleteDialog({open: false, policy: null});
      fetchPolicies();
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Separation Policies</h1>
          <p className="text-muted-foreground">Manage institutional separation policies</p>
        </div>
        <Link href="/off-boarding/separation-policy/add">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Policy
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Policies ({separationPolicies.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : separationPolicies.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              No policies found.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Separation Type</TableHead>
                  <TableHead>Notice Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Enforcement</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {separationPolicies.map((policy) => (
                  <TableRow key={policy.id}>
                    <TableCell>{policy.separation_type?.separation_type || "N/A"}</TableCell>
                    <TableCell>
                      {policy.min_notice_days} - {policy.max_notice_days} days
                    </TableCell>
                    <TableCell>
                      <Badge variant={policy.is_active ? "default" : "secondary"}>
                        {policy.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={policy.enforce_policy ? "destructive" : "outline"}>
                        {policy.enforce_policy ? "Enforced" : "Not Enforced"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/separation-policies/${policy.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link href={`/separation-policies/${policy.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteDialog({open: true, policy})}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog({open, policy: null})}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Policy</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this separation policy? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({open: false, policy: null})}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteDialog.policy && handleDelete(deleteDialog.policy)}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
