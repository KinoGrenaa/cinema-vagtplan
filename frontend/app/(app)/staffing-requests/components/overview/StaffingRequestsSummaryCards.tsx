type StaffingRequestsSummaryCardsProps = {
  emergencyCount: number;
  pendingCount: number;
  completedCount: number;
};

type SummaryCardProps = {
  label: string;
  description: string;
  count: number;
  tone: "red" | "amber" | "emerald";
};

const toneClasses = {
  red: {
    accent: "bg-red-500 dark:bg-red-400",
    badge:
      "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-200",
  },
  amber: {
    accent: "bg-amber-500 dark:bg-amber-400",
    badge:
      "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200",
  },
  emerald: {
    accent: "bg-emerald-500 dark:bg-emerald-400",
    badge:
      "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200",
  },
} as const;

function SummaryCard({
  label,
  description,
  count,
  tone,
}: SummaryCardProps) {
  const classes = toneClasses[tone];

  return (
    <article className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-colors dark:border-gray-800 dark:bg-gray-900">
      <span
        className={`absolute inset-y-0 left-0 w-1 ${classes.accent}`}
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-4 pl-1">
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {label}
          </p>
          <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
        <span
          className={`inline-flex min-w-11 items-center justify-center rounded-full px-3 py-1.5 text-lg font-bold ${classes.badge}`}
          aria-label={`${count} ${label.toLowerCase()}`}
        >
          {count}
        </span>
      </div>
    </article>
  );
}

export default function StaffingRequestsSummaryCards({
  emergencyCount,
  pendingCount,
  completedCount,
}: StaffingRequestsSummaryCardsProps) {
  return (
    <section
      className="grid gap-4 md:grid-cols-3"
      aria-label="Oversigt over bemandingsforespørgsler"
    >
      <SummaryCard
        label="Akutte"
        description="Forespørgsler markeret med akut behov."
        count={emergencyCount}
        tone="red"
      />
      <SummaryCard
        label="Afventer"
        description="Forespørgsler, der stadig kan behandles."
        count={pendingCount}
        tone="amber"
      />
      <SummaryCard
        label="Behandlede"
        description="Accepterede, afviste eller afsluttede behov."
        count={completedCount}
        tone="emerald"
      />
    </section>
  );
}
