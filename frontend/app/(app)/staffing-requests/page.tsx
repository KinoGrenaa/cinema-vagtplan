"use client";

import {
  useEffect,
} from "react";
import {
  useRouter,
} from "next/navigation";

export default function StaffingRequestsRedirectPage() {
  const router =
    useRouter();

  useEffect(() => {
    const query =
      window.location.search;

    router.replace(
      `/shift-trades${query}`,
    );
  }, [
    router,
  ]);

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:px-8">
      <div
        className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        role="status"
        aria-live="polite"
      >
        {"\u00c5bner Ledige vagter..."}
      </div>
    </main>
  );
}
