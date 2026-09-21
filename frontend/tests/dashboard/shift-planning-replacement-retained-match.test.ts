import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const dialog = fs.readFileSync(
  "app/(app)/shift-planning/components/draft-workspace/ShiftPlanningReplaceShiftsDialog.tsx",
  "utf8",
);

test("Erstat-preview viser præcist matchende eksisterende vagter som beholdt", () => {
  assert.match(dialog, /satisfiedProposedShiftCount: number/);
  assert.match(dialog, /Allerede korrekt/);
  assert.match(dialog, /satisfiedByExistingShiftId != null/);
  assert.match(dialog, /"Beholdes"/);
  assert.match(
    dialog,
    /preview\.summary\.creatableShiftCount/,
  );
});

test("Erstat-preview forklarer at et præcist eksisterende match ikke oprettes igen", () => {
  assert.match(
    dialog,
    /samme jobfunktion, tider og[\s\S]{0,80}medarbejder/,
  );
  assert.match(
    dialog,
    /oprettes ikke en dublet/,
  );
});


test("Erstat-preview behandler aktive vagtbytter og bemandingsforespørgsler som konsekvenser, ikke blokeringer", () => {
  assert.match(dialog, /openShiftTradeCount\?: number/);
  assert.match(dialog, /pendingStaffingRequestCount\?: number/);
  assert.match(dialog, /Aktive forløb annulleres automatisk/);
  assert.match(dialog, /Historikken bevares/);
  assert.match(dialog, /åbent vagtbytte|åbne vagtbytter/);
  assert.match(dialog, /aktiv bemandingsforespørgsel|aktive bemandingsforespørgsler/);
});


test("viser replacement-perioden i dansk datoformat", () => {
  assert.match(
    dialog,
    /formatDateKey\(preview\.startDateKey\)/,
  );
  assert.match(
    dialog,
    /formatDateKey\(preview\.endDateKey\)/,
  );
});
