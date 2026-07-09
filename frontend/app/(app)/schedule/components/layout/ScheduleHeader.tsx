"use client";

type SchedulePageHeaderProps = {
  aiGenerateDaySchedule?: () => void;
  aiGeneratingDaySchedule: boolean;
  onOpenRegisterTimeModal: () => void;
  onOpenManualTimeModal: () => void;
  disableManualTimeModal: boolean;
};

type ScheduleDateNavigationProps = {
  selectedDate: string;
  onPreviousDay: () => void;
  onToday: () => void;
  onDateChange: (date: string) => void;
  onNextDay: () => void;
};

export function SchedulePageHeader({
  aiGenerateDaySchedule,
  aiGeneratingDaySchedule,
  onOpenRegisterTimeModal,
  onOpenManualTimeModal,
  disableManualTimeModal,
}: SchedulePageHeaderProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vagtplan</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Overblik over vagter, bemanding og dagens program
          </p>

          {aiGenerateDaySchedule && (
            <div className="mb-6 flex flex-wrap gap-3">
              <button
                onClick={aiGenerateDaySchedule}
                disabled={aiGeneratingDaySchedule}
                className="rounded-2xl bg-cyan-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-cyan-700 disabled:opacity-50"
              >
                {aiGeneratingDaySchedule
                  ? "Genererer AI dagsplan..."
                  : "🤖 Generate AI Day Schedule"}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onOpenRegisterTimeModal}
            className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
          >
            Registrer tid
          </button>

          <button
            onClick={onOpenManualTimeModal}
            disabled={disableManualTimeModal}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            Manuel registrering
          </button>
        </div>
      </div>
    </div>
  );
}

export function ScheduleDateNavigation({
  selectedDate,
  onPreviousDay,
  onToday,
  onDateChange,
  onNextDay,
}: ScheduleDateNavigationProps) {
  return (
    <div className="mt-4 mb-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Dato for vagtplan
          </div>
          <div className="text-2xl font-bold">
            {selectedDate.split("-").reverse().join("-")}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={onPreviousDay}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:hover:bg-gray-800"
          >
            ← Forrige dag
          </button>

          <button
            onClick={onToday}
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            I dag
          </button>

          <label className="relative inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-blue-300 bg-blue-50 text-lg shadow-sm transition hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:hover:bg-blue-950">
            <span aria-hidden="true">📅</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => onDateChange(event.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Vælg dato"
            />
          </label>

          <button
            onClick={onNextDay}
            className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:hover:bg-gray-800"
          >
            Næste dag →
          </button>
        </div>
      </div>
    </div>
  );
}
