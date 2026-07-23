"use client";

import Link from "next/link";

import InfoModal from "@/app/components/modals/InfoModal";

import ClockEntryForm from "./components/form/ClockEntryForm";
import ClockHeader from "./components/layout/ClockHeader";
import ClockEntriesSection from "./components/list/ClockEntriesSection";
import { useClockPage } from "./hooks/page/useClockPage";

export default function ClockPage() {
  const {
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
  } = useClockPage();

  if (isGlobalMaster) {
    return (
      <>
        <main className="min-h-screen bg-slate-100 p-4 text-slate-950 transition-colors dark:bg-slate-950 dark:text-slate-100 md:p-8">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm transition-colors dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
              <p className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                Global MASTER
              </p>
              <h1 className="mt-2 text-2xl font-bold">
                Tidsregistrering kræver biografbruger
              </h1>
              <p className="mt-3 text-sm leading-6 text-amber-900 dark:text-amber-100/90">
                MASTER er en global systemrolle og har ikke egen biograf. Brug
                en ADMIN- eller EMPLOYEE-bruger til mødetid/fyraften, eller gå
                til MASTER-panelet for at vælge og administrere en biograf.
              </p>
              <div className="mt-5">
                <Link
                  href="/master"
                  className="inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-700 active:bg-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50 dark:bg-amber-400 dark:text-amber-950 dark:hover:bg-amber-300 dark:active:bg-amber-200 dark:focus-visible:ring-amber-300 dark:focus-visible:ring-offset-amber-950"
                >
                  Gå til MASTER-panel
                </Link>
              </div>
            </div>
          </div>
        </main>

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

  return (
    <>
      <main className="min-h-screen bg-slate-100 p-4 text-slate-950 transition-colors dark:bg-slate-950 dark:text-slate-100 md:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <ClockHeader />

          <ClockEntryForm
            todayShifts={todayShifts}
            selectedShiftId={selectedShiftId}
            clockIn={clockIn}
            clockOut={clockOut}
            note={note}
            loading={loading}
            onSelectedShiftIdChange={setSelectedShiftId}
            onClockInChange={setClockIn}
            onClockOutChange={setClockOut}
            onNoteChange={setNote}
            onSubmit={handleSubmit}
          />

          <ClockEntriesSection entries={entries} totalHours={totalHours} />
        </div>
      </main>

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
