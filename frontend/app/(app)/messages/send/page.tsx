"use client";

import {
  useEffect,
} from "react";

export default function LegacySendMessageRedirect() {
  useEffect(() => {
    window.location.replace(
      `/messages/new${window.location.search}${window.location.hash}`,
    );
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-6 text-slate-600 dark:bg-[#030712] dark:text-slate-300">
      Åbner Ny besked...
    </main>
  );
}
