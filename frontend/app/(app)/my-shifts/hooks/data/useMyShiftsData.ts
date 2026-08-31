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

type MyShiftMonthResponse = {
  items?: Shift[];
  target?: Shift | null;
};

type MyShiftTradeOverviewResponse = {
  offeredTrades?: ShiftTrade[];
  directTrades?: ShiftTrade[];
};

type MyShiftsStaticDataResponse = {
  users?: User[];
  cinemaSettings?: CinemaSettings | null;
};

function mergeShiftTrades(
  groups: ShiftTrade[][],
) {
  return Array.from(
    new Map(
      groups
        .flat()
        .map((trade) => [
          trade.id,
          trade,
        ]),
    ).values(),
  );
}

function mergeShiftTarget(
  items: Shift[],
  target: Shift | null,
) {
  if (
    !target ||
    items.some(
      (shift) =>
        shift.id === target.id,
    )
  ) {
    return items;
  }

  return [
    target,
    ...items,
  ];
}

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
  ] = useState(() =>
    dateToLocalMonthString(
      new Date(),
    ),
  );
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
        const params =
          new URLSearchParams({
            month:
              selectedMonth,
          });

        if (
          focusedShiftId
        ) {
          params.set(
            "targetId",
            String(
              focusedShiftId,
            ),
          );
        }

        const response =
          await apiFetch(
            `/shifts/my-month?${params.toString()}`,
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
          (await response.json()) as
            MyShiftMonthResponse;
        const items =
          Array.isArray(
            data.items,
          )
            ? data.items
            : [];
        const target =
          data.target &&
          typeof data.target ===
            "object"
            ? data.target
            : null;

        setShifts(
          mergeShiftTarget(
            items,
            target,
          ),
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
      focusedShiftId,
      isMasterWithoutOwnCinema,
      selectedMonth,
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
        const params =
          new URLSearchParams({
            month:
              selectedMonth,
          });
        const response =
          await apiFetch(
            `/shift-trades/my-shifts-overview?${params.toString()}`,
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
          (await response.json()) as
            MyShiftTradeOverviewResponse;
        const offeredTrades =
          Array.isArray(
            data.offeredTrades,
          )
            ? data.offeredTrades
            : [];
        const directTrades =
          Array.isArray(
            data.directTrades,
          )
            ? data.directTrades
            : [];

        setShiftTrades(
          mergeShiftTrades([
            offeredTrades,
            directTrades,
          ]),
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
      selectedMonth,
    ]);

  const fetchStaticData =
    useCallback(async () => {
      if (
        !currentUser ||
        isMasterWithoutOwnCinema
      ) {
        setUsers([]);
        setCinemaSettings(
          null,
        );
        return;
      }

      try {
        const response =
          await apiFetch(
            "/shifts/my-static-data",
          );

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(
              response,
              "Kollegaer og vagtbytteindstillinger kunne ikke hentes.",
            ),
          );
        }

        const data =
          (await response.json()) as
            MyShiftsStaticDataResponse;

        setUsers(
          Array.isArray(
            data.users,
          )
            ? data.users
            : [],
        );
        setCinemaSettings(
          data.cinemaSettings &&
          typeof data.cinemaSettings ===
            "object"
            ? {
                allowShiftTradePool:
                  Boolean(
                    data
                      .cinemaSettings
                      .allowShiftTradePool,
                  ),
                allowShiftTradeDirect:
                  Boolean(
                    data
                      .cinemaSettings
                      .allowShiftTradeDirect,
                  ),
              }
            : null,
        );
      } catch (error) {
        setUsers([]);
        setCinemaSettings(
          null,
        );
        showErrorRef.current(
          "Sidedata kunne ikke hentes",
          error instanceof Error
            ? error.message
            : "Der opstod en fejl ved hentning af kollegaer og vagtbytteindstillinger.",
        );
      }
    }, [
      currentUser,
      isMasterWithoutOwnCinema,
    ]);

  const refreshDynamicData =
    useCallback(async () => {
      if (
        !currentUser ||
        isMasterWithoutOwnCinema
      ) {
        setShifts([]);
        setShiftTrades([]);
        return;
      }

      await Promise.all([
        fetchShifts(),
        fetchShiftTrades(),
      ]);
    }, [
      currentUser,
      fetchShiftTrades,
      fetchShifts,
      isMasterWithoutOwnCinema,
    ]);

  const refreshStaticData =
    fetchStaticData;

  const refreshData =
    refreshDynamicData;

  useEffect(() => {
    setCurrentUser(
      getStoredUser(),
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
      setShifts([]);
      setShiftTrades([]);
      setDataLoaded(true);
      return;
    }

    let active = true;
    setDataLoaded(false);

    void refreshDynamicData().finally(
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
    refreshDynamicData,
    userLoaded,
  ]);

  useEffect(() => {
    if (!userLoaded) {
      return;
    }

    void refreshStaticData();
  }, [
    refreshStaticData,
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

    const targetMonth =
      dateToLocalMonthString(
        new Date(
          focusedShift.startTime,
        ),
      );

    if (
      targetMonth !==
      selectedMonth
    ) {
      setSelectedMonth(
        targetMonth,
      );
    }
  }, [
    currentUser,
    dataLoaded,
    focusedShiftId,
    selectedMonth,
    shifts,
  ]);

  useRealtimeShifts({
    onShiftsUpdated:
      () => {
        void fetchShifts();
      },
    onShiftTradesUpdated:
      () => {
        void refreshDynamicData();
      },
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
        (shift) =>
          shift.userId ===
            currentUser.id &&
          dateToLocalMonthString(
            new Date(
              shift.startTime,
            ),
          ) ===
            selectedMonth,
      );
    }, [
      currentUser,
      isMasterWithoutOwnCinema,
      selectedMonth,
      shifts,
    ]);


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
    changeMonth,
  };
}
