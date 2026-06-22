"use client";

import { useEffect, useMemo, useState } from "react";
import ConfirmModal from "@/app/components/modals/ConfirmModal";
import InfoModal from "@/app/components/modals/InfoModal";
import { useConfirm } from "@/app/hooks/useConfirm";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useApi } from "@/app/hooks/useApi";
import { useRealtimeShifts } from "@/app/hooks/useRealtimeShifts";
import { useAuth } from "@/app/providers/AuthProvider";

const MASTER_SELECTED_CINEMA_ID_KEY = "masterSelectedCinemaId";

type StaffingRequestStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

type StaffingRequestType =
  | "EXTRA_SHIFT"
  | "EMERGENCY"
  | "REPLACEMENT"
  | "OVERTIME";

type StaffingRequest = {
  id: number;
  type: StaffingRequestType;
  status: StaffingRequestStatus;
  priority: number;
  message?: string | null;
  aiGenerated: boolean;
  createdAt: string;
  requestStartTime?: string | null;
  requestEndTime?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  requestedByUser?: {
    id?: number;
    firstName: string;
    lastName: string;
  } | null;
  targetUser?: {
    id?: number;
    firstName: string;
    lastName: string;
  } | null;
  shift?: {
    startTime: string;
    endTime: string;
    workType?: {
      name: string;
    } | null;
  } | null;
  workType?: {
    name: string;
  } | null;
};

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();

    if (typeof data?.message === "string") {
      return data.message;
    }

    if (Array.isArray(data?.message)) {
      return data.message.join("\n");
    }
  } catch {}

  return fallback;
}

function appendCinemaId(endpoint: string, cinemaId: number | null) {
  if (!cinemaId) return endpoint;

  const separator = endpoint.includes("?") ? "&" : "?";
  return `${endpoint}${separator}cinemaId=${cinemaId}`;
}

function getSelectedMasterCinemaId() {
  if (typeof window === "undefined") return null;

  const cinemaId = Number(localStorage.getItem(MASTER_SELECTED_CINEMA_ID_KEY));

  if (!Number.isInteger(cinemaId) || cinemaId <= 0) {
    return null;
  }

  return cinemaId;
}

function getCurrentUserId(user: unknown) {
  const currentUser = user as { id?: number; sub?: number } | null;

  if (!currentUser) return null;

  if (typeof currentUser.id === "number") return currentUser.id;
  if (typeof currentUser.sub === "number") return currentUser.sub;

  return null;
}

function getFullName(
  user?: { firstName: string; lastName: string } | null,
  fallback = "Ukendt",
) {
  if (!user) return fallback;

  return `${user.firstName} ${user.lastName}`.trim() || fallback;
}

function getStatusLabel(status: StaffingRequestStatus) {
  switch (status) {
    case "ACCEPTED":
      return "Accepteret";
    case "REJECTED":
      return "Afvist";
    case "EXPIRED":
      return "Udløbet";
    case "CANCELLED":
      return "Annulleret";
    default:
      return "Afventer";
  }
}

function getTypeLabel(type: StaffingRequestType) {
  switch (type) {
    case "EMERGENCY":
      return "Akut";
    case "REPLACEMENT":
      return "Erstatning";
    case "OVERTIME":
      return "Overarbejde";
    default:
      return "Ekstra vagt";
  }
}

function getDefaultMessage(type: StaffingRequestType) {
  if (type === "EMERGENCY") {
    return "Der er akut behov for ekstra bemanding.";
  }

  if (type === "REPLACEMENT") {
    return "Der er behov for en erstatning til en vagt.";
  }

  if (type === "OVERTIME") {
    return "Der er behov for ekstra bemanding eller overarbejde.";
  }

  return "Der er behov for ekstra bemanding.";
}

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

  const groupedRequests = useMemo(() => {
    return {
      emergency: requests.filter((request) => request.type === "EMERGENCY"),
      pending: requests.filter((request) => request.status === "PENDING"),
      completed: requests.filter((request) => request.status !== "PENDING"),
    };
  }, [requests]);

  const visibleRequests = showCompletedRequests
    ? requests
    : groupedRequests.pending;

  function getStatusStyle(status: StaffingRequestStatus) {
    switch (status) {
      case "ACCEPTED":
        return "bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-200";
      case "REJECTED":
        return "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200";
      case "EXPIRED":
      case "CANCELLED":
        return "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      default:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200";
    }
  }

  function getPriorityStyle(priority: number) {
    if (priority >= 8) {
      return "bg-red-600 text-white";
    }

    if (priority >= 5) {
      return "bg-orange-500 text-white";
    }

    return "bg-blue-600 text-white";
  }

  function formatDateTime(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "Ukendt tidspunkt";
    }

    const datePart = date.toLocaleDateString("da-DK", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const timePart = date.toLocaleTimeString("da-DK", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${datePart} kl. ${timePart}`;
  }

  function getRequestWorkTypeName(request: StaffingRequest) {
    return (
      request.shift?.workType?.name ||
      request.workType?.name ||
      getTypeLabel(request.type)
    );
  }

  function getRequestTitle(request: StaffingRequest) {
    const typeLabel = getTypeLabel(request.type);
    const workTypeName = getRequestWorkTypeName(request);

    if (workTypeName === typeLabel) {
      return typeLabel;
    }

    return `${typeLabel} · ${workTypeName}`;
  }

  function getRequestTimeRange(request: StaffingRequest) {
    const startTime = request.shift?.startTime || request.requestStartTime;
    const endTime = request.shift?.endTime || request.requestEndTime;

    if (!startTime || !endTime) {
      return null;
    }

    return `${formatDateTime(startTime)} → ${formatDateTime(endTime)}`;
  }

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
              <section className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-white p-5 shadow dark:bg-gray-900">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Akutte
                  </div>
                  <div className="mt-2 text-3xl font-bold">
                    {groupedRequests.emergency.length}
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow dark:bg-gray-900">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Afventer
                  </div>
                  <div className="mt-2 text-3xl font-bold">
                    {groupedRequests.pending.length}
                  </div>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow dark:bg-gray-900">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Behandlede
                  </div>
                  <div className="mt-2 text-3xl font-bold">
                    {groupedRequests.completed.length}
                  </div>
                </div>
              </section>

              {requests.length === 0 ? (
                <section className="rounded-2xl border border-dashed bg-white p-8 text-center text-gray-500 shadow dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                  Ingen bemandingsforespørgsler fundet.
                </section>
              ) : (
                <section className="space-y-4">
                  {visibleRequests.length === 0 ? (
                    <article className="rounded-2xl border border-dashed bg-white p-8 text-center text-gray-500 shadow dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                      Ingen afventende bemandingsforespørgsler.
                    </article>
                  ) : null}

                  {visibleRequests.map((request) => {
                    const targetUserId = request.targetUser?.id ?? null;
                    const isPending = request.status === "PENDING";

                    const canAccept =
                      isPending &&
                      (user?.role === "EMPLOYEE" || user?.role === "ADMIN") &&
                      currentUserId !== null &&
                      (!targetUserId || targetUserId === currentUserId);

                    const canReject =
                      isPending &&
                      (user?.role === "EMPLOYEE" || user?.role === "ADMIN") &&
                      currentUserId !== null &&
                      targetUserId === currentUserId;

                    const canCancel = isPending && isManager;

                    return (
                      <article
                        key={request.id}
                        className="rounded-2xl bg-white p-6 shadow dark:bg-gray-900"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="flex flex-wrap gap-2">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${getPriorityStyle(
                                  request.priority,
                                )}`}
                              >
                                PRIORITET {request.priority}
                              </span>

                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(
                                  request.status,
                                )}`}
                              >
                                {getStatusLabel(request.status)}
                              </span>

                              {request.aiGenerated && (
                                <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800 dark:bg-purple-950/40 dark:text-purple-200">
                                  AI
                                </span>
                              )}
                            </div>

                            <h2 className="mt-4 text-2xl font-bold">
                              {getRequestTitle(request)}
                            </h2>

                            <div className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                              Intern reference #{request.id}
                            </div>

                            <p className="mt-2 text-gray-700 dark:text-gray-300">
                              {request.message ||
                                getDefaultMessage(request.type)}
                            </p>
                          </div>

                          <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                            {getTypeLabel(request.type)}
                          </div>
                        </div>

                        <div className="mt-6 grid gap-4 text-sm md:grid-cols-4">
                          <div>
                            <div className="font-semibold text-gray-500 dark:text-gray-400">
                              Oprettet af
                            </div>
                            <div>
                              {getFullName(request.requestedByUser, "System")}
                            </div>
                          </div>

                          <div>
                            <div className="font-semibold text-gray-500 dark:text-gray-400">
                              Målgruppe
                            </div>
                            <div>
                              {request.targetUser
                                ? getFullName(request.targetUser)
                                : "Alle medarbejdere"}
                            </div>
                          </div>

                          <div>
                            <div className="font-semibold text-gray-500 dark:text-gray-400">
                              Oprettet
                            </div>
                            <div>{formatDateTime(request.createdAt)}</div>
                          </div>

                          <div>
                            <div className="font-semibold text-gray-500 dark:text-gray-400">
                              Vagt / behov
                            </div>
                            <div>{getRequestWorkTypeName(request)}</div>
                            {getRequestTimeRange(request) ? (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {getRequestTimeRange(request)}
                              </div>
                            ) : null}
                          </div>
                        </div>

                        {(canAccept || canReject || canCancel) && (
                          <div className="mt-6 flex flex-wrap gap-3">
                            {canAccept ? (
                              <button
                                type="button"
                                onClick={() => handleAccept(request.id)}
                                disabled={processingId === request.id}
                                className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
                              >
                                {user?.role === "ADMIN"
                                  ? "Acceptér selv"
                                  : "Acceptér"}
                              </button>
                            ) : null}

                            {canReject ? (
                              <button
                                type="button"
                                onClick={() => handleReject(request)}
                                disabled={processingId === request.id}
                                className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
                              >
                                Afvis
                              </button>
                            ) : null}

                            {canCancel ? (
                              <button
                                type="button"
                                onClick={() => handleCancel(request)}
                                disabled={processingId === request.id}
                                className="rounded-2xl border border-red-300 px-5 py-3 text-sm font-bold text-red-700 shadow-sm transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                              >
                                Annuller
                              </button>
                            ) : null}
                          </div>
                        )}
                      </article>
                    );
                  })}

                  {groupedRequests.completed.length > 0 ? (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setShowCompletedRequests((current) => !current)
                        }
                        className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                      >
                        {showCompletedRequests
                          ? "Skjul behandlede"
                          : `Vis behandlede (${groupedRequests.completed.length})`}
                      </button>
                    </div>
                  ) : null}
                </section>
              )}
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
