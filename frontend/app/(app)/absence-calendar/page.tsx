"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AdminGuard from "@/app/components/AdminGuard";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import { useAuth } from "@/app/providers/AuthProvider";
import { dateToLocalMonthString } from "@/app/utils/dateTime";
import AbsenceCalendarGrid from "./components/calendar/AbsenceCalendarGrid";
import AbsenceCalendarHeader from "./components/layout/AbsenceCalendarHeader";
import { readErrorMessage } from "./helpers/core/absenceCalendarHelpers";
import type { LeaveRequest } from "./helpers/core/absenceCalendarTypes";

function getSelectedMasterCinemaId() {
  if (typeof window === "undefined") {
    return null;
  }
  const value = window.localStorage.getItem("masterSelectedCinemaId");
  if (!value) {
    return null;
  }
  const parsedId = Number(value);
  return Number.isInteger(parsedId) && parsedId > 0 ? String(parsedId) : null;
}

export default function AbsenceCalendarPage() {
  const router = useRouter();
  const { user } = useAuth();
  const infoDialog = useInfoModal();
  const showErrorRef = useRef(infoDialog.showError);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(
    dateToLocalMonthString(new Date()),
  );

  useEffect(() => {
    showErrorRef.current = infoDialog.showError;
  }, [infoDialog.showError]);

  useEffect(() => {
    function syncSelectedCinema() {
      setSelectedMasterCinemaId(getSelectedMasterCinemaId());
    }

    syncSelectedCinema();
    window.addEventListener("masterSelectedCinemaChanged", syncSelectedCinema);
    window.addEventListener("storage", syncSelectedCinema);

    return () => {
      window.removeEventListener("masterSelectedCinemaChanged", syncSelectedCinema);
      window.removeEventListener("storage", syncSelectedCinema);
    };
  }, []);

  const needsMasterCinemaSelection =
    user?.role === "MASTER" && !user.cinemaId && !selectedMasterCinemaId;

  const fetchRequests = useCallback(async () => {
    if (needsMasterCinemaSelection) {
      setRequests([]);
      return;
    }

    const endpoint =
      user?.role === "MASTER" && !user.cinemaId && selectedMasterCinemaId
        ? `/leave-requests?cinemaId=${encodeURIComponent(selectedMasterCinemaId)}`
        : "/leave-requests";

    try {
      const response = await apiFetch(endpoint);
      if (!response.ok) {
        setRequests([]);
        showErrorRef.current(
          "Fraværskalenderen kunne ikke hentes",
          await readErrorMessage(
            response,
            "Der opstod en fejl, da fraværskalenderen skulle hentes.",
          ),
        );
        return;
      }

      const data = await response.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      setRequests([]);
      showErrorRef.current(
        "Fraværskalenderen kunne ikke hentes",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da fraværskalenderen skulle hentes.",
      );
    }
  }, [needsMasterCinemaSelection, selectedMasterCinemaId, user]);

  useEffect(() => {
    if (!user) {
      return;
    }
    fetchRequests();
  }, [fetchRequests, user]);

  const daysInMonth = useMemo(() => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const lastDay = new Date(year, month, 0).getDate();
    return Array.from({ length: lastDay }, (_, index) => {
      const day = index + 1;
      return `${selectedMonth}-${String(day).padStart(2, "0")}`;
    });
  }, [selectedMonth]);

  function changeMonth(direction: number) {
    const date = new Date(`${selectedMonth}-01T12:00:00`);
    date.setMonth(date.getMonth() + direction);
    setSelectedMonth(dateToLocalMonthString(date));
  }

  return (
    <>
      <AdminGuard>
        <main className="mx-auto max-w-7xl space-y-6 p-6">
          <AbsenceCalendarHeader
            selectedMonth={selectedMonth}
            onChangeMonth={changeMonth}
          />

          {needsMasterCinemaSelection ? (
            <section className="rounded-3xl border border-dashed border-amber-300 bg-amber-50 p-6 text-amber-900 shadow-sm dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100">
              <h2 className="text-xl font-semibold">Ingen aktiv biograf valgt</h2>
              <p className="mt-2 text-sm">
                Vælg en biograf i MASTER-panelet, før du kan se
                fraværskalenderen.
              </p>
              <button
                type="button"
                onClick={() => router.push("/master")}
                className="mt-4 rounded-2xl bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800 dark:bg-amber-200 dark:text-amber-950 dark:hover:bg-amber-100"
              >
                Vælg biograf
              </button>
            </section>
          ) : (
            <AbsenceCalendarGrid daysInMonth={daysInMonth} requests={requests} />
          )}
        </main>
      </AdminGuard>

      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />
    </>
  );
}
