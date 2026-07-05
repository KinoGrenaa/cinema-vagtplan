import type {
  DraftPublicationPreviewItem,
  DraftValidationIssue,
} from "./shiftPlanningDraftTypes";

const PAYROLL_TYPE_ACTION_HINT =
  "Ret jobfunktionen under Jobfunktioner: vælg “Oprettes som”, så vagten kan få korrekt løntype.";

const JOB_FUNCTION_ACTION_HINT =
  "Ret forslaget, så vagten har en aktiv jobfunktion, og kontrollér igen.";

const TIME_RULE_ACTION_HINT =
  "Ret tidsreglen på jobfunktionen eller fallback-tiderne, så mødetid og fyraften kan beregnes.";

const TEMPLATE_ACTION_HINT =
  "Vælg en vagtskabelon for dagen, og kontrollér forslaget igen.";

function normalizeSearchText(value: unknown) {
  return String(value ?? "").toLowerCase();
}

function detailsToSearchText(details: unknown) {
  if (details == null) {
    return "";
  }

  if (typeof details === "string") {
    return details;
  }

  try {
    return JSON.stringify(details);
  } catch {
    return "";
  }
}

function includesAny(searchText: string, terms: string[]) {
  return terms.some((term) => searchText.includes(term));
}

function getActionHintFromSearchText(searchText: string) {
  const normalizedText = normalizeSearchText(searchText);

  if (
    includesAny(normalizedText, [
      "løntype",
      "loentype",
      "payroll",
      "oprettes som",
      "worktype",
      "work type",
    ])
  ) {
    return PAYROLL_TYPE_ACTION_HINT;
  }

  if (
    includesAny(normalizedText, [
      "jobfunktion mangler",
      "mangler jobfunktion",
      "job function missing",
      "missing job function",
    ])
  ) {
    return JOB_FUNCTION_ACTION_HINT;
  }

  if (
    includesAny(normalizedText, [
      "tidsregel",
      "mangler tid",
      "mødetid",
      "fyraften",
      "fallback",
      "plannedstartminute",
      "plannedendminute",
    ])
  ) {
    return TIME_RULE_ACTION_HINT;
  }

  if (
    includesAny(normalizedText, [
      "vagtskabelon",
      "skabelon mangler",
      "mangler skabelon",
      "template missing",
      "missing template",
    ])
  ) {
    return TEMPLATE_ACTION_HINT;
  }

  return null;
}

export function getDraftValidationIssueActionHint(
  issue: DraftValidationIssue,
) {
  return getActionHintFromSearchText(
    [
      issue.code,
      issue.message,
      issue.jobFunctionName,
      detailsToSearchText(issue.details),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

export function getPublicationPreviewItemActionHint(
  item: DraftPublicationPreviewItem,
) {
  return getActionHintFromSearchText(
    [
      item.jobFunctionName,
      item.workTypeName,
      item.warningMessage,
      ...(item.blockReasons ?? []),
    ]
      .filter(Boolean)
      .join(" "),
  );
}
