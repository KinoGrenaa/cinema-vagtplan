import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const entryCard = readFileSync(
  "app/(app)/time-approval/components/entry/TimeApprovalEntryCard.tsx",
  "utf8",
);
const entryActions = readFileSync(
  "app/(app)/time-approval/components/entry/TimeApprovalEntryActions.tsx",
  "utf8",
);
const userGroup = readFileSync(
  "app/(app)/time-approval/components/entry/TimeApprovalUserGroup.tsx",
  "utf8",
);

test("time approval viser registreringer som kompakte oversigtsrækker", () => {
  assert.match(entryCard, /getCompactTimeRange/);
  assert.match(entryCard, /getDurationLabel/);
  assert.match(entryCard, /Automatisk udfyldt/);
  assert.match(entryCard, />\s*Manuel\s*</);
  assert.match(entryCard, />\s*Afvigelse\s*</);
  assert.match(entryCard, />\s*Godkend\s*</);
  assert.match(entryCard, /\{isExpanded \? "Skjul" : "Vis"\}/);
});

test("tunge detaljer og sekundære handlinger vises først efter udfoldning", () => {
  assert.match(entryCard, /\{isExpanded && \(/);
  assert.match(entryCard, /<AutomaticTimeRegistrationNotice/);
  assert.match(entryCard, /<DeviationPanel entry=\{entry\}/);
  assert.match(entryCard, /<TimeApprovalEntryNotes entry=\{entry\}/);
  assert.match(entryCard, /<TimeApprovalEntryActions/);
  assert.doesNotMatch(entryActions, />\s*Godkend\s*</);
  assert.match(entryActions, />\s*Redigér\s*</);
  assert.match(entryActions, />\s*Historik\s*</);
  assert.match(entryActions, />\s*Send retur\s*</);
  assert.match(entryActions, />\s*Afvis registrering\s*</);
});

test("medarbejderens registreringer grupperes tydeligt efter københavnsk dato", () => {
  assert.match(userGroup, /function groupEntriesByDate/);
  assert.match(userGroup, /timeZone: "Europe\/Copenhagen"/);
  assert.match(userGroup, /dateGroups\.map/);
  assert.match(userGroup, /\{dateGroup\.label\}/);
  assert.match(userGroup, /space-y-2/);
});

test("redigering bruger mødetid og fyraften og viser sammenligningsgrundlaget", () => {
  const editModal = readFileSync(
    "app/components/modals/time-entries/TimeEntryEditModal.tsx",
    "utf8",
  );
  const page = readFileSync(
    "app/(app)/time-approval/page.tsx",
    "utf8",
  );

  assert.match(editModal, />Mødetid</);
  assert.match(editModal, />Fyraften</);
  assert.match(editModal, /Planlagt/);
  assert.match(editModal, /Registreret før rettelse/);
  assert.match(editModal, /Note om rettelsen/);
  assert.match(editModal, /gemmes i registreringens historik/);
  assert.doesNotMatch(editModal, />Clock ind</);
  assert.doesNotMatch(editModal, />Clock ud</);
  assert.doesNotMatch(editModal, /Vælg clock ind/);
  assert.doesNotMatch(editModal, /Vælg clock ud/);

  assert.match(
    page,
    /jobFunctionName=\{editEntry\.shift\?\.jobFunction\?\.name \?\? null\}/,
  );
  assert.match(
    page,
    /plannedStartTime=\{editEntry\.shift\?\.startTime \?\? null\}/,
  );
  assert.match(
    page,
    /plannedEndTime=\{editEntry\.shift\?\.endTime \?\? null\}/,
  );
  assert.match(
    page,
    /deviationMessages=\{editEntry\.deviation\?\.messages \?\? \[\]\}/,
  );
});
