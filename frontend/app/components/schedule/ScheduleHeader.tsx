"use client";

type ScheduleHeaderProps = {
  selectedDate: string;
  generatingAiSchedule: boolean;
  onGenerateAiDaySchedule: () => Promise<void>;
  onOpenClockModal: () => void;
  onPreviousDay: () => void;
  onToday: () => void;
  onNextDay: () => void;
};

export default function ScheduleHeader({
  selectedDate,
  generatingAiSchedule,
  onGenerateAiDaySchedule,
  onOpenClockModal,
  onPreviousDay,
  onToday,
  onNextDay,
}: ScheduleHeaderProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vagtplan</h1>

          <p className="text-gray-500 dark:text-gray-400">
            Valgt dato: {selectedDate}
          </p>

          <div className="mb-6 flex flex-wrap gap-3">
            <button
              onClick={onGenerateAiDaySchedule}
              disabled={generatingAiSchedule}
              className="rounded-2xl bg-cyan-600 px-5 py-3 font-semibold text-white shadow-sm hover:bg-cyan-700 disabled:opacity-50"
            >
              {generatingAiSchedule
                ? "Genererer AI dagsplan..."
                : "🤖 Generate AI Day Schedule"}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onOpenClockModal}
            className="rounded-xl bg-green-600 px-4 py-2 text-white transition hover:bg-green-700"
          >
            Registrer tid
          </button>

          <button
            onClick={onPreviousDay}
            className="rounded-xl bg-gray-200 px-4 py-2 transition hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            Forrige dag
          </button>

          <button
            onClick={onToday}
            className="rounded-xl bg-black px-4 py-2 text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            I dag
          </button>

          <button
            onClick={onNextDay}
            className="rounded-xl bg-gray-200 px-4 py-2 transition hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
          >
            Næste dag
          </button>
        </div>
      </div>
    </div>
  );
}
