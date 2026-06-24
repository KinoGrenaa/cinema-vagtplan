"use client";

import { useEffect, useMemo, useState } from "react";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useApi } from "@/app/hooks/useApi";
import { useRealtimeShifts } from "@/app/hooks/useRealtimeShifts";
import { useAuth } from "@/app/providers/AuthProvider";
import StaffingRequestsListSection from "./components/StaffingRequestsListSection";
import StaffingRequestsSummaryCards from "./components/StaffingRequestsSummaryCards";
import {
  appendCinemaId,
  getCurrentUserId,
  getSelectedMasterCinemaId,
  groupStaffingRequests,
  readErrorMessage,
} from "./helpers/staffingRequestHelpers";
import type { StaffingRequest } from "./helpers/staffingRequestTypes";

export default function StaffingRequestsPage() {
  const { apiFetch } = useApi();
  const { user } = useAuth();
  const confirmDialog = useConfirm();
  const infoDialog = useInfoModal();

  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<
    number | null
  >(null);
  const [requests, setRequests] = useState<StaffingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [showCompletedRequests, setShowCompletedRequests] = useState(false);

  const activeCinemaId = useMemo(() => {
    if (!user) return null;

    const userCinemaId = Number(user.cinemaId);

    if (Number.isInteger(userCinemaId) && userCinemaId > 0) {
      return userCinemaId;
    }

    if (user.role === "MASTER") {
      return selectedMasterCinemaId;
    }

    return null;
  }, [selectedMasterCinemaId, user]);

  const currentUserId = useMemo(() => getCurrentUserId(user), [user]);

  const isManager = user?.role === "MASTER" || user?.role === "ADMIN";

  const needsMasterCinemaSelection =
    user?.role === "MASTER" && !user.cinemaId && !selectedMasterCinemaId;

  useEffect(() => {
    function updateSelectedCinema() {
      setSelectedMasterCinemaId(getSelectedMasterCinemaId());
    }

    updateSelectedCinema();

    window.addEventListener("storage", updateSelectedCinema);
    window.addEventListener(
      "masterSelectedCinemaChanged",
      updateSelectedCinema,
    );

    return () => {
      window.removeEventListener("storage", updateSelectedCinema);
      window.removeEventListener(
        "masterSelectedCinemaChanged",
        updateSelectedCinema,
      );
    };
  }, []);

  async function fetchRequests() {
    if (needsMasterCinemaSelection) {
      setRequests([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await apiFetch(
        appendCinemaId("/staffing-requests", activeCinemaId),
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Kunne ikke hente bemandingsforespørgsler",
          ),
        );
      }

      const data = await response.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      setRequests([]);

      infoDialog.showError(
        "Kunne ikke hente bemandingsforespørgsler",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da bemandingsforespørgsler skulle hentes. Prøv igen.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!user) return;

    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, activeCinemaId, needsMasterCinemaSelection]);

  async function acceptRequest(id: number) {
    try {
      setProcessingId(id);

      const response = await apiFetch(
        appendCinemaId(`/staffing-requests/${id}/accept`, activeCinemaId),
        {
          method: "PATCH",
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Kunne ikke acceptere bemandingsforespørgsel",
          ),
        );
      }

      await fetchRequests();
    } catch (error) {
      infoDialog.showError(
        "Bemandingsforespørgslen kunne ikke accepteres",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da bemandingsforespørgslen skulle accepteres. Prøv igen.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function rejectRequest(id: number) {
    try {
      setProcessingId(id);

      const response = await apiFetch(
        appendCinemaId(`/staffing-requests/${id}/reject`, activeCinemaId),
        {
          method: "PATCH",
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Kunne ikke afvise bemandingsforespørgsel",
          ),
        );
      }

      await fetchRequests();
    } catch (error) {
      infoDialog.showError(
        "Bemandingsforespørgslen kunne ikke afvises",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da bemandingsforespørgslen skulle afvises. Prøv igen.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function cancelRequest(id: number) {
    try {
      setProcessingId(id);

      const response = await apiFetch(
        appendCinemaId(`/staffing-requests/${id}/cancel`, activeCinemaId),
        {
          method: "PATCH",
        },
      );

      if (!response.ok) {
        throw new Error(
          await readErrorMessage(
            response,
            "Kunne ikke annullere bemandingsforespørgsel",
          ),
        );
      }

      await fetchRequests();
    } catch (error) {
      infoDialog.showError(
        "Bemandingsforespørgslen kunne ikke annulleres",
        error instanceof Error
          ? error.message
          : "Der opstod en fejl, da bemandingsforespørgslen skulle annulleres. Prøv igen.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  function handleAccept(id: number) {
    void acceptRequest(id);
  }

  function handleReject(request: StaffingRequest) {
    confirmDialog.confirm({
      title: "Afvis bemandingsforespørgsel",
      description:
        `Vil du afvise forespørgsel #${request.id}?\n\n` +
        "Forespørgslen markeres som afvist.",
      confirmText: "Afvis",
      cancelText: "Annuller",
      confirmVariant: "danger",
      onConfirm: () => rejectRequest(request.id),
    });
  }

  function handleCancel(request: StaffingRequest) {
    confirmDialog.confirm({
      title: "Annuller bemandingsforespørgsel",
      description:
        `Vil du annullere forespørgsel #${request.id}?\n\n` +
        "Forespørgslen fjernes ikke, men den kan ikke længere accepteres.",
      confirmText: "Annuller forespørgsel",
      cancelText: "Behold",
      confirmVariant: "danger",
      onConfirm: () => cancelRequest(request.id),
    });
  }

  const groupedRequests = useMemo(() => groupStaffingRequests(requests), [requests]);

  const visibleRequests = showCompletedRequests
    ? requests
    : groupedRequests.pending;

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 md:p-8 dark:bg-gray-950 dark:text-gray-100">
        Indlæser bemandingsforespørgsler...
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 md:p-8 dark:bg-gray-950 dark:text-gray-100">
        <div className="mx-auto max-w-6xl space-y-6">
          <section className="rounded-2xl bg-white p-6 shadow dark:bg-gray-900">
            <h1 className="text-3xl font-bold">Bemandingsforespørgsler</h1>

            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Overblik over ekstra bemanding, akutte forespørgsler og
              bemandingsbehov.
            </p>
          </section>

          {needsMasterCinemaSelection ? (
            <section className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-yellow-900 shadow-sm dark:border-yellow-900 dark:bg-yellow-950/30 dark:text-yellow-100">
              <div className="text-sm font-medium uppercase tracking-wide">
                Biograf mangler
              </div>

              <p className="mt-2 text-sm">
                Vælg først en biograf i MASTER-panelet, før du administrerer
                bemandingsforespørgsler.
              </p>

              <a
                href="/master"
                className="mt-4 inline-flex rounded-xl bg-yellow-700 px-4 py-2 text-sm font-semibold text-white hover:bg-yellow-800"
              >
                Gå til MASTER-panel
              </a>
            </section>
          ) : (
            <>
              <StaffingRequestsSummaryCards
                emergencyCount={groupedRequests.emergency.length}
                pendingCount={groupedRequests.pending.length}
                completedCount={groupedRequests.completed.length}
              />

              <StaffingRequestsListSection
                requests={requests}
                visibleRequests={visibleRequests}
                completedRequestsCount={groupedRequests.completed.length}
                showCompletedRequests={showCompletedRequests}
                onToggleCompletedRequests={() =>
                  setShowCompletedRequests((current) => !current)
                }
                userRole={user?.role}
                currentUserId={currentUserId}
                isManager={isManager}
                processingId={processingId}
                onAccept={handleAccept}
                onReject={handleReject}
                onCancel={handleCancel}
              />
            </>
          )}
        </div>
      </main>

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
    </>
  );
}
