import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const page = fs.readFileSync(
  path.resolve(process.cwd(), "app/(app)/shift-planning/page.tsx"),
  "utf8",
);
const workflow = fs.readFileSync(
  path.resolve(
    process.cwd(),
    "app/(app)/shift-planning/components/workflow/ShiftPlanningWorkflowGuide.tsx",
  ),
  "utf8",
);
const week = fs.readFileSync(
  path.resolve(
    process.cwd(),
    "app/(app)/shift-planning/components/month/ShiftPlanningWeekIndicator.tsx",
  ),
  "utf8",
);
const dialog = fs.readFileSync(
  path.resolve(
    process.cwd(),
    "app/(app)/shift-planning/components/draft-workspace/ShiftPlanningReplaceShiftsDialog.tsx",
  ),
  "utf8",
);

test("shift planning forklarer den fælles arbejdsgang kompakt", () => {
  for (const label of [
    "Planlæg",
    "Ønsker",
    "Fordel",
    "Gennemse & udgiv",
  ]) {
    assert.match(workflow, new RegExp(label.replace("&", "\\&")));
  }

  assert.match(
    workflow,
    /Ønsker bliver valgfrit; vagter kan fortsat tildeles direkte/,
  );
  assert.doesNotMatch(
    workflow,
    /Denne pakke ændrer kun brugerfladen/,
  );
});

test("arbejdsgangen markerer først Planlæg som aktiv når en kladde er valgt", () => {
  assert.match(
    page,
    /<ShiftPlanningWorkflowGuide hasSelectedDraft=\{selectedDraftId !== null\} \/>/,
  );
  assert.match(
    workflow,
    /hasSelectedDraft && index === 0/,
  );
  assert.match(
    workflow,
    /Vælg eller opret en kladde for at begynde planlægningen/,
  );
});

test("shift planning bruger kladde-sprog i oversigten", () => {
  assert.match(page, /Vagter i kladden/);
  assert.match(page, />\s*Klar\s*</);
  assert.doesNotMatch(page, /Vagter i arbejdsforslaget/);
  assert.match(page, /Kladdevagter, faktiske vagter og problemer/);
});

test("summary-kort viser indlæsning i stedet for falske nuller mens kladde-preview hentes", () => {
  assert.match(page, /const displayedPreviewLoading =/);
  assert.match(
    page,
    /displayedPreviewLoading \? "…" : \(displayedPreview\?\.summary\.itemCount \?\? 0\)/,
  );
  assert.match(
    page,
    /displayedPreviewLoading \? "…" : \(displayedPreview\?\.summary\.readyItemCount \?\? 0\)/,
  );
});

test("månedshovedet holder direkte udgivelses- og destruktive handlinger ude af Planlæg", () => {
  assert.doesNotMatch(page, /Gennemse månedens ændringer/);
  assert.doesNotMatch(page, /Fjern månedens vagter/);
  assert.doesNotMatch(page, />\s*Erstat månedens vagter\s*</);
});

test("ugehandlinger skelner kladde fra faktiske vagter", () => {
  assert.match(week, />\s*Ryd planlægning\s*</);
  assert.match(week, />\s*Gennemse\s*</);
  assert.match(week, />\s*Fjern faktiske\s*</);
  assert.match(
    week,
    /Faktiske vagter påvirkes ikke/,
  );
});

test("replacement-dialogen bruger gennemse og udgiv-sprog", () => {
  assert.match(dialog, /Gennemse ændringer for \{targetLabel\}/);
  assert.match(dialog, />\s*Kladde\s*</);
  assert.match(dialog, /Ændringerne kan ikke udgives endnu/);
  assert.match(dialog, /Udgiv ændringer/);
  assert.doesNotMatch(dialog, /Ja, erstat vagter/);
});
