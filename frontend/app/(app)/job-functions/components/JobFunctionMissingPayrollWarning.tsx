type JobFunctionMissingPayrollWarningProps = {
  count: number;
  names: string;
  remainingCount: number;
  visible: boolean;
};

export default function JobFunctionMissingPayrollWarning({
  count,
  names,
  remainingCount,
  visible,
}: JobFunctionMissingPayrollWarningProps) {
  if (!visible) {
    return null;
  }

  const nameText =
    remainingCount > 0 ? `${names} og ${remainingCount} mere` : names;

  return (
    <div
      role="alert"
      className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <p className="font-semibold">
        {count === 1
          ? "1 aktiv jobfunktion mangler Oprettes som"
          : `${count} aktive jobfunktioner mangler Oprettes som`}
      </p>
      <p className="mt-1">
        Vælg en løntype for <span className="font-semibold">{nameText}</span>,
        før vagter kan oprettes fra dem i vagtplanlægningen.
      </p>
    </div>
  );
}
