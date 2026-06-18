"use client";

import { useEffect, useMemo, useState } from "react";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useApi } from "@/app/hooks/useApi";
import { useRealtimeShifts } from "@/app/hooks/useRealtimeShifts";
import { useAuth } from "@/app/providers/AuthProvider";

const MASTER_SELECTED_CINEMA_ID_KEY = "masterSelectedCinemaId";

type StaffingRequest = {
  id: number;
  type: "EXTRA_SHIFT" | "EMERGENCY" | "REPLACEMENT" | "OVERTIME";
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";
  priority: number;
  message?: string | null;
  aiGenerated: boolean;
  createdAt: string;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  requestedByUser?: {
    firstName: string;
    lastName: string;
  } | null;
  targetUser?: {
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

export default function StaffingRequestsPage() {
  const { apiFetch } = useApi();
  const { user } = useAuth();
  const infoDialog = useInfoModal();

  const [selectedMasterCinemaId, setSelectedMasterCinemaId] = useState<
    number | null
  >(null);
  const [requests, setRequests] = useState<StaffingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

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

  const needsMasterCinemaSelection =
    user?.role === "MASTER" && !user.cinemaId && !selectedMasterCinemaId;

  useEffect(() => {
    function updateSelectedCinema() {
      setSelectedMasterCinemaId(getSelectedMasterCinemaId());
    }

    updateSelectedCinema();

    window.addEventListener("storage", updateSelectedCinema);
    window.addEventListener("masterSelectedCinemaChanged", updateSelectedCinema);

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

  useRealtimeShifts({
    onShiftsUpdated: fetchRequests,
    onShiftTradesUpdated: fetchRequests,
    enableToasts: false,
  });

  async function handleAccept(id: number) {
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

  async function handleReject(id: number) {
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

  const groupedRequests = useMemo(() => {
    return {
      emergency: requests.filter((request) => request.type === "EMERGENCY"),
      pending: requests.filter((request) => request.status === "PENDING"),
      completed: requests.filter((request) => request.status !== "PENDING"),
    };
  }, [requests]);

  function getStatusStyle(status: StaffingRequest["status"]) {
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

    return date.toLocaleString("da-DK", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
              Overblik over ekstra bemanding, akutte forespørgsler og realtime
              bemandingsbehov.
            </p>
          </section>

          {needsMasterCinemaSelection && (
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
          )}

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
              {requests.map((request) => {
                const canRespond =
                  request.status === "PENDING" &&
                  request.targetUser &&
                  user &&
                  request.targetUser.firstName &&
                  request.targetUser.lastName;

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
                            {request.status}
                          </span>

                          {request.aiGenerated && (
                            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800 dark:bg-purple-950/40 dark:text-purple-200">
                              AI
                            </span>
                          )}
                        </div>

                        <h2 className="mt-4 text-2xl font-bold">
                          Forespørgsel #{request.id}
                        </h2>

                        <p className="mt-2 text-gray-700 dark:text-gray-300">
                          {request.message || "Ekstra bemanding nødvendig."}
                        </p>
                      </div>

                      <div className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                        {request.type}
                      </div>
                    </div>

                    <div className="mt-6 grid gap-4 text-sm md:grid-cols-4">
                      <div>
                        <div className="font-semibold text-gray-500 dark:text-gray-400">
                          Oprettet af
                        </div>
                        <div>
                          {request.requestedByUser
                            ? `${request.requestedByUser.firstName} ${request.requestedByUser.lastName}`
                            : "System"}
                        </div>
                      </div>

                      <div>
                        <div className="font-semibold text-gray-500 dark:text-gray-400">
                          Målgruppe
                        </div>
                        <div>
                          {request.targetUser
                            ? `${request.targetUser.firstName} ${request.targetUser.lastName}`
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
                          Vagt
                        </div>
                        <div>{request.shift?.workType?.name || "Akut"}</div>
                        {request.shift && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDateTime(request.shift.startTime)} →{" "}
                            {formatDateTime(request.shift.endTime)}
                          </div>
                        )}
                      </div>
                    </div>

                    {canRespond && (
                      <div className="mt-6 flex flex-wrap gap-3">
                        <button
                          onClick={() => handleAccept(request.id)}
                          disabled={processingId === request.id}
                          className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
                        >
                          Acceptér
                        </button>

                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={processingId === request.id}
                          className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
                        >
                          Afvis
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </main>

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
