import { formatDateKey } from "../helpers/shiftPlanningHelpers";

type DraftValidationIssue = {
  id?: number | string | null;
  itemId?: number | string | null;
  date?: string | null;
  dateKey?: string | null;
  severity?: string | null;
  code?: string | null;
  message?: string | null;
  employeeName?: string | null;
  userName?: string | null;
  jobFunctionName?: string | null;
  details?: unknown;
};

type DraftValidationSummary = {
  isValid?: boolean;
  errorCount?: number | string | null;
  warningCount?: number | string | null;
  issueCount?: number | string | null;
};

type DraftPublicationPreviewSummary = {
  canPublishLater?: boolean;
  itemCount?: number | string | null;
  publishableItemCount?: number | string | null;
  blockedItemCount?: number | string | null;
  validationErrorCount?: number | string | null;
  validationWarningCount?: number | string | null;
  validationIssueCount?: number | string | null;
};

type DraftPublicationPreviewItem = {
  draftItemId?: number | string | null;
  dateKey?: string | null;
  status?: string | null;
  jobFunctionName?: string | null;
  jobFunctionColor?: string | null;
  userName?: string | null;
  plannedStartMinute?: number | string | null;
  plannedEndMinute?: number | string | null;
  canBecomeShift?: boolean | null;
  blockReasons?: string[] | null;
  warningMessage?: string | null;
};

type DraftPublicationPreviewResult = {
  draftId?: number | string;
  cinemaId?: number | null;
  year?: number | null;
  month?: number | null;
  status?: string | null;
  checkedAt?: string | null;
  mode?: string | null;
  createsShifts?: boolean | null;
  summary?: DraftPublicationPreviewSummary | null;
  blockingReasons?: string[];
  validationSummary?: DraftValidationSummary | null;
  validationIssues?: DraftValidationIssue[];
  previewItems?: DraftPublicationPreviewItem[];
};

type ShiftPlanningPublicationPreviewPanelProps = {
  canPublishLater: boolean;
  errorMessage: string | null;
  result: DraftPublicationPreviewResult | null;
};

const MAX_VISIBLE_PUBLICATION_PREVIEW_ITEMS = 12;

function toNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function formatCreatedAt(value?: string | null) {
  if (!value) {
    return "Ukendt tidspunkt";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Ukendt tidspunkt";
  }

  return new Intl.DateTimeFormat("da-DK", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function formatMinute(value: unknown) {
  const minute = Number(value);

  if (!Number.isInteger(minute) || minute < 0) {
    return null;
  }

  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

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
  const shouldHighlightProblem =
    !Number.isFinite(numericValue) || numericValue > 0;

  const classes =
    variant === "warning" && shouldHighlightProblem
      ? "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"
      : variant === "success"
        ? "border-green-200 bg-green-50 text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100"
        : "border-blue-200 bg-white text-blue-950 dark:border-blue-900/70 dark:bg-gray-950/70 dark:text-blue-100";

  return (
    <div className={`rounded-2xl border p-4 ${classes}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
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

  return (
    <div className="mt-5 rounded-2xl border border-purple-200 bg-white p-4 dark:border-purple-900/70 dark:bg-gray-950/70">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-bold text-gray-950 dark:text-white">
            Publiceringspreview
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Viser hvad kladden senere kan blive til, uden at oprette eller
            publicere vagter. Backend svarer eksplicit med{" "}
            <span className="font-semibold">createsShifts: false</span>.
          </p>
        </div>
        {result?.checkedAt && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Senest hentet {formatCreatedAt(result.checkedAt)}
          </p>
        )}
      </div>

      {errorMessage && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-100">
          {errorMessage}
        </div>
      )}

      {!result && !errorMessage && (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
          Publiceringspreview er ikke hentet for den åbne kladde endnu.
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-4">
          <div
            className={`rounded-2xl border p-4 text-sm ${
              canPublishLater
                ? "border-green-200 bg-green-50 text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100"
                : "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"
            }`}
          >
            <p className="font-semibold">
              {canPublishLater
                ? "Preview er klar til et senere publiceringstrin"
                : "Preview viser blokeringer før senere publicering"}
            </p>
            <p className="mt-1 opacity-85">
              Mode: {result.mode || "Ukendt"} · Opretter vagter nu:{" "}
              {result.createsShifts ? "Ja" : "Nej"}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <PreviewMetricCard
              label="Kan senere publiceres"
              value={canPublishLater ? "Ja" : "Nej"}
              variant={canPublishLater ? "success" : "warning"}
            />
            <PreviewMetricCard
              label="Preview-poster"
              value={toNumber(previewSummary?.itemCount)}
            />
            <PreviewMetricCard
              label="Kan blive vagter"
              value={toNumber(previewSummary?.publishableItemCount)}
              variant="success"
            />
            <PreviewMetricCard
              label="Blokeret"
              value={toNumber(previewSummary?.blockedItemCount)}
              variant="warning"
            />
          </div>

          {(result.blockingReasons ?? []).length > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100">
              <p className="font-semibold">Blokerende årsager</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {(result.blockingReasons ?? []).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          )}

          {visiblePreviewItems.length > 0 && (
            <div className="grid gap-3">
              {visiblePreviewItems.map((item, index) => {
                const itemDate = item.dateKey
                  ? formatDateKey(item.dateKey)
                  : "Dato mangler";
                const blockReasons = item.blockReasons ?? [];

                return (
                  <article
                    key={`${item.draftItemId ?? "preview"}-${index}`}
                    className={`rounded-2xl border p-4 text-sm ${
                      item.canBecomeShift
                        ? "border-green-200 bg-green-50 text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100"
                        : "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"
                    }`}
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold dark:bg-gray-950/60">
                            {item.canBecomeShift ? "Kan blive vagt" : "Blokeret"}
                          </span>
                          <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold dark:bg-gray-950/60">
                            {itemDate}
                          </span>
                        </div>
                        <p className="mt-3 font-semibold">
                          {formatMinute(item.plannedStartMinute) &&
                          formatMinute(item.plannedEndMinute)
                            ? `kl. ${formatMinute(item.plannedStartMinute)} - ${formatMinute(item.plannedEndMinute)}`
                            : "Tid mangler"}
                        </p>
                        <p className="mt-1 opacity-85">
                          {item.jobFunctionColor && (
                            <span
                              className="mr-2 inline-block h-2.5 w-2.5 rounded-full"
                              style={{ backgroundColor: item.jobFunctionColor }}
                            />
                          )}
                          {item.jobFunctionName || "Jobfunktion mangler"}
                        </p>
                      </div>
                      <div className="lg:text-right">
                        <p className="font-semibold">
                          {item.userName || "Ikke tildelt"}
                        </p>
                        <p className="mt-1 text-xs opacity-75">
                          Kladdepost #{item.draftItemId ?? "?"}
                        </p>
                      </div>
                    </div>

                    {blockReasons.length > 0 && (
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-xs opacity-90">
                        {blockReasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    )}

                    {item.warningMessage && (
                      <p className="mt-3 text-xs font-semibold">
                        Advarsel: {item.warningMessage}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {previewItems.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
              Previewet har ingen poster. Kladden kan ikke senere publiceres,
              før den har poster.
            </div>
          )}

          {hiddenPreviewItemCount > 0 && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              {hiddenPreviewItemCount} flere preview-poster er skjult i denne
              kompakte visning.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
