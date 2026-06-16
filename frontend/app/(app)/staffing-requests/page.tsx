"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useApi } from "@/app/hooks/useApi";
import { useAuth } from "@/app/providers/AuthProvider";
import InfoModal from "@/app/components/modals/InfoModal";
import { useInfoModal } from "@/app/hooks/useInfoModal";
import { useRealtimeShifts } from "@/app/hooks/useRealtimeShifts";

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
  };

  targetUser?: {
    firstName: string;
    lastName: string;
  };

  shift?: {
    startTime: string;
    endTime: string;
    workType?: {
      name: string;
    };
  };
};

export default function StaffingRequestsPage() {
  const { apiFetch } = useApi();
  const { user } = useAuth();
  const infoDialog = useInfoModal();

  const [requests, setRequests] = useState<StaffingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);

      const response = await apiFetch("/staffing-requests");

      if (!response.ok) {
        throw new Error("Kunne ikke hente staffing requests");
      }

      const data = await response.json();

      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useRealtimeShifts({
    onShiftsUpdated: fetchRequests,
    onShiftTradesUpdated: fetchRequests,
    enableToasts: false,
  });

  async function handleAccept(id: number) {
    try {
      setProcessingId(id);

      const response = await apiFetch(`/staffing-requests/${id}/accept`, {
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error("Kunne ikke acceptere staffing request");
      }

      await fetchRequests();
    } catch (error) {
      console.error(error);

      infoDialog.showError(
        "Staffing request kunne ikke accepteres",
        "Der opstod en fejl, da staffing requesten skulle accepteres. Prøv igen.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(id: number) {
    try {
      setProcessingId(id);

      const response = await apiFetch(`/staffing-requests/${id}/reject`, {
        method: "PATCH",
      });

      if (!response.ok) {
        throw new Error("Kunne ikke afvise staffing request");
      }

      await fetchRequests();
    } catch (error) {
      console.error(error);

      infoDialog.showError(
        "Staffing request kunne ikke afvises",
        "Der opstod en fejl, da staffing requesten skulle afvises. Prøv igen.",
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
        return "bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200";

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
      <main className="min-h-screen bg-gray-100 p-6 dark:bg-gray-950">
        <div className="rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-900">
          Indlæser staffing requests...
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-gray-100 p-4 text-gray-900 dark:bg-gray-950 dark:text-gray-100 md:p-8">
        <div className="mx-auto space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h1 className="text-3xl font-bold">AI Staffing Requests</h1>

                <p className="mt-2 text-gray-500 dark:text-gray-400">
                  Live emergency staffing, AI escalation og realtime
                  bemandingsrequests.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="rounded-2xl bg-red-100 px-4 py-3 text-sm font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-200">
                  🚨 Emergency: {groupedRequests.emergency.length}
                </div>

                <div className="rounded-2xl bg-yellow-100 px-4 py-3 text-sm font-semibold text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-200">
                  ⏳ Pending: {groupedRequests.pending.length}
                </div>

                <div className="rounded-2xl bg-green-100 px-4 py-3 text-sm font-semibold text-green-700 dark:bg-green-950/40 dark:text-green-200">
                  ✅ Behandlede: {groupedRequests.completed.length}
                </div>
              </div>
            </div>
          </div>

          {requests.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="text-5xl">🤖</div>

              <h2 className="mt-4 text-2xl font-bold">
                Ingen staffing requests
              </h2>

              <p className="mt-2 text-gray-500 dark:text-gray-400">
                Systemet overvåger automatisk bemanding og AI pressure.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {requests.map((request) => {
              const canRespond =
                request.status === "PENDING" &&
                request.targetUser &&
                user &&
                `${request.targetUser.firstName} ${request.targetUser.lastName}` !==
                  "";

              return (
                <div
                  key={request.id}
                  className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-xl px-3 py-1 text-xs font-bold ${getPriorityStyle(
                            request.priority,
                          )}`}
                        >
                          PRIORITY {request.priority}
                        </span>

                        <span
                          className={`rounded-xl px-3 py-1 text-xs font-bold ${getStatusStyle(
                            request.status,
                          )}`}
                        >
                          {request.status}
                        </span>

                        {request.aiGenerated && (
                          <span className="rounded-xl bg-cyan-600 px-3 py-1 text-xs font-bold text-white">
                            🤖 AI GENERATED
                          </span>
                        )}

                        <span className="rounded-xl bg-gray-200 px-3 py-1 text-xs font-bold dark:bg-gray-800">
                          {request.type}
                        </span>
                      </div>

                      <div>
                        <h2 className="text-xl font-bold">
                          Staffing Request #{request.id}
                        </h2>

                        <p className="mt-2 text-gray-600 dark:text-gray-300">
                          {request.message || "Ekstra bemanding nødvendig."}
                        </p>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <div className="rounded-xl bg-gray-100 p-3 dark:bg-gray-950">
                          <div className="text-xs font-semibold uppercase text-gray-500">
                            Oprettet af
                          </div>

                          <div className="mt-1 font-semibold">
                            {request.requestedByUser
                              ? `${request.requestedByUser.firstName} ${request.requestedByUser.lastName}`
                              : "System"}
                          </div>
                        </div>

                        <div className="rounded-xl bg-gray-100 p-3 dark:bg-gray-950">
                          <div className="text-xs font-semibold uppercase text-gray-500">
                            Målgruppe
                          </div>

                          <div className="mt-1 font-semibold">
                            {request.targetUser
                              ? `${request.targetUser.firstName} ${request.targetUser.lastName}`
                              : "Alle medarbejdere"}
                          </div>
                        </div>

                        <div className="rounded-xl bg-gray-100 p-3 dark:bg-gray-950">
                          <div className="text-xs font-semibold uppercase text-gray-500">
                            Oprettet
                          </div>

                          <div className="mt-1 font-semibold">
                            {formatDateTime(request.createdAt)}
                          </div>
                        </div>

                        <div className="rounded-xl bg-gray-100 p-3 dark:bg-gray-950">
                          <div className="text-xs font-semibold uppercase text-gray-500">
                            Vagt
                          </div>

                          <div className="mt-1 font-semibold">
                            {request.shift?.workType?.name || "Emergency"}
                          </div>
                        </div>
                      </div>

                      {request.shift && (
                        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-950">
                          <div className="text-sm font-semibold">
                            📅 {formatDateTime(request.shift.startTime)} →{" "}
                            {formatDateTime(request.shift.endTime)}
                          </div>
                        </div>
                      )}
                    </div>

                    {canRespond && (
                      <div className="flex flex-col gap-3">
                        <button
                          onClick={() => handleAccept(request.id)}
                          disabled={processingId === request.id}
                          className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
                        >
                          ✅ Acceptér
                        </button>

                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={processingId === request.id}
                          className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
                        >
                          ❌ Afvis
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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
