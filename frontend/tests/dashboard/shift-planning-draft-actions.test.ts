import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const workspace =
  readFileSync(
    "app/(app)/shift-planning/components/draft-workspace/ShiftPlanningDraftWorkspaceBar.tsx",
    "utf8",
  );

const page =
  readFileSync(
    "app/(app)/shift-planning/page.tsx",
    "utf8",
  );

test("uændret kladde samler sjældne handlinger i Kladdehandlinger", () => {
  assert.match(
    workspace,
    /selectedDraft && editable && \([\s\S]*Kladdehandlinger/,
  );
  assert.doesNotMatch(
    workspace,
    /selectedDraft && editable && !dirty && \([\s\S]{0,500}Kladdehandlinger/,
  );
  assert.match(workspace, /Omdøb kladde/);
  assert.match(workspace, /Kopiér kladde/);
  assert.match(workspace, /Slet kladde/);
});

test("ikke-gemte ændringer kan håndteres direkte fra Kladdehandlinger", () => {
  assert.match(
    workspace,
    /Kladden har ikke-gemte ændringer\./,
  );
  assert.match(
    workspace,
    /Gem eller fortryd ændringerne, før du omdøber eller kopierer/,
  );
  assert.match(
    workspace,
    /Kladden kan stadig slettes\./,
  );
  assert.match(
    workspace,
    /setShowDraftActionsDialog\(false\);[\s\S]{0,100}setShowSaveDialog\(true\)/,
  );
  assert.match(
    workspace,
    /setShowDraftActionsDialog\(false\);[\s\S]{0,100}void discardChanges\(\)/,
  );
  assert.match(
    workspace,
    /const canRenameSelected = Boolean\(selectedDraft\) && editable && !dirty && !busy/,
  );
  assert.match(
    workspace,
    /const canCopySelected = Boolean\(selectedDraft\) && editable && !dirty && !busy/,
  );
  assert.match(
    workspace,
    /const canDeleteSelected = Boolean\(selectedDraft\) && editable && !busy/,
  );
});

test("dirty kladde kan slettes efter tydelig advarsel", () => {
  assert.match(
    workspace,
    /Hvis du sletter kladden, går[\s\S]{0,80}disse ændringer også tabt/,
  );

  const deleteFunction = page.match(
    /const deleteSelectedDraft = async \(\) => \{[\s\S]*?\n  \};\n\n  const loadPlanningShiftReplacementPreview/,
  );

  assert.ok(deleteFunction);
  assert.doesNotMatch(
    deleteFunction[0],
    /if \(draftDirty\)/,
  );
});

test("gem og fortryd vises kun ved lokale ændringer", () => {
  assert.match(
    workspace,
    /selectedDraft && editable && dirty && \([\s\S]*Gem ændringer[\s\S]*Fortryd ændringer/,
  );
});

test("opret-knappen vises kun når vagter reelt kan oprettes og viser antal", () => {
  assert.match(
    workspace,
    /\{canCreateShifts && \([\s\S]*Opret 1 vagt[\s\S]*Opret \$\{readyCount\} vagter/,
  );
});

test("omdøb kladde er koblet til et dedikeret rename-endpoint", () => {
  assert.match(
    page,
    /\/shift-planning-drafts\/\$\{selectedDraftId\}\/rename/,
  );
  assert.match(
    page,
    /onRenameDraft=\{renameSelectedDraft\}/,
  );
  assert.match(
    workspace,
    /onRenameDraft: \(name: string\) => Promise<void>/,
  );
});


test("gem fra Kladdehandlinger vender tilbage til Kladdehandlinger uden ekstra kvitteringsmodal", () => {
  assert.match(
    workspace,
    /setReturnToDraftActionsAfterSave\(true\);[\s\S]{0,180}setShowSaveDialog\(true\)/,
  );
  assert.match(
    workspace,
    /showConfirmation: !returnToDraftActionsAfterSave/,
  );
  assert.match(
    workspace,
    /setDraftActionsNotice\("Ændringerne er gemt\."\);[\s\S]{0,120}setShowDraftActionsDialog\(true\)/,
  );
  assert.match(
    workspace,
    /if \(returnToDraftActionsAfterSave\) \{[\s\S]{0,180}setShowDraftActionsDialog\(true\)/,
  );
});


test("Kladdehandlinger navngiver tydeligt den valgte kladde", () => {
  assert.match(
    workspace,
    /Handlinger for kladden:\{" "\}/,
  );
});
