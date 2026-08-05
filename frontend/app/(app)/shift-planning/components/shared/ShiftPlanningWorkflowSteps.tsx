type WorkflowStep = {
  href: string;
  label: string;
};

const steps: WorkflowStep[] = [
  { href: "#shift-planning-calendar", label: "1. Planlæg i kalenderen" },
  { href: "#shift-planning-calculate", label: "2. Beregn vagtforslag" },
  { href: "#shift-planning-review", label: "3. Gennemgå og opret" },
];

export default function ShiftPlanningWorkflowSteps() {
  return (
    <nav
      aria-label="Arbejdsgang for vagtplanlægning"
      className="rounded-2xl border border-blue-200 bg-blue-50/80 p-3 shadow-sm dark:border-blue-900/70 dark:bg-blue-950/25"
    >
      <ol className="flex flex-col gap-2 text-sm font-semibold text-blue-900 dark:text-blue-100 lg:flex-row lg:items-center">
        {steps.map((step, index) => (
          <li key={step.href} className="flex items-center gap-2">
            {index > 0 && (
              <span aria-hidden="true" className="hidden text-blue-400 lg:inline">
                →
              </span>
            )}
            <a
              href={step.href}
              className="rounded-lg px-2 py-1 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 dark:hover:bg-blue-900/50"
            >
              {step.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
