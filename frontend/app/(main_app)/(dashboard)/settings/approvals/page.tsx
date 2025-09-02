"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchApprovableModels } from "@/lib/api/approvals/utils";
import { ContentTypeLite } from "@/types/approvals.types";


export default function ApprovalsModelsPage() {
  const [models, setModels] = useState<ContentTypeLite[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [q, setQ] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchApprovableModels();
        if (mounted) setModels(data);
      } catch (e: any) {
        if (mounted) setError(e?.message || "Failed to load approvable models");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!q) return models;
    const s = q.toLowerCase();
    return models.filter((m) =>
      [m.name, m.plural_name, m.app_label, m.model].some((v) => v.toLowerCase().includes(s))
    );
  }, [models, q]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Approvals Configuration</h1>
      </div>
      <p className="text-sm text-gray-600">Select a model to configure which actions require approval and define approval levels.</p>

      <div className="flex items-center gap-2">
        <input
          className="border rounded px-3 py-2 text-sm w-full max-w-md"
          placeholder="Search models by name, plural name, app label, or model"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading && <div className="text-sm text-gray-600">Loading...</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      <div className="border rounded overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">App</th>
              <th className="text-left p-2">Model</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="p-2">{m.name}</td>
                <td className="p-2">{m.app_label}</td>
                <td className="p-2">{m.model}</td>
                <td className="p-2">
                  <Link
                    className="inline-flex px-3 py-1.5 bg-blue-600 text-white rounded text-xs"
                    href={`/settings/approvals/${m.id}`}
                  >
                    Configure
                  </Link>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={4}>
                  No approvable models found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 