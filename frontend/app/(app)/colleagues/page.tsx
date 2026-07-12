"use client";

import Link from "next/link";
import InfoModal from "@/app/components/modals/InfoModal";
import { ColleaguesHeader } from "./components/layout/ColleaguesHeader";
import { ColleaguesList } from "./components/list/ColleaguesList";
import { useColleaguesPage } from "./hooks/useColleaguesPage";

function ColleaguesMasterCinemaRequired() {
  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/40">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
          Ingen aktiv biograf valgt
        </p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
          Vælg en biograf for at se kollegaer
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-700 dark:text-gray-300">
          Kollegaoversigten viser medarbejdere for en konkret biograf. Som
          MASTER skal du vælge en aktiv biograf først.
        </p>
        <Link
          href="/master"
          className="mt-5 inline-flex rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-700"
        >
          Vælg biograf
        </Link>
      </div>
    </main>
  );
}

export default function ColleaguesPage() {
  const { users, needsMasterCinemaSelection, infoDialog } = useColleaguesPage();

  if (needsMasterCinemaSelection) {
    return <ColleaguesMasterCinemaRequired />;
  }

  return (
    <>
      <main className="min-h-screen bg-gray-100 p-4 md:p-8">
        <div className="bg-white rounded-xl shadow p-6">
          <ColleaguesHeader />
          <ColleaguesList users={users} />
        </div>
      </main>

      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />
    </>
  );
}
