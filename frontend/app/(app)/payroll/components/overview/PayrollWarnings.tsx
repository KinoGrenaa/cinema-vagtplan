import type { PayrollWarningsProps } from "../../types";

export default function PayrollWarnings({
  pendingCount,
  voidedCount,
  adjustmentCount,
  onOpenTimeApproval,
}: PayrollWarningsProps) {
  if (
    pendingCount <= 0 &&
    voidedCount <= 0 &&
    adjustmentCount <= 0
  ) {
    return null;
  }

  return (
    <div className="mt-5 grid gap-3 text-sm lg:grid-cols-3">
      {pendingCount > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/30 dark:text-amber-200">
          <div className="font-semibold">
            {pendingCount} kræver handling før låsning og eksport
          </div>
          <div className="mt-1 text-sm">
            Er stadig åbne, afventer godkendelse eller er sendt retur til
            rettelse.
          </div>
          <button
            type="button"
            onClick={onOpenTimeApproval}
            className="mt-3 rounded-xl border border-amber-300 bg-white px-3 py-2 text-sm font-semibold transition hover:bg-amber-100 active:bg-amber-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 dark:border-amber-800 dark:bg-amber-950/40 dark:hover:bg-amber-950 dark:active:bg-amber-900 dark:focus-visible:ring-amber-300 dark:focus-visible:ring-offset-gray-900"
          >
            Gå til timegodkendelse
          </button>
        </div>
      )}
      {adjustmentCount > 0 && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-900 dark:border-blue-900/70 dark:bg-blue-950/30 dark:text-blue-200">
          <div className="font-semibold">
            {adjustmentCount} efterregulering
            {adjustmentCount === 1 ? "" : "er"}
          </div>
          <div className="mt-1 text-sm">
            Medtages separat i denne lønperiode.
          </div>
        </div>
      )}
      {voidedCount > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-gray-800 dark:border-gray-800 dark:bg-gray-950/40 dark:text-gray-200">
          <div className="font-semibold">
            {voidedCount} afvist/annulleret
          </div>
          <div className="mt-1 text-sm">
            Indgår ikke i løngrundlaget, men bevares i historikken.
          </div>
        </div>
      )}
    </div>
  );
}
