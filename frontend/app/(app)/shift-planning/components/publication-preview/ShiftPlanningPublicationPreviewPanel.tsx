import { formatCreatedAt } from "../../helpers/shiftPlanningDraftHelpers";
import type { DraftPublicationPreviewResult } from "../../helpers/shiftPlanningDraftTypes";

import { ShiftPlanningPublicationPreviewResultSection } from "./ShiftPlanningPublicationPreviewResultSection";

type ShiftPlanningPublicationPreviewPanelProps = {
  canPublishLater: boolean;
  errorMessage: string | null;
  result: DraftPublicationPreviewResult | null;
};

export function ShiftPlanningPublicationPreviewPanel({
  canPublishLater,
  errorMessage,
  result,
}: ShiftPlanningPublicationPreviewPanelProps) {
  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-950 shadow-sm dark:border-blue-900/70 dark:bg-blue-950/30 dark:text-blue-100">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-base font-semibold">Vagter der kan oprettes</h4>
          <p className="mt-1 text-sm text-blue-800 dark:text-blue-200/80">
            Viser hvilke vagter der vil blive oprettet, uden at oprette dem endnu.
          </p>
        </div>
        {result?.checkedAt && (
          <span className="rounded-full border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-blue-800 dark:border-blue-800 dark:bg-blue-950/70 dark:text-blue-100">
            Senest hentet {formatCreatedAt(result.checkedAt)}
          </span>
        )}
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100">
          {errorMessage}
        </div>
      )}

      {!result && !errorMessage && (
        <div className="mt-4 rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-800 dark:border-blue-900/70 dark:bg-gray-950/70 dark:text-blue-100">
          Oprettelsesoverblikket vises automatisk, når den samlede kontrol er
          gennemført.
        </div>
      )}

      {result && (
        <ShiftPlanningPublicationPreviewResultSection
          canPublishLater={canPublishLater}
          result={result}
        />
      )}
    </section>
  );
}
