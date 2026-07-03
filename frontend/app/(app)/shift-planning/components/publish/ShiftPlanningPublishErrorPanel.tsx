type ShiftPlanningPublishErrorPanelProps = {
  message: string;
};

export function ShiftPlanningPublishErrorPanel({
  message,
}: ShiftPlanningPublishErrorPanelProps) {
  const normalizedMessage = message.toLowerCase();
  const looksLikeDuplicateOrPublished =
    normalizedMessage.includes("allerede") ||
    normalizedMessage.includes("oprettet") ||
    normalizedMessage.includes("dublet") ||
    normalizedMessage.includes("duplicate") ||
    normalizedMessage.includes("published");

  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
      <p className="font-semibold">Oprettelse blev stoppet</p>
      <p className="mt-1">{message}</p>
      <p className="mt-2 text-xs text-red-800">
        {looksLikeDuplicateOrPublished
          ? "Forslaget kan være oprettet i en anden fane eller tidligere handling. Genindlæs de gemte forslag, og kontrollér vagtplanen før du prøver igen."
          : "Tjek kontrol, oprettelsesoverblik, arbejdstype og tekstbekræftelse, før du prøver igen."}
      </p>
    </div>
  );
}
