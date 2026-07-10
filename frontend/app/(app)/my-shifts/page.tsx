"use client";

import ConfirmModal from "@/app/components/modals/ConfirmModal";

import InfoModal from "@/app/components/modals/InfoModal";

import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";

import MyShiftsDirectTradesSection from "./components/list/MyShiftsDirectTradesSection";

import MyShiftsHeader from "./components/layout/MyShiftsHeader";

import MyShiftsListSection from "./components/list/MyShiftsListSection";

import MyShiftsMonthControls from "./components/layout/MyShiftsMonthControls";

import { useMyShiftsData } from "./hooks/useMyShiftsData";

import { useMyShiftsTradeActions } from "./hooks/useMyShiftsTradeActions";

export default function MyShiftsPage() {
  const confirmDialog = useConfirm();

  const infoDialog = useInfoModal();

  const {
    currentUser,
    userLoaded,
    shifts,
    users,
    shiftTrades,
    selectedMonth,
    cinemaSettings,
    isMasterWithoutOwnCinema,
    refreshData,
    getOpenTradeForShift,
    directTradesForMe,
    myMonthShifts,
    totalHours,
    changeMonth,
  } = useMyShiftsData({ infoDialog });

  const {
    message,
    sendToPool,
    sendDirect,
    acceptTrade,
    rejectTrade,
    cancelTrade,
  } = useMyShiftsTradeActions({
    currentUser,
    shifts,
    users,
    shiftTrades,
    confirmDialog,
    infoDialog,
    refreshData,
  });

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <MyShiftsHeader
          userLoaded={userLoaded}
          isMasterWithoutOwnCinema={isMasterWithoutOwnCinema}
        />

        {userLoaded && !isMasterWithoutOwnCinema && (
          <>
            <MyShiftsMonthControls
              selectedMonth={selectedMonth}
              message={message}
              changeMonth={changeMonth}
            />

            <MyShiftsDirectTradesSection
              directTradesForMe={directTradesForMe}
              acceptTrade={acceptTrade}
              rejectTrade={rejectTrade}
            />

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-xl font-bold">Samlet timer</h2>

              <p className="mt-2 text-4xl font-bold">
                {totalHours.toFixed(2)}
              </p>
              <p className="text-gray-500 dark:text-gray-400">
                timer i valgt måned
              </p>
            </section>

            <MyShiftsListSection
              myMonthShifts={myMonthShifts}
              users={users}
              currentUserId={currentUser?.id}
              cinemaSettings={cinemaSettings}
              getOpenTradeForShift={getOpenTradeForShift}
              sendToPool={sendToPool}
              sendDirect={sendDirect}
              cancelTrade={cancelTrade}
            />
          </>
        )}
      </div>

      <ConfirmModal
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        confirmVariant={confirmDialog.confirmVariant}
        loading={confirmDialog.loading}
        onConfirm={confirmDialog.handleConfirm}
        onCancel={confirmDialog.handleCancel}
      />

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
