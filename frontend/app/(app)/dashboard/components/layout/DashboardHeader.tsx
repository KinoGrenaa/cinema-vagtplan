"use client";

import { getTodayLocalDate } from "@/app/utils/dateTime";

function formatDashboardDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day, 12));

  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "full",
    timeZone: "Europe/Copenhagen",
  }).format(value);
}

export default function DashboardHeader() {
  const today = getTodayLocalDate();

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <p className="text-sm font-semibold capitalize text-gray-500 dark:text-gray-400">
        {formatDashboardDate(today)}
      </p>
      <h1 className="mt-2 text-3xl font-bold text-gray-950 dark:text-white">
        Dagens driftsoverblik
      </h1>
      <p className="mt-2 max-w-3xl text-gray-600 dark:text-gray-300">
        Se dagens status, bemanding og de poster, der kræver opfølgning.
      </p>
    </section>
  );
}
