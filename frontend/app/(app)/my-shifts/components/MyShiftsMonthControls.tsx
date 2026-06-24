type MyShiftsMonthControlsProps = {
  selectedMonth: string;
  message: string;
  changeMonth: (direction: number) => void;
};

export default function MyShiftsMonthControls({
  selectedMonth,
  message,
  changeMonth,
}: MyShiftsMonthControlsProps) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <button
          onClick={() => changeMonth(-1)}
          className="rounded-xl bg-gray-200 px-4 py-2 transition hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
        >
          Forrige måned
        </button>

        <span className="rounded-xl bg-gray-100 px-4 py-2 font-bold dark:bg-gray-950">
          {selectedMonth}
        </span>

        <button
          onClick={() => changeMonth(1)}
          className="rounded-xl bg-gray-200 px-4 py-2 transition hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
        >
          Næste måned
        </button>
      </div>

      {message && (
        <div className="rounded-xl border border-yellow-300 bg-yellow-100 p-4 text-yellow-900 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-200">
          {message}
        </div>
      )}
    </>
  );
}
