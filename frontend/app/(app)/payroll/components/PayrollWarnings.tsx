import type { PayrollWarningsProps } from "../types";

export default function PayrollWarnings({
  pendingCount,
  voidedCount,
  adjustmentCount,
  onOpenTimeApproval,
}: PayrollWarningsProps) {
  if (pendingCount <= 0 && voidedCount <= 0 && adjustmentCount <= 0) {
    return null;
  }

  return (
    <div className="mt-4 space-y-3 text-sm">
      {pendingCount > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="font-semibold">
            ⚠ {pendingCount} afventende tidsregistreringer
          </div>

          <div className="mt-1">
            Disse registreringer er ikke inkluderet i lønrapporten, før de er
            godkendt.
          </div>

          <button
            onClick={onOpenTimeApproval}
            className="mt-3 rounded-lg border border-amber-400 px-3 py-2 font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40"
          >
            Gennemgå tidsregistreringer
          </button>
        </div>
      )}

      {adjustmentCount > 0 && (
        <div className="rounded-xl border border-blue-300 bg-blue-50 p-4 text-blue-900 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200">
          <div className="font-semibold">
            {adjustmentCount} afventende efterreguleringer
          </div>

          <div className="mt-1">
            Disse efterreguleringer vises separat og vil senere blive medtaget
            ved løneksport.
          </div>
        </div>
      )}

      {voidedCount > 0 && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          <div className="font-semibold">
            {voidedCount} annullerede tidsregistreringer
          </div>

          <div className="mt-1">
            Annullerede registreringer indgår ikke i løngrundlaget.
          </div>
        </div>
      )}
    </div>
  );
}
