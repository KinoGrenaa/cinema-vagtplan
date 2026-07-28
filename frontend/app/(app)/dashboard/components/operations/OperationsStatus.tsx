type OperationsStatusValue =
  | "UNKNOWN"
  | "NORMAL"
  | "WARNING"
  | "CRITICAL";

type Props = {
  liveOperationsStatus: OperationsStatusValue;
};

const statusLabels: Record<OperationsStatusValue, string> = {
  UNKNOWN: "Ukendt",
  NORMAL: "Normal",
  WARNING: "Kræver opmærksomhed",
  CRITICAL: "Kritisk",
};

export default function OperationsStatus({
  liveOperationsStatus,
}: Props) {
  return (
    <section
      className={`rounded-2xl border p-6 shadow-sm ${
        liveOperationsStatus === "UNKNOWN"
          ? "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
          : liveOperationsStatus === "NORMAL"
            ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
            : liveOperationsStatus === "WARNING"
              ? "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950"
              : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
      }`}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="text-4xl" aria-hidden="true">
            {liveOperationsStatus === "UNKNOWN"
              ? "⚪"
              : liveOperationsStatus === "NORMAL"
                ? "🟢"
                : liveOperationsStatus === "WARNING"
                  ? "🟡"
                  : "🔴"}
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              Driftsstatus lige nu
            </h2>
            <p className="mt-1 text-sm opacity-80">
              Samlet vurdering af dagens bemanding og aktivitet.
            </p>
          </div>
        </div>
        <div
          className={`rounded-full px-6 py-3 text-sm font-bold ${
            liveOperationsStatus === "UNKNOWN"
              ? "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
              : liveOperationsStatus === "NORMAL"
                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                : liveOperationsStatus === "WARNING"
                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                  : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
          }`}
        >
          {statusLabels[liveOperationsStatus]}
        </div>
      </div>
    </section>
  );
}
