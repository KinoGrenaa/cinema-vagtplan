"use client";

import { getTodayLocalDate } from "@/app/utils/dateTime";

type DashboardHeaderProps = {
  onRefresh: () => void;
  isRefreshing: boolean;
};

function formatDashboardDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day, 12));

  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "full",
    timeZone: "Europe/Copenhagen",
  }).format(value);
}
export default function DashboardHeader({
  onRefresh,
  isRefreshing,
}: DashboardHeaderProps) {
  const today = getTodayLocalDate();
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold capitalize text-gray-500 dark:text-gray-400">
            {formatDashboardDate(today)}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-gray-950 dark:text-white">
            Dagens driftsoverblik
          </h1>
          <p className="mt-2 max-w-3xl text-gray-600 dark:text-gray-300">
            Se dagens status, bemanding og de poster, der kræver opfølgning.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-busy={isRefreshing}
          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-500 disabled:shadow-none dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:hover:border-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-100 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:border-gray-800 dark:disabled:bg-gray-900 dark:disabled:text-gray-500"
        >
          {isRefreshing ? "Opdaterer..." : "Opdater overblik"}
        </button>
      </div>
    </section>
  );
}
