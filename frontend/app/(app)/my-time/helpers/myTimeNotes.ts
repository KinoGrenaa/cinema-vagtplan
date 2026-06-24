import type { TimeEntry, TimeEntryRevision } from "./myTimeTypes";

export function getRevisionActionLabel(action: string) {
  switch (action) {
    case "CREATED":
      return "Oprettet";

    case "UPDATED":
      return "Rettet";

    case "APPROVED":
      return "Godkendt";

    case "NEEDS_CHANGES":
      return "Sendt retur til rettelse";

    case "VOIDED":
      return "Afvist/annulleret";

    case "REOPENED":
      return "Genåbnet";

    case "UNAPPROVED":
      return "Godkendelse fjernet";

    default:
      return action;
  }
}

export function getRevisionActorLabel(action: string) {
  switch (action) {
    case "CREATED":
      return "Oprettet af";

    case "UPDATED":
      return "Rettet af";

    case "APPROVED":
      return "Godkendt af";

    case "NEEDS_CHANGES":
      return "Sendt retur af";

    case "VOIDED":
      return "Afvist/annulleret af";

    case "REOPENED":
      return "Genåbnet af";

    case "UNAPPROVED":
      return "Godkendelse fjernet af";

    default:
      return "Udført af";
  }
}

export function shouldShowCreatedNoteAsSingleNote(item: TimeEntryRevision) {
  if (item.action !== "CREATED") return false;

  const clockInNote = item.newClockInNote?.trim() || "";
  const clockOutNote = item.newClockOutNote?.trim() || "";

  return clockInNote.length > 0 && clockInNote === clockOutNote;
}

export function shouldShowEntryNoteAsSingleNote(entry: TimeEntry) {
  const clockInNote = entry.clockInNote?.trim() || "";
  const clockOutNote = entry.clockOutNote?.trim() || "";

  return !entry.shift && clockInNote.length > 0 && clockInNote === clockOutNote;
}

export function getEntrySingleNote(entry: TimeEntry) {
  return (
    entry.note?.trim() ||
    entry.clockInNote?.trim() ||
    entry.clockOutNote?.trim() ||
    ""
  );
}
