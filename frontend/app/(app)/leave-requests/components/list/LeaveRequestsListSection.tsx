import { ChevronDown, ChevronRight } from "lucide-react";

import {
  getEmptyReasonText,
  getPeriodText,
  getStatusBadge,
  getStatusDescription,
  getStatusLabel,
  getStatusSummaryParts,
} from "../../helpers/core/leaveRequestHelpers";
import type { LeaveRequest } from "../../helpers/core/leaveRequestTypes";

type LeaveRequestGroup = {
  key: string;
  requests: LeaveRequest[];
};

type LeaveRequestsListSectionProps = {
  currentUserId: number | null;
  expandedGroupKeys: string[];
  filterSummary: string;
  groupedRequests: LeaveRequestGroup[];
  totalRequestCount: number;
  visibleRequestCount: number;
  onSelectCancelRequest: (request: LeaveRequest) => void;
  onToggleGroup: (groupKey: string) => void;
};

export default function LeaveRequestsListSection({
  currentUserId,
  expandedGroupKeys,
  filterSummary,
  groupedRequests,
  totalRequestCount,
  visibleRequestCount,
  onSelectCancelRequest,
  onToggleGroup,
}: LeaveRequestsListSectionProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">Mine ansøgninger</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Viser {visibleRequestCount} af {totalRequestCount} ansøgninger.
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Filter: {filterSummary}
          </p>
        </div>
      </div>

      {groupedRequests.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 p-6 text-center text-gray-500 dark:border-gray-800 dark:text-gray-400">
          Ingen fraværsansøgninger matcher det valgte filter.
        </div>
      ) : (
        <div className="space-y-3">
          {groupedRequests.map((group) => {
            const isExpanded = expandedGroupKeys.includes(group.key);
            return (
              <div
                key={group.key}
                className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
              >
                <button
                  type="button"
                  onClick={() => onToggleGroup(group.key)}
                  className="flex w-full items-center justify-between gap-4 bg-gray-50 p-4 text-left transition hover:bg-gray-100 dark:bg-gray-950 dark:hover:bg-gray-900"
                >
                  <div>
                    <div className="flex items-center gap-2 font-semibold">
                      {isExpanded ? (
                        <ChevronDown size={18} />
                      ) : (
                        <ChevronRight size={18} />
                      )}
                      {group.key}
                    </div>
                    <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {group.requests.length} ansøgning
                      {group.requests.length === 1 ? "" : "er"}
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    {getStatusSummaryParts(group.requests).map((part) => (
                      <span
                        key={part}
                        className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      >
                        {part}
                      </span>
                    ))}
                  </div>
                </button>

                {isExpanded && (
                  <div className="space-y-3 p-4">
                    {group.requests.map((request) => (
                      <div
                        key={request.id}
                        className="rounded-2xl border border-gray-200 p-4 dark:border-gray-800"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <div className="text-lg font-semibold">
                              {getPeriodText(request)}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(
                                  request.status,
                                )}`}
                              >
                                {getStatusDescription(request.status)}
                              </span>
                            </div>
                          </div>
                          {(request.status === "PENDING" ||
                            request.status === "APPROVED") &&
                            request.user.id === currentUserId && (
                              <button
                                type="button"
                                onClick={() => onSelectCancelRequest(request)}
                                className="rounded-lg bg-gray-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
                              >
                                Annullér
                              </button>
                            )}
                        </div>

                        <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
                          <div>
                            <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                              Periode
                            </div>
                            <div className="mt-1">{getPeriodText(request)}</div>
                          </div>
                          <div>
                            <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                              Årsag
                            </div>
                            <div className="mt-1">
                              {getEmptyReasonText(request.reason)}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                              Status
                            </div>
                            <div className="mt-1">
                              {getStatusLabel(request.status)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
