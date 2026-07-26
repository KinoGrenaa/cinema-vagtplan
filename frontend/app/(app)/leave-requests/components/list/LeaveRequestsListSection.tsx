"use client";

import {
  useEffect,
} from "react";

import {
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import {
  getEmptyReasonText,
  getPeriodText,
  getStatusBadge,
  getStatusDescription,
  getStatusLabel,
  getStatusSummaryParts,
} from "../../helpers/core/leaveRequestHelpers";
import type {
  LeaveRequest,
} from "../../helpers/core/leaveRequestTypes";

type LeaveRequestGroup = {
  key: string;
  requests:
    LeaveRequest[];
};

type LeaveRequestsListSectionProps = {
  currentUserId:
    number | null;
  focusedRequestId:
    number | null;
  expandedGroupKeys:
    string[];
  filterSummary: string;
  groupedRequests:
    LeaveRequestGroup[];
  totalRequestCount:
    number;
  visibleRequestCount:
    number;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore:
    () => Promise<unknown>;
  onSelectCancelRequest:
    (
      request:
        LeaveRequest,
    ) => void;
  onToggleGroup:
    (
      groupKey: string,
    ) => void;
};

export default function LeaveRequestsListSection({
  currentUserId,
  focusedRequestId,
  expandedGroupKeys,
  filterSummary,
  groupedRequests,
  totalRequestCount,
  visibleRequestCount,
  hasMore,
  loadingMore,
  onLoadMore,
  onSelectCancelRequest,
  onToggleGroup,
}: LeaveRequestsListSectionProps) {
  useEffect(() => {
    if (!focusedRequestId) {
      return;
    }

    const timeoutId =
      window.setTimeout(
        () => {
          const element =
            document.getElementById(
              `leave-request-${focusedRequestId}`,
            );

          if (!element) {
            return;
          }

          element.focus({
            preventScroll:
              true,
          });
          element.scrollIntoView({
            behavior:
              window
                .matchMedia(
                  "(prefers-reduced-motion: reduce)",
                )
                .matches
                ? "auto"
                : "smooth",
            block:
              "center",
          });
        },
        100,
      );

    return () =>
      window.clearTimeout(
        timeoutId,
      );
  }, [focusedRequestId]);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-950 dark:text-white">
            Mine ansøgninger
          </h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Viser{" "}
            {visibleRequestCount} af{" "}
            {totalRequestCount}{" "}
            ansøgninger.
          </p>
          <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
            Filter:{" "}
            {filterSummary}
          </p>
        </div>
      </div>

      {groupedRequests.length ===
      0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-950/50">
          <h3 className="text-xl font-bold text-gray-950 dark:text-white">
            Ingen
            fraværsansøgninger
          </h3>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Ingen
            fraværsansøgninger
            matcher det valgte
            filter.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedRequests.map(
            (group) => {
              const isExpanded =
                expandedGroupKeys.includes(
                  group.key,
                );

              return (
                <div
                  key={
                    group.key
                  }
                  className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
                >
                  <button
                    type="button"
                    onClick={() =>
                      onToggleGroup(
                        group.key,
                      )
                    }
                    aria-expanded={
                      isExpanded
                    }
                    className="flex w-full items-center justify-between gap-4 bg-gray-50 p-4 text-left text-gray-900 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 dark:bg-gray-950 dark:text-gray-100 dark:hover:bg-gray-900 dark:focus-visible:ring-blue-400"
                  >
                    <div>
                      <div className="flex items-center gap-2 font-semibold text-gray-950 dark:text-white">
                        {isExpanded ? (
                          <ChevronDown
                            size={
                              18
                            }
                          />
                        ) : (
                          <ChevronRight
                            size={
                              18
                            }
                          />
                        )}
                        {group.key}
                      </div>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {
                          group
                            .requests
                            .length
                        }{" "}
                        ansøgning
                        {group
                          .requests
                          .length ===
                        1
                          ? ""
                          : "er"}
                      </div>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2">
                      {getStatusSummaryParts(
                        group.requests,
                      ).map(
                        (part) => (
                          <span
                            key={
                              String(
                                part,
                              )
                            }
                            className="inline-flex rounded-full border border-gray-200 bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                          >
                            {part}
                          </span>
                        ),
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="space-y-3 border-t border-gray-200 bg-gray-50/50 p-4 dark:border-gray-800 dark:bg-gray-950/30">
                      {group.requests.map(
                        (
                          request,
                        ) => (
                          <article
                            key={
                              request.id
                            }
                            id={`leave-request-${request.id}`}
                            tabIndex={
                              -1
                            }
                            aria-label={
                              request.id ===
                              focusedRequestId
                                ? "Fremhævet fraværsansøgning"
                                : undefined
                            }
                            className={`rounded-2xl border bg-white p-4 text-gray-900 shadow-sm outline-none transition-colors dark:bg-gray-900 dark:text-gray-100 ${
                              request.id ===
                              focusedRequestId
                                ? "border-blue-500 ring-4 ring-blue-500/60 ring-offset-4 ring-offset-gray-50 dark:border-blue-400 dark:ring-blue-400/60 dark:ring-offset-gray-950"
                                : "border-gray-200 dark:border-gray-800"
                            }`}
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                <div className="text-lg font-semibold text-gray-950 dark:text-white">
                                  {getPeriodText(
                                    request,
                                  )}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <span
                                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ring-black/5 dark:ring-white/10 ${getStatusBadge(
                                      request.status,
                                    )}`}
                                  >
                                    {getStatusDescription(
                                      request.status,
                                    )}
                                  </span>
                                  {request.id ===
                                    focusedRequestId && (
                                    <span className="inline-flex rounded-full bg-blue-700 px-3 py-1 text-xs font-semibold text-white dark:bg-blue-500">
                                      Fra
                                      notifikation
                                    </span>
                                  )}
                                </div>
                                {request.status ===
                                  "EXPIRED" && (
                                  <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
                                    Ansøgningen
                                    blev ikke
                                    behandlet,
                                    før
                                    fraværsperioden
                                    begyndte.
                                  </p>
                                )}
                              </div>

                              {(request.status ===
                                "PENDING" ||
                                request.status ===
                                  "APPROVED") &&
                                request.user.id ===
                                  currentUserId && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      onSelectCancelRequest(
                                        request,
                                      )
                                    }
                                    className="rounded-lg bg-gray-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-600 focus-visible:ring-offset-2 dark:bg-gray-600 dark:hover:bg-gray-500 dark:focus-visible:ring-gray-400 dark:focus-visible:ring-offset-gray-900"
                                  >
                                    Annullér
                                  </button>
                                )}
                            </div>

                            <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/50">
                                <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                  Periode
                                </div>
                                <div className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                                  {getPeriodText(
                                    request,
                                  )}
                                </div>
                              </div>
                              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/50">
                                <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                  Årsag
                                </div>
                                <div className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                                  {getEmptyReasonText(
                                    request.reason,
                                  )}
                                </div>
                              </div>
                              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950/50">
                                <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                                  Status
                                </div>
                                <div className="mt-1 font-medium text-gray-900 dark:text-gray-100">
                                  {getStatusLabel(
                                    request.status,
                                  )}
                                </div>
                              </div>
                            </div>
                          </article>
                        ),
                      )}
                    </div>
                  )}
                </div>
              );
            },
          )}

          {hasMore && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() =>
                  void onLoadMore()
                }
                disabled={
                  loadingMore
                }
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-400 hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-wait disabled:bg-gray-100 disabled:text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:bg-gray-800 dark:active:bg-gray-700 dark:focus-visible:ring-blue-400 dark:focus-visible:ring-offset-gray-900 dark:disabled:bg-gray-800 dark:disabled:text-gray-500"
              >
                {loadingMore
                  ? "Henter..."
                  : "Hent ældre ansøgninger"}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
