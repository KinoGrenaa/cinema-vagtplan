import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtimeCore } from "@/app/hooks/useRealtimeCore";
import { apiFetch } from "@/app/lib/api";
import type { TimeEntry } from "../helpers/myTimeTypes";

type ShowError = (title: string, description: string) => void;

export function useMyTimeEntries(showError: ShowError) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const showErrorRef = useRef(showError);

  useEffect(() => {
    showErrorRef.current = showError;
  }, [showError]);

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);

      const response = await apiFetch("/time-entries/me");

      if (!response.ok) {
        setEntries([]);

        showErrorRef.current(
          "Kunne ikke hente dine timer",
          "Der opstod en fejl, da dine timer skulle hentes. Prøv igen.",
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
  }, []);

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
