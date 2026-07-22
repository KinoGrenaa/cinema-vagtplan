"use client";

import Link from "next/link";

import InfoModal from "@/app/components/modals/InfoModal";

import { LiveHeader } from "./components/layout/LiveHeader";
import { LiveActiveMoviesSection } from "./components/sections/LiveActiveMoviesSection";
import { LiveActiveShiftsSection } from "./components/sections/LiveActiveShiftsSection";
import { LiveClockedInSection } from "./components/sections/LiveClockedInSection";
import { useLivePage } from "./hooks/useLivePage";

function LiveMasterCinemaRequired() {
  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-3xl rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/40">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
          Ingen aktiv biograf valgt
        </p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
          Vælg en biograf for at se
          live-overblik
        </h1>
        <p className="mt-3 text-sm leading-6 text-gray-700 dark:text-gray-300">
          Live-overblikket viser
          fremmødte medarbejdere,
          aktive vagter og aktuelle
          filmvisninger for en konkret
          biograf. Som MASTER skal du
          vælge en aktiv biograf først.
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

export default function LivePage() {
  const {
    loading,
    users,
    timeEntries,
    activeShifts,
    activeMovies,
    needsMasterCinemaSelection,
    moduleAccess,
    infoDialog,
  } = useLivePage();

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-8 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        Indlæser live-overblik...
      </main>
    );
  }

  if (needsMasterCinemaSelection) {
    return (
      <LiveMasterCinemaRequired />
    );
  }

  const hasVisibleSections =
    moduleAccess.schedule ||
    moduleAccess.timeTracking;

  return (
    <>
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <LiveHeader />

          {!hasVisibleSections && (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-900 dark:bg-amber-950/30">
              <h2 className="text-xl font-bold">
                Ingen live-data er
                aktiveret
              </h2>
              <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                Live-overblikket kræver
                et aktivt Vagtplan- eller
                Tidsregistreringsmodul.
              </p>
            </section>
          )}

          {moduleAccess.timeTracking && (
            <LiveClockedInSection
              timeEntries={
                timeEntries
              }
              users={users}
            />
          )}

          {moduleAccess.schedule && (
            <>
              <LiveActiveShiftsSection
                activeShifts={
                  activeShifts
                }
              />
              <LiveActiveMoviesSection
                activeMovies={
                  activeMovies
                }
              />
            </>
          )}
        </div>
      </main>

      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={
          infoDialog.description
        }
        variant={
          infoDialog.variant
        }
        buttonText={
          infoDialog.buttonText
        }
        onClose={infoDialog.close}
      />
    </>
  );
}
