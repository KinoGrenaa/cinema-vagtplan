import {
  useEffect,
} from "react";

import {
  formatDateTime,
  getDefaultMessage,
  getFullName,
  getPriorityStyle,
  getRequestTimeRange,
  getRequestTitle,
  getRequestWorkTypeName,
  getStatusLabel,
  getStatusStyle,
  getTypeLabel,
} from "../../helpers/core/staffingRequestHelpers";
import type {
  StaffingRequest,
} from "../../helpers/core/staffingRequestTypes";

type Props = {
  requests:
    StaffingRequest[];
  visibleRequests:
    StaffingRequest[];
  completedRequestsCount:
    number;
  showCompletedRequests:
    boolean;
  onToggleCompletedRequests:
    () => void;
  userRole?: string;
  currentUserId:
    number | null;
  isManager: boolean;
  processingId:
    number | null;
  focusedRequestId:
    number | null;
  onAccept:
    (id: number) => void;
  onReject:
    (
      request:
        StaffingRequest,
    ) => void;
  onCancel:
    (
      request:
        StaffingRequest,
    ) => void;
};

function EmptyState({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-10 text-center shadow-sm transition-colors dark:border-gray-700 dark:bg-gray-900">
      <div
        className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-500 dark:bg-gray-800 dark:text-gray-400"
        aria-hidden="true"
      >
        –
      </div>
      <p className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-400">
        {text}
      </p>
    </div>
  );
}

function getTypeClasses(
  type:
    StaffingRequest["type"],
) {
  if (type === "EMERGENCY") {
    return "border-red-200 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-200";
  }

  return "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-200";
}

export default function StaffingRequestsListSection({
  requests,
  visibleRequests,
  completedRequestsCount,
  showCompletedRequests,
  onToggleCompletedRequests,
  userRole,
  currentUserId,
  isManager,
  processingId,
  focusedRequestId,
  onAccept,
  onReject,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!focusedRequestId) {
      return;
    }

    const timeoutId =
      window.setTimeout(() => {
        const element =
          document.getElementById(
            `staffing-request-${focusedRequestId}`,
          );

        if (!element) {
          return;
        }

        element.focus({
          preventScroll: true,
        });
        element.scrollIntoView({
          behavior: window
            .matchMedia(
              "(prefers-reduced-motion: reduce)",
            )
            .matches
            ? "auto"
            : "smooth",
          block: "center",
        });
      }, 100);

    return () =>
      window.clearTimeout(
        timeoutId,
      );
  }, [focusedRequestId]);

  if (requests.length === 0) {
    return (
      <EmptyState text="Ingen bemandingsforespørgsler fundet." />
    );
  }

  return (
    <section
      className="space-y-4"
      aria-label="Bemandingsforespørgsler"
    >
      {visibleRequests.length ===
      0 ? (
        <EmptyState text="Ingen afventende bemandingsforespørgsler." />
      ) : null}

      {visibleRequests.map(
        (request) => {
          const targetUserId =
            request.targetUser?.id ??
            null;
          const isPending =
            request.status ===
            "PENDING";
          const isProcessing =
            processingId ===
            request.id;
          const isFocused =
            focusedRequestId ===
            request.id;
          const canAccept =
            isPending &&
            (userRole ===
              "EMPLOYEE" ||
              userRole ===
                "ADMIN") &&
            currentUserId !==
              null &&
            (!targetUserId ||
              targetUserId ===
                currentUserId);
          const canReject =
            isPending &&
            (userRole ===
              "EMPLOYEE" ||
              userRole ===
                "ADMIN") &&
            currentUserId !==
              null &&
            targetUserId ===
              currentUserId;
          const canCancel =
            isPending &&
            isManager;
          const timeRange =
            getRequestTimeRange(
              request,
            );

          return (
            <article
              key={request.id}
              id={`staffing-request-${request.id}`}
              tabIndex={-1}
              aria-label={
                isFocused
                  ? "Fremhævet bemandingsforespørgsel"
                  : undefined
              }
              aria-busy={
                isProcessing
              }
              className={`overflow-hidden rounded-2xl border bg-white shadow-sm outline-none transition dark:bg-gray-900 ${
                isFocused
                  ? "border-blue-500 ring-4 ring-blue-500/60 ring-offset-4 ring-offset-gray-100 dark:border-blue-400 dark:ring-blue-400/60 dark:ring-offset-gray-950"
                  : "border-gray-200 dark:border-gray-800"
              }`}
            >
              <div className="p-5 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${getPriorityStyle(
                          request.priority,
                        )}`}
                      >
                        PRIORITET{" "}
                        {
                          request.priority
                        }
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${getStatusStyle(
                          request.status,
                        )}`}
                      >
                        {getStatusLabel(
                          request.status,
                        )}
                      </span>

                      <span
                        className={`rounded-full border px-3 py-1 text-xs font-bold ${getTypeClasses(
                          request.type,
                        )}`}
                      >
                        {getTypeLabel(
                          request.type,
                        )}
                      </span>

                      {request.aiGenerated ? (
                        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-800 dark:bg-purple-950/50 dark:text-purple-200">
                          AI
                        </span>
                      ) : null}

                      {isFocused ? (
                        <span className="rounded-full bg-blue-700 px-3 py-1 text-xs font-bold text-white dark:bg-blue-500">
                          Fra notifikation
                        </span>
                      ) : null}
                    </div>

                    <h2 className="mt-4 text-xl font-bold text-gray-950 dark:text-white md:text-2xl">
                      {getRequestTitle(
                        request,
                      )}
                    </h2>

                    <p className="mt-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                      Intern reference #
                      {request.id}
                    </p>

                    <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-700 dark:text-gray-300">
                      {request.message ||
                        getDefaultMessage(
                          request.type,
                        )}
                    </p>
                  </div>
                </div>

                <dl className="mt-6 grid gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm transition-colors dark:border-gray-800 dark:bg-gray-950/70 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <dt className="font-medium text-gray-500 dark:text-gray-400">
                      Oprettet af
                    </dt>
                    <dd className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
                      {getFullName(
                        request.requestedByUser,
                        "System",
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="font-medium text-gray-500 dark:text-gray-400">
                      Målgruppe
                    </dt>
                    <dd className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
                      {request.targetUser
                        ? getFullName(
                            request.targetUser,
                          )
                        : "Alle medarbejdere"}
                    </dd>
                  </div>

                  <div>
                    <dt className="font-medium text-gray-500 dark:text-gray-400">
                      Oprettet
                    </dt>
                    <dd className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
                      {formatDateTime(
                        request.createdAt,
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="font-medium text-gray-500 dark:text-gray-400">
                      Vagt / behov
                    </dt>
                    <dd className="mt-1 font-semibold text-gray-900 dark:text-gray-100">
                      {getRequestWorkTypeName(
                        request,
                      )}
                    </dd>
                    {timeRange ? (
                      <dd className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
                        {timeRange}
                      </dd>
                    ) : null}
                  </div>
                </dl>

                {canAccept ||
                canReject ||
                canCancel ? (
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    {canAccept ? (
                      <button
                        type="button"
                        onClick={() =>
                          onAccept(
                            request.id,
                          )
                        }
                        disabled={
                          isProcessing
                        }
                        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:active:bg-emerald-600 dark:focus-visible:ring-emerald-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
                      >
                        {isProcessing
                          ? "Behandler..."
                          : userRole ===
                              "ADMIN"
                            ? "Acceptér selv"
                            : "Acceptér"}
                      </button>
                    ) : null}

                    {canReject ? (
                      <button
                        type="button"
                        onClick={() =>
                          onReject(
                            request,
                          )
                        }
                        disabled={
                          isProcessing
                        }
                        className="inline-flex min-h-11 items-center justify-center rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 active:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none dark:bg-red-500 dark:hover:bg-red-400 dark:active:bg-red-600 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
                      >
                        {isProcessing
                          ? "Behandler..."
                          : "Afvis"}
                      </button>
                    ) : null}

                    {canCancel ? (
                      <button
                        type="button"
                        onClick={() =>
                          onCancel(
                            request,
                          )
                        }
                        disabled={
                          isProcessing
                        }
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-300 bg-white px-5 py-2.5 text-sm font-semibold text-red-700 shadow-sm transition hover:border-red-400 hover:bg-red-50 active:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none dark:border-red-900 dark:bg-gray-950 dark:text-red-300 dark:hover:border-red-800 dark:hover:bg-red-950/40 dark:active:bg-red-950/70 dark:focus-visible:ring-red-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:border-gray-800 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
                      >
                        {isProcessing
                          ? "Behandler..."
                          : "Annuller"}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </article>
          );
        },
      )}

      {completedRequestsCount >
      0 ? (
        <div className="pt-2">
          <button
            type="button"
            onClick={
              onToggleCompletedRequests
            }
            aria-expanded={
              showCompletedRequests
            }
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-950"
          >
            {showCompletedRequests
              ? "Skjul behandlede"
              : `Vis behandlede (${completedRequestsCount})`}
          </button>
        </div>
      ) : null}
    </section>
  );
}
