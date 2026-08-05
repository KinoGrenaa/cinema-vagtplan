"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useApi } from "@/app/hooks/useApi";
import { useAuth } from "@/app/providers/AuthProvider";

const MASTER_SELECTED_CINEMA_ID_KEY =
  "masterSelectedCinemaId";

export type ScheduleJobFunctionTimingPreview = {
  date: string;
  jobFunction: {
    id: number;
    name: string;
    color: string;
  };
  usedFallback: boolean;
  startMinute: number;
  endMinute: number;
  startTime: string;
  endTime: string;
  sourceMovieShowingIds: number[];
  sourceMovieShowings: Array<{
    id: number;
    title: string;
    startTime: string;
    endTime: string;
  }>;
};

type Params = {
  enabled: boolean;
  selectedDate: string;
  jobFunctionId: number | null;
};

function readSelectedMasterCinemaId() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = Number(
    window.localStorage.getItem(
      MASTER_SELECTED_CINEMA_ID_KEY,
    ),
  );

  return Number.isInteger(value) && value > 0
    ? value
    : null;
}

async function readErrorMessage(
  response: Response,
) {
  const payload = await response
    .json()
    .catch(() => null);

  return typeof payload?.message === "string"
    ? payload.message
    : "Vagtens tider kunne ikke beregnes.";
}

export function useScheduleJobFunctionTimingPreview({
  enabled,
  selectedDate,
  jobFunctionId,
}: Params) {
  const { apiFetch } = useApi();
  const { user } = useAuth();
  const [
    cinemaSelectionVersion,
    setCinemaSelectionVersion,
  ] = useState(0);
  const [
    preview,
    setPreview,
  ] =
    useState<ScheduleJobFunctionTimingPreview | null>(
      null,
    );
  const [
    loading,
    setLoading,
  ] = useState(false);
  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
    function handleCinemaSelectionChange() {
      setCinemaSelectionVersion(
        (current) => current + 1,
      );
    }

    window.addEventListener(
      "storage",
      handleCinemaSelectionChange,
    );
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
    void cinemaSelectionVersion;

    if (
      !enabled ||
      !user ||
      !jobFunctionId
    ) {
      return null;
    }

    const base =
      `/job-functions/${jobFunctionId}/resolve-time-preview`;

    if (
      user.role === "MASTER" &&
      !user.cinemaId
    ) {
      const cinemaId =
        readSelectedMasterCinemaId();

      return cinemaId
        ? `${base}?cinemaId=${cinemaId}`
        : null;
    }

    return base;
  }, [
    cinemaSelectionVersion,
    enabled,
    jobFunctionId,
    user,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function fetchPreview() {
      if (!endpoint) {
        setPreview(null);
        setLoading(false);
        setError(null);
        return;
      }

      setPreview(null);
      setLoading(true);
      setError(null);

      try {
        const response = await apiFetch(
          endpoint,
          {
            method: "POST",
            body: JSON.stringify({
              date: selectedDate,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(
              response,
            ),
          );
        }

        const data =
          (await response.json()) as
            ScheduleJobFunctionTimingPreview;

        if (!cancelled) {
          setPreview(data);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setPreview(null);
          setError(
            fetchError instanceof Error
              ? fetchError.message
              : "Vagtens tider kunne ikke beregnes.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void fetchPreview();

    return () => {
      cancelled = true;
    };
  }, [
    apiFetch,
    endpoint,
    selectedDate,
  ]);

  return {
    preview,
    loading,
    error,
  };
}
