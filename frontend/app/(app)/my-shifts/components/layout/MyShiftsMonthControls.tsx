type MyShiftsMonthControlsProps = {
  selectedMonth: string;
  message: string;
  changeMonth: (direction: number) => void;
};

const navigationButtonClass =
  "rounded-xl border border-gray-300 bg-white px-4 py-2 font-medium text-gray-800 shadow-sm transition hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 dark:active:bg-gray-600 dark:focus-visible:ring-offset-gray-950";

function formatMonthLabel(
  selectedMonth: string,
) {
  const [
    year,
    month,
  ] = selectedMonth
    .split("-")
    .map(Number);

  if (
    !Number.isInteger(
      year,
    ) ||
    !Number.isInteger(
      month,
    ) ||
    month < 1 ||
    month > 12
  ) {
    return selectedMonth;
  }

  const label =
    new Intl.DateTimeFormat(
      "da-DK",
      {
        timeZone:
          "Europe/Copenhagen",
        month: "long",
        year: "numeric",
      },
    ).format(
      new Date(
        Date.UTC(
          year,
          month - 1,
          1,
          12,
        ),
      ),
    );

  return (
    label.charAt(0)
      .toLocaleUpperCase(
        "da-DK",
      ) +
    label.slice(1)
  );
}

export default function MyShiftsMonthControls({
  selectedMonth,
  message,
  changeMonth,
}: MyShiftsMonthControlsProps) {
  return (
    <>
      <nav
        className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        aria-label="Vælg måned"
      >
        <button
          type="button"
          onClick={() =>
            changeMonth(-1)
          }
          className={
            navigationButtonClass
          }
        >
          Forrige måned
        </button>

        <span className="min-w-36 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-center font-bold text-gray-950 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-100">
          {formatMonthLabel(
            selectedMonth,
          )}
        </span>

        <button
          type="button"
          onClick={() =>
            changeMonth(1)
          }
          className={
            navigationButtonClass
          }
        >
          Næste måned
        </button>
      </nav>

      {message && (
        <div
          className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-100"
          role="status"
          aria-live="polite"
        >
          {message}
        </div>
      )}
    </>
  );
}
