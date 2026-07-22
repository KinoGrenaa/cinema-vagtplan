import {
  formatMonthLabel,
} from "../../helpers/core/absenceCalendarHelpers";

type AbsenceCalendarHeaderProps = {
  selectedMonth: string;
  isCurrentMonth: boolean;
  onChangeMonth: (
    direction: number,
  ) => void;
  onToday: () => void;
  onOpenApproval: () => void;
};

export default function AbsenceCalendarHeader({
  selectedMonth,
  isCurrentMonth,
  onChangeMonth,
  onToday,
  onOpenApproval,
}: AbsenceCalendarHeaderProps) {
  return (
    <header className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950/60">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-950 dark:text-white">
            Ferie/fraværskalender
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Månedsoverblik over
            godkendt fravær og
            ansøgninger, der afventer
            behandling.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenApproval}
          className="w-fit rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-800"
        >
          Åbn fraværsgodkendelse
        </button>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() =>
            onChangeMonth(-1)
          }
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          ← Forrige
        </button>

        <div className="text-center">
          <div className="text-xl font-bold text-gray-950 dark:text-white">
            {formatMonthLabel(
              selectedMonth,
            )}
          </div>
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={onToday}
              className="mt-1 text-sm font-semibold text-blue-700 hover:underline dark:text-blue-300"
            >
              Gå til denne måned
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            onChangeMonth(1)
          }
          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold transition hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          Næste →
        </button>
      </div>
    </header>
  );
}
