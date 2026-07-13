"use client";

import { useRouter } from "next/navigation";
import AdminGuard from "@/app/components/access/AdminGuard";
import InfoModal from "@/app/components/modals/InfoModal";
import AbsenceCalendarGrid from "./components/calendar/AbsenceCalendarGrid";
import AbsenceCalendarHeader from "./components/layout/AbsenceCalendarHeader";
import { useAbsenceCalendarData } from "./hooks/data/useAbsenceCalendarData";
import { useAbsenceCalendarMonth } from "./hooks/ui/useAbsenceCalendarMonth";

export default function AbsenceCalendarPage() {
  const router = useRouter();
  const { infoDialog, needsMasterCinemaSelection, requests } =
    useAbsenceCalendarData();
  const { changeMonth, daysInMonth, selectedMonth } =
    useAbsenceCalendarMonth();

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
