import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  useInfoModal,
} from "@/app/hooks/useInfoModal";
import {
  useRealtimeShifts,
} from "@/app/hooks/useRealtimeShifts";
import {
  apiFetch,
} from "@/app/lib/api";
import {
  dateToLocalMonthString,
} from "@/app/utils/dateTime";
import {
  getStoredUser,
  hasOwnCinema,
  readErrorMessage,
} from "../../helpers/core/myShiftsHelpers";
import type {
  CinemaSettings,
  CurrentUser,
  Shift,
  ShiftTrade,
  User,
} from "../../helpers/core/myShiftsTypes";

type UseMyShiftsDataOptions = {
  infoDialog:
    ReturnType<
      typeof useInfoModal
    >;
  focusedShiftId?:
    number | null;
};

export function useMyShiftsData({
  infoDialog,
  focusedShiftId,
}: UseMyShiftsDataOptions) {
  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<CurrentUser | null>(
      null,
    );
  const [
    userLoaded,
    setUserLoaded,
  ] = useState(false);
  const [
    dataLoaded,
    setDataLoaded,
  ] = useState(false);
  const [
    shifts,
    setShifts,
  ] = useState<Shift[]>([]);
  const [
    users,
    setUsers,
  ] = useState<User[]>([]);
  const [
    shiftTrades,
    setShiftTrades,
  ] =
    useState<ShiftTrade[]>([]);
  const [
    selectedMonth,
    setSelectedMonth,
  ] = useState(() => {
    return dateToLocalMonthString(
      new Date(),
    );
  });
  const [
    cinemaSettings,
    setCinemaSettings,
  ] =
    useState<CinemaSettings | null>(
      null,
    );
  const showErrorRef =
    useRef(
      infoDialog.showError,
    );

  useEffect(() => {
    showErrorRef.current =
      infoDialog.showError;
  }, [
    infoDialog.showError,
  ]);

  const isMasterWithoutOwnCinema =
    currentUser?.role ===
      "MASTER" &&
    !currentUser.cinemaId;

  const fetchShifts =
    useCallback(async () => {
      if (
        !currentUser ||
        isMasterWithoutOwnCinema
      ) {
        setShifts([]);
        return;
      }

      try {
        const response =
          await apiFetch(
            "/shifts",
          );

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(
              response,
              "Vagter kunne ikke hentes.",
            ),
          );
        }

        const data =
          await response.json();

        setShifts(
          Array.isArray(data)
            ? data
            : Array.isArray(
                  data.shifts,
                )
              ? data.shifts
              : [],
        );
      } catch (error) {
        setShifts([]);
        showErrorRef.current(
          "Vagter kunne ikke hentes",
          error instanceof Error
            ? error.message
            : "Der opstod en fejl ved hentning af vagter.",
        );
      }
    }, [
      currentUser,
      isMasterWithoutOwnCinema,
    ]);

  const fetchUsers =
    useCallback(async () => {
      if (
        !currentUser ||
        isMasterWithoutOwnCinema
      ) {
        setUsers([]);
        return;
      }

      try {
        const response =
          await apiFetch(
            "/users",
          );

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(
              response,
              "Kollegaer kunne ikke hentes.",
            ),
          );
        }

        const data =
          await response.json();

        setUsers(
          Array.isArray(data)
            ? data
            : [],
        );
      } catch (error) {
        setUsers([]);
        showErrorRef.current(
          "Kollegaer kunne ikke hentes",
          error instanceof Error
            ? error.message
            : "Der opstod en fejl ved hentning af kollegaer.",
        );
      }
    }, [
      currentUser,
      isMasterWithoutOwnCinema,
    ]);

  const fetchShiftTrades =
    useCallback(async () => {
      if (
        !currentUser ||
        isMasterWithoutOwnCinema
      ) {
        setShiftTrades([]);
        return;
      }

      try {
        const response =
          await apiFetch(
            "/shift-trades",
          );

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(
              response,
              "Vagtbytter kunne ikke hentes.",
            ),
          );
        }

        const data =
          await response.json();

        setShiftTrades(
          Array.isArray(data)
            ? data
            : [],
        );
      } catch (error) {
        setShiftTrades([]);
        showErrorRef.current(
          "Vagtbytter kunne ikke hentes",
          error instanceof Error
            ? error.message
            : "Der opstod en fejl ved hentning af vagtbytter.",
        );
      }
    }, [
      currentUser,
      isMasterWithoutOwnCinema,
    ]);

  const fetchCinemaSettings =
    useCallback(async () => {
      if (
        !currentUser ||
        isMasterWithoutOwnCinema ||
        !hasOwnCinema(
          currentUser,
        )
      ) {
        setCinemaSettings(
          null,
        );
        return;
      }

      try {
        const response =
          await apiFetch(
            `/cinemas/${currentUser.cinemaId}`,
          );

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(
              response,
              "Biografindstillinger kunne ikke hentes.",
            ),
          );
        }

        const data =
          await response.json();

        setCinemaSettings({
          allowShiftTradePool:
            Boolean(
              data.allowShiftTradePool,
            ),
          allowShiftTradeDirect:
            Boolean(
              data.allowShiftTradeDirect,
            ),
        });
      } catch (error) {
        setCinemaSettings(
          null,
        );
        showErrorRef.current(
          "Biografindstillinger kunne ikke hentes",
          error instanceof Error
            ? error.message
            : "Der opstod en fejl ved hentning af biografindstillinger.",
        );
      }
    }, [
      currentUser,
      isMasterWithoutOwnCinema,
    ]);

  const refreshData =
    useCallback(async () => {
      if (
        !currentUser ||
        isMasterWithoutOwnCinema
      ) {
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
    const storedUser =
      getStoredUser();

    setCurrentUser(
      storedUser,
    );
    setUserLoaded(true);
  }, []);

  useEffect(() => {
    if (!userLoaded) {
      return;
    }

    if (
      !currentUser ||
      isMasterWithoutOwnCinema
    ) {
      setDataLoaded(true);
      return;
    }

    let active = true;

    setDataLoaded(false);

    void refreshData().finally(
      () => {
        if (active) {
          setDataLoaded(true);
        }
      },
    );

    return () => {
      active = false;
    };
  }, [
    currentUser,
    isMasterWithoutOwnCinema,
    refreshData,
    userLoaded,
  ]);

  useEffect(() => {
    if (
      !focusedShiftId ||
      !currentUser ||
      !dataLoaded
    ) {
      return;
    }

    const focusedShift =
      shifts.find(
        (shift) =>
          shift.id ===
            focusedShiftId &&
          shift.userId ===
            currentUser.id,
      );

    if (!focusedShift) {
      return;
    }

    setSelectedMonth(
      dateToLocalMonthString(
        new Date(
          focusedShift.startTime,
        ),
      ),
    );
  }, [
    currentUser,
    dataLoaded,
    focusedShiftId,
    shifts,
  ]);

  useRealtimeShifts({
    onShiftsUpdated:
      refreshData,
    onShiftTradesUpdated:
      refreshData,
  });

  function getOpenTradeForShift(
    shiftId: number,
  ) {
    return shiftTrades.find(
      (trade) =>
        trade.shiftId ===
          shiftId &&
        trade.status ===
          "OPEN",
    );
  }

  const directTradesForMe =
    useMemo(() => {
      if (
        !currentUser ||
        isMasterWithoutOwnCinema
      ) {
        return [];
      }

      return shiftTrades.filter(
        (trade) =>
          trade.status ===
            "OPEN" &&
          trade.type ===
            "DIRECT" &&
          trade.targetUserId ===
            currentUser.id,
      );
    }, [
      currentUser,
      isMasterWithoutOwnCinema,
      shiftTrades,
    ]);

  const myMonthShifts =
    useMemo(() => {
      if (
        !currentUser ||
        isMasterWithoutOwnCinema
      ) {
        return [];
      }

      return shifts.filter(
        (shift) => {
          const shiftMonth =
            dateToLocalMonthString(
              new Date(
                shift.startTime,
              ),
            );

          return (
            shift.userId ===
              currentUser.id &&
            shiftMonth ===
              selectedMonth
          );
        },
      );
    }, [
      currentUser,
      isMasterWithoutOwnCinema,
      selectedMonth,
      shifts,
    ]);

  const totalHours =
    useMemo(() => {
      return myMonthShifts.reduce(
        (
          total,
          shift,
        ) => {
          const start =
            new Date(
              shift.startTime,
            );
          const end =
            new Date(
              shift.endTime,
            );

          return (
            total +
            (
              end.getTime() -
              start.getTime()
            ) /
              1000 /
              60 /
              60
          );
        },
        0,
      );
    }, [myMonthShifts]);

  function changeMonth(
    direction: number,
  ) {
    const date =
      new Date(
        `${selectedMonth}-01T12:00:00`,
      );

    date.setMonth(
      date.getMonth() +
        direction,
    );

    setSelectedMonth(
      dateToLocalMonthString(
        date,
      ),
    );
  }

  return {
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
  };
}
