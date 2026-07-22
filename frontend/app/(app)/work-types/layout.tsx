"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useAuth } from "@/app/providers/AuthProvider";
import {
  useCinemaModules,
} from "@/app/providers/CinemaModulesProvider";

export default function WorkTypesLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();
  const {
    loading,
    hasCinemaContext,
    isModuleEnabled,
  } = useCinemaModules();

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-6 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          Kontrollerer moduladgang...
        </div>
      </main>
    );
  }

  if (
    hasCinemaContext &&
    !isModuleEnabled("SCHEDULE")
  ) {
    return (
      <main className="min-h-screen bg-gray-100 p-6 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          <h1 className="text-2xl font-bold">
            Modulet er ikke aktivt
          </h1>

          <p className="mt-2 text-sm text-amber-900 dark:text-amber-100/90">
            Vagttyper er en del af Vagtplan, som
            er deaktiveret for den aktive
            biograf.
          </p>

          <Link
            href={
              user?.role === "MASTER"
                ? "/master"
                : "/dashboard"
            }
            className="mt-5 inline-flex rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 dark:bg-white dark:text-black dark:hover:bg-gray-200 dark:focus-visible:ring-white dark:focus-visible:ring-offset-gray-950"
          >
            Gå tilbage
          </Link>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
