"use client";

import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import ShiftTradesHeader from "./components/ShiftTradesHeader";
import ShiftTradesHistorySection from "./components/ShiftTradesHistorySection";
import ShiftTradesOpenSection from "./components/ShiftTradesOpenSection";
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
