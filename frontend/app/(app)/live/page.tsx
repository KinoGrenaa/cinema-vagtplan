"use client";

import InfoModal from "@/app/components/modals/InfoModal";
import { LiveActiveMoviesSection } from "./components/LiveActiveMoviesSection";
import { LiveActiveShiftsSection } from "./components/LiveActiveShiftsSection";
import { LiveClockedInSection } from "./components/LiveClockedInSection";
import { LiveHeader } from "./components/LiveHeader";
import { useLivePage } from "./hooks/useLivePage";

export default function LivePage() {
  const { users, timeEntries, activeShifts, activeMovies, infoDialog } =
    useLivePage();

  return (
    <>
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <LiveHeader />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <LiveClockedInSection timeEntries={timeEntries} users={users} />
            <LiveActiveShiftsSection activeShifts={activeShifts} />
            <LiveActiveMoviesSection activeMovies={activeMovies} />
          </div>
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
