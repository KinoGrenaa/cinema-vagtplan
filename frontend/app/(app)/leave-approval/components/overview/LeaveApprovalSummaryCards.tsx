type LeaveApprovalStatusCounts = {
  PENDING: number;
  EXPIRED: number;
  APPROVED: number;
  REJECTED: number;
  CANCELLED: number;
};

type LeaveApprovalSummaryCardsProps = {
  statusCounts:
    LeaveApprovalStatusCounts;
};

type SummaryCardProps = {
  label: string;
  value: number;
  description: string;
  variant?:
    | "default"
    | "attention";
};

function SummaryCard({
  label,
  value,
  description,
  variant = "default",
}: SummaryCardProps) {
  const cardClass =
    variant === "attention"
      ? "border-orange-200 bg-orange-50 text-orange-950 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-100"
      : "border-gray-200 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-100";

  const secondaryTextClass =
    variant === "attention"
      ? "text-orange-800 dark:text-orange-200"
      : "text-gray-600 dark:text-gray-300";

  return (
    <div
      className={`rounded-2xl border p-5 shadow-sm transition-colors ${cardClass}`}
    >
      <div
        className={`text-sm font-medium ${secondaryTextClass}`}
      >
        {label}
      </div>

      <div className="mt-1 text-2xl font-bold">
        {value}
      </div>

      <div
        className={`mt-1 text-xs ${secondaryTextClass}`}
      >
        {description}
      </div>
    </div>
  );
}

export default function LeaveApprovalSummaryCards({
  statusCounts,
}: LeaveApprovalSummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <SummaryCard
        label="Afventer"
        value={
          statusCounts.PENDING
        }
        description="Kræver behandling."
        variant={
          statusCounts.PENDING > 0
            ? "attention"
            : "default"
        }
      />

      <SummaryCard
        label="Udløbet"
        value={
          statusCounts.EXPIRED
        }
        description="Ikke behandlet i tide."
      />

      <SummaryCard
        label="Godkendt"
        value={
          statusCounts.APPROVED
        }
        description="Allerede godkendt."
      />

      <SummaryCard
        label="Afvist"
        value={
          statusCounts.REJECTED
        }
        description="Afviste ansøgninger."
      />

      <SummaryCard
        label="Annulleret"
        value={
          statusCounts.CANCELLED
        }
        description="Annullerede ansøgninger."
      />
    </div>
  );
}
