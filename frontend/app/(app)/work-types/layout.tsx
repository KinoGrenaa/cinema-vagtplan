"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useAuth } from "@/app/providers/AuthProvider";
import { useCinemaModules } from "@/app/providers/CinemaModulesProvider";

export default function WorkTypesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();
  const { loading, hasCinemaContext, isModuleEnabled } = useCinemaModules();

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 text-slate-950 transition-colors sm:p-6 lg:p-8 dark:bg-slate-950 dark:text-slate-100">
        <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-200">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 animate-pulse rounded-full bg-blue-600 dark:bg-blue-400"
            />
            Kontrollerer moduladgang...
          </div>
        </div>
      </main>
    );
  }

  if (hasCinemaContext && !isModuleEnabled("SCHEDULE")) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 text-slate-950 transition-colors sm:p-6 lg:p-8 dark:bg-slate-950 dark:text-slate-100">
        <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-100">
          <div className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            Moduladgang
          </div>
          <h1 className="mt-2 text-2xl font-bold">Modulet er ikke aktivt</h1>
          <p className="mt-2 text-sm leading-6 text-amber-900 dark:text-amber-100/90">
            Vagttyper er en del af Vagtplan, som er deaktiveret for den aktive
            biograf.
          </p>
          <Link
            href={user?.role === "MASTER" ? "/master" : "/dashboard"}
            className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 focus-visible:ring-offset-amber-50 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200 dark:focus-visible:ring-white dark:focus-visible:ring-offset-amber-950"
          >
            Gå tilbage
          </Link>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
