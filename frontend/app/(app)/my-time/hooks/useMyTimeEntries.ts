import { useCallback, useEffect, useRef, useState } from "react";

import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { apiFetch } from "@/app/lib/api";

import type { TimeEntry } from "../helpers/core/myTimeTypes";

type ShowError = (title: string, description: string) => void;

type UseMyTimeEntriesOptions = {
  disabled?: boolean;
};

export function useMyTimeEntries(
  showError: ShowError,
  options: UseMyTimeEntriesOptions = {},
) {
  const disabled = options.disabled ?? false;

  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const showErrorRef = useRef(showError);

  useEffect(() => {
    showErrorRef.current = showError;
  }, [showError]);

  const fetchEntries = useCallback(async () => {
    if (disabled) {
      setEntries([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await apiFetch("/time-entries/me");

      if (!response.ok) {
        setEntries([]);
        showErrorRef.current(
          "Kunne ikke hente dine timer",
          "Der opstod en fejl, da dine timer skulle hentes.\nPrøv igen.",
        );
        return;
      }

      const data = await response.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setEntries([]);
      showErrorRef.current(
        "Kunne ikke hente dine timer",
        "Der opstod en fejl, da dine timer skulle hentes. Prøv igen.",
      );
    } finally {
      setLoading(false);
    }
  }, [disabled]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  useRealtimeCore({
    onTimeEntry: fetchEntries,
  });

  return {
    entries,
    loading,
    fetchEntries,
  };
}
