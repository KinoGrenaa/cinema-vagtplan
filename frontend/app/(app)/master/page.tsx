"use client";

import InfoModal from "@/app/components/modals/InfoModal";

import MasterCinemasListSection from "./components/MasterCinemasListSection";
import MasterCreateCinemaSection from "./components/MasterCreateCinemaSection";
import MasterHeader from "./components/MasterHeader";
import MasterSummaryCards from "./components/MasterSummaryCards";
import MasterSystemErrorSummaryCard from "./components/MasterSystemErrorSummaryCard";
import { useMasterPanel } from "./hooks/useMasterPanel";

export default function MasterPage() {
  const {
    infoDialog,
    checkedAccess,
    currentUser,
    cinemas,
    loading,
    creating,
    savingCinemaId,
    newCinemaName,
    selectedCinemaId,
    editingCinemaId,
    editingCinemaName,
    message,
    selectedCinema,
    fetchCinemas,
    saveSelectedCinema,
    createCinema,
    startEditingCinema,
    cancelEditingCinema,
    saveCinemaName,
    setNewCinemaName,
    setEditingCinemaName,
  } = useMasterPanel();

  if (!checkedAccess || loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          Indlæser MASTER-panel...
        </div>
      </main>
    );
  }

  if (!currentUser || currentUser.role !== "MASTER") {
    return (
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 shadow-sm dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <h1 className="text-2xl font-bold">Ingen adgang</h1>
          <p className="mt-2">Denne side er kun for globale MASTER-brugere.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <MasterHeader onRefresh={fetchCinemas} />

        <MasterSummaryCards cinemas={cinemas} selectedCinema={selectedCinema} />

        <MasterSystemErrorSummaryCard />

        <MasterCreateCinemaSection
          newCinemaName={newCinemaName}
          creating={creating}
          onNewCinemaNameChange={setNewCinemaName}
          onCreateCinema={createCinema}
        />

        {message && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900 dark:bg-green-950/30 dark:text-green-200">
            {message}
          </div>
        )}

        <MasterCinemasListSection
          cinemas={cinemas}
          selectedCinemaId={selectedCinemaId}
          editingCinemaId={editingCinemaId}
          editingCinemaName={editingCinemaName}
          savingCinemaId={savingCinemaId}
          onEditingCinemaNameChange={setEditingCinemaName}
          onSaveSelectedCinema={saveSelectedCinema}
          onStartEditingCinema={startEditingCinema}
          onCancelEditingCinema={cancelEditingCinema}
          onSaveCinemaName={saveCinemaName}
        />
      </div>

      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={infoDialog.description}
        buttonText={infoDialog.buttonText}
        variant={infoDialog.variant}
        onClose={infoDialog.close}
      />
    </main>
  );
}
