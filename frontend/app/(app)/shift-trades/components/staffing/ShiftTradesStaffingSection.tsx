"use client";

import {
  useCallback,
  useMemo,
} from "react";
import {
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";

import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import {
  useApi,
} from "@/app/hooks/useApi";
import {
  useConfirm,
} from "@/app/hooks/useConfirm";
import {
  useInfoModal,
} from "@/app/hooks/useInfoModal";
import {
  useAuth,
} from "@/app/providers/AuthProvider";

import StaffingPendingPaginationControl from "../../../staffing-requests/components/list/StaffingPendingPaginationControl";
import StaffingRequestsListSection from "../../../staffing-requests/components/list/StaffingRequestsListSection";
import StaffingRequestTargetNotice from "../../../staffing-requests/components/layout/StaffingRequestTargetNotice";
import {
  parseStaffingRequestTarget,
  type StaffingRequestTargetState,
} from "../../../staffing-requests/helpers/core/staffingRequestTarget";
import {
  getRequestTimeRange,
  getRequestTitle,
} from "../../../staffing-requests/helpers/core/staffingRequestHelpers";
import {
  getStaffingRequestRejectDialogCopy,
} from "../../../staffing-requests/helpers/core/staffingRequestPresentation";
import type {
  StaffingRequest,
} from "../../../staffing-requests/helpers/core/staffingRequestTypes";
import {
  useStaffingRequestActions,
} from "../../../staffing-requests/hooks/actions/useStaffingRequestActions";
import {
  usePendingStaffingRequestPages,
} from "../../../staffing-requests/hooks/data/usePendingStaffingRequestPages";
import {
  useStaffingRequestsData,
} from "../../../staffing-requests/hooks/data/useStaffingRequestsData";

function mergeRequests(
  pendingRequests:
    StaffingRequest[],
  completedRequests:
    StaffingRequest[],
) {
  return [
    ...new Map(
      [
        ...pendingRequests,
        ...completedRequests,
      ].map(
        (request) => [
          request.id,
          request,
        ],
      ),
    ).values(),
  ];
}

export default function ShiftTradesStaffingSection() {
  const {
    apiFetch,
  } = useApi();
  const {
    user,
  } = useAuth();
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

  const requestTarget =
    parseStaffingRequestTarget(
      searchParams.get(
        "requestId",
      ),
    );

  const {
    activeCinemaId,
    currentUserId,
    fetchRequests,
    isManager,
    loading,
    loadingMoreCompleted,
    needsMasterCinemaSelection,
    pendingRequests:
      initialPendingRequests,
    completedRequests,
    pendingCount,
    completedCount,
    completedHasMore,
    loadMoreCompleted,
    setShowCompletedRequests,
    showCompletedRequests,
  } = useStaffingRequestsData({
    user,
    apiFetch,
    showError:
      infoDialog.showError,
    targetRequestId:
      requestTarget.requestId,
  });

  const {
    requests:
      pendingRequests,
    hasMore:
      pendingHasMore,
    loadingMore:
      loadingMorePending,
    loadMore:
      loadMorePending,
  } =
    usePendingStaffingRequestPages({
      apiFetch,
      activeCinemaId,
      initialRequests:
        initialPendingRequests,
      totalCount:
        pendingCount,
      needsMasterCinemaSelection,
      showError:
        infoDialog.showError,
    });

  const {
    acceptRequest,
    cancelRequest,
    processingId,
    rejectRequest,
  } =
    useStaffingRequestActions({
      apiFetch,
      activeCinemaId,
      fetchRequests,
      showError:
        infoDialog.showError,
    });

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
    useMemo(
      () =>
        showCompletedRequests
          ? [
              ...pendingRequests,
              ...completedRequests,
            ]
          : pendingRequests,
      [
        completedRequests,
        pendingRequests,
        showCompletedRequests,
      ],
    );

  const targetRequest =
    useMemo(
      () =>
        requestTarget.requestId
          ? requests.find(
              (request) =>
                request.id ===
                requestTarget.requestId,
            ) ?? null
          : null,
      [
        requestTarget.requestId,
        requests,
      ],
    );

  const focusedVisibleRequests =
    useMemo(() => {
      if (!targetRequest) {
        return visibleRequests;
      }

      return visibleRequests.some(
        (request) =>
          request.id ===
          targetRequest.id,
      )
        ? visibleRequests
        : [
            targetRequest,
            ...visibleRequests,
          ];
    }, [
      targetRequest,
      visibleRequests,
    ]);

  const targetState:
    StaffingRequestTargetState =
      requestTarget.invalid
        ? "invalid"
        : !requestTarget.requestId
          ? "idle"
          : loading
            ? "loading"
            : targetRequest
              ? "found"
              : "missing";

  const clearRequestTarget =
    useCallback(() => {
      const params =
        new URLSearchParams(
          searchParams.toString(),
        );

      params.delete(
        "requestId",
      );

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

  function handleAccept(
    id: number,
  ) {
    const request =
      requests.find(
        (candidate) =>
          candidate.id === id,
      );

    if (!request) {
      return;
    }

    const timeRange =
      getRequestTimeRange(
        request,
      );

    confirmDialog.confirm({
      title:
        "Acceptér vagten?",
      description:
        `Er du sikker på, at du vil acceptere ${getRequestTitle(request)}?${
          timeRange
            ? `\n\n${timeRange}`
            : ""
        }`,
      confirmText:
        "Acceptér vagten",
      cancelText:
        "Annuller",
      confirmVariant:
        "primary",
      onConfirm:
        () =>
          acceptRequest(id),
    });
  }

  function handleReject(
    request:
      StaffingRequest,
  ) {
    const copy =
      getStaffingRequestRejectDialogCopy(
        user?.role,
        request,
      );

    confirmDialog.confirm({
      ...copy,
      cancelText:
        "Annuller",
      confirmVariant:
        "danger",
      onConfirm:
        () =>
          rejectRequest(
            request.id,
          ),
    });
  }

  function handleCancel(
    request:
      StaffingRequest,
  ) {
    confirmDialog.confirm({
      title:
        "Annuller bemandingsforespørgsel",
      description:
        `Vil du annullere ${getRequestTitle(request)}?\n\n` +
        "Forespørgslen fjernes ikke, men den kan ikke længere accepteres.",
      confirmText:
        "Annuller forespørgsel",
      cancelText:
        "Behold",
      confirmVariant:
        "danger",
      onConfirm:
        () =>
          cancelRequest(
            request.id,
          ),
    });
  }

  if (needsMasterCinemaSelection) {
    return null;
  }
  if (
    !loading &&
    pendingCount === 0 &&
    !requestTarget.requestId &&
    !showCompletedRequests
  ) {
    if (completedCount === 0) {
      return null;
    }
    return (
      <button
        type="button"
        onClick={() => setShowCompletedRequests(true)}
        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950"
      >
        {`Vis behandlede bemandingsforespørgsler (${completedCount})`}
      </button>
    );
  }

  return (
    <>
      <section
        className="space-y-4"
        aria-labelledby="staffing-requests-title"
      >
        <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
              Bemanding fra vagtplanen
            </p>
            <h2
              id="staffing-requests-title"
              className="mt-1 text-xl font-bold text-gray-950 dark:text-white"
            >
              {"Bemandingsforesp\u00f8rgsler"}
            </h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {"Vagter som du eller andre kvalificerede medarbejdere er blevet spurgt om at tage."}
            </p>
          </div>

          <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-blue-50 px-3 text-sm font-bold text-blue-800 dark:bg-blue-950/50 dark:text-blue-200">
            {pendingCount}
          </span>
        </div>

        <StaffingRequestTargetNotice
          state={targetState}
          requestId={
            requestTarget.requestId
          }
          onClear={
            clearRequestTarget
          }
        />

        {loading ? (
          <div
            className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300"
            role="status"
          >
            {"Henter bemandingsforesp\u00f8rgsler..."}
          </div>
        ) : (
          <>
            <StaffingPendingPaginationControl
              loadedCount={
                pendingRequests.length
              }
              totalCount={
                pendingCount
              }
              hasMore={
                pendingHasMore
              }
              loadingMore={
                loadingMorePending
              }
              onLoadMore={
                loadMorePending
              }
            />

            <StaffingRequestsListSection
              requests={
                requests
              }
              visibleRequests={
                focusedVisibleRequests
              }
              completedRequestsCount={
                completedCount
              }
              completedRequestsLoadedCount={
                completedRequests.length
              }
              completedRequestsHasMore={
                completedHasMore
              }
              loadingMoreCompleted={
                loadingMoreCompleted
              }
              showCompletedRequests={
                showCompletedRequests
              }
              onToggleCompletedRequests={() =>
                setShowCompletedRequests(
                  (current) =>
                    !current,
                )
              }
              onLoadMoreCompleted={
                loadMoreCompleted
              }
              userRole={
                user?.role
              }
              currentUserId={
                currentUserId
              }
              isManager={
                isManager
              }
              processingId={
                processingId
              }
              focusedRequestId={
                requestTarget.requestId
              }
              onAccept={
                handleAccept
              }
              onReject={
                handleReject
              }
              onCancel={
                handleCancel
              }
            />
          </>
        )}
      </section>

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
        open={
          infoDialog.open
        }
        title={
          infoDialog.title
        }
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
    </>
  );
}
