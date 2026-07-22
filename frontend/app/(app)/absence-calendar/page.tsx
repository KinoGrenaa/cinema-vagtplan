"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import AdminGuard from "@/app/components/access/AdminGuard";
import InfoModal from "@/app/components/modals/InfoModal";

import AbsenceCalendarGrid from "./components/calendar/AbsenceCalendarGrid";
import AbsenceCalendarOverview from "./components/calendar/AbsenceCalendarOverview";
import AbsenceCalendarHeader from "./components/layout/AbsenceCalendarHeader";
import {
  filterAbsenceRequests,
  getAbsenceCalendarSummary,
  getTodayDateKey,
} from "./helpers/core/absenceCalendarHelpers";
import type { AbsenceCalendarStatusFilter } from "./helpers/core/absenceCalendarTypes";
import { useAbsenceCalendarData } from "./hooks/data/useAbsenceCalendarData";
import { useAbsenceCalendarMonth } from "./hooks/ui/useAbsenceCalendarMonth";

export default function AbsenceCalendarPage() {
  const router = useRouter();
  const {
    infoDialog,
    needsMasterCinemaSelection,
    requests,
  } = useAbsenceCalendarData();
  const {
    calendarDays,
    changeMonth,
    goToToday,
    isCurrentMonth,
    selectedMonth,
  } = useAbsenceCalendarMonth();

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");
  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<AbsenceCalendarStatusFilter>(
      "ALL",
    );
  const [
    selectedDate,
    setSelectedDate,
  ] = useState<string | null>(
    getTodayDateKey(),
  );

  useEffect(() => {
    if (
      selectedDate?.startsWith(
        selectedMonth,
      )
    ) {
      return;
    }

    setSelectedDate(null);
  }, [
    selectedDate,
    selectedMonth,
  ]);

  const filteredRequests = useMemo(
    () =>
      filterAbsenceRequests(
        requests,
        searchQuery,
        statusFilter,
      ),
    [
      requests,
      searchQuery,
      statusFilter,
    ],
  );

  const summary = useMemo(
    () =>
      getAbsenceCalendarSummary(
        requests,
        selectedMonth,
      ),
    [requests, selectedMonth],
  );

  function handleToday() {
    goToToday();
    setSelectedDate(
      getTodayDateKey(),
    );
  }

  return (
    <>
      <AdminGuard>
        <main className="min-h-screen bg-gray-100 px-4 py-6 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:px-6">
          <div className="mx-auto max-w-7xl space-y-6">
            <AbsenceCalendarHeader
              selectedMonth={
                selectedMonth
              }
              isCurrentMonth={
                isCurrentMonth
              }
              onChangeMonth={
                changeMonth
              }
              onToday={handleToday}
              onOpenApproval={() =>
                router.push(
                  "/leave-approval",
                )
              }
            />

            {needsMasterCinemaSelection ? (
              <section className="rounded-3xl border border-dashed border-amber-300 bg-amber-50 p-6 text-amber-950 shadow-sm transition-colors dark:border-amber-800 dark:bg-amber-950/35 dark:text-amber-100">
                <h2 className="text-xl font-semibold">
                  Ingen aktiv biograf valgt
                </h2>

                <p className="mt-2 text-sm text-amber-900 dark:text-amber-100/90">
                  Vælg en biograf i
                  MASTER-panelet, før du
                  kan se
                  fraværskalenderen.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      "/master",
                    )
                  }
                  className="mt-4 rounded-2xl bg-amber-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 dark:bg-amber-400 dark:text-amber-950 dark:hover:bg-amber-300 dark:focus-visible:ring-amber-300 dark:focus-visible:ring-offset-gray-950"
                >
                  Vælg biograf
                </button>
              </section>
            ) : (
              <>
                <AbsenceCalendarOverview
                  summary={summary}
                  searchQuery={
                    searchQuery
                  }
                  statusFilter={
                    statusFilter
                  }
                  onSearchQueryChange={
                    setSearchQuery
                  }
                  onStatusFilterChange={
                    setStatusFilter
                  }
                />

                <AbsenceCalendarGrid
                  calendarDays={
                    calendarDays
                  }
                  requests={
                    filteredRequests
                  }
                  selectedDate={
                    selectedDate
                  }
                  onSelectDate={
                    setSelectedDate
                  }
                />
              </>
            )}
          </div>
        </main>
      </AdminGuard>

      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={
          infoDialog.description
        }
        buttonText={
          infoDialog.buttonText
        }
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />
    </>
  );
}
