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
  formatDateDK,
} from "@/app/utils/dateTime";

import {
  appendCinemaId,
  getActiveFilterCount,
  getLeaveDateGroupMeta,
  getSelectedMasterCinemaId,
  getStatusFilterSummary,
  getStoredUser,
  getUserName,
  makeDateGroupExpansionKey,
  readErrorMessage,
} from "../../helpers/core/leaveApprovalHelpers";
import {
  DEFAULT_STATUS_FILTERS,
  type GroupedLeaveRequests,
  type LeaveRequest,
  type LeaveRequestPageResponse,
  type LeaveStatus,
  type LeaveStatusFilters,
  type StoredUser,
} from "../../helpers/core/leaveApprovalTypes";

type InfoDialog = {
  showError:
    (
      title: string,
      description: string,
    ) => void;
};

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
  if (filters.expired) {
    statuses.push(
      "EXPIRED",
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

  return statuses;
}

const emptyStatusCounts =
  {
    PENDING: 0,
    EXPIRED: 0,
    APPROVED: 0,
    REJECTED: 0,
    CANCELLED: 0,
  } satisfies Record<
    LeaveStatus,
    number
  >;

function getStatusSuccessMessage(
  status:
    LeaveStatus,
) {
  switch (status) {
    case "APPROVED":
      return "Fraværsansøgningen er godkendt.";
    case "REJECTED":
      return "Fraværsansøgningen er afvist.";
    case "CANCELLED":
      return "Fraværsansøgningen er annulleret.";
    default:
      return "Fraværsansøgningens status er opdateret.";
  }
}

export function useLeaveApprovalData(
  infoDialog:
    InfoDialog,
  focusedRequestId?:
    number | null,
) {
  const showError =
    infoDialog.showError;

  const [
    requests,
    setRequests,
  ] =
    useState<LeaveRequest[]>(
      [],
    );
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
    dateRangeStatusCounts,
    setDateRangeStatusCounts,
  ] =
    useState<
      Record<
        LeaveStatus,
        number
      >
    >(
      emptyStatusCounts,
    );
  const [
    currentUser,
    setCurrentUser,
  ] =
    useState<StoredUser | null>(
      null,
    );
  const [
    selectedMasterCinemaId,
    setSelectedMasterCinemaId,
  ] =
    useState<number | null>(
      null,
    );

  const [
    showFilterModal,
    setShowFilterModal,
  ] = useState(false);
  const [
    statusFilters,
    setStatusFilters,
  ] = useState(
    DEFAULT_STATUS_FILTERS,
  );
  const [
    draftStatusFilters,
    setDraftStatusFilters,
  ] = useState(
    DEFAULT_STATUS_FILTERS,
  );
  const [
    startDateFilter,
    setStartDateFilter,
  ] = useState("");
  const [
    endDateFilter,
    setEndDateFilter,
  ] = useState("");
  const [
    draftStartDateFilter,
    setDraftStartDateFilter,
  ] = useState("");
  const [
    draftEndDateFilter,
    setDraftEndDateFilter,
  ] = useState("");
  const [
    expandedUserIds,
    setExpandedUserIds,
  ] =
    useState<number[]>([]);
  const [
    expandedDateGroupKeys,
    setExpandedDateGroupKeys,
  ] =
    useState<string[]>([]);

  const [
    successToast,
    setSuccessToast,
  ] =
    useState<string | null>(
      null,
    );

  useEffect(() => {
    if (!successToast) {
      return;
    }

    const timeoutId =
      window.setTimeout(
        () =>
          setSuccessToast(
            null,
          ),
        4000,
      );

    return () =>
      window.clearTimeout(
        timeoutId,
      );
  }, [successToast]);

  const activeCinemaId =
    useMemo(() => {
      if (!currentUser) {
        return null;
      }

      if (
        currentUser.role ===
          "MASTER" &&
        !currentUser.cinemaId
      ) {
        return selectedMasterCinemaId;
      }

      return (
        currentUser.cinemaId ??
        null
      );
    }, [
      currentUser,
      selectedMasterCinemaId,
    ]);

  const needsMasterCinemaSelection =
    currentUser?.role ===
      "MASTER" &&
    !currentUser.cinemaId &&
    !selectedMasterCinemaId;

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
          "includeAll",
          "true",
        );
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
          startDateFilter
        ) {
          params.set(
            "startDate",
            startDateFilter,
          );
        }
        if (
          endDateFilter
        ) {
          params.set(
            "endDate",
            endDateFilter,
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

        return appendCinemaId(
          `/leave-requests/page?${params.toString()}`,
          currentUser?.role ===
              "MASTER" &&
            !currentUser.cinemaId
            ? activeCinemaId
            : null,
        );
      },
      [
        activeCinemaId,
        currentUser,
        endDateFilter,
        focusedRequestId,
        startDateFilter,
        statusFilters,
      ],
    );

  const fetchRequests =
    useCallback(
      async (
        shouldShowError = true,
      ) => {
        if (!currentUser) {
          return;
        }

        if (
          needsMasterCinemaSelection
        ) {
          setRequests([]);
          setHasMore(false);
          setNextBeforeId(
            null,
          );
          setTotalCount(0);
          setDateRangeStatusCounts(
            emptyStatusCounts,
          );
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
          setDateRangeStatusCounts({
            PENDING:
              Number(
                data.statusCounts
                  ?.PENDING || 0,
              ),
            EXPIRED:
              Number(
                data.statusCounts
                  ?.EXPIRED || 0,
              ),
            APPROVED:
              Number(
                data.statusCounts
                  ?.APPROVED || 0,
              ),
            REJECTED:
              Number(
                data.statusCounts
                  ?.REJECTED || 0,
              ),
            CANCELLED:
              Number(
                data.statusCounts
                  ?.CANCELLED || 0,
              ),
          });
        } catch (error) {
          setRequests([]);
          setHasMore(false);
          setNextBeforeId(
            null,
          );
          setTotalCount(0);

          if (shouldShowError) {
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
        showError,
        needsMasterCinemaSelection,
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
      showError,
      loadingMore,
      nextBeforeId,
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
    function syncActiveCinemaContext() {
      setCurrentUser(
        getStoredUser(),
      );
      setSelectedMasterCinemaId(
        getSelectedMasterCinemaId(),
      );
    }

    syncActiveCinemaContext();
    window.addEventListener(
      "masterSelectedCinemaChanged",
      syncActiveCinemaContext,
    );
    window.addEventListener(
      "storage",
      syncActiveCinemaContext,
    );

    return () => {
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        syncActiveCinemaContext,
      );
      window.removeEventListener(
        "storage",
        syncActiveCinemaContext,
      );
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    void fetchRequests();
  }, [
    currentUser,
    fetchRequests,
    selectedMasterCinemaId,
  ]);

  const groupedRequests =
    useMemo<
      GroupedLeaveRequests[]
    >(() => {
      const groups =
        new Map<
          number,
          LeaveRequest[]
        >();

      for (
        const request of
        requests
      ) {
        const existing =
          groups.get(
            request.user.id,
          ) || [];

        groups.set(
          request.user.id,
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
            userId,
            userRequests,
          ]) => {
            const sortedRequests =
              userRequests.sort(
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
              );
            const dateGroups =
              new Map<
                string,
                {
                  key: string;
                  title: string;
                  sortTime:
                    number;
                  requests:
                    LeaveRequest[];
                }
              >();

            for (
              const request of
              sortedRequests
            ) {
              const meta =
                getLeaveDateGroupMeta(
                  request,
                );
              const existing =
                dateGroups.get(
                  meta.key,
                );

              dateGroups.set(
                meta.key,
                existing
                  ? {
                      ...existing,
                      requests: [
                        ...existing.requests,
                        request,
                      ],
                    }
                  : {
                      ...meta,
                      requests: [
                        request,
                      ],
                    },
              );
            }

            return {
              userId,
              userName:
                getUserName(
                  sortedRequests[0],
                ),
              requests:
                sortedRequests,
              dateGroups:
                Array.from(
                  dateGroups.values(),
                ).sort(
                  (
                    left,
                    right,
                  ) =>
                    left.sortTime -
                    right.sortTime,
                ),
            };
          },
        )
        .sort(
          (
            left,
            right,
          ) =>
            left.userName.localeCompare(
              right.userName,
              "da-DK",
            ),
        );
    }, [requests]);

  const activeFilterCount =
    useMemo(
      () =>
        getActiveFilterCount(
          statusFilters,
          startDateFilter,
          endDateFilter,
        ),
      [
        endDateFilter,
        startDateFilter,
        statusFilters,
      ],
    );
  const hasCustomFilters =
    useMemo(
      () =>
        statusFilters.pending !==
          DEFAULT_STATUS_FILTERS.pending ||
        statusFilters.expired !==
          DEFAULT_STATUS_FILTERS.expired ||
        statusFilters.approved !==
          DEFAULT_STATUS_FILTERS.approved ||
        statusFilters.rejected !==
          DEFAULT_STATUS_FILTERS.rejected ||
        statusFilters.cancelled !==
          DEFAULT_STATUS_FILTERS.cancelled ||
        Boolean(
          startDateFilter,
        ) ||
        Boolean(
          endDateFilter,
        ),
      [
        endDateFilter,
        startDateFilter,
        statusFilters,
      ],
    );
  const statusFilterSummary =
    useMemo(
      () =>
        getStatusFilterSummary(
          statusFilters,
        ),
      [statusFilters],
    );
  const dateFilterSummary =
    useMemo(() => {
      if (
        startDateFilter &&
        endDateFilter
      ) {
        return `${formatDateDK(
          startDateFilter,
        )} til ${formatDateDK(
          endDateFilter,
        )}`;
      }

      if (startDateFilter) {
        return `Fra ${formatDateDK(
          startDateFilter,
        )}`;
      }

      if (endDateFilter) {
        return `Til ${formatDateDK(
          endDateFilter,
        )}`;
      }

      return "Alle datoer";
    }, [
      endDateFilter,
      startDateFilter,
    ]);

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

    setExpandedUserIds(
      (current) =>
        current.includes(
          focusedRequest.user.id,
        )
          ? current
          : [
              ...current,
              focusedRequest.user.id,
            ],
    );

    const focusedDateGroup =
      getLeaveDateGroupMeta(
        focusedRequest,
      );
    const expansionKey =
      makeDateGroupExpansionKey(
        focusedRequest.user.id,
        focusedDateGroup.key,
      );

    setExpandedDateGroupKeys(
      (current) =>
        current.includes(
          expansionKey,
        )
          ? current
          : [
              ...current,
              expansionKey,
            ],
    );
  }, [
    focusedRequestId,
    requests,
  ]);

  async function updateStatus(
    requestId: number,
    status:
      LeaveStatus,
    note?: string,
  ) {
    setSuccessToast(
      null,
    );

    try {
      if (
        needsMasterCinemaSelection
      ) {
        showError(
          "Ingen aktiv biograf valgt",
          "Vælg en biograf i MASTER-panelet, før du behandler fravær.",
        );
        return;
      }

      const response =
        await apiFetch(
          appendCinemaId(
            `/leave-requests/${requestId}/status`,
            currentUser?.role ===
                "MASTER" &&
              !currentUser.cinemaId
              ? activeCinemaId
              : null,
          ),
          {
            method:
              "PATCH",
            body:
              JSON.stringify({
                status,
                ...(note
                  ? {
                      note,
                    }
                  : {}),
              }),
          },
        );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Status kunne ikke opdateres.",
          ),
        );
      }

      await fetchRequests();

      setSuccessToast(
        getStatusSuccessMessage(
          status,
        ),
      );
    } catch (error) {
      showError(
        "Status kunne ikke opdateres",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl.",
      );
    }
  }

  function dismissSuccessToast() {
    setSuccessToast(
      null,
    );
  }

  function openFilterModal() {
    setDraftStatusFilters(
      statusFilters,
    );
    setDraftStartDateFilter(
      startDateFilter,
    );
    setDraftEndDateFilter(
      endDateFilter,
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
    setStartDateFilter(
      draftStartDateFilter,
    );
    setEndDateFilter(
      draftEndDateFilter,
    );
    setExpandedUserIds(
      [],
    );
    setExpandedDateGroupKeys(
      [],
    );
    setShowFilterModal(
      false,
    );
  }

  function resetFilter() {
    setStatusFilters(
      DEFAULT_STATUS_FILTERS,
    );
    setDraftStatusFilters(
      DEFAULT_STATUS_FILTERS,
    );
    setStartDateFilter(
      "",
    );
    setEndDateFilter(
      "",
    );
    setDraftStartDateFilter(
      "",
    );
    setDraftEndDateFilter(
      "",
    );
    setExpandedUserIds(
      [],
    );
    setExpandedDateGroupKeys(
      [],
    );
    setShowFilterModal(
      false,
    );
  }

  function showOnlyPending() {
    setStatusFilters({
      pending: true,
      expired: false,
      approved: false,
      rejected: false,
      cancelled: false,
    });
    setExpandedUserIds(
      [],
    );
    setExpandedDateGroupKeys(
      [],
    );
  }

  function toggleUserGroup(
    userId: number,
  ) {
    setExpandedUserIds(
      (current) =>
        current.includes(
          userId,
        )
          ? current.filter(
              (id) =>
                id !==
                userId,
            )
          : [
              ...current,
              userId,
            ],
    );
  }

  function toggleDateGroup(
    userId: number,
    dateKey: string,
  ) {
    const expansionKey =
      makeDateGroupExpansionKey(
        userId,
        dateKey,
      );

    setExpandedDateGroupKeys(
      (current) =>
        current.includes(
          expansionKey,
        )
          ? current.filter(
              (key) =>
                key !==
                expansionKey,
            )
          : [
              ...current,
              expansionKey,
            ],
    );
  }

  return {
    requests,
    totalCount,
    loading,
    loadingMore,
    hasMore,
    dateRangeStatusCounts,
    needsMasterCinemaSelection,
    successToast,
    dismissSuccessToast,
    updateStatus,
    loadMore,
    showFilterModal,
    draftStatusFilters,
    draftStartDateFilter,
    draftEndDateFilter,
    expandedUserIds,
    expandedDateGroupKeys,
    visibleRequests:
      requests,
    groupedRequests,
    activeFilterCount,
    hasCustomFilters,
    statusFilterSummary,
    dateFilterSummary,
    openFilterModal,
    closeFilterModal,
    updateDraftStatusFilter,
    setDraftStartDateFilter,
    setDraftEndDateFilter,
    applyFilter,
    resetFilter,
    showOnlyPending,
    toggleUserGroup,
    toggleDateGroup,
  };
}
