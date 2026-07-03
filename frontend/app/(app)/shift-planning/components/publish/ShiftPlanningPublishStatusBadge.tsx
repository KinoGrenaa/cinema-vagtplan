type ShiftPlanningPublishStatusBadgeProps = {
  publicationPreviewCanPublishLater: boolean;
  selectedDraftCanBePublished: boolean;
  selectedDraftIsPublished: boolean;
};

export function ShiftPlanningPublishStatusBadge({
  publicationPreviewCanPublishLater,
  selectedDraftCanBePublished,
  selectedDraftIsPublished,
}: ShiftPlanningPublishStatusBadgeProps) {
  const label = selectedDraftIsPublished
    ? "Oprettet"
    : selectedDraftCanBePublished && publicationPreviewCanPublishLater
      ? "Kan bekræftes"
      : "Blokeret";

  const statusClassName = selectedDraftIsPublished
    ? "bg-green-100 text-green-950 dark:bg-green-900/60 dark:text-green-100"
    : selectedDraftCanBePublished && publicationPreviewCanPublishLater
      ? "bg-amber-100 text-amber-950 dark:bg-amber-900/60 dark:text-amber-100"
      : "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300";

  return (
    <span
      className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${statusClassName}`}
    >
      {label}
    </span>
  );
}
