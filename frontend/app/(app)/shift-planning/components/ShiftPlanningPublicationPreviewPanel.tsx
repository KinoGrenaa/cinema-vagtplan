import { formatDateKey } from "../helpers/shiftPlanningHelpers";
import {
  formatCreatedAt,
  formatMinute,
  toNumber,
} from "../helpers/shiftPlanningDraftHelpers";
import type { DraftPublicationPreviewResult } from "../helpers/shiftPlanningDraftTypes";

type ShiftPlanningPublicationPreviewPanelProps = {
  canPublishLater: boolean;
  errorMessage: string | null;
  result: DraftPublicationPreviewResult | null;
};

const MAX_VISIBLE_PUBLICATION_PREVIEW_ITEMS = 12;

function PreviewMetricCard({
  label,
  value,
  variant = "neutral",
}: {
  label: string;
  value: number | string;
  variant?: "neutral" | "warning" | "success";
}) {
  const numericValue = Number(value);
  const shouldHighlightProblem = !Number.isFinite(numericValue) || numericValue > 0;
  const classes =
    variant === "warning" && shouldHighlightProblem
      ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"
      : variant === "success"
        ? "border-green-200 bg-green-50 text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100"
        : "border-blue-200 bg-white text-blue-950 dark:border-blue-900/70 dark:bg-gray-950/70 dark:text-blue-100";

  return (
    <div className={`rounded-xl border px-3 py-2 ${classes}`}>
      <div className="text-[11px] uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

export function ShiftPlanningPublicationPreviewPanel({
  canPublishLater,
  errorMessage,
  result,
}: ShiftPlanningPublicationPreviewPanelProps) {
  const previewSummary = result?.summary;
  const previewItems = result?.previewItems ?? [];
  const visiblePreviewItems = previewItems.slice(
    0,
    MAX_VISIBLE_PUBLICATION_PREVIEW_ITEMS,
  );
  const hiddenPreviewItemCount = Math.max(
    0,
    previewItems.length - visiblePreviewItems.length,
  );
  const blockingReasons = result?.blockingReasons ?? [];

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-950 shadow-sm dark:border-blue-900/70 dark:bg-blue-950/30 dark:text-blue-100">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 className="text-base font-semibold">Publiceringspreview</h4>
          <p className="mt-1 text-sm text-blue-800 dark:text-blue-200/80">
            Viser hvad kladden kan blive til, uden at oprette eller publicere
            vagter. Backend svarer eksplicit med <code>createsShifts: false</code>.
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
          Publiceringspreview er ikke hentet for den åbne kladde endnu.
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-4">
          <div
            className={`rounded-xl border px-3 py-2 text-sm ${
              canPublishLater
                ? "border-green-200 bg-green-50 text-green-900 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100"
                : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"
            }`}
          >
            <div className="font-semibold">
              {canPublishLater
                ? "Preview er klar til publicering"
                : "Preview viser blokeringer før publicering"}
            </div>
            <div className="mt-1 text-xs opacity-80">
              Mode: {result.mode || "Ukendt"} · Opretter vagter nu: {" "}
              {result.createsShifts ? "Ja" : "Nej"}
            </div>
          </div>

          {previewSummary && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <PreviewMetricCard
                label="Poster"
                value={toNumber(previewSummary.itemCount)}
              />
              <PreviewMetricCard
                label="Kan blive vagter"
                value={toNumber(previewSummary.publishableItemCount)}
                variant="success"
              />
              <PreviewMetricCard
                label="Blokerede"
                value={toNumber(previewSummary.blockedItemCount)}
                variant="warning"
              />
              <PreviewMetricCard
                label="Valideringsfejl"
                value={toNumber(previewSummary.validationErrorCount)}
                variant="warning"
              />
              <PreviewMetricCard
                label="Valideringsadvarsler"
                value={toNumber(previewSummary.validationWarningCount)}
                variant="warning"
              />
              <PreviewMetricCard
                label="Valideringsproblemer"
                value={toNumber(previewSummary.validationIssueCount)}
                variant="warning"
              />
            </div>
          )}

          {blockingReasons.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100">
              <div className="font-semibold">Blokerende årsager</div>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {blockingReasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {visiblePreviewItems.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-semibold text-blue-950 dark:text-blue-100">
                Preview-poster
              </div>
              {visiblePreviewItems.map((item, index) => {
                const itemDate = item.dateKey
                  ? formatDateKey(item.dateKey)
                  : "Dato mangler";
                const blockReasons = item.blockReasons ?? [];
                const startTime = formatMinute(item.plannedStartMinute);
                const endTime = formatMinute(item.plannedEndMinute);

                return (
                  <div
                    key={`${item.draftItemId ?? index}-${item.dateKey ?? "no-date"}`}
                    className="rounded-xl border border-blue-200 bg-white p-3 text-sm text-blue-950 dark:border-blue-900/70 dark:bg-gray-950/70 dark:text-blue-100"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            item.canBecomeShift
                              ? "bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-100"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-100"
                          }`}
                        >
                          {item.canBecomeShift ? "Kan blive vagt" : "Blokeret"}
                        </span>
                        <span className="font-semibold">{itemDate}</span>
                      </div>
                      <span className="text-xs text-blue-700 dark:text-blue-200/70">
                        {startTime && endTime
                          ? `kl. ${startTime} - ${endTime}`
                          : "Tid mangler"}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-blue-800 dark:text-blue-200/80">
                      {item.jobFunctionColor && (
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.jobFunctionColor }}
                        />
                      )}
                      <span>{item.jobFunctionName || "Jobfunktion mangler"}</span>
                      <span>·</span>
                      <span>{item.userName || "Ikke tildelt"}</span>
                      <span>·</span>
                      <span>Kladdepost #{item.draftItemId ?? "?"}</span>
                    </div>

                    {blockReasons.length > 0 && (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-amber-800 dark:text-amber-100">
                        {blockReasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    )}

                    {item.warningMessage && (
                      <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100">
                        Advarsel: {item.warningMessage}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {previewItems.length === 0 && (
            <div className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-800 dark:border-blue-900/70 dark:bg-gray-950/70 dark:text-blue-100">
              Previewet har ingen poster. Kladden kan ikke publiceres, før den har
              poster.
            </div>
          )}

          {hiddenPreviewItemCount > 0 && (
            <div className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-800 dark:border-blue-900/70 dark:bg-gray-950/70 dark:text-blue-100">
              {hiddenPreviewItemCount} flere preview-poster er skjult i denne
              kompakte visning.
            </div>
          )}
        </div>
      )}
    </section>
  );
}
