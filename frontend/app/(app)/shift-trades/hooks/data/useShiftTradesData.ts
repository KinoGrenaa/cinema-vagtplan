import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useApi,
} from "@/app/hooks/useApi";
import {
  useRealtimeShifts,
} from "@/app/hooks/useRealtimeShifts";
import {
  useAuth,
} from "@/app/providers/AuthProvider";

import type {
  ShiftTrade,
  ShiftTradePageResponse,
} from "../../helpers/core/shiftTradeTypes";

type InfoDialog = {
  showError:
    (
      title: string,
      description: string,
    ) => void;
};

type UseShiftTradesDataArgs = {
  infoDialog:
    InfoDialog;
  targetTradeId?:
    number | null;
};

function mergeTrades(
  current:
    ShiftTrade[],
  incoming:
    ShiftTrade[],
) {
  const byId =
    new Map<
      number,
      ShiftTrade
    >();

  for (const trade of [
    ...current,
    ...incoming,
  ]) {
    byId.set(
      trade.id,
      trade,
    );
  }

  return [
    ...byId.values(),
  ].sort(
    (left, right) =>
      right.id -
      left.id,
  );
}

export function useShiftTradesData({
  infoDialog,
  targetTradeId,
}: UseShiftTradesDataArgs) {
  const {
    apiFetch,
  } = useApi();
  const {
    user,
  } = useAuth();
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

  const [
    directTrades,
    setDirectTrades,
  ] =
    useState<ShiftTrade[]>(
      [],
    );
  const [
    poolTrades,
    setPoolTrades,
  ] =
    useState<ShiftTrade[]>(
      [],
    );
  const [
    historyTrades,
    setHistoryTrades,
  ] =
    useState<ShiftTrade[]>(
      [],
    );
  const [
    historyTotalCount,
    setHistoryTotalCount,
  ] = useState(0);
  const [
    historyHasMore,
    setHistoryHasMore,
  ] = useState(false);
  const [
    historyNextBeforeId,
    setHistoryNextBeforeId,
  ] =
    useState<number | null>(
      null,
    );
  const [
    loading,
    setLoading,
  ] = useState(true);
  const [
    loadingMoreHistory,
    setLoadingMoreHistory,
  ] = useState(false);
  const [
    message,
    setMessage,
  ] = useState("");
  const [
    needsMasterCinemaSelection,
    setNeedsMasterCinemaSelection,
  ] = useState(false);

  const getMasterCinemaId =
    useCallback(() => {
      if (
        typeof window ===
        "undefined"
      ) {
        return null;
      }

      if (
        user?.role !==
          "MASTER" ||
        user.cinemaId
      ) {
        return null;
      }

      const value =
        Number(
          window.localStorage.getItem(
            "masterSelectedCinemaId",
          ),
        );

      return Number.isInteger(
        value,
      ) &&
        value > 0
        ? value
        : null;
    }, [user]);

  const buildPageUrl =
    useCallback(
      (options: {
        beforeId?:
          number | null;
        includeTarget?:
          boolean;
      } = {}) => {
        const params =
          new URLSearchParams();

        params.set(
          "limit",
          "50",
        );

        const masterCinemaId =
          getMasterCinemaId();

        if (masterCinemaId) {
          params.set(
            "cinemaId",
            String(
              masterCinemaId,
            ),
          );
        }

        if (
          options.beforeId
        ) {
          params.set(
            "beforeId",
            String(
              options.beforeId,
            ),
          );
        }

        if (
          options.includeTarget &&
          targetTradeId
        ) {
          params.set(
            "targetId",
            String(
              targetTradeId,
            ),
          );
        }

        return `/shift-trades/page?${params.toString()}`;
      },
      [
        getMasterCinemaId,
        targetTradeId,
      ],
    );

  const fetchTrades =
    useCallback(
      async (
        showLoading = true,
      ) => {
        if (!user) {
          setDirectTrades([]);
          setPoolTrades([]);
          setHistoryTrades([]);
          setHistoryTotalCount(0);
          setHistoryHasMore(
            false,
          );
          setHistoryNextBeforeId(
            null,
          );
          setNeedsMasterCinemaSelection(
            false,
          );
          setLoading(false);
          return;
        }

        const masterCinemaId =
          getMasterCinemaId();
        const shouldSelectMasterCinema =
          user.role ===
            "MASTER" &&
          !user.cinemaId &&
          !masterCinemaId;

        setNeedsMasterCinemaSelection(
          shouldSelectMasterCinema,
        );

        if (
          shouldSelectMasterCinema
        ) {
          setDirectTrades([]);
          setPoolTrades([]);
          setHistoryTrades([]);
          setHistoryTotalCount(0);
          setHistoryHasMore(
            false,
          );
          setHistoryNextBeforeId(
            null,
          );
          setLoading(false);
          return;
        }

        try {
          if (showLoading) {
            setLoading(true);
          }

          const response =
            await apiFetch(
              buildPageUrl({
                includeTarget:
                  true,
              }),
            );

          if (!response.ok) {
            throw new Error(
              "Der opstod en fejl, da vagtbytter skulle hentes. Prøv igen.",
            );
          }

          const data =
            (await response.json()) as
              Partial<ShiftTradePageResponse>;
          const nextDirectTrades =
            Array.isArray(
              data.directTrades,
            )
              ? data.directTrades
              : [];
          const nextPoolTrades =
            Array.isArray(
              data.poolTrades,
            )
              ? data.poolTrades
              : [];
          const nextHistoryTrades =
            Array.isArray(
              data.history?.items,
            )
              ? data.history
                  .items
              : [];
          const target =
            data.target ?? null;

          setDirectTrades(
            target?.status ===
              "OPEN" &&
              target.type ===
                "DIRECT"
              ? mergeTrades(
                  nextDirectTrades,
                  [target],
                )
              : nextDirectTrades,
          );
          setPoolTrades(
            target?.status ===
              "OPEN" &&
              target.type ===
                "POOL"
              ? mergeTrades(
                  nextPoolTrades,
                  [target],
                )
              : nextPoolTrades,
          );
          setHistoryTrades(
            target &&
              target.status !==
                "OPEN"
              ? mergeTrades(
                  nextHistoryTrades,
                  [target],
                )
              : nextHistoryTrades,
          );
          setHistoryTotalCount(
            Number(
              data.history
                ?.totalCount || 0,
            ),
          );
          setHistoryHasMore(
            Boolean(
              data.history
                ?.hasMore,
            ),
          );
          setHistoryNextBeforeId(
            Number.isInteger(
              data.history
                ?.nextBeforeId,
            )
              ? data.history
                  ?.nextBeforeId ??
                null
              : null,
          );
        } catch (error) {
          setDirectTrades([]);
          setPoolTrades([]);
          setHistoryTrades([]);
          setHistoryTotalCount(0);
          setHistoryHasMore(
            false,
          );
          setHistoryNextBeforeId(
            null,
          );
          showErrorRef.current(
            "Kunne ikke hente vagtbytter",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl, da vagtbytter skulle hentes. Prøv igen.",
          );
        } finally {
          if (showLoading) {
            setLoading(false);
          }
        }
      },
      [
        apiFetch,
        buildPageUrl,
        getMasterCinemaId,
        user,
      ],
    );

  const loadMoreHistory =
    useCallback(async () => {
      if (
        !historyHasMore ||
        !historyNextBeforeId ||
        loadingMoreHistory
      ) {
        return;
      }

      try {
        setLoadingMoreHistory(
          true,
        );

        const response =
          await apiFetch(
            buildPageUrl({
              beforeId:
                historyNextBeforeId,
            }),
          );

        if (!response.ok) {
          throw new Error(
            "Ældre vagtbytter kunne ikke hentes.",
          );
        }

        const data =
          (await response.json()) as
            Partial<ShiftTradePageResponse>;
        const nextItems =
          Array.isArray(
            data.history?.items,
          )
            ? data.history
                .items
            : [];

        setHistoryTrades(
          (current) =>
            mergeTrades(
              current,
              nextItems,
            ),
        );
        setHistoryTotalCount(
          Number(
            data.history
              ?.totalCount ||
              historyTotalCount,
          ),
        );
        setHistoryHasMore(
          Boolean(
            data.history
              ?.hasMore,
          ),
        );
        setHistoryNextBeforeId(
          Number.isInteger(
            data.history
              ?.nextBeforeId,
          )
            ? data.history
                ?.nextBeforeId ??
              null
            : null,
        );
      } catch (error) {
        showErrorRef.current(
          "Kunne ikke hente ældre vagtbytter",
          error instanceof Error
            ? error.message
            : "Ældre vagtbytter kunne ikke hentes.",
        );
      } finally {
        setLoadingMoreHistory(
          false,
        );
      }
    }, [
      apiFetch,
      buildPageUrl,
      historyHasMore,
      historyNextBeforeId,
      historyTotalCount,
      loadingMoreHistory,
    ]);

  useEffect(() => {
    void fetchTrades();
  }, [fetchTrades]);

  useRealtimeShifts({
    onShiftTradesUpdated:
      () =>
        void fetchTrades(
          false,
        ),
    onShiftsUpdated:
      () =>
        void fetchTrades(
          false,
        ),
  });

  function hasShiftConflict(
    trade: ShiftTrade,
  ) {
    return Boolean(
      trade.hasShiftConflict,
    );
  }

  return {
    user:
      user ?? null,
    apiFetch,
    loading,
    loadingMoreHistory,
    message,
    setMessage,
    fetchTrades,
    loadMoreHistory,
    directTrades,
    poolTrades,
    historyTrades,
    historyTotalCount,
    historyHasMore,
    hasShiftConflict,
    needsMasterCinemaSelection,
  };
}
