"use client";

import InfoModal from "@/app/components/modals/InfoModal";
import ClockEntriesSection from "./components/ClockEntriesSection";
import ClockEntryForm from "./components/ClockEntryForm";
import ClockHeader from "./components/ClockHeader";
import { useClockPage } from "./hooks/useClockPage";

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
    setSelectedShiftId,
    setClockIn,
    setClockOut,
    setNote,
    handleSubmit,
  } = useClockPage();

  return (
    <>
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
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
