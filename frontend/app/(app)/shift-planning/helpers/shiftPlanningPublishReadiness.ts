export type ShiftPlanningPublishReadinessStep = {
  id: string;
  complete: boolean;
  description: string;
  label: string;
  nextAction: string | null;
};

export type ShiftPlanningPublishReadiness = {
  allRequirementsMet: boolean;
  missingRequirements: string[];
  nextAction: string | null;
  statusLabel: string;
  steps: ShiftPlanningPublishReadinessStep[];
};

type GetShiftPlanningPublishReadinessOptions = {
  canSubmitPublish: boolean;
  publicationPreviewCanPublishLater: boolean;
  selectedDraftCanBePublished: boolean;
};

export function getShiftPlanningPublishReadiness({
  canSubmitPublish,
  publicationPreviewCanPublishLater,
  selectedDraftCanBePublished,
}: GetShiftPlanningPublishReadinessOptions): ShiftPlanningPublishReadiness {
  const steps: ShiftPlanningPublishReadinessStep[] = [
    {
      id: "draft-open",
      complete: selectedDraftCanBePublished,
      label: "Forslag er åbent",
      description: "Forslaget må ikke allerede være oprettet eller erstattet.",
      nextAction: selectedDraftCanBePublished
        ? null
        : "Vælg et åbent forslag, eller opret en ny forhåndsvisning.",
    },
    {
      id: "publication-preview",
      complete: publicationPreviewCanPublishLater,
      label: "Vagter er tjekket",
      description: "Kontrollen og visningen af vagter skal være grøn.",
      nextAction: publicationPreviewCanPublishLater
        ? null
        : "Kør “Kontrollér og se vagter”, og ret eventuelle blokerende punkter.",
    },
  ];

  const missingRequirements = steps
    .filter((step) => !step.complete)
    .map((step) => step.nextAction ?? step.description);

  const nextAction = missingRequirements[0] ?? null;
  const allRequirementsMet = canSubmitPublish;

  return {
    allRequirementsMet,
    missingRequirements,
    nextAction,
    statusLabel: allRequirementsMet ? "Klar" : "Mangler punkter",
    steps,
  };
}
