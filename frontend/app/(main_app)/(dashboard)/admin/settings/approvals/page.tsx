"use client";

import React, {useEffect, useMemo, useState} from "react";
import Link from "next/link";
import {
  fetchApprovalDocuments,
  fetchApprovableModels,
  deleteApprovalDocument,
} from "@/lib/api/approvals/utils";
import type {ApprovalDocument, ContentTypeLite} from "@/types/approvals.types";
import {Button} from "@/components/ui/button";
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {Input} from "@/components/ui/input";
import {MoreVertical} from "lucide-react";
import {useRouter} from "next/navigation";
import {showErrorToast} from "@/lib/utils";
import {Badge} from "@/components/ui/badge";


const actionsMapper: Array<{
  value:string, label:string
}> = [
  {value:"create", label:"Creation"},
  {value:"edit", label:"Update"},
  {value:"delete", label:"Deletion"},
]

export default function ApprovalsDocumentsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<ApprovalDocument[]>([]);
  const [models, setModels] = useState<ContentTypeLite[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [q, setQ] = useState<string>("");

  // dialog state
  const [open, setOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);

  const refresh = async () => {
    const [docsRes, modelsRes] = await Promise.all([
      fetchApprovalDocuments(),
      fetchApprovableModels(),
    ]);
    setDocs(docsRes?.results || []);
    setModels(modelsRes || []);
  };

  useEffect(() => {
    let mounted = true;
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await refresh();
    } catch (e: any) {
      showErrorToast({error: e, defaultMessage: "Failed to load approval records"});
      setError(e?.message || "Failed to load approval records");
    } finally {
      setLoading(false);
    }
  };

  const filteredDocs = useMemo(() => {
    if (!q) return docs;
    const s = q.toLowerCase();
    return docs.filter((d) =>
      [d.description || "", String(d.content_type_name)].some((v) => v.toLowerCase().includes(s)),
    );
  }, [docs, q]);


  filteredDocs.sort((a, b) => a.content_type_name.localeCompare(b.content_type_name))


  const onCreate = async () => {
    if (!selectedModelId) return;
    setOpen(false);
    setTimeout(()=> router.push(`/admin/settings/approvals/create?content=${selectedModelId}`), 1000);
  };

  const onDelete = async (id: number) => {
    if (!confirm("Delete this approval document?")) return;
    const ok = await deleteApprovalDocument(id);
    if (ok) refresh();
  };

  return (
    <div className="p-4 space-y-4 bg-white rounded-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold capitalize">Objects Bearing approvals</h1>
        <div className="flex items-center justify-end gap-4">
          <Button onClick={()=>router.push("/admin/settings/approvals/approver-groups/")} variant={"outline"} className="rounded-lg">Approver Groups</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-lg">Create / Configure</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[520px] rounded-lg">
            <DialogHeader>
              <DialogTitle>Select Objects to configure</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="text-xs text-gray-600">
                Everything that can bear an approval is listed.
              </div>
              <Select onValueChange={(val) => setSelectedModelId(Number(val))}>
                <SelectTrigger className="rounded-lg w-full">
                  <SelectValue placeholder="Choose a model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((m) => (
                    <SelectItem key={m.id} value={`${m.id}`}>
                      {m.name}
                    </SelectItem>
                  ))}
                  {models.length === 0 && (
                    <div className="px-3 py-2 text-xs text-gray-500">
                      Nothing to configure
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button className="rounded-lg" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                className="rounded-lg"
                onClick={onCreate}
                disabled={!selectedModelId}
              >
                {"Continue"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input
          className="rounded-lg w-full max-w-md"
          placeholder="Search..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading && <div className="text-sm text-gray-600">Loading...</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-center min-w-[10rem]">Number of Levels</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocs.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <div className="flex items-center justify-start gap-4">
                  {d.content_type_name || " -"}
                    {d.actions.map((action, idx) => (
                      <Badge variant={"info"} className="capitalize" key={idx}>{actionsMapper.find(mapped_action => mapped_action.value === action.name)?.label || action.name}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell><div className="truncate text-xs md:text-sm">{d.description }</div> </TableCell>
                <TableCell className="min-w-[10rem]">
                  <p className="text-center">
                    {d.levels?.length || 0}
                  </p>
                  </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" className="rounded-full">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-lg">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/settings/approvals/${d.id}`}>View details</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/settings/approvals/${d.id}/edit/`}>Edit</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDelete(d.id)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
            {!loading && filteredDocs.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-gray-500">
                  No approval documents found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
