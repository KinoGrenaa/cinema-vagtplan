"use client";

import {
  useCallback,
} from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import {
  useConfirm,
} from "@/app/hooks/useConfirm";
import {
  useInfoModal,
} from "@/app/hooks/useInfoModal";

import MyShiftsDirectTradesSection from "./components/list/MyShiftsDirectTradesSection";
import MyShiftsListSection from "./components/list/MyShiftsListSection";
import MyShiftsHeader from "./components/layout/MyShiftsHeader";
import MyShiftsMonthControls from "./components/layout/MyShiftsMonthControls";
import MyShiftTargetNotice from "./components/layout/MyShiftTargetNotice";
import {
  parseMyShiftTarget,
  type MyShiftTargetState,
} from "./helpers/core/myShiftTarget";
import {
  useMyShiftsTradeActions,
} from "./hooks/actions/useMyShiftsTradeActions";
import {
  useMyShiftsData,
} from "./hooks/data/useMyShiftsData";

export default function MyShiftsPage() {
  const confirmDialog =
    useConfirm();
  const infoDialog =
    useInfoModal();
  const pathname =
    usePathname();
  const router =
    useRouter();
  const searchParams =
    useSearchParams();

  const shiftTarget =
    parseMyShiftTarget(
      searchParams.get(
        "shiftId",
      ),
    );

  const {
    currentUser,
    userLoaded,
    dataLoaded,
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
  } = useMyShiftsData({
    infoDialog,
    focusedShiftId:
      shiftTarget.shiftId,
  });

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

  const focusedShift =
    shiftTarget.shiftId &&
    currentUser
      ? shifts.find(
          (shift) =>
            shift.id ===
              shiftTarget.shiftId &&
            shift.userId ===
              currentUser.id,
        ) ?? null
      : null;

  const targetState:
    MyShiftTargetState =
      shiftTarget.invalid
        ? "invalid"
        : !shiftTarget.shiftId
          ? "idle"
          : !userLoaded ||
              !dataLoaded
            ? "loading"
            : focusedShift
              ? "found"
              : "missing";

  const clearShiftTarget =
    useCallback(() => {
      const params =
        new URLSearchParams(
          searchParams.toString(),
        );

      params.delete("shiftId");

      const query =
        params.toString();

      router.replace(
        query
          ? `${pathname}?${query}`
          : pathname,
        {
          scroll: false,
        },
      );
    }, [
      pathname,
      router,
      searchParams,
    ]);

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <MyShiftsHeader
          userLoaded={
            userLoaded
          }
          isMasterWithoutOwnCinema={
            isMasterWithoutOwnCinema
          }
        />

        <MyShiftTargetNotice
          state={targetState}
          shiftId={
            shiftTarget.shiftId
          }
          onClear={
            clearShiftTarget
          }
        />

        {userLoaded &&
          !isMasterWithoutOwnCinema && (
          <>
            <MyShiftsMonthControls
              selectedMonth={
                selectedMonth
              }
              message={message}
              changeMonth={
                changeMonth
              }
            />

            <MyShiftsDirectTradesSection
              directTradesForMe={
                directTradesForMe
              }
              acceptTrade={
                acceptTrade
              }
              rejectTrade={
                rejectTrade
              }
            />

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-xl font-bold text-gray-950 dark:text-gray-100">
                Samlet timer
              </h2>
              <p className="mt-2 text-4xl font-bold text-blue-700 dark:text-blue-400">
                {totalHours.toFixed(
                  2,
                )}
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                timer i valgt måned
              </p>
            </section>

            <MyShiftsListSection
              myMonthShifts={
                myMonthShifts
              }
              users={users}
              currentUserId={
                currentUser?.id
              }
              cinemaSettings={
                cinemaSettings
              }
              focusedShiftId={
                shiftTarget.shiftId
              }
              getOpenTradeForShift={
                getOpenTradeForShift
              }
              sendToPool={
                sendToPool
              }
              sendDirect={
                sendDirect
              }
              cancelTrade={
                cancelTrade
              }
            />
          </>
        )}
      </div>

      <ConfirmModal
        open={
          confirmDialog.open
        }
        title={
          confirmDialog.title
        }
        description={
          confirmDialog.description
        }
        confirmText={
          confirmDialog.confirmText
        }
        cancelText={
          confirmDialog.cancelText
        }
        confirmVariant={
          confirmDialog.confirmVariant
        }
        loading={
          confirmDialog.loading
        }
        onConfirm={
          confirmDialog.handleConfirm
        }
        onCancel={
          confirmDialog.handleCancel
        }
      />

      <InfoModal
        open={infoDialog.open}
        title={infoDialog.title}
        description={
          infoDialog.description
        }
        buttonText={
          infoDialog.buttonText
        }
        variant={
          infoDialog.variant
        }
        onClose={
          infoDialog.close
        }
      />
    </main>
  );
}
