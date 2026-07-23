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

const secondaryButtonClass =
  "rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900";

export function SchedulePageHeader({
  aiGenerateDaySchedule,
  aiGeneratingDaySchedule,
  onOpenRegisterTimeModal,
  onOpenManualTimeModal,
  disableManualTimeModal,
}: SchedulePageHeaderProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-950 dark:text-white">
            Vagtplan
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-300">
            Overblik over vagter, bemanding og dagens program
          </p>
          {aiGenerateDaySchedule && (
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={aiGenerateDaySchedule}
                disabled={aiGeneratingDaySchedule}
                className="rounded-2xl bg-cyan-700 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-cyan-800 active:bg-cyan-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-cyan-200 disabled:text-cyan-800 dark:bg-cyan-600 dark:hover:bg-cyan-500 dark:active:bg-cyan-400 dark:focus-visible:ring-cyan-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:bg-cyan-950 dark:disabled:text-cyan-400"
              >
                {aiGeneratingDaySchedule
                  ? "Genererer AI dagsplan..."
                  : "Generate AI Day Schedule"}
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onOpenRegisterTimeModal}
            className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
          >
            Registrer tid
          </button>
          <button
            type="button"
            onClick={onOpenManualTimeModal}
            disabled={disableManualTimeModal}
            className={`${secondaryButtonClass} disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500 disabled:opacity-100 dark:disabled:bg-gray-800 dark:disabled:text-gray-500`}
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
    <div className="mb-3 mt-4 rounded-2xl border border-gray-200 bg-white p-4 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="flex flex-col items-center justify-center gap-3 text-center">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
            Dato for vagtplan
          </div>
          <div className="text-2xl font-bold text-gray-950 dark:text-white">
            {selectedDate.split("-").reverse().join("-")}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={onPreviousDay}
            className={secondaryButtonClass}
          >
            ← Forrige dag
          </button>
          <button
            type="button"
            onClick={onToday}
            className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 active:bg-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 dark:bg-blue-600 dark:hover:bg-blue-500 dark:active:bg-blue-400 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
          >
            I dag
          </button>
          <label className="relative inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-blue-300 bg-blue-50 text-lg text-blue-900 shadow-sm transition hover:bg-blue-100 active:bg-blue-200 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-100 dark:hover:bg-blue-950 dark:active:bg-blue-900 dark:focus-within:ring-blue-400 dark:focus-within:ring-offset-gray-900">
            <span aria-hidden="true"></span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => onDateChange(event.target.value)}
              className="absolute inset-0 cursor-pointer opacity-0"
              aria-label="Vælg dato"
            />
          </label>
          <button
            type="button"
            onClick={onNextDay}
            className={secondaryButtonClass}
          >
            Næste dag →
          </button>
        </div>
      </div>
    </div>
  );
}
