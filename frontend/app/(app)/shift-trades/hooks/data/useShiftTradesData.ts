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
  ShiftTradeCursorPage,
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

type OpenTradeType =
  | "DIRECT"
  | "POOL";

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

function getPageMetadata(
  value:
    | Partial<
        ShiftTradeCursorPage
      >
    | null
    | undefined,
  fallbackCount: number,
) {
  return {
    totalCount:
      Number.isInteger(
        value?.totalCount,
      )
        ? Number(
            value?.totalCount,
          )
        : fallbackCount,
    hasMore:
      Boolean(
        value?.hasMore,
      ),
    nextBeforeId:
      Number.isInteger(
        value?.nextBeforeId,
      )
        ? value?.nextBeforeId ??
          null
        : null,
  };
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
    directTotalCount,
    setDirectTotalCount,
  ] = useState(0);
  const [
    directHasMore,
    setDirectHasMore,
  ] = useState(false);
  const [
    directNextBeforeId,
    setDirectNextBeforeId,
  ] =
    useState<number | null>(
      null,
    );

  const [
    poolTotalCount,
    setPoolTotalCount,
  ] = useState(0);
  const [
    poolHasMore,
    setPoolHasMore,
  ] = useState(false);
  const [
    poolNextBeforeId,
    setPoolNextBeforeId,
  ] =
    useState<number | null>(
      null,
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
    loadingMoreDirect,
    setLoadingMoreDirect,
  ] = useState(false);
  const [
    loadingMorePool,
    setLoadingMorePool,
  ] = useState(false);
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

  const addCinemaQuery =
    useCallback(
      (
        params:
          URLSearchParams,
      ) => {
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
      },
      [getMasterCinemaId],
    );

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
        addCinemaQuery(
          params,
        );

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
        addCinemaQuery,
        targetTradeId,
      ],
    );

  const buildOpenPageUrl =
    useCallback(
      (
        type:
          OpenTradeType,
        beforeId:
          number,
      ) => {
        const params =
          new URLSearchParams({
            type,
            limit: "50",
            beforeId:
              String(
                beforeId,
              ),
          });
        addCinemaQuery(
          params,
        );

        return `/shift-trades/open-page?${params.toString()}`;
      },
      [addCinemaQuery],
    );

  const resetTrades =
    useCallback(() => {
      setDirectTrades([]);
      setPoolTrades([]);
      setHistoryTrades([]);
      setDirectTotalCount(0);
      setDirectHasMore(false);
      setDirectNextBeforeId(null);
      setPoolTotalCount(0);
      setPoolHasMore(false);
      setPoolNextBeforeId(null);
      setHistoryTotalCount(0);
      setHistoryHasMore(false);
      setHistoryNextBeforeId(null);
      setLoadingMoreDirect(false);
      setLoadingMorePool(false);
      setLoadingMoreHistory(false);
    }, []);

  const fetchTrades =
    useCallback(
      async (
        showLoading = true,
      ) => {
        if (!user) {
          resetTrades();
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
          resetTrades();
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

          const directPage =
            getPageMetadata(
              data.directPage,
              nextDirectTrades.length,
            );
          setDirectTotalCount(
            directPage.totalCount,
          );
          setDirectHasMore(
            directPage.hasMore,
          );
          setDirectNextBeforeId(
            directPage.nextBeforeId,
          );

          const poolPage =
            getPageMetadata(
              data.poolPage,
              nextPoolTrades.length,
            );
          setPoolTotalCount(
            poolPage.totalCount,
          );
          setPoolHasMore(
            poolPage.hasMore,
          );
          setPoolNextBeforeId(
            poolPage.nextBeforeId,
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
          resetTrades();
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
        resetTrades,
        user,
      ],
    );

  const loadMoreOpenTrades =
    useCallback(
      async (
        type:
          OpenTradeType,
      ) => {
        const isDirect =
          type ===
          "DIRECT";
        const hasMore =
          isDirect
            ? directHasMore
            : poolHasMore;
        const nextBeforeId =
          isDirect
            ? directNextBeforeId
            : poolNextBeforeId;
        const isLoading =
          isDirect
            ? loadingMoreDirect
            : loadingMorePool;

        if (
          !hasMore ||
          !nextBeforeId ||
          isLoading
        ) {
          return;
        }

        try {
          if (isDirect) {
            setLoadingMoreDirect(
              true,
            );
          } else {
            setLoadingMorePool(
              true,
            );
          }

          const response =
            await apiFetch(
              buildOpenPageUrl(
                type,
                nextBeforeId,
              ),
            );

          if (!response.ok) {
            throw new Error(
              "Flere åbne vagtbytter kunne ikke hentes.",
            );
          }

          const data =
            (await response.json()) as
              Partial<ShiftTradeCursorPage>;
          const nextItems =
            Array.isArray(
              data.items,
            )
              ? data.items
              : [];
          const page =
            getPageMetadata(
              data,
              nextItems.length,
            );

          if (isDirect) {
            setDirectTrades(
              (current) =>
                mergeTrades(
                  current,
                  nextItems,
                ),
            );
            setDirectTotalCount(
              page.totalCount,
            );
            setDirectHasMore(
              page.hasMore,
            );
            setDirectNextBeforeId(
              page.nextBeforeId,
            );
          } else {
            setPoolTrades(
              (current) =>
                mergeTrades(
                  current,
                  nextItems,
                ),
            );
            setPoolTotalCount(
              page.totalCount,
            );
            setPoolHasMore(
              page.hasMore,
            );
            setPoolNextBeforeId(
              page.nextBeforeId,
            );
          }
        } catch (error) {
          showErrorRef.current(
            "Kunne ikke hente flere vagtbytter",
            error instanceof Error
              ? error.message
              : "Flere åbne vagtbytter kunne ikke hentes.",
          );
        } finally {
          if (isDirect) {
            setLoadingMoreDirect(
              false,
            );
          } else {
            setLoadingMorePool(
              false,
            );
          }
        }
      },
      [
        apiFetch,
        buildOpenPageUrl,
        directHasMore,
        directNextBeforeId,
        loadingMoreDirect,
        loadingMorePool,
        poolHasMore,
        poolNextBeforeId,
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
    loadingMoreDirect,
    loadingMorePool,
    loadingMoreHistory,
    message,
    setMessage,
    fetchTrades,
    loadMoreDirect:
      () =>
        loadMoreOpenTrades(
          "DIRECT",
        ),
    loadMorePool:
      () =>
        loadMoreOpenTrades(
          "POOL",
        ),
    loadMoreHistory,
    directTrades,
    directTotalCount,
    directHasMore,
    poolTrades,
    poolTotalCount,
    poolHasMore,
    historyTrades,
    historyTotalCount,
    historyHasMore,
    hasShiftConflict,
    needsMasterCinemaSelection,
  };
}
