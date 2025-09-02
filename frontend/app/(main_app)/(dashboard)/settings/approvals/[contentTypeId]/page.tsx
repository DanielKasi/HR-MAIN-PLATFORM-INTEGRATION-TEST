"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchActions, fetchApprovableModels, createApprovalDocument, fetchApprovalDocuments, createApprovalDocumentLevel, updateApprovalDocument } from "@/lib/api/approvals/utils";
import type { Action, ContentTypeLite, ApprovalDocument } from "@/types/approvals.types";
import { useSelector } from "react-redux";
import { selectSelectedInstitution } from "@/store/auth/selectors";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ApprovalEditorPage() {
  const params = useParams<{ contentTypeId: string }>();
  const contentTypeId = Number(params?.contentTypeId);

  const currentInstitution = useSelector(selectSelectedInstitution);

  const [models, setModels] = useState<ContentTypeLite[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [documents, setDocuments] = useState<ApprovalDocument[]>([]);
  const [selectedActionIds, setSelectedActionIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [savingActions, setSavingActions] = useState(false);
  const [savingLevel, setSavingLevel] = useState(false);

  // Level dialog state
  const [openLevelDialog, setOpenLevelDialog] = useState(false);
  const [newLevelName, setNewLevelName] = useState("");
  const [newLevelDescription, setNewLevelDescription] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);

  // TODO: Replace with real data from Redux (roles and profiles)
  const availableRoles = useSelector((s: any) => s?.roles?.list || []) as Array<{ id: number; name: string }>; // fallback
  const availableUsers = useSelector((s: any) => s?.users?.profiles || []) as Array<{ id: number; user: { fullname: string } }>; // fallback

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const [modelsRes, actionsRes, docsRes] = await Promise.all([
          fetchApprovableModels(),
          fetchActions(),
          fetchApprovalDocuments(),
        ]);
        if (!mounted) return;
        const normalizedActions = Array.isArray(actionsRes)
          ? actionsRes
          : Array.isArray((actionsRes as any).results)
          ? (actionsRes as any).results
          : [];
        setModels(modelsRes);
        setActions(normalizedActions);
        const docs = docsRes?.results || [];
        setDocuments(docs);
        const doc = docs.find((d: ApprovalDocument) => d.content_type === contentTypeId);
        if (doc && Array.isArray(doc.actions)) {
          setSelectedActionIds(doc.actions.map((a) => a.id));
        }
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to load approval data");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [contentTypeId]);

  const model = useMemo(() => models.find((m) => m.id === contentTypeId), [models, contentTypeId]);
  const docForThisModel = useMemo(
    () => documents.find((d) => d.content_type === contentTypeId),
    [documents, contentTypeId]
  );

  const toggleAction = (id: number) => {
    setSelectedActionIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const saveActionsSelection = async () => {
    if (!currentInstitution) {
      setError("Missing institution");
      return;
    }
    try {
      setSavingActions(true);
      let doc = docForThisModel;
      if (!doc) {
        doc = await createApprovalDocument({ institution: currentInstitution.id, content_type: contentTypeId });
      }
      await updateApprovalDocument(doc.id, { actions: selectedActionIds });
      const docsRes = await fetchApprovalDocuments();
      setDocuments(docsRes?.results || []);
    } catch (e: any) {
      setError(e?.message || "Failed to save actions");
    } finally {
      setSavingActions(false);
    }
  };

  const addLevel = async () => {
    if (!docForThisModel) return;
    try {
      setSavingLevel(true);
      const nextLevel = (docForThisModel.levels?.length || 0) + 1;
      const created = await createApprovalDocumentLevel({
        approval_document: docForThisModel.id,
        level: nextLevel,
        name: newLevelName || undefined,
        description: newLevelDescription || undefined,
      });
      const docsRes = await fetchApprovalDocuments();
      setDocuments(docsRes?.results || []);
      // Reset dialog
      setOpenLevelDialog(false);
      setNewLevelName("");
      setNewLevelDescription("");
      setSelectedRoleIds([]);
      setSelectedUserIds([]);
      // NOTE: Persisting approvers/overriders will require backend endpoints to attach groups to this level.
    } catch (e: any) {
      setError(e?.message || "Failed to add level");
    } finally {
      setSavingLevel(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Configure Approvals</h1>
          <p className="text-xs text-gray-600">Select actions that require approval and define ordered approval levels.</p>
        </div>
        <Link href="/settings/approvals" className="text-sm text-blue-600">Back</Link>
      </div>

      {loading && <div className="text-sm text-gray-600">Loading...</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {model && (
        <div className="border rounded-lg p-3">
          <div className="text-sm font-medium mb-2">Target Model</div>
          <div className="text-sm">{model.name} <span className="text-gray-500">({model.app_label}.{model.model})</span></div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="border rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium">Actions Requiring Approval</div>
            <Button className="rounded-lg" variant="outline" disabled={savingActions} onClick={saveActionsSelection}>
              {savingActions ? "Saving..." : "Save"}
            </Button>
          </div>
          <ul className="space-y-2 text-sm">
            {actions.map((a) => (
              <li key={a.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                <div>
                  <div className="font-medium">{a.name}</div>
                  {a.description ? <div className="text-xs text-gray-600">{a.description}</div> : null}
                </div>
                <label className="inline-flex items-center gap-2 text-xs">
                  <input type="checkbox" className="rounded" checked={selectedActionIds.includes(a.id)} onChange={() => toggleAction(a.id)} />
                  Require
                </label>
              </li>
            ))}
            {actions.length === 0 && <li className="text-gray-500">No actions found.</li>}
          </ul>
        </div>

        <div className="border rounded-lg p-3">
          <div className="text-sm font-medium mb-2">Approval Levels</div>
          <div className="text-xs text-gray-600 mb-2">Create ordered levels and assign approver and overrider groups.</div>

          <div className="flex items-center gap-2 mb-2">
            <Dialog open={openLevelDialog} onOpenChange={setOpenLevelDialog}>
              <DialogTrigger asChild>
                <Button className="rounded-lg" variant="outline" disabled={!docForThisModel || savingLevel}>Add Level</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[640px]">
                <DialogHeader>
                  <DialogTitle>Create Approval Level</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div>
                    <div className="text-xs mb-1">Level Name</div>
                    <Input className="rounded-lg" placeholder="Optional name" value={newLevelName} onChange={(e) => setNewLevelName(e.target.value)} />
                  </div>
                  <div>
                    <div className="text-xs mb-1">Description</div>
                    <Input className="rounded-lg" placeholder="Optional description" value={newLevelDescription} onChange={(e) => setNewLevelDescription(e.target.value)} />
                  </div>
                  <div>
                    <div className="text-xs mb-1">Approver Roles</div>
                    <div className="flex flex-wrap gap-2">
                      {availableRoles.map((r) => (
                        <Button
                          key={r.id}
                          variant={selectedRoleIds.includes(r.id) ? "default" : "outline"}
                          className="rounded-lg text-xs"
                          onClick={() => setSelectedRoleIds((prev) => prev.includes(r.id) ? prev.filter((x) => x !== r.id) : [...prev, r.id])}
                        >
                          {r.name}
                        </Button>
                      ))}
                      {availableRoles.length === 0 && <div className="text-xs text-gray-500">No roles loaded</div>}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs mb-1">Approver Users</div>
                    <Select onValueChange={(val) => {
                      const id = Number(val);
                      if (!Number.isNaN(id)) setSelectedUserIds((prev) => prev.includes(id) ? prev : [...prev, id]);
                    }}>
                      <SelectTrigger className="rounded-lg w-full">
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableUsers.map((u) => (
                          <SelectItem key={u.id} value={`${u.id}`}>{u.user?.fullname || `User ${u.id}`}</SelectItem>
                        ))}
                        {availableUsers.length === 0 && <div className="px-3 py-2 text-xs text-gray-500">No users loaded</div>}
                      </SelectContent>
                    </Select>
                    {selectedUserIds.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedUserIds.map((uid) => (
                          <Button key={uid} variant="outline" className="rounded-lg text-xs" onClick={() => setSelectedUserIds((prev) => prev.filter((x) => x !== uid))}>
                            {availableUsers.find((u) => u.id === uid)?.user?.fullname || `User ${uid}`} ×
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <DialogFooter>
                  <Button className="rounded-lg" variant="outline" onClick={() => setOpenLevelDialog(false)}>Cancel</Button>
                  <Button className="rounded-lg" onClick={addLevel} disabled={savingLevel}>{savingLevel ? "Creating..." : "Create Level"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {docForThisModel ? (
            <ol className="space-y-2">
              {docForThisModel.levels?.map((lvl) => (
                <li key={lvl.id} className="border rounded-lg p-2">
                  <div className="text-sm font-medium">Level {lvl.level} {lvl.name ? `- ${lvl.name}` : ""}</div>
                  <div className="text-xs text-gray-600">Approvers: {lvl.approvers?.length || 0} • Overriders: {lvl.overriders?.length || 0}</div>
                </li>
              ))}
              {(!docForThisModel.levels || docForThisModel.levels.length === 0) && (
                <li className="text-xs text-gray-500">No levels yet.</li>
              )}
            </ol>
          ) : (
            <div className="text-xs text-gray-500">Create and save actions first to create a document, then add levels.</div>
          )}
        </div>
      </div>
    </div>
  );
} 