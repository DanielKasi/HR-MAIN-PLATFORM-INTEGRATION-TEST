"use client";

import {useState, useEffect} from "react";
import {Branch} from "@/app/types";
import {apiGet} from "@/lib/apiRequest";
import {useSelector} from "react-redux";
import {selectSelectedInstitution} from "@/store/auth/selectors";

export function useBranches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const currentInstitution = useSelector(selectSelectedInstitution);

  useEffect(() => {
    fetchBranches();
  }, [currentInstitution]);

  const fetchBranches = async () => {
    if (!currentInstitution) {
      setBranches([]);
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const response = await apiGet(`/institution/${currentInstitution.id}/branch`);

      if (response.status !== 200) {
        throw new Error("Failed to fetch branches");
      }

      const data = await response.data.results;
      setBranches(Array.isArray(data) ? data : []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch branches";
      setError(errorMessage);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  return {branches, loading, error};
}
