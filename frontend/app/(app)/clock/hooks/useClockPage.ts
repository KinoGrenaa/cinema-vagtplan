import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import type { CurrentUser, Shift, TimeEntry } from "../../../../../shared/types";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import { getTodayLocalDate } from "@/app/utils/dateTime";
import { toast } from "sonner";

import { calculateTotalHours, readErrorMessage } from "../helpers/clockHelpers";

function isGlobalMasterUser(user: CurrentUser | null) {
  return user?.role === "MASTER" && !user.cinemaId;
}

export function useClockPage() {
  const infoDialog = useInfoModal();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
  const [selectedShiftId, setSelectedShiftId] = useState<number | null>(null);
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchEntries = useCallback(
    async (userId: number, showError = true) => {
      try {
        const response = await apiFetch(`/time-entries?userId=${userId}`);

        if (!response.ok) {
          setEntries([]);

          if (showError) {
            infoDialog.showError(
              "Tidsregistreringer kunne ikke hentes",
              await readErrorMessage(
                response,
                "Der opstod en fejl, da tidsregistreringerne skulle hentes.",
              ),
            );
          }

          return;
        }

        const data = await response.json();
        setEntries(Array.isArray(data) ? data : []);
      } catch (error) {
        setEntries([]);

        if (showError) {
          infoDialog.showError(
            "Tidsregistreringer kunne ikke hentes",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl, da tidsregistreringerne skulle hentes.",
          );
        }
      }
    },
    [],
  );

  const fetchTodayShifts = useCallback(
    async (userId: number, showError = true) => {
      try {
        const today = getTodayLocalDate();
        const response = await apiFetch(`/shifts?date=${today}`);

        if (!response.ok) {
          setTodayShifts([]);

          if (showError) {
            infoDialog.showError(
              "Dagens vagter kunne ikke hentes",
              await readErrorMessage(
                response,
                "Der opstod en fejl, da dagens vagter skulle hentes.",
              ),
            );
          }

          return;
        }

        const data = await response.json();
        const myShifts = Array.isArray(data)
          ? data.filter((shift) => shift.user?.id === userId)
          : [];

        setTodayShifts(myShifts);
      } catch (error) {
        setTodayShifts([]);

        if (showError) {
          infoDialog.showError(
            "Dagens vagter kunne ikke hentes",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl, da dagens vagter skulle hentes.",
          );
        }
      }
    },
    [],
  );

  useEffect(() => {
    const savedUser = localStorage.getItem("user");

    if (!savedUser) {
      window.location.href = "/";
      return;
    }

    try {
      const parsedUser: CurrentUser = JSON.parse(savedUser);
      setCurrentUser(parsedUser);

      if (isGlobalMasterUser(parsedUser)) {
        setEntries([]);
        setTodayShifts([]);
        return;
      }

      fetchEntries(parsedUser.id);
      fetchTodayShifts(parsedUser.id, false);
    } catch {
      localStorage.removeItem("user");
      window.location.href = "/";
    }
  }, [fetchEntries, fetchTodayShifts]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser) return;

    if (isGlobalMasterUser(currentUser)) {
      infoDialog.showError(
        "Tidsregistrering kræver biografbruger",
        "MASTER er en global systemrolle og kan ikke registrere egen mødetid/fyraften uden at være tilknyttet en biograf.",
      );
      return;
    }

    try {
      setLoading(true);

      const response = await apiFetch("/time-entries", {
        method: "POST",
        body: JSON.stringify({
          userId: currentUser.id,
          shiftId: selectedShiftId,
          clockIn: new Date(clockIn).toISOString(),
          clockOut: clockOut ? new Date(clockOut).toISOString() : null,
          note,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Der opstod en fejl, da tiden skulle registreres. Prøv igen.",
          ),
        );
      }

      setSelectedShiftId(null);
      setClockIn("");
      setClockOut("");
      setNote("");
      await fetchEntries(currentUser.id);
      toast.success("Tid registreret.");
    } catch (error) {
      infoDialog.showError(
        "Tiden kunne ikke registreres",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da tiden skulle registreres. Prøv igen.",
      );
    } finally {
      setLoading(false);
    }
  }

  const totalHours = useMemo(() => calculateTotalHours(entries), [entries]);
  const isGlobalMaster = isGlobalMasterUser(currentUser);

  return {
    infoDialog,
    entries,
    todayShifts,
    selectedShiftId,
    clockIn,
    clockOut,
    note,
    loading,
    totalHours,
    isGlobalMaster,
    setSelectedShiftId,
    setClockIn,
    setClockOut,
    setNote,
    handleSubmit,
  };
}
