export type DraftPreviewPrepareStateVariant =
  | "ready"
  | "warning"
  | "blocked"
  | "loading";

export type DraftPreviewPrepareState = {
  canPrepareDraft: boolean;
  description: string;
  nextStep: string;
  title: string;
  variant: DraftPreviewPrepareStateVariant;
};

type DraftPreviewPrepareStateInput = {
  activeCinemaId: number | null;
  emptyDraftShiftCount: number;
  loading: boolean;
  missingTemplateDayCount: number;
  rowCount: number;
  warningCount: number;
};

export function getDraftPreviewPrepareState({
  activeCinemaId,
  emptyDraftShiftCount,
  loading,
  missingTemplateDayCount,
  rowCount,
  warningCount,
}: DraftPreviewPrepareStateInput): DraftPreviewPrepareState {
  if (loading) {
    return {
      canPrepareDraft: false,
      title: "Planlægningsgrundlaget hentes",
      description:
        "Vent til månedens skabeloner er hentet, før du beregner vagtforslaget.",
      nextStep: "Tjek listen igen, når indlæsningen er færdig.",
      variant: "loading",
    };
  }

  if (!activeCinemaId) {
    return {
      canPrepareDraft: false,
      title: "Vælg aktiv biograf først",
      description:
        "Vagtforslaget kan først beregnes, når MASTER har valgt en aktiv biograf.",
      nextStep: "Vælg biograf i toppen eller via MASTER-panelet.",
      variant: "blocked",
    };
  }

  if (rowCount === 0) {
    return {
      canPrepareDraft: false,
      title: "Ingen datoer er klar til beregning",
      description:
        "Der er ingen aktive datoer med vagtsskabelon i måneden endnu.",
      nextStep:
        "Vælg datoer i kalenderen, læg vagtsskabeloner på dem, og beregn derefter vagtforslaget.",
      variant: "blocked",
    };
  }

  if (missingTemplateDayCount > 0) {
    return {
      canPrepareDraft: true,
      title: "Kan beregnes, men kræver kontrol",
      description:
        "Mindst én dato bruger en skabelon uden opsætning for den ugedag.",
      nextStep:
        "Ret de markerede datoer eller beregn vagtforslaget og kør kontrol, før vagter oprettes.",
      variant: "warning",
    };
  }

  if (warningCount > 0 || emptyDraftShiftCount > 0) {
    return {
      canPrepareDraft: true,
      title: "Kan beregnes med opmærksomhedspunkter",
      description:
        "Vagtforslaget vil indeholde ugeadvarsler eller vagter uden fast medarbejder.",
      nextStep:
        "Beregn vagtforslaget, åbn kladden og gennemgå kontrollen, før vagter oprettes.",
      variant: "warning",
    };
  }

  return {
    canPrepareDraft: true,
    title: "Klar til beregning",
    description:
      "Måneden har aktive datoer med vagtsskabeloner og ingen kendte opmærksomhedspunkter i denne oversigt.",
    nextStep:
      "Beregn vagtforslaget, gennemgå kontrollen og opret først derefter vagterne.",
    variant: "ready",
  };
}

export function getDraftPreviewPrepareButtonLabel(
  state: DraftPreviewPrepareState,
  savingDraft: boolean,
) {
  if (savingDraft) {
    return "Beregner vagtforslag...";
  }

  if (!state.canPrepareDraft) {
    return "Beregn vagtforslag";
  }

  return state.variant === "warning"
    ? "Beregn og gennemgå"
    : "Beregn vagtforslag";
}
