export type PreparedDraftStatusTone = "attention" | "ready";

export type PreparedDraftStatus = {
  badgeText: string;
  description: string;
  nextStep: string;
  title: string;
  tone: PreparedDraftStatusTone;
};

type PreparedDraftStatusInput = {
  id: number | string;
  itemCount?: number | null;
  unassignedItemCount?: number | null;
  warningItemCount?: number | null;
};

export function toPreparedDraftNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getAttentionText(unassignedCount: number, warningCount: number) {
  const parts: string[] = [];

  if (unassignedCount > 0) {
    parts.push(`${unassignedCount} uden standardmedarbejder`);
  }

  if (warningCount > 0) {
    parts.push(`${warningCount} med kontroladvarsel`);
  }

  return parts.join(" og ");
}

export function getPreparedDraftStatus(
  draft: PreparedDraftStatusInput,
): PreparedDraftStatus {
  const itemCount = toPreparedDraftNumber(draft.itemCount);
  const unassignedCount = toPreparedDraftNumber(draft.unassignedItemCount);
  const warningCount = toPreparedDraftNumber(draft.warningItemCount);
  const attentionText = getAttentionText(unassignedCount, warningCount);

  if (attentionText) {
    return {
      badgeText: "Kræver kontrol",
      title: `Forhåndsvisning #${draft.id} er gemt`,
      description: `${itemCount} vagter er gemt i forhåndsvisningen, men ${attentionText}. Der er stadig ikke oprettet aktive vagter.`,
      nextStep:
        "Åbn den gemte forhåndsvisning fra listen, kør kontrol og gennemgå oprettelsesoverblikket, før vagter oprettes.",
      tone: "attention",
    };
  }

  return {
    badgeText: "Klar til kontrol",
    title: `Forhåndsvisning #${draft.id} er gemt`,
    description: `${itemCount} vagter er gemt i forhåndsvisningen uden kendte opmærksomhedspunkter i denne oversigt. Der er stadig ikke oprettet aktive vagter.`,
    nextStep:
      "Åbn den gemte forhåndsvisning fra listen, kør den endelige kontrol og opret derefter vagterne.",
    tone: "ready",
  };
}

export function getPreparedDraftSuccessDescription(
  draft: PreparedDraftStatusInput,
) {
  const status = getPreparedDraftStatus(draft);

  return `${status.description}\n${status.nextStep}`;
}
