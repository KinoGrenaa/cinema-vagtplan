"use client";

import Link from "next/link";

import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";

import ShiftTradesHeader from "./components/layout/ShiftTradesHeader";
import ShiftTradesHistorySection from "./components/list/ShiftTradesHistorySection";
import ShiftTradesOpenSection from "./components/list/ShiftTradesOpenSection";
import { useShiftTradeActions } from "./hooks/useShiftTradeActions";
import { useShiftTradesData } from "./hooks/useShiftTradesData";

export default function ShiftTradesPage() {
  const confirmModal = useConfirm();
  const infoDialog = useInfoModal();

  const {
    user,
    apiFetch,
    loading,
    message,
    setMessage,
    fetchTrades,
    directTrades,
    poolTrades,
    historyTrades,
    hasShiftConflict,
    needsMasterCinemaSelection,
  } = useShiftTradesData({ infoDialog });

  const { acceptTrade, rejectTrade } = useShiftTradeActions({
    apiFetch,
    user,
    confirmModal,
    infoDialog,
    fetchTrades,
    setMessage,
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-10 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        Henter vagtbytter...
      </main>
    );
  }

  if (needsMasterCinemaSelection) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-900/60 dark:bg-amber-950/40">
            <p className="text-sm font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              Ingen aktiv biograf valgt
            </p>
            <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
              Vælg en biograf for at se vagtpuljen
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-700 dark:text-gray-300">
              Som MASTER skal du vælge en aktiv biograf, før vagtbytter kan
              vises eller behandles.
            </p>
            <Link
              href="/master"
              className="mt-5 inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Vælg biograf
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <ShiftTradesHeader message={message} />

          <ShiftTradesOpenSection
            title="Direkte tilbud"
            trades={directTrades}
            emptyText="Du har ingen direkte vagtbytter lige nu."
            onAccept={acceptTrade}
            onReject={rejectTrade}
            hasShiftConflict={hasShiftConflict}
          />

          <ShiftTradesOpenSection
            title="Åbne vagter i puljen"
            trades={poolTrades}
            emptyText="Der er ingen åbne vagter i vagtpuljen lige nu."
            onAccept={acceptTrade}
            hasShiftConflict={hasShiftConflict}
          />

          <ShiftTradesHistorySection trades={historyTrades} />
        </div>
      </main>

      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        description={confirmModal.description}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        confirmVariant={confirmModal.confirmVariant}
        loading={confirmModal.loading}
        onConfirm={confirmModal.handleConfirm}
        onCancel={confirmModal.handleCancel}
      />

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
