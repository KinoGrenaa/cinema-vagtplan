type ShiftPlanningDraftPublicationReadinessPanelProps = {
  backendValidationIsGreen: boolean;
  hasValidationError: boolean;
  hasValidationResult: boolean;
  isReadyForPublication: boolean;
};

function getReadinessPanelClasses({
  backendValidationIsGreen,
  isReadyForPublication,
}: Pick<
  ShiftPlanningDraftPublicationReadinessPanelProps,
  "backendValidationIsGreen" | "isReadyForPublication"
>) {
  if (isReadyForPublication) {
    return "border-green-200 bg-green-50 text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100";
  }

  if (backendValidationIsGreen) {
    return "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100";
  }

  return "border-gray-200 bg-white text-gray-800 dark:border-gray-800 dark:bg-gray-950/70 dark:text-gray-200";
}

function getReadinessTitle({
  backendValidationIsGreen,
  hasValidationError,
  hasValidationResult,
  isReadyForPublication,
}: ShiftPlanningDraftPublicationReadinessPanelProps) {
  if (isReadyForPublication) {
    return "Klar til publicering";
  }

  if (backendValidationIsGreen) {
    return "Backend-kontrol er grøn — gennemgå lokale kontroladvarsler";
  }

  if (hasValidationResult) {
    return "Ikke klar til publicering";
  }

  if (hasValidationError) {
    return "Ikke klar — backend-kontrol fejlede";
  }

  return "Ikke klar — kør backend-kontrol først";
}

function getReadinessDescription({
  backendValidationIsGreen,
  hasValidationError,
  hasValidationResult,
  isReadyForPublication,
}: ShiftPlanningDraftPublicationReadinessPanelProps) {
  if (isReadyForPublication) {
    return "Planlægningsplanlægningskladden har grøn backend-kontrol og ingen synlige lokale kontroladvarsler. Publicering er stadig låst bag publiceringspreview, arbejdstype og præcis bekræftelse.";
  }

  if (backendValidationIsGreen) {
    return "Backend-kontrollen fandt ingen fejl eller advarsler, men planlægningsplanlægningskladden har lokale kontrolpunkter. Gennemgå dem før du henter publiceringspreview og publicerer.";
  }

  if (hasValidationResult) {
    return "Backend-kontrollen skal være grøn, før planlægningsplanlægningskladden kan vises som klar til publiceringspreview og publicering.";
  }

  if (hasValidationError) {
    return "Ret fejlen eller prøv valideringen igen. Planlægningskladden kan ikke markeres klar til publiceringspreview eller publicering uden en grøn backend-kontrol.";
  }

  return "Klik på “Kør backend-kontrol”. En kladde kan først vises som klar til publiceringspreview og publicering, når backend-kontrollen er kørt og er grøn.";
}

function getReadinessBadgeClasses({
  backendValidationIsGreen,
  isReadyForPublication,
}: Pick<
  ShiftPlanningDraftPublicationReadinessPanelProps,
  "backendValidationIsGreen" | "isReadyForPublication"
>) {
  if (isReadyForPublication) {
    return "bg-green-100 text-green-950 dark:bg-green-900/60 dark:text-green-100";
  }

  if (backendValidationIsGreen) {
    return "bg-amber-100 text-amber-950 dark:bg-amber-900/60 dark:text-amber-100";
  }

  return "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300";
}

function getReadinessBadgeLabel({
  backendValidationIsGreen,
  isReadyForPublication,
}: Pick<
  ShiftPlanningDraftPublicationReadinessPanelProps,
  "backendValidationIsGreen" | "isReadyForPublication"
>) {
  if (isReadyForPublication) {
    return "Klar";
  }

  if (backendValidationIsGreen) {
    return "Kontrol";
  }

  return "Blokeret";
}

export function ShiftPlanningDraftPublicationReadinessPanel(
  props: ShiftPlanningDraftPublicationReadinessPanelProps,
) {
  return (
    <div
      className={`mt-4 rounded-2xl border p-4 text-sm ${getReadinessPanelClasses(
        props,
      )}`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
            Publiceringsklarhed
          </p>
          <p className="mt-2 text-base font-bold">{getReadinessTitle(props)}</p>
          <p className="mt-1 opacity-85">{getReadinessDescription(props)}</p>
        </div>
        <span
          className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-bold ${getReadinessBadgeClasses(
            props,
          )}`}
        >
          {getReadinessBadgeLabel(props)}
        </span>
      </div>
    </div>
  );
}
