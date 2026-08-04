import type {
  DraftPublicationPreviewItem,
  DraftValidationIssue,
} from "./shiftPlanningDraftTypes";

export type ShiftPlanningIssueActionHint = {
  href?: string;
  linkLabel?: string;
  text: string;
};

const PAYROLL_TYPE_ACTION_HINT: ShiftPlanningIssueActionHint = {
  href: "/job-functions",
  linkLabel: "Åbn Jobfunktioner",
  text: "Ret jobfunktionen under Jobfunktioner og vælg en standardeksportkode, hvis timerne skal grupperes i løneksporten.",
};

const JOB_FUNCTION_ACTION_HINT: ShiftPlanningIssueActionHint = {
  text: "Ret forslaget, så vagten har en aktiv jobfunktion, og kontrollér igen.",
};

const TIME_RULE_ACTION_HINT: ShiftPlanningIssueActionHint = {
  href: "/job-functions",
  linkLabel: "Åbn Jobfunktioner",
  text: "Ret tidsreglen på jobfunktionen eller fallback-tiderne, så mødetid og fyraften kan beregnes.",
};

const TEMPLATE_ACTION_HINT: ShiftPlanningIssueActionHint = {
  href: "/schedule-templates",
  linkLabel: "Åbn Vagtskabeloner",
  text: "Vælg en vagtskabelon for dagen, og kontrollér forslaget igen.",
};

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
      "eksportkode",
      "loentype",
      "payroll",
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

function getActionHintKey(hint: ShiftPlanningIssueActionHint) {
  return [hint.text, hint.href ?? "", hint.linkLabel ?? ""].join("|");
}

function collectUniqueActionHints(
  hints: Array<ShiftPlanningIssueActionHint | null>,
  limit = 4,
) {
  const uniqueHints: ShiftPlanningIssueActionHint[] = [];
  const seenHintKeys = new Set<string>();

  for (const hint of hints) {
    if (!hint) {
      continue;
    }

    const hintKey = getActionHintKey(hint);
    if (seenHintKeys.has(hintKey)) {
      continue;
    }

    uniqueHints.push(hint);
    seenHintKeys.add(hintKey);

    if (uniqueHints.length >= limit) {
      break;
    }
  }

  return uniqueHints;
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

export function getDraftValidationIssueActionHints(
  issues: DraftValidationIssue[],
  limit = 4,
) {
  return collectUniqueActionHints(
    issues.map((issue) => getDraftValidationIssueActionHint(issue)),
    limit,
  );
}

export function getPublicationPreviewItemActionHint(
  item: DraftPublicationPreviewItem,
) {
  return getActionHintFromSearchText(
    [
      item.jobFunctionName,
      item.jobFunctionName,
      item.warningMessage,
      ...(item.blockReasons ?? []),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

export function getPublicationPreviewActionHints(
  items: DraftPublicationPreviewItem[],
  blockingReasons: string[] = [],
  limit = 4,
) {
  return collectUniqueActionHints(
    [
      ...blockingReasons.map((reason) => getActionHintFromSearchText(reason)),
      ...items.map((item) => getPublicationPreviewItemActionHint(item)),
    ],
    limit,
  );
}
