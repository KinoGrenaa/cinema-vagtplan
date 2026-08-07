import { toNumber } from "../../helpers/shiftPlanningDraftHelpers";
import {
  getPublicationPreviewActionHints,
} from "../../helpers/shiftPlanningIssueActionHints";
import type {
  DraftPublicationPreviewItem,
  DraftPublicationPreviewResult,
} from "../../helpers/shiftPlanningDraftTypes";
import { formatDateKey } from "../../helpers/shiftPlanningHelpers";

import { ShiftPlanningIssueActionSummary } from "../shared/ShiftPlanningIssueActionSummary";
import { ShiftPlanningPublicationPreviewItemCard } from "./ShiftPlanningPublicationPreviewItemCard";
import { ShiftPlanningPublicationPreviewMetricCard } from "./ShiftPlanningPublicationPreviewMetricCard";

const MAX_VISIBLE_PUBLISHABLE_ITEMS = 12;

type BlockedItemGroupKey = "past" | "existing" | "other";

type BlockedItemGroup = {
  key: BlockedItemGroupKey;
  label: string;
  description: string;
  items: DraftPublicationPreviewItem[];
};

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

function isBlockedItem(item: DraftPublicationPreviewItem) {
  return !item.canBecomeShift || (item.blockReasons?.length ?? 0) > 0;
}

function getBlockedItemGroupKey(
  item: DraftPublicationPreviewItem,
): BlockedItemGroupKey {
  const normalizedReasons = (item.blockReasons ?? [])
    .join(" ")
    .toLowerCase();

  if (normalizedReasons.includes("datoen er overstået")) {
    return "past";
  }

  if (
    normalizedReasons.includes("samme jobfunktion og tidspunkt i vagtplanen")
  ) {
    return "existing";
  }

  return "other";
}

function buildBlockedItemGroups(
  blockedItems: DraftPublicationPreviewItem[],
): BlockedItemGroup[] {
  const definitions: Array<Omit<BlockedItemGroup, "items">> = [
    {
      key: "past",
      label: "Overståede datoer",
      description:
        "Disse vagter ligger på datoer, der er passeret, og kan derfor ikke oprettes fra kladden.",
    },
    {
      key: "existing",
      label: "Allerede i vagtplanen",
      description:
        "Der findes allerede vagter med samme jobfunktion og tidspunkt.",
    },
    {
      key: "other",
      label: "Andre blokeringer",
      description:
        "Disse vagter kræver en anden rettelse, før de kan oprettes.",
    },
  ];

  return definitions
    .map((definition) => ({
      ...definition,
      items: blockedItems.filter(
        (item) => getBlockedItemGroupKey(item) === definition.key,
      ),
    }))
    .filter((group) => group.items.length > 0);
}

function groupItemsByDate(items: DraftPublicationPreviewItem[]) {
  const groups = new Map<string, DraftPublicationPreviewItem[]>();

  for (const item of items) {
    const dateKey = item.dateKey || "no-date";
    const currentItems = groups.get(dateKey) ?? [];
    currentItems.push(item);
    groups.set(dateKey, currentItems);
  }

  return Array.from(groups.entries()).map(([dateKey, dateItems]) => ({
    dateKey,
    label: dateKey === "no-date" ? "Dato mangler" : formatDateKey(dateKey),
    items: dateItems,
  }));
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
  const publishableItems = previewItems.filter((item) => !isBlockedItem(item));
  const blockedItems = previewItems.filter(isBlockedItem);
  const visiblePublishableItems = publishableItems.slice(
    0,
    MAX_VISIBLE_PUBLISHABLE_ITEMS,
  );
  const hiddenPublishableItems = publishableItems.slice(
    MAX_VISIBLE_PUBLISHABLE_ITEMS,
  );
  const blockedItemGroups = buildBlockedItemGroups(blockedItems);
  const blockingReasons = result.blockingReasons ?? [];
  const actionHints = getPublicationPreviewActionHints(
    previewItems,
    blockingReasons,
  );

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
      <ShiftPlanningIssueActionSummary
        hints={actionHints}
        intro="Ret de vigtigste punkter først, og kør overblikket igen bagefter."
      />
      {visiblePublishableItems.length > 0 && (
        <div className="space-y-2">
          <div>
            <div className="text-sm font-semibold text-blue-950 dark:text-blue-100">
              Vagter der kan oprettes
            </div>
            <p className="mt-1 text-xs text-blue-800 dark:text-blue-200/80">
              Disse vagter vises direkte, så du kan gennemgå dem før oprettelse.
            </p>
          </div>
          {visiblePublishableItems.map((item, index) => (
            <ShiftPlanningPublicationPreviewItemCard
              key={`${item.draftItemId ?? index}-${item.dateKey ?? "no-date"}`}
              item={item}
            />
          ))}
        </div>
      )}
      {hiddenPublishableItems.length > 0 && (
        <details className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-900 dark:border-blue-900/70 dark:bg-gray-950/70 dark:text-blue-100">
          <summary className="cursor-pointer font-semibold">
            Vis {hiddenPublishableItems.length} flere oprettelige vagter
          </summary>
          <div className="mt-3 space-y-2">
            {hiddenPublishableItems.map((item, index) => (
              <ShiftPlanningPublicationPreviewItemCard
                key={`hidden-${item.draftItemId ?? index}-${item.dateKey ?? "no-date"}`}
                item={item}
              />
            ))}
          </div>
        </details>
      )}
      {blockedItemGroups.length > 0 && (
        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold text-blue-950 dark:text-blue-100">
              Blokerede vagter
            </div>
            <p className="mt-1 text-xs text-blue-800 dark:text-blue-200/80">
              Detaljerne er foldet sammen, så overblikket forbliver kort. Åbn
              kun den gruppe, du vil undersøge.
            </p>
          </div>
          {blockedItemGroups.map((group) => {
            const dateGroups = groupItemsByDate(group.items);

            return (
              <details
                key={group.key}
                className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100"
              >
                <summary className="cursor-pointer font-semibold">
                  {group.label} · {group.items.length}{" "}
                  {group.items.length === 1 ? "vagt" : "vagter"} på{" "}
                  {dateGroups.length} {dateGroups.length === 1 ? "dato" : "datoer"}
                </summary>
                <p className="mt-2 text-xs opacity-80">{group.description}</p>
                <div className="mt-3 space-y-4">
                  {dateGroups.map((dateGroup) => (
                    <section key={`${group.key}-${dateGroup.dateKey}`}>
                      <h5 className="text-xs font-semibold uppercase tracking-wide opacity-80">
                        {dateGroup.label} · {dateGroup.items.length}{" "}
                        {dateGroup.items.length === 1 ? "vagt" : "vagter"}
                      </h5>
                      <div className="mt-2 space-y-2">
                        {dateGroup.items.map((item, index) => (
                          <ShiftPlanningPublicationPreviewItemCard
                            key={`${group.key}-${dateGroup.dateKey}-${item.draftItemId ?? index}`}
                            item={item}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      )}
      {previewItems.length === 0 && (
        <div className="rounded-xl border border-blue-200 bg-white px-3 py-2 text-sm text-blue-800 dark:border-blue-900/70 dark:bg-gray-950/70 dark:text-blue-100">
          Overblikket har ingen vagter endnu.
        </div>
      )}
    </div>
  );
}
