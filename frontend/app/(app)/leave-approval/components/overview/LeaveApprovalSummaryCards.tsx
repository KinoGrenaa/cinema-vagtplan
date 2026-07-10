type LeaveApprovalStatusCounts = {
  PENDING: number;
  APPROVED: number;
  REJECTED: number;
  CANCELLED: number;
};

type LeaveApprovalSummaryCardsProps = {
  statusCounts: LeaveApprovalStatusCounts;
};

export default function LeaveApprovalSummaryCards({
  statusCounts,
}: LeaveApprovalSummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      <div
        className={`rounded-2xl border p-5 shadow-sm transition-colors ${
          statusCounts.PENDING > 0
            ? "border-orange-200 bg-orange-50 dark:border-orange-900/60 dark:bg-orange-950/30"
            : "border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900"
        }`}
      >
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Afventer
        </div>
        <div className="mt-1 text-2xl font-bold">{statusCounts.PENDING}</div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Kræver behandling.
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Godkendt
        </div>
        <div className="mt-1 text-2xl font-bold">{statusCounts.APPROVED}</div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Allerede godkendt.
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="text-sm text-gray-500 dark:text-gray-400">Afvist</div>
        <div className="mt-1 text-2xl font-bold">{statusCounts.REJECTED}</div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Afviste ansøgninger.
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Annulleret
        </div>
        <div className="mt-1 text-2xl font-bold">{statusCounts.CANCELLED}</div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Annullerede ansøgninger.
        </div>
      </div>
    </div>
  );
}
