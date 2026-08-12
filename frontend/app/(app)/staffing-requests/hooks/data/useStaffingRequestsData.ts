import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  appendCinemaId,
  getCurrentUserId,
  getSelectedMasterCinemaId,
  readErrorMessage,
} from "../../helpers/core/staffingRequestHelpers";
import type {
  StaffingRequest,
  StaffingRequestPageResponse,
} from "../../helpers/core/staffingRequestTypes";

type ApiFetch = (
  endpoint: string,
  init?: RequestInit,
) => Promise<Response>;

type AuthUser = {
  id?: number;
  sub?: number;
  role?:
    string | null;
  cinemaId?:
    number | string | null;
} | null;

type UseStaffingRequestsDataParams = {
  user:
    AuthUser | undefined;
  apiFetch:
    ApiFetch;
  showError:
    (
      title: string,
      description: string,
    ) => void;
  targetRequestId?:
    number | null;
};

function mergeRequests(
  current:
    StaffingRequest[],
  incoming:
    StaffingRequest[],
) {
  const byId =
    new Map<
      number,
      StaffingRequest
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
  ];
}

function sortPendingRequests(
  requests:
    StaffingRequest[],
) {
  return [
    ...requests,
  ].sort(
    (left, right) => {
      if (
        right.priority !==
        left.priority
      ) {
        return (
          right.priority -
          left.priority
        );
      }

      return (
        new Date(
          right.createdAt,
        ).getTime() -
        new Date(
          left.createdAt,
        ).getTime()
      );
    },
  );
}

function sortCompletedRequests(
  requests:
    StaffingRequest[],
) {
  return [
    ...requests,
  ].sort(
    (left, right) =>
      right.id -
      left.id,
  );
}

export function useStaffingRequestsData({
  user,
  apiFetch,
  showError,
  targetRequestId,
}: UseStaffingRequestsDataParams) {
  const [
    selectedMasterCinemaId,
    setSelectedMasterCinemaId,
  ] =
    useState<number | null>(
      null,
    );
  const [
    pendingRequests,
    setPendingRequests,
  ] =
    useState<
      StaffingRequest[]
    >([]);
  const [
    completedRequests,
    setCompletedRequests,
  ] =
    useState<
      StaffingRequest[]
    >([]);
  const [
    emergencyCount,
    setEmergencyCount,
  ] = useState(0);
  const [
    pendingCount,
    setPendingCount,
  ] = useState(0);
  const [
    completedCount,
    setCompletedCount,
  ] = useState(0);
  const [
    completedHasMore,
    setCompletedHasMore,
  ] = useState(false);
  const [
    completedNextBeforeId,
    setCompletedNextBeforeId,
  ] =
    useState<number | null>(
      null,
    );
  const [
    loading,
    setLoading,
  ] = useState(true);
  const [
    loadingMoreCompleted,
    setLoadingMoreCompleted,
  ] = useState(false);
  const [
    showCompletedRequests,
    setShowCompletedRequests,
  ] = useState(false);
  const showErrorRef =
    useRef(showError);

  useEffect(() => {
    showErrorRef.current =
      showError;
  }, [showError]);

  const activeCinemaId =
    useMemo(() => {
      if (!user) {
        return null;
      }

      const userCinemaId =
        Number(
          user.cinemaId,
        );

      if (
        Number.isInteger(
          userCinemaId,
        ) &&
        userCinemaId > 0
      ) {
        return userCinemaId;
      }

      if (
        user.role ===
        "MASTER"
      ) {
        return selectedMasterCinemaId;
      }

      return null;
    }, [
      selectedMasterCinemaId,
      user,
    ]);
  const currentUserId =
    useMemo(
      () =>
        getCurrentUserId(
          user,
        ),
      [user],
    );
  const isManager =
    user?.role ===
      "MASTER" ||
    user?.role ===
      "ADMIN";
  const needsMasterCinemaSelection =
    user?.role ===
      "MASTER" &&
    !user.cinemaId &&
    !selectedMasterCinemaId;

  useEffect(() => {
    function updateSelectedCinema() {
      setSelectedMasterCinemaId(
        getSelectedMasterCinemaId(),
      );
    }

    updateSelectedCinema();

    window.addEventListener(
      "storage",
      updateSelectedCinema,
    );
    window.addEventListener(
      "masterSelectedCinemaChanged",
      updateSelectedCinema,
    );

    return () => {
      window.removeEventListener(
        "storage",
        updateSelectedCinema,
      );
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        updateSelectedCinema,
      );
    };
  }, []);

  const buildPageEndpoint =
    useCallback(
      (options: {
        beforeId?:
          number | null;
        includeTarget?:
          boolean;
      } = {}) => {
        let endpoint =
          appendCinemaId(
            "/staffing-requests/page?limit=50",
            activeCinemaId,
          );

        if (
          options.beforeId
        ) {
          endpoint +=
            `&beforeId=${options.beforeId}`;
        }

        if (
          options.includeTarget &&
          targetRequestId
        ) {
          endpoint +=
            `&targetId=${targetRequestId}`;
        }

        return endpoint;
      },
      [
        activeCinemaId,
        targetRequestId,
      ],
    );

  const fetchRequests =
    useCallback(
      async (
        showLoading = true,
      ) => {
        if (
          needsMasterCinemaSelection
        ) {
          setPendingRequests(
            [],
          );
          setCompletedRequests(
            [],
          );
          setEmergencyCount(0);
          setPendingCount(0);
          setCompletedCount(0);
          setCompletedHasMore(
            false,
          );
          setCompletedNextBeforeId(
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
              buildPageEndpoint({
                includeTarget:
                  true,
              }),
            );

          if (!response.ok) {
            throw new Error(
              await readErrorMessage(
                response,
                "Kunne ikke hente bemandingsforespørgsler",
              ),
            );
          }

          const data =
            (await response.json()) as
              Partial<StaffingRequestPageResponse>;
          const pending =
            Array.isArray(
              data.pending,
            )
              ? data.pending
              : [];
          const completed =
            Array.isArray(
              data.completed
                ?.items,
            )
              ? data.completed
                  .items
              : [];
          const target =
            data.target ?? null;

          setPendingRequests(
            sortPendingRequests(
              target?.status ===
                "PENDING"
                ? mergeRequests(
                    pending,
                    [target],
                  )
                : pending,
            ),
          );
          setCompletedRequests(
            sortCompletedRequests(
              target &&
                target.status !==
                  "PENDING"
                ? mergeRequests(
                    completed,
                    [target],
                  )
                : completed,
            ),
          );
          setEmergencyCount(
            Number(
              data.counts
                ?.emergency || 0,
            ),
          );
          setPendingCount(
            Number(
              data.counts
                ?.pending || 0,
            ),
          );
          setCompletedCount(
            Number(
              data.counts
                ?.completed || 0,
            ),
          );
          setCompletedHasMore(
            Boolean(
              data.completed
                ?.hasMore,
            ),
          );
          setCompletedNextBeforeId(
            Number.isInteger(
              data.completed
                ?.nextBeforeId,
            )
              ? data.completed
                  ?.nextBeforeId ??
                null
              : null,
          );
        } catch (error) {
          setPendingRequests(
            [],
          );
          setCompletedRequests(
            [],
          );
          setEmergencyCount(0);
          setPendingCount(0);
          setCompletedCount(0);
          setCompletedHasMore(
            false,
          );
          setCompletedNextBeforeId(
            null,
          );
          showErrorRef.current(
            "Kunne ikke hente bemandingsforespørgsler",
            error instanceof Error
              ? error.message
              : "Der opstod en fejl, da bemandingsforespørgsler skulle hentes. Prøv igen.",
          );
        } finally {
          if (showLoading) {
            setLoading(false);
          }
        }
      },
      [
        apiFetch,
        buildPageEndpoint,
        needsMasterCinemaSelection,
      ],
    );

  const loadMoreCompleted =
    useCallback(async () => {
      if (
        !completedHasMore ||
        !completedNextBeforeId ||
        loadingMoreCompleted
      ) {
        return;
      }

      try {
        setLoadingMoreCompleted(
          true,
        );

        const response =
          await apiFetch(
            buildPageEndpoint({
              beforeId:
                completedNextBeforeId,
            }),
          );

        if (!response.ok) {
          throw new Error(
            await readErrorMessage(
              response,
              "Ældre behandlede bemandingsforespørgsler kunne ikke hentes",
            ),
          );
        }

        const data =
          (await response.json()) as
            Partial<StaffingRequestPageResponse>;
        const nextItems =
          Array.isArray(
            data.completed
              ?.items,
          )
            ? data.completed
                .items
            : [];

        setCompletedRequests(
          (current) =>
            sortCompletedRequests(
              mergeRequests(
                current,
                nextItems,
              ),
            ),
        );
        setEmergencyCount(
          Number(
            data.counts
              ?.emergency ||
              emergencyCount,
          ),
        );
        setPendingCount(
          Number(
            data.counts
              ?.pending ||
              pendingCount,
          ),
        );
        setCompletedCount(
          Number(
            data.counts
              ?.completed ||
              completedCount,
          ),
        );
        setCompletedHasMore(
          Boolean(
            data.completed
              ?.hasMore,
          ),
        );
        setCompletedNextBeforeId(
          Number.isInteger(
            data.completed
              ?.nextBeforeId,
          )
            ? data.completed
                ?.nextBeforeId ??
              null
            : null,
        );
      } catch (error) {
        showError(
          "Kunne ikke hente ældre forespørgsler",
          error instanceof Error
            ? error.message
            : "Ældre behandlede bemandingsforespørgsler kunne ikke hentes.",
        );
      } finally {
        setLoadingMoreCompleted(
          false,
        );
      }
    }, [
      apiFetch,
      buildPageEndpoint,
      completedCount,
      completedHasMore,
      completedNextBeforeId,
      emergencyCount,
      loadingMoreCompleted,
      pendingCount,
      showError,
    ]);

  useEffect(() => {
    if (!user) {
      return;
    }

    void fetchRequests();
  }, [
    fetchRequests,
    user,
  ]);

  const requests =
    useMemo(
      () =>
        mergeRequests(
          pendingRequests,
          completedRequests,
        ),
      [
        completedRequests,
        pendingRequests,
      ],
    );
  const visibleRequests =
    showCompletedRequests
      ? [
          ...pendingRequests,
          ...completedRequests,
        ]
      : pendingRequests;

  return {
    activeCinemaId,
    currentUserId,
    fetchRequests,
    isManager,
    loading,
    loadingMoreCompleted,
    needsMasterCinemaSelection,
    requests,
    pendingRequests,
    completedRequests,
    emergencyCount,
    pendingCount,
    completedCount,
    completedHasMore,
    loadMoreCompleted,
    setShowCompletedRequests,
    showCompletedRequests,
    visibleRequests,
  };
}
