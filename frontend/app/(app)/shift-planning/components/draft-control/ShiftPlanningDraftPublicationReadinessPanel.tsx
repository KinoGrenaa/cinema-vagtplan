type ShiftPlanningDraftPublicationReadinessPanelProps = {
  controlValidationIsGreen: boolean;
  hasValidationError: boolean;
  hasValidationResult: boolean;
  isReadyForPublication: boolean;
};

function getReadinessPanelClasses({
  controlValidationIsGreen,
  isReadyForPublication,
}: Pick<
  ShiftPlanningDraftPublicationReadinessPanelProps,
  "controlValidationIsGreen" | "isReadyForPublication"
>) {
  if (isReadyForPublication) {
    return "border-green-200 bg-green-50 text-green-950 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-100";
  }

  if (controlValidationIsGreen) {
    return "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100";
  }

  return "border-gray-200 bg-white text-gray-800 dark:border-gray-800 dark:bg-gray-950/70 dark:text-gray-200";
}

function getReadinessTitle({
  controlValidationIsGreen,
  hasValidationError,
  hasValidationResult,
  isReadyForPublication,
}: ShiftPlanningDraftPublicationReadinessPanelProps) {
  if (isReadyForPublication) {
    return "Klar til oprettelse";
  }

  if (controlValidationIsGreen) {
    return "Kontrol er grøn — gennemgå lokale advarsler";
  }

  if (hasValidationResult) {
    return "Ikke klar til oprettelse";
  }

  if (hasValidationError) {
    return "Ikke klar — kontrollen fejlede";
  }

  return "Ikke klar — kontrollér først";
}

function getReadinessDescription({
  controlValidationIsGreen,
  hasValidationError,
  hasValidationResult,
  isReadyForPublication,
}: ShiftPlanningDraftPublicationReadinessPanelProps) {
  if (isReadyForPublication) {
    return "Forslaget er kontrolleret, og der er ingen synlige advarsler. Gennemgå oprettelsesoverblikket, vælg arbejdstype og bekræft, før vagterne oprettes.";
  }

  if (controlValidationIsGreen) {
    return "Kontrollen fandt ingen fejl, men der er stadig lokale advarsler. Gennemgå dem, før du går videre til oprettelse.";
  }

  if (hasValidationResult) {
    return "Kontrollen skal være grøn, før forslaget kan vises som klar til oprettelse.";
  }

  if (hasValidationError) {
    return "Ret fejlen eller prøv kontrollen igen. Forslaget kan ikke markeres klar, før kontrollen er grøn.";
  }

  return "Klik på “Kontrollér”. Forslaget kan først markeres klar til oprettelse, når kontrollen er gennemført og er grøn.";
}

function getReadinessBadgeClasses({
  controlValidationIsGreen,
  isReadyForPublication,
}: Pick<
  ShiftPlanningDraftPublicationReadinessPanelProps,
  "controlValidationIsGreen" | "isReadyForPublication"
>) {
  if (isReadyForPublication) {
    return "bg-green-100 text-green-950 dark:bg-green-900/60 dark:text-green-100";
  }

  if (controlValidationIsGreen) {
    return "bg-amber-100 text-amber-950 dark:bg-amber-900/60 dark:text-amber-100";
  }

  return "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300";
}

function getReadinessBadgeLabel({
  controlValidationIsGreen,
  isReadyForPublication,
}: Pick<
  ShiftPlanningDraftPublicationReadinessPanelProps,
  "controlValidationIsGreen" | "isReadyForPublication"
>) {
  if (isReadyForPublication) {
    return "Klar";
  }

  if (controlValidationIsGreen) {
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
            Status før oprettelse
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
