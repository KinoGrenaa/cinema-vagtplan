"use client";

import { useEffect, useMemo, useState } from "react";
import { useApi } from "@/app/hooks/useApi";
import { useAuth } from "@/app/providers/AuthProvider";

const MASTER_SELECTED_CINEMA_ID_KEY = "masterSelectedCinemaId";

export type ScheduleJobFunction = {
  id: number;
  name: string;
  color: string;
  sortOrder?: number;
  isActive: boolean;
  workTypeId?: number | null;
  workType?: {
    id: number;
    name: string;
    isActive?: boolean;
  } | null;
};

function getSelectedMasterCinemaId() {
  if (typeof window === "undefined") {
    return null;
  }

  const cinemaId = Number(
    localStorage.getItem(MASTER_SELECTED_CINEMA_ID_KEY),
  );

  if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
    return null;
  }

  return cinemaId;
}

export function useScheduleJobFunctions(enabled: boolean) {
  const { apiFetch } = useApi();
  const { user } = useAuth();
  const [selectionVersion, setSelectionVersion] = useState(0);
  const [jobFunctions, setJobFunctions] = useState<
    ScheduleJobFunction[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function handleCinemaSelectionChange() {
      setSelectionVersion((current) => current + 1);
    }

    window.addEventListener("storage", handleCinemaSelectionChange);
    window.addEventListener(
      "masterSelectedCinemaChanged",
      handleCinemaSelectionChange,
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleCinemaSelectionChange,
      );
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        handleCinemaSelectionChange,
      );
    };
  }, []);

  const endpoint = useMemo(() => {
    void selectionVersion;

    if (!enabled || !user) {
      return null;
    }

    if (user.role === "MASTER" && !user.cinemaId) {
      const cinemaId = getSelectedMasterCinemaId();

      if (!cinemaId) {
        return null;
      }

      return `/job-functions?cinemaId=${cinemaId}`;
    }

    return "/job-functions";
  }, [enabled, selectionVersion, user]);

  useEffect(() => {
    let cancelled = false;

    async function fetchJobFunctions() {
      if (!endpoint) {
        setJobFunctions([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await apiFetch(endpoint);

        if (!response.ok) {
          const payload = await response.json().catch(() => null);

          throw new Error(
            typeof payload?.message === "string"
              ? payload.message
              : "Jobfunktioner kunne ikke hentes.",
          );
        }

        const payload = await response.json();
        const nextJobFunctions: ScheduleJobFunction[] =
          Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.jobFunctions)
              ? payload.jobFunctions
              : [];

        if (!cancelled) {
          setJobFunctions(nextJobFunctions);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setJobFunctions([]);
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Jobfunktioner kunne ikke hentes.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchJobFunctions();

    return () => {
      cancelled = true;
    };
  }, [apiFetch, endpoint]);

  return {
    jobFunctions,
    loading,
    error,
  };
}
