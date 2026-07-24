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
  useConfirm,
} from "@/app/hooks/useConfirm";
import {
  useInfoModal,
} from "@/app/hooks/useInfoModal";
import {
  useApi,
} from "@/app/hooks/useApi";
import {
  useAuth,
} from "@/app/providers/AuthProvider";

import StaffingRequestsHeader from "./components/layout/StaffingRequestsHeader";
import StaffingRequestsMasterCinemaRequired from "./components/layout/StaffingRequestsMasterCinemaRequired";
import StaffingRequestTargetNotice from "./components/layout/StaffingRequestTargetNotice";
import StaffingRequestsListSection from "./components/list/StaffingRequestsListSection";
import StaffingRequestsSummaryCards from "./components/overview/StaffingRequestsSummaryCards";
import {
  parseStaffingRequestTarget,
  type StaffingRequestTargetState,
} from "./helpers/core/staffingRequestTarget";
import type {
  StaffingRequest,
} from "./helpers/core/staffingRequestTypes";
import {
  useStaffingRequestActions,
} from "./hooks/actions/useStaffingRequestActions";
import {
  useStaffingRequestsData,
} from "./hooks/data/useStaffingRequestsData";

export default function StaffingRequestsPage() {
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

  const {
    activeCinemaId,
    currentUserId,
    fetchRequests,
    groupedRequests,
    isManager,
    loading,
    needsMasterCinemaSelection,
    requests,
    setShowCompletedRequests,
    showCompletedRequests,
    visibleRequests,
  } = useStaffingRequestsData({
    user,
    apiFetch,
    showError:
      infoDialog.showError,
  });

  const {
    acceptRequest,
    cancelRequest,
    processingId,
    rejectRequest,
  } = useStaffingRequestActions({
    apiFetch,
    activeCinemaId,
    fetchRequests,
    showError:
      infoDialog.showError,
  });

  const requestTarget =
    parseStaffingRequestTarget(
      searchParams.get(
        "requestId",
      ),
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
    void acceptRequest(id);
  }

  function handleReject(
    request:
      StaffingRequest,
  ) {
    confirmDialog.confirm({
      title:
        "Afvis bemandingsforespørgsel",
      description:
        `Vil du afvise forespørgsel #${request.id}?\n\n` +
        "Forespørgslen markeres som afvist.",
      confirmText: "Afvis",
      cancelText:
        "Annuller",
      confirmVariant:
        "danger",
      onConfirm: () =>
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
        `Vil du annullere forespørgsel #${request.id}?\n\n` +
        "Forespørgslen fjernes ikke, men den kan ikke længere accepteres.",
      confirmText:
        "Annuller forespørgsel",
      cancelText: "Behold",
      confirmVariant:
        "danger",
      onConfirm: () =>
        cancelRequest(
          request.id,
        ),
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 px-4 py-8 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:px-8">
        <div
          className="mx-auto max-w-6xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          role="status"
          aria-live="polite"
        >
          Henter bemandingsforespørgsler...
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-gray-100 px-4 py-8 text-gray-900 transition-colors dark:bg-gray-950 dark:text-gray-100 md:px-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <StaffingRequestsHeader />

          <StaffingRequestTargetNotice
            state={targetState}
            requestId={
              requestTarget.requestId
            }
            onClear={
              clearRequestTarget
            }
          />

          {needsMasterCinemaSelection ? (
            <StaffingRequestsMasterCinemaRequired />
          ) : (
            <>
              <StaffingRequestsSummaryCards
                emergencyCount={
                  groupedRequests
                    .emergency.length
                }
                pendingCount={
                  groupedRequests
                    .pending.length
                }
                completedCount={
                  groupedRequests
                    .completed.length
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
                  groupedRequests
                    .completed.length
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
        </div>
      </main>

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
    </>
  );
}
