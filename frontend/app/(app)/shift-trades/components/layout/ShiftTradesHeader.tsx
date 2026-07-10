import Link from "next/link";

type ShiftTradesHeaderProps = {
  message: string;
};

export default function ShiftTradesHeader({ message }: ShiftTradesHeaderProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vagtpulje</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Se åbne vagter som andre medarbejdere har lagt i puljen.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-xl bg-black px-4 py-2 text-center font-semibold text-white transition hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
        >
          Dashboard
        </Link>
      </div>

      {message && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
          {message}
        </div>
      )}
    </section>
  );
}
