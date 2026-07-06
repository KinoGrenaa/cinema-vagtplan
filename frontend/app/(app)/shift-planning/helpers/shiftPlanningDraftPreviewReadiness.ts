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
      title: "Forhåndsvisningen hentes",
      description:
        "Vent til månedens skabeloner er hentet, før du gemmer en forhåndsvisning.",
      nextStep: "Tjek listen igen, når indlæsningen er færdig.",
      variant: "loading",
    };
  }

  if (!activeCinemaId) {
    return {
      canPrepareDraft: false,
      title: "Vælg aktiv biograf først",
      description:
        "Forhåndsvisningen kan først gemmes, når MASTER har valgt en aktiv biograf.",
      nextStep: "Vælg biograf i toppen eller via MASTER-panelet.",
      variant: "blocked",
    };
  }

  if (rowCount === 0) {
    return {
      canPrepareDraft: false,
      title: "Ingen datoer er klar til forhåndsvisning",
      description:
        "Der er ingen aktive datoer med vagtsskabelon i måneden endnu.",
      nextStep:
        "Vælg datoer i kalenderen nedenfor, læg vagtsskabeloner på dem, og gem derefter forhåndsvisningen.",
      variant: "blocked",
    };
  }

  if (missingTemplateDayCount > 0) {
    return {
      canPrepareDraft: true,
      title: "Kan gemmes, men kræver kontrol",
      description:
        "Mindst én dato bruger en skabelon uden opsætning for den ugedag.",
      nextStep:
        "Ret de markerede datoer eller gem forhåndsvisningen og kør kontrol, før vagter oprettes.",
      variant: "warning",
    };
  }

  if (warningCount > 0 || emptyDraftShiftCount > 0) {
    return {
      canPrepareDraft: true,
      title: "Kan gemmes med opmærksomhedspunkter",
      description:
        "Forhåndsvisningen indeholder ugeadvarsler eller vagter uden standardmedarbejder.",
      nextStep:
        "Gem forhåndsvisningen, åbn kontrollen og gennemgå oprettelsesoverblikket, før vagter oprettes.",
      variant: "warning",
    };
  }

  return {
    canPrepareDraft: true,
    title: "Klar til forhåndsvisning",
    description:
      "Måneden har aktive datoer med vagtsskabeloner og ingen kendte opmærksomhedspunkter i denne oversigt.",
    nextStep:
      "Gem forhåndsvisningen, gennemgå kontrollen og opret først derefter de rigtige vagter.",
    variant: "ready",
  };
}

export function getDraftPreviewPrepareButtonLabel(
  state: DraftPreviewPrepareState,
  savingDraft: boolean,
) {
  if (savingDraft) {
    return "Gemmer forhåndsvisning...";
  }

  if (!state.canPrepareDraft) {
    return "Gem forhåndsvisning";
  }

  return state.variant === "warning"
    ? "Gem og kontrollér"
    : "Gem forhåndsvisning";
}
