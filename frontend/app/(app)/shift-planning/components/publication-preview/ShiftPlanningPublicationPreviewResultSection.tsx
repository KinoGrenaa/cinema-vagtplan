import { toNumber } from "../../helpers/shiftPlanningDraftHelpers";
import type {
  DraftPublicationPreviewItem,
  DraftPublicationPreviewResult,
} from "../../helpers/shiftPlanningDraftTypes";
import { ShiftPlanningPublicationPreviewItemCard } from "./ShiftPlanningPublicationPreviewItemCard";
import { ShiftPlanningPublicationPreviewMetricCard } from "./ShiftPlanningPublicationPreviewMetricCard";

const MAX_VISIBLE_PUBLICATION_PREVIEW_ITEMS = 12;

function getPublicationPreviewItemDisplayRank(
  item: DraftPublicationPreviewItem,
) {
  if (!item.canBecomeShift || (item.blockReasons?.length ?? 0) > 0) {
    return 0;
  }

  if (item.warningMessage) {
    return 1;
  }

  return 2;
}

function compareOptionalText(first: unknown, second: unknown) {
  const firstText = first == null ? "" : String(first);
  const secondText = second == null ? "" : String(second);

  return firstText.localeCompare(secondText, "da-DK", {
    numeric: true,
    sensitivity: "base",
  });
}

function compareOptionalNumber(first: unknown, second: unknown) {
  const firstNumber = Number(first);
  const secondNumber = Number(second);
  const normalizedFirst = Number.isFinite(firstNumber)
    ? firstNumber
    : Number.MAX_SAFE_INTEGER;
  const normalizedSecond = Number.isFinite(secondNumber)
    ? secondNumber
    : Number.MAX_SAFE_INTEGER;

  return normalizedFirst - normalizedSecond;
}

function sortPublicationPreviewItemsForDisplay(
  items: DraftPublicationPreviewItem[],
) {
  return [...items].sort((firstItem, secondItem) => {
    const rankDifference =
      getPublicationPreviewItemDisplayRank(firstItem) -
      getPublicationPreviewItemDisplayRank(secondItem);

    if (rankDifference !== 0) {
      return rankDifference;
    }

    const dateDifference = compareOptionalText(
      firstItem.dateKey,
      secondItem.dateKey,
    );

    if (dateDifference !== 0) {
      return dateDifference;
    }

    const startDifference = compareOptionalNumber(
      firstItem.plannedStartMinute,
      secondItem.plannedStartMinute,
    );

    if (startDifference !== 0) {
      return startDifference;
    }

    return compareOptionalText(
      firstItem.draftItemId,
      secondItem.draftItemId,
    );
  });
}

type ShiftPlanningPublicationPreviewResultSectionProps = {
  canPublishLater: boolean;
  result: DraftPublicationPreviewResult;
};

export function ShiftPlanningPublicationPreviewResultSection({
  canPublishLater,
  result,
}: ShiftPlanningPublicationPreviewResultSectionProps) {
  const previewSummary = result.summary;
  const previewItems = sortPublicationPreviewItemsForDisplay(
    result.previewItems ?? [],
  );
  const visiblePreviewItems = previewItems.slice(
    0,
    MAX_VISIBLE_PUBLICATION_PREVIEW_ITEMS,
  );
  const hiddenPreviewItemCount = Math.max(
    0,
    previewItems.length - visiblePreviewItems.length,
  );
  const blockingReasons = result.blockingReasons ?? [];

  return (
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
            ? "Vagterne kan oprettes"
            : "Der er noget, der skal rettes"}
        </div>
        <div className="mt-1 text-xs opacity-80">
          Dette overblik opretter ikke vagter. Vagterne oprettes først i sidste
          trin.
        </div>
      </div>

      {previewSummary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ShiftPlanningPublicationPreviewMetricCard
            label="Vagter"
            value={toNumber(previewSummary.itemCount)}
          />
          <ShiftPlanningPublicationPreviewMetricCard
            label="Kan oprettes"
            value={toNumber(previewSummary.publishableItemCount)}
            variant="success"
          />
          <ShiftPlanningPublicationPreviewMetricCard
            label="Blokeret"
            value={toNumber(previewSummary.blockedItemCount)}
            variant="warning"
          />
          <ShiftPlanningPublicationPreviewMetricCard
            label="Fejl fra kontrol"
            value={toNumber(previewSummary.validationErrorCount)}
            variant="warning"
          />
          <ShiftPlanningPublicationPreviewMetricCard
            label="Advarsler fra kontrol"
            value={toNumber(previewSummary.validationWarningCount)}
            variant="warning"
          />
          <ShiftPlanningPublicationPreviewMetricCard
            label="Kontrolpunkter"
            value={toNumber(previewSummary.validationIssueCount)}
            variant="warning"
          />
        </div>
      )}

      {blockingReasons.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100">
          <div className="font-semibold">Det blokerer oprettelse</div>
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
            Vagter i overblikket
          </div>
          {visiblePreviewItems.map((item, index) => (
            <ShiftPlanningPublicationPreviewItemCard
              key={`${item.draftItemId ?? index}-${item.dateKey ?? "no-date"}`}
              index={index}
              item={item}
            />
          ))}
        </div>
      )}

      {previewItems.length === 0 && (
        <div className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-800 dark:border-blue-900/70 dark:bg-gray-950/70 dark:text-blue-100">
          Overblikket har ingen vagter endnu.
        </div>
      )}

      {hiddenPreviewItemCount > 0 && (
        <div className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-800 dark:border-blue-900/70 dark:bg-gray-950/70 dark:text-blue-100">
          {hiddenPreviewItemCount} flere vagter er skjult i denne kompakte
          visning. Blokerede vagter og advarsler vises først.
        </div>
      )}
    </div>
  );
}
