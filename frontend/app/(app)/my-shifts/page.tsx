"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useRealtimeShifts } from "@/app/hooks/useRealtimeShifts";
import { apiFetch } from "@/app/lib/api";
import { dateToLocalMonthString } from "@/app/utils/dateTime";
import MyShiftsDirectTradesSection from "./components/MyShiftsDirectTradesSection";
import MyShiftsListSection from "./components/MyShiftsListSection";
import {
  getShiftConfirmText,
  getStoredUser,
  hasOwnCinema,
  readErrorMessage,
} from "./helpers/myShiftsHelpers";
import type {
  CinemaSettings,
  CurrentUser,
  Shift,
  ShiftTrade,
  User,
} from "./helpers/myShiftsTypes";

export default function MyShiftsPage() {
  const confirmDialog = useConfirm();
  const infoDialog = useInfoModal();

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [shiftTrades, setShiftTrades] = useState<ShiftTrade[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return dateToLocalMonthString(new Date());
  });
  const [message, setMessage] = useState("");
  const [cinemaSettings, setCinemaSettings] = useState<CinemaSettings | null>(
    null,
  );

  const isMasterWithoutOwnCinema =
    currentUser?.role === "MASTER" && !currentUser.cinemaId;

  const fetchShifts = useCallback(async () => {
    if (!currentUser || isMasterWithoutOwnCinema) {
      setShifts([]);
      return;
    }

    try {
      const response = await apiFetch("/shifts");

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Vagter kunne ikke hentes."),
        );
      }

      const data = await response.json();

      setShifts(
        Array.isArray(data)
          ? data
          : Array.isArray(data.shifts)
            ? data.shifts
            : [],
      );
    } catch (error) {
      setShifts([]);
      infoDialog.showError(
        "Vagter kunne ikke hentes",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl ved hentning af vagter.",
      );
    }
  }, [currentUser, isMasterWithoutOwnCinema]);

  const fetchUsers = useCallback(async () => {
    if (!currentUser || isMasterWithoutOwnCinema) {
      setUsers([]);
      return;
    }

    try {
      const response = await apiFetch("/users");

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Kollegaer kunne ikke hentes."),
        );
      }

      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      setUsers([]);
      infoDialog.showError(
        "Kollegaer kunne ikke hentes",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl ved hentning af kollegaer.",
      );
    }
  }, [currentUser, isMasterWithoutOwnCinema]);

  const fetchShiftTrades = useCallback(async () => {
    if (!currentUser || isMasterWithoutOwnCinema) {
      setShiftTrades([]);
      return;
    }

    try {
      const response = await apiFetch("/shift-trades");

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(response, "Vagtbytter kunne ikke hentes."),
        );
      }

      const data = await response.json();
      setShiftTrades(Array.isArray(data) ? data : []);
    } catch (error) {
      setShiftTrades([]);
      infoDialog.showError(
        "Vagtbytter kunne ikke hentes",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl ved hentning af vagtbytter.",
      );
    }
  }, [currentUser, isMasterWithoutOwnCinema]);

  const fetchCinemaSettings = useCallback(async () => {
    if (
      !currentUser ||
      isMasterWithoutOwnCinema ||
      !hasOwnCinema(currentUser)
    ) {
      setCinemaSettings(null);
      return;
    }

    try {
      const response = await apiFetch(`/cinemas/${currentUser.cinemaId}`);

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Biografindstillinger kunne ikke hentes.",
          ),
        );
      }

      const data = await response.json();

      setCinemaSettings({
        allowShiftTradePool: Boolean(data.allowShiftTradePool),
        allowShiftTradeDirect: Boolean(data.allowShiftTradeDirect),
      });
    } catch (error) {
      setCinemaSettings(null);
      infoDialog.showError(
        "Biografindstillinger kunne ikke hentes",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl ved hentning af biografindstillinger.",
      );
    }
  }, [currentUser, isMasterWithoutOwnCinema]);

  const refreshData = useCallback(async () => {
    if (!currentUser || isMasterWithoutOwnCinema) {
      return;
    }

    await Promise.all([
      fetchShifts(),
      fetchUsers(),
      fetchShiftTrades(),
      fetchCinemaSettings(),
    ]);
  }, [
    currentUser,
    fetchCinemaSettings,
    fetchShiftTrades,
    fetchShifts,
    fetchUsers,
    isMasterWithoutOwnCinema,
  ]);

  useEffect(() => {
    const storedUser = getStoredUser();

    setCurrentUser(storedUser);
    setUserLoaded(true);
  }, []);

  useEffect(() => {
    if (!userLoaded || !currentUser || isMasterWithoutOwnCinema) {
      return;
    }

    refreshData();
  }, [currentUser, isMasterWithoutOwnCinema, refreshData, userLoaded]);

  useRealtimeShifts({
    onShiftsUpdated: refreshData,
    onShiftTradesUpdated: refreshData,
  });

  function getOpenTradeForShift(shiftId: number) {
    return shiftTrades.find(
      (trade) => trade.shiftId === shiftId && trade.status === "OPEN",
    );
  }

  const directTradesForMe = useMemo(() => {
    if (!currentUser || isMasterWithoutOwnCinema) return [];

    return shiftTrades.filter(
      (trade) =>
        trade.status === "OPEN" &&
        trade.type === "DIRECT" &&
        trade.targetUserId === currentUser.id,
    );
  }, [currentUser, isMasterWithoutOwnCinema, shiftTrades]);

  const myMonthShifts = useMemo(() => {
    if (!currentUser || isMasterWithoutOwnCinema) return [];

    return shifts.filter((shift) => {
      const shiftMonth = dateToLocalMonthString(new Date(shift.startTime));
      return shift.userId === currentUser.id && shiftMonth === selectedMonth;
    });
  }, [currentUser, isMasterWithoutOwnCinema, selectedMonth, shifts]);

  const totalHours = useMemo(() => {
    return myMonthShifts.reduce((total, shift) => {
      const start = new Date(shift.startTime);
      const end = new Date(shift.endTime);

      return total + (end.getTime() - start.getTime()) / 1000 / 60 / 60;
    }, 0);
  }, [myMonthShifts]);

  function sendToPool(shiftId: number) {
    if (!currentUser || !hasOwnCinema(currentUser)) return;

    const shift = shifts.find((item) => item.id === shiftId);

    if (!shift) {
      infoDialog.showError(
        "Vagten blev ikke fundet",
        "Vagten kunne ikke findes. Prøv at opdatere siden.",
      );
      return;
    }

    confirmDialog.confirm({
      title: "Send vagt i vagtpulje",
      description: `Er du sikker på, at du vil sende denne vagt i vagtpuljen?

${getShiftConfirmText(shift)}`,
      confirmText: "Send i pulje",
      cancelText: "Annuller",
      confirmVariant: "primary",
      onConfirm: async () => {
        const response = await apiFetch("/shift-trades", {
          method: "POST",
          body: JSON.stringify({
            shiftId,
            offeredByUserId: currentUser.id,
            cinemaId: currentUser.cinemaId,
            type: "POOL",
          }),
        });

        if (!response.ok) {
          infoDialog.showError(
            "Vagten kunne ikke sendes til puljen",
            await readErrorMessage(
              response,
              "Kunne ikke sende vagten til puljen.",
            ),
          );
          return;
        }

        setMessage("Vagten er sendt til fælles pulje.");
        await refreshData();
      },
    });
  }

  function sendDirect(shiftId: number, targetUserId: number) {
    if (!currentUser || !targetUserId || !hasOwnCinema(currentUser)) return;

    const shift = shifts.find((item) => item.id === shiftId);

    if (!shift) {
      infoDialog.showError(
        "Vagten blev ikke fundet",
        "Vagten kunne ikke findes. Prøv at opdatere siden.",
      );
      return;
    }

    const targetUser = users.find((user) => user.id === targetUserId);

    const targetName = targetUser
      ? `${targetUser.firstName} ${targetUser.lastName}`
      : "den valgte kollega";

    confirmDialog.confirm({
      title: "Send vagt direkte",
      description: `Er du sikker på, at du vil sende denne vagt direkte til ${targetName}?

${getShiftConfirmText(shift)}`,
      confirmText: "Send vagt",
      cancelText: "Annuller",
      confirmVariant: "primary",
      onConfirm: async () => {
        const response = await apiFetch("/shift-trades", {
          method: "POST",
          body: JSON.stringify({
            shiftId,
            offeredByUserId: currentUser.id,
            cinemaId: currentUser.cinemaId,
            type: "DIRECT",
            targetUserId,
          }),
        });

        if (!response.ok) {
          infoDialog.showError(
            "Vagten kunne ikke sendes til kollegaen",
            await readErrorMessage(
              response,
              "Kunne ikke sende vagten til kollegaen.",
            ),
          );
          return;
        }

        setMessage(`Vagten er sendt direkte til ${targetName}.`);
        await refreshData();
      },
    });
  }

  function getTradeShift(tradeId: number) {
    const trade = shiftTrades.find((item) => item.id === tradeId);

    return trade?.shift ?? null;
  }

  function acceptTrade(tradeId: number) {
    if (!currentUser) return;

    const shift = getTradeShift(tradeId);

    if (!shift) {
      infoDialog.showError(
        "Vagten blev ikke fundet",
        "Vagten kunne ikke findes. Prøv at opdatere siden.",
      );
      return;
    }

    confirmDialog.confirm({
      title: "Acceptér vagt",
      description: `Er du sikker på, at du vil acceptere denne vagt?

${getShiftConfirmText(shift)}`,
      confirmText: "Acceptér",
      cancelText: "Annuller",
      confirmVariant: "success",
      onConfirm: async () => {
        const response = await apiFetch(`/shift-trades/${tradeId}/accept`, {
          method: "PATCH",
          body: JSON.stringify({
            acceptedByUserId: currentUser.id,
          }),
        });

        if (!response.ok) {
          infoDialog.showError(
            "Vagten kunne ikke accepteres",
            await readErrorMessage(response, "Kunne ikke acceptere vagten."),
          );
          return;
        }

        setMessage("Vagten er accepteret.");
        await refreshData();
      },
    });
  }

  function rejectTrade(tradeId: number) {
    const shift = getTradeShift(tradeId);

    if (!shift) {
      infoDialog.showError(
        "Vagten blev ikke fundet",
        "Vagten kunne ikke findes. Prøv at opdatere siden.",
      );
      return;
    }

    confirmDialog.confirm({
      title: "Afvis vagt",
      description: `Er du sikker på, at du vil afvise denne vagt?

${getShiftConfirmText(shift)}`,
      confirmText: "Afvis",
      cancelText: "Annuller",
      confirmVariant: "danger",
      onConfirm: async () => {
        const response = await apiFetch(`/shift-trades/${tradeId}/reject`, {
          method: "PATCH",
        });

        if (!response.ok) {
          infoDialog.showError(
            "Vagten kunne ikke afvises",
            await readErrorMessage(response, "Kunne ikke afvise vagten."),
          );
          return;
        }

        setMessage("Vagten er afvist.");
        await refreshData();
      },
    });
  }

  function cancelTrade(tradeId: number) {
    confirmDialog.confirm({
      title: "Annullér udsendelse",
      description:
        "Er du sikker på, at du vil annullere udsendelsen af denne vagt?",
      confirmText: "Annullér",
      cancelText: "Tilbage",
      confirmVariant: "danger",
      onConfirm: async () => {
        const response = await apiFetch(`/shift-trades/${tradeId}/cancel`, {
          method: "PATCH",
        });

        if (!response.ok) {
          infoDialog.showError(
            "Udsendelsen kunne ikke annulleres",
            await readErrorMessage(
              response,
              "Kunne ikke annullere udsendelsen.",
            ),
          );
          return;
        }

        setMessage("Udsendelsen er annulleret.");
        await refreshData();
      },
    });
  }

  function changeMonth(direction: number) {
    const date = new Date(`${selectedMonth}-01T12:00:00`);
    date.setMonth(date.getMonth() + direction);
    setSelectedMonth(dateToLocalMonthString(date));
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-3xl font-bold">Mine vagter</h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400">
            Oversigt over dine vagter pr. måned.
          </p>
        </div>

        {!userLoaded && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            Henter bruger...
          </div>
        )}

        {isMasterWithoutOwnCinema && (
          <div className="rounded-2xl border border-yellow-300 bg-yellow-50 p-5 text-yellow-900 shadow-sm dark:border-yellow-900/70 dark:bg-yellow-950/30 dark:text-yellow-100">
            <h2 className="text-lg font-semibold">
              Denne side er til egne vagter
            </h2>
            <p className="mt-2 text-sm">
              MASTER-brugere har ikke egne vagter i en konkret biograf. Brug
              vagtplanen eller vælg en almindelig bruger, hvis du skal teste
              medarbejderflowet.
            </p>
          </div>
        )}

        {userLoaded && !isMasterWithoutOwnCinema && (
          <>
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <button
                onClick={() => changeMonth(-1)}
                className="rounded-xl bg-gray-200 px-4 py-2 transition hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                Forrige måned
              </button>

              <span className="rounded-xl bg-gray-100 px-4 py-2 font-bold dark:bg-gray-950">
                {selectedMonth}
              </span>

              <button
                onClick={() => changeMonth(1)}
                className="rounded-xl bg-gray-200 px-4 py-2 transition hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700"
              >
                Næste måned
              </button>
            </div>

            {message && (
              <div className="rounded-xl border border-yellow-300 bg-yellow-100 p-4 text-yellow-900 dark:border-yellow-900 dark:bg-yellow-950/40 dark:text-yellow-200">
                {message}
              </div>
            )}

            <MyShiftsDirectTradesSection
              directTradesForMe={directTradesForMe}
              acceptTrade={acceptTrade}
              rejectTrade={rejectTrade}
            />

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-xl font-bold">Samlet timer</h2>
              <p className="mt-2 text-4xl font-bold">{totalHours.toFixed(2)}</p>
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
