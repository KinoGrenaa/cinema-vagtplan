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
import type { StaffingRequest } from "../../helpers/core/staffingRequestTypes";

type StaffingRequestsListSectionProps = {
  requests: StaffingRequest[];
  visibleRequests: StaffingRequest[];
  completedRequestsCount: number;
  showCompletedRequests: boolean;
  onToggleCompletedRequests: () => void;
  userRole?: string;
  currentUserId: number | null;
  isManager: boolean;
  processingId: number | null;
  onAccept: (id: number) => void;
  onReject: (request: StaffingRequest) => void;
  onCancel: (request: StaffingRequest) => void;
};

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
  onAccept,
  onReject,
  onCancel,
}: StaffingRequestsListSectionProps) {
  if (requests.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed bg-white p-8 text-center text-gray-500 shadow dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        Ingen bemandingsforespørgsler fundet.
      </section>
    );
  }

  return (
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
          (userRole === "EMPLOYEE" || userRole === "ADMIN") &&
          currentUserId !== null &&
          (!targetUserId || targetUserId === currentUserId);
        const canReject =
          isPending &&
          (userRole === "EMPLOYEE" || userRole === "ADMIN") &&
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
                  {request.message || getDefaultMessage(request.type)}
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
                <div>{getFullName(request.requestedByUser, "System")}</div>
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
                    onClick={() => onAccept(request.id)}
                    disabled={processingId === request.id}
                    className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
                  >
                    {userRole === "ADMIN" ? "Acceptér selv" : "Acceptér"}
                  </button>
                ) : null}
                {canReject ? (
                  <button
                    type="button"
                    onClick={() => onReject(request)}
                    disabled={processingId === request.id}
                    className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50"
                  >
                    Afvis
                  </button>
                ) : null}
                {canCancel ? (
                  <button
                    type="button"
                    onClick={() => onCancel(request)}
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

      {completedRequestsCount > 0 ? (
        <div className="pt-2">
          <button
            type="button"
            onClick={onToggleCompletedRequests}
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
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
