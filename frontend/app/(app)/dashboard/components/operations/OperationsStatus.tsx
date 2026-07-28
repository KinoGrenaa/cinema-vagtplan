import Link from "next/link";

type OperationsStatusValue =
  | "UNKNOWN"
  | "NORMAL"
  | "WARNING"
  | "CRITICAL";

type Props = {
  liveOperationsStatus: OperationsStatusValue;
};

type StatusContent = {
  label: string;
  description: string;
  actionLabel?: string;
};

const statusContent: Record<OperationsStatusValue, StatusContent> = {
  UNKNOWN: {
    label: "Ukendt",
    description:
      "Status kan ikke vurderes endnu. Kontrollér, at dagens vagtplan og filmprogram er opdateret.",
    actionLabel: "Kontrollér dagens vagtplan",
  },
  NORMAL: {
    label: "Normal",
    description:
      "Dagens bemanding og aktivitet ser ud til at være i balance.",
  },
  WARNING: {
    label: "Kræver opmærksomhed",
    description:
      "Dagens bemanding eller aktivitet bør gennemgås, før driften fortsætter.",
    actionLabel: "Gennemgå dagens vagtplan",
  },
  CRITICAL: {
    label: "Kritisk",
    description:
      "Der er kritiske forhold i dagens bemanding eller aktivitet, som bør håndteres nu.",
    actionLabel: "Åbn dagens vagtplan",
  },
};

export default function OperationsStatus({
  liveOperationsStatus,
}: Props) {
  const content = statusContent[liveOperationsStatus];

  return (
    <section
      aria-labelledby="dashboard-operations-status-heading"
      className={`rounded-2xl border p-6 shadow-sm ${
        liveOperationsStatus === "UNKNOWN"
          ? "border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900"
          : liveOperationsStatus === "NORMAL"
            ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950"
            : liveOperationsStatus === "WARNING"
              ? "border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950"
              : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950"
      }`}
    >
      <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <div className="text-4xl" aria-hidden="true">
            {liveOperationsStatus === "UNKNOWN"
              ? "⚪"
              : liveOperationsStatus === "NORMAL"
                ? "🟢"
                : liveOperationsStatus === "WARNING"
                  ? "🟡"
                  : "🔴"}
          </div>
          <div>
            <h2
              id="dashboard-operations-status-heading"
              className="text-2xl font-bold"
            >
              Driftsstatus lige nu
            </h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 opacity-80">
              {content.description}
            </p>
            {content.actionLabel && (
              <Link
                href="/schedule"
                className="mt-4 inline-flex items-center gap-1 rounded-lg font-semibold underline decoration-2 underline-offset-4 transition hover:gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950"
              >
                {content.actionLabel}
                <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        </div>
        <div
          className={`shrink-0 self-start rounded-full px-6 py-3 text-sm font-bold md:self-auto ${
            liveOperationsStatus === "UNKNOWN"
              ? "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200"
              : liveOperationsStatus === "NORMAL"
                ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                : liveOperationsStatus === "WARNING"
                  ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                  : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
          }`}
        >
          {content.label}
        </div>
      </div>
    </section>
  );
}
