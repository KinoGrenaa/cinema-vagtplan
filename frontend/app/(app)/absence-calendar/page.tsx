"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AdminGuard from "@/app/components/AdminGuard";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { apiFetch } from "@/app/lib/api";
import { dateToLocalMonthString } from "@/app/utils/dateTime";
import AbsenceCalendarGrid from "./components/AbsenceCalendarGrid";
import AbsenceCalendarHeader from "./components/AbsenceCalendarHeader";
import { readErrorMessage } from "./helpers/absenceCalendarHelpers";
import type { LeaveRequest } from "./helpers/absenceCalendarTypes";

export default function AbsenceCalendarPage() {
  const infoDialog = useInfoModal();

  const [requests, setRequests] = useState<LeaveRequest[]>([]);

  const [selectedMonth, setSelectedMonth] = useState(
    dateToLocalMonthString(new Date()),
  );

  const fetchRequests = useCallback(async () => {
    try {
      const response = await apiFetch("/leave-requests");

      if (!response.ok) {
        setRequests([]);

        infoDialog.showError(
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

      infoDialog.showError(
        "Fraværskalenderen kunne ikke hentes",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da fraværskalenderen skulle hentes.",
      );
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

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
        <main className="p-6 max-w-7xl mx-auto space-y-6">
          <AbsenceCalendarHeader
            selectedMonth={selectedMonth}
            onChangeMonth={changeMonth}
          />

          <AbsenceCalendarGrid daysInMonth={daysInMonth} requests={requests} />
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
