"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useRealtimeCore,
} from "@/app/hooks/useRealtimeCore";
import {
  apiFetch,
} from "@/app/lib/api";

import {
  getActiveFilterCount,
  getFilterSummary,
  getGroupKey,
  readErrorMessage,
} from "../../helpers/core/leaveRequestHelpers";
import {
  DEFAULT_STATUS_FILTERS,
  type LeaveRequest,
  type LeaveRequestPageResponse,
  type LeaveStatus,
  type LeaveStatusCounts,
  type LeaveStatusFilters,
} from "../../helpers/core/leaveRequestTypes";

export type LeaveRequestCurrentUser = {
  id?: number;
  sub?: number;
  role:
    | "MASTER"
    | "ADMIN"
    | "EMPLOYEE";
  cinemaId:
    number | null;
};

type UseLeaveRequestsDataOptions = {
  showError:
    (
      title: string,
      description: string,
    ) => void;
  focusedRequestId?:
    number | null;
};

function readStoredCurrentUser() {
  const savedUser =
    localStorage.getItem(
      "user",
    );

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(
      savedUser,
    ) as
      LeaveRequestCurrentUser;
  } catch {
    return null;
  }
}

function readStoredMasterCinemaId() {
  const savedCinemaId =
    Number(
      localStorage.getItem(
        "masterSelectedCinemaId",
      ),
    );

  return Number.isInteger(
    savedCinemaId,
  ) &&
    savedCinemaId > 0
    ? savedCinemaId
    : null;
}

function getActiveCinemaId(
  user:
    LeaveRequestCurrentUser | null,
  selectedMasterCinemaId:
    number | null,
) {
  if (!user) {
    return null;
  }

  if (
    user.role === "MASTER" &&
    !user.cinemaId
  ) {
    return selectedMasterCinemaId;
  }

  return user.cinemaId;
}

function getSelectedStatuses(
  filters:
    LeaveStatusFilters,
) {
  const statuses:
    LeaveStatus[] = [];

  if (filters.pending) {
    statuses.push(
      "PENDING",
    );
  }
  if (filters.approved) {
    statuses.push(
      "APPROVED",
    );
  }
  if (filters.rejected) {
    statuses.push(
      "REJECTED",
    );
  }
  if (filters.cancelled) {
    statuses.push(
      "CANCELLED",
    );
  }
  if (filters.expired) {
    statuses.push(
      "EXPIRED",
    );
  }

  return statuses;
}

function mergeRequests(
  current:
    LeaveRequest[],
  incoming:
    LeaveRequest[],
) {
  const byId =
    new Map<
      number,
      LeaveRequest
    >();

  for (const request of [
    ...current,
    ...incoming,
  ]) {
    byId.set(
      request.id,
      request,
    );
  }

  return [
    ...byId.values(),
  ].sort(
    (left, right) =>
      new Date(
        left.startDate,
      ).getTime() -
      new Date(
        right.startDate,
      ).getTime(),
  );
}

function normalizeStatusCounts(
  counts:
    Partial<
      Record<
        LeaveStatus,
        number
      >
    > | undefined,
): LeaveStatusCounts {
  return {
    pending:
      Number(
        counts?.PENDING ||
          0,
      ),
    approved:
      Number(
        counts?.APPROVED ||
          0,
      ),
    rejected:
      Number(
        counts?.REJECTED ||
          0,
      ),
    cancelled:
      Number(
        counts?.CANCELLED ||
          0,
      ),
    expired:
      Number(
        counts?.EXPIRED ||
          0,
      ),
  };
}

export function useLeaveRequestsData({
  showError,
  focusedRequestId,
}: UseLeaveRequestsDataOptions) {
  const [
    requests,
    setRequests,
  ] =
    useState<LeaveRequest[]>(
      [],
    );
  const [
    currentUserId,
    setCurrentUserId,
  ] =
    useState<number | null>(
      null,
    );
  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<LeaveRequestCurrentUser | null>(
      null,
    );
  const [
    activeCinemaId,
    setActiveCinemaId,
  ] =
    useState<number | null>(
      null,
    );
  const [
    isMasterWithoutOwnCinema,
    setIsMasterWithoutOwnCinema,
  ] = useState(false);
  const [
    initialized,
    setInitialized,
  ] = useState(false);
  const [
    loading,
    setLoading,
  ] = useState(true);
  const [
    loadingMore,
    setLoadingMore,
  ] = useState(false);
  const [
    hasMore,
    setHasMore,
  ] = useState(false);
  const [
    nextBeforeId,
    setNextBeforeId,
  ] =
    useState<number | null>(
      null,
    );
  const [
    totalCount,
    setTotalCount,
  ] = useState(0);
  const [
    statusCounts,
    setStatusCounts,
  ] =
    useState<LeaveStatusCounts>({
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
      expired: 0,
    });

  const [
    showFilterModal,
    setShowFilterModal,
  ] = useState(false);
  const [
    statusFilters,
    setStatusFilters,
  ] =
    useState<LeaveStatusFilters>(
      DEFAULT_STATUS_FILTERS,
    );
  const [
    draftStatusFilters,
    setDraftStatusFilters,
  ] =
    useState<LeaveStatusFilters>(
      DEFAULT_STATUS_FILTERS,
    );
  const [
    filterStartDate,
    setFilterStartDate,
  ] = useState("");
  const [
    filterEndDate,
    setFilterEndDate,
  ] = useState("");
  const [
    draftFilterStartDate,
    setDraftFilterStartDate,
  ] = useState("");
  const [
    draftFilterEndDate,
    setDraftFilterEndDate,
  ] = useState("");
  const [
    expandedGroupKeys,
    setExpandedGroupKeys,
  ] =
    useState<string[]>([]);

  const refreshUserContext =
    useCallback(() => {
      const storedUser =
        readStoredCurrentUser();
      const selectedMasterCinemaId =
        readStoredMasterCinemaId();
      const nextActiveCinemaId =
        getActiveCinemaId(
          storedUser,
          selectedMasterCinemaId,
        );
      const masterWithoutActiveCinema =
        storedUser?.role ===
          "MASTER" &&
        !storedUser.cinemaId &&
        !nextActiveCinemaId;

      setCurrentUser(
        storedUser,
      );
      setCurrentUserId(
        storedUser?.id ??
          storedUser?.sub ??
          null,
      );
      setActiveCinemaId(
        nextActiveCinemaId,
      );
      setIsMasterWithoutOwnCinema(
        masterWithoutActiveCinema,
      );
      setInitialized(
        true,
      );
    }, []);

  const buildPageEndpoint =
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
        params.set(
          "statuses",
          getSelectedStatuses(
            statusFilters,
          ).join(","),
        );

        if (
          filterStartDate
        ) {
          params.set(
            "startDate",
            filterStartDate,
          );
        }
        if (
          filterEndDate
        ) {
          params.set(
            "endDate",
            filterEndDate,
          );
        }
        if (
          activeCinemaId &&
          currentUser?.role ===
            "MASTER" &&
          !currentUser.cinemaId
        ) {
          params.set(
            "cinemaId",
            String(
              activeCinemaId,
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
          focusedRequestId
        ) {
          params.set(
            "targetId",
            String(
              focusedRequestId,
            ),
          );
        }

        return `/leave-requests/page?${params.toString()}`;
      },
      [
        activeCinemaId,
        currentUser,
        filterEndDate,
        filterStartDate,
        focusedRequestId,
        statusFilters,
      ],
    );

  const fetchRequests =
    useCallback(
      async (
        showFetchError = true,
      ) => {
        if (!initialized) {
          return;
        }

        if (
          !currentUser ||
          isMasterWithoutOwnCinema
        ) {
          setRequests([]);
          setHasMore(false);
          setNextBeforeId(
            null,
          );
          setTotalCount(0);
          setStatusCounts({
            pending: 0,
            approved: 0,
            rejected: 0,
            cancelled: 0,
            expired: 0,
          });
          setLoading(false);
          return;
        }

        try {
          setLoading(true);

          const response =
            await apiFetch(
              buildPageEndpoint({
                includeTarget:
                  true,
              }),
            );

          if (!response.ok) {
            throw new Error(
              await readErrorMessage(
                response,
                "Fraværsansøgninger kunne ikke hentes.",
              ),
            );
          }

          const data =
            (await response.json()) as
              Partial<LeaveRequestPageResponse>;
          const items =
            Array.isArray(
              data.items,
            )
              ? data.items
              : [];
          const target =
            data.target ?? null;

          setRequests(
            mergeRequests(
              items,
              target
                ? [target]
                : [],
            ),
          );
          setHasMore(
            Boolean(
              data.hasMore,
            ),
          );
          setNextBeforeId(
            Number.isInteger(
              data.nextBeforeId,
            )
              ? data.nextBeforeId ??
                null
              : null,
          );
          setTotalCount(
            Number(
              data.totalCount ||
                0,
            ),
          );
          setStatusCounts(
            normalizeStatusCounts(
              data.statusCounts,
            ),
          );
        } catch (error) {
          setRequests([]);
          setHasMore(false);
          setNextBeforeId(
            null,
          );
          setTotalCount(0);

          if (showFetchError) {
            showError(
              "Fraværsansøgninger kunne ikke hentes",
              error instanceof Error
                ? error.message
                : "Der opstod en fejl ved hentning af fraværsansøgninger.",
            );
          }
        } finally {
          setLoading(false);
        }
      },
      [
        buildPageEndpoint,
        currentUser,
        initialized,
        isMasterWithoutOwnCinema,
        showError,
      ],
    );

  const loadMore =
    useCallback(async () => {
      if (
        !hasMore ||
        !nextBeforeId ||
        loadingMore
      ) {
        return;
      }

      try {
        setLoadingMore(
          true,
        );

        const response =
          await apiFetch(
            buildPageEndpoint({
              beforeId:
                nextBeforeId,
            }),
          );

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(
              response,
              "Ældre fraværsansøgninger kunne ikke hentes.",
            ),
          );
        }

        const data =
          (await response.json()) as
            Partial<LeaveRequestPageResponse>;

        setRequests(
          (current) =>
            mergeRequests(
              current,
              Array.isArray(
                data.items,
              )
                ? data.items
                : [],
            ),
        );
        setHasMore(
          Boolean(
            data.hasMore,
          ),
        );
        setNextBeforeId(
          Number.isInteger(
            data.nextBeforeId,
          )
            ? data.nextBeforeId ??
              null
            : null,
        );
        setTotalCount(
          Number(
            data.totalCount ||
              totalCount,
          ),
        );
        setStatusCounts(
          normalizeStatusCounts(
            data.statusCounts,
          ),
        );
      } catch (error) {
        showError(
          "Ældre fraværsansøgninger kunne ikke hentes",
          error instanceof Error
            ? error.message
            : "Der opstod en fejl ved hentning af ældre fraværsansøgninger.",
        );
      } finally {
        setLoadingMore(
          false,
        );
      }
    }, [
      buildPageEndpoint,
      hasMore,
      loadingMore,
      nextBeforeId,
      showError,
      totalCount,
    ]);

  useRealtimeCore({
    onLeaveRequestUpdated:
      () =>
        void fetchRequests(
          false,
        ),
  });

  useEffect(() => {
    refreshUserContext();
    window.addEventListener(
      "masterSelectedCinemaChanged",
      refreshUserContext,
    );

    return () => {
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        refreshUserContext,
      );
    };
  }, [refreshUserContext]);

  useEffect(() => {
    void fetchRequests();
  }, [fetchRequests]);

  const activeFilterCount =
    useMemo(
      () =>
        getActiveFilterCount(
          statusFilters,
          filterStartDate,
          filterEndDate,
        ),
      [
        filterEndDate,
        filterStartDate,
        statusFilters,
      ],
    );
  const filterSummary =
    useMemo(
      () =>
        getFilterSummary(
          statusFilters,
          filterStartDate,
          filterEndDate,
        ),
      [
        filterEndDate,
        filterStartDate,
        statusFilters,
      ],
    );
  const groupedRequests =
    useMemo(() => {
      const groups =
        new Map<
          string,
          LeaveRequest[]
        >();

      for (
        const request of
        requests
      ) {
        const key =
          getGroupKey(
            request,
          );
        const existing =
          groups.get(
            key,
          ) || [];

        groups.set(
          key,
          [
            ...existing,
            request,
          ],
        );
      }

      return Array.from(
        groups.entries(),
      )
        .map(
          ([
            key,
            groupRequests,
          ]) => ({
            key,
            requests:
              groupRequests.sort(
                (
                  left,
                  right,
                ) =>
                  new Date(
                    left.startDate,
                  ).getTime() -
                  new Date(
                    right.startDate,
                  ).getTime(),
              ),
          }),
        )
        .sort(
          (
            left,
            right,
          ) =>
            new Date(
              left.requests[0]
                .startDate,
            ).getTime() -
            new Date(
              right.requests[0]
                .startDate,
            ).getTime(),
        );
    }, [requests]);

  useEffect(() => {
    if (!focusedRequestId) {
      return;
    }

    const focusedRequest =
      requests.find(
        (request) =>
          request.id ===
          focusedRequestId,
      );

    if (!focusedRequest) {
      return;
    }

    const key =
      getGroupKey(
        focusedRequest,
      );

    setExpandedGroupKeys(
      (current) =>
        current.includes(key)
          ? current
          : [
              ...current,
              key,
            ],
    );
  }, [
    focusedRequestId,
    requests,
  ]);

  function openFilterModal() {
    setDraftStatusFilters(
      statusFilters,
    );
    setDraftFilterStartDate(
      filterStartDate,
    );
    setDraftFilterEndDate(
      filterEndDate,
    );
    setShowFilterModal(
      true,
    );
  }

  function closeFilterModal() {
    setShowFilterModal(
      false,
    );
  }

  function updateDraftStatusFilter(
    key:
      keyof LeaveStatusFilters,
    checked: boolean,
  ) {
    setDraftStatusFilters(
      (current) => ({
        ...current,
        [key]: checked,
      }),
    );
  }

  function applyFilter() {
    setStatusFilters(
      draftStatusFilters,
    );
    setFilterStartDate(
      draftFilterStartDate,
    );
    setFilterEndDate(
      draftFilterEndDate,
    );
    setExpandedGroupKeys(
      [],
    );
    setShowFilterModal(
      false,
    );
  }

  function resetFilter() {
    setDraftStatusFilters(
      DEFAULT_STATUS_FILTERS,
    );
    setStatusFilters(
      DEFAULT_STATUS_FILTERS,
    );
    setDraftFilterStartDate(
      "",
    );
    setDraftFilterEndDate(
      "",
    );
    setFilterStartDate(
      "",
    );
    setFilterEndDate(
      "",
    );
    setExpandedGroupKeys(
      [],
    );
    setShowFilterModal(
      false,
    );
  }

  function showPendingOnly() {
    setStatusFilters({
      pending: true,
      approved: false,
      rejected: false,
      cancelled: false,
      expired: false,
    });
    setFilterStartDate(
      "",
    );
    setFilterEndDate(
      "",
    );
    setExpandedGroupKeys(
      [],
    );
  }

  function toggleGroup(
    groupKey: string,
  ) {
    setExpandedGroupKeys(
      (current) =>
        current.includes(
          groupKey,
        )
          ? current.filter(
              (key) =>
                key !==
                groupKey,
            )
          : [
              ...current,
              groupKey,
            ],
    );
  }

  return {
    activeCinemaId,
    currentUser,
    currentUserId,
    fetchRequests,
    isMasterWithoutOwnCinema,
    loading,
    requests,
    filters: {
      activeFilterCount,
      dateFilteredRequestCount:
        totalCount,
      draftFilterEndDate,
      draftFilterStartDate,
      draftStatusFilters,
      expandedGroupKeys,
      filterSummary,
      groupedRequests,
      hasMore,
      loadingMore,
      showFilterModal,
      statusCounts,
      visibleRequests:
        requests,
      applyFilter,
      closeFilterModal,
      loadMore,
      openFilterModal,
      resetFilter,
      setDraftFilterEndDate,
      setDraftFilterStartDate,
      showPendingOnly,
      toggleGroup,
      updateDraftStatusFilter,
    },
  };
}
