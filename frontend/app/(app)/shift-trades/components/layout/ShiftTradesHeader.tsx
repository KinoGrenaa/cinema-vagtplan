import Link from "next/link";

type ShiftTradesHeaderProps = {
  message: string;
};

export default function ShiftTradesHeader({ message }: ShiftTradesHeaderProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <div className="p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
              Vagter og tilbud
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-950 dark:text-white">
              Vagtpulje
            </h1>
            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
              Se direkte tilbud og åbne vagter, som andre medarbejdere har lagt
              i puljen.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900"
          >
            Til dashboard
          </Link>
        </div>
      </div>

      {message && (
        <div
          className="border-t border-blue-200 bg-blue-50 px-6 py-4 text-sm font-medium text-blue-800 dark:border-blue-900/70 dark:bg-blue-950/35 dark:text-blue-200"
          role="status"
          aria-live="polite"
        >
          {message}
        </div>
      )}
    </section>
  );
}
