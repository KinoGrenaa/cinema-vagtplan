import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const page = readFileSync(
  "app/(app)/cinema-settings/page.tsx",
  "utf8",
);

const timeRegistration = readFileSync(
  "app/(app)/cinema-settings/components/sections/CinemaSettingsTimeRegistrationSection.tsx",
  "utf8",
);

const timeEntryRules = readFileSync(
  "app/(app)/cinema-settings/components/sections/CinemaSettingsTimeEntryRulesSection.tsx",
  "utf8",
);

const payrollRules = readFileSync(
  "app/(app)/cinema-settings/components/payroll/CinemaSettingsPayrollRulesSection.tsx",
  "utf8",
);

const payrollSection = readFileSync(
  "app/(app)/cinema-settings/components/payroll/CinemaSettingsPayrollSection.tsx",
  "utf8",
);

test("biografindstillinger er opdelt i tydelige hovedområder", () => {
  const headings = [
    'title="Biograf og funktioner"',
    'title="Fravær"',
    'title="Tidsregistrering"',
  ];

  let previousIndex = -1;

  for (const heading of headings) {
    const index = page.indexOf(heading);

    assert.ok(
      index > previousIndex,
      `${heading} skal ligge efter den foregående hovedgruppe`,
    );

    previousIndex = index;
  }

  assert.match(
    payrollSection,
    /title="Løn og arbejdstid"/,
  );
  assert.match(
    payrollSection,
    /title="Lønperiode og udbetaling"/,
  );
});

test("tidsregistrering samler automatik, tolerancer og notekrav", () => {
  assert.match(
    timeRegistration,
    /Automatisk tidsregistrering/,
  );
  assert.match(
    timeEntryRules,
    /Afvigelsestolerance/,
  );
  assert.match(
    timeEntryRules,
    /Notekrav/,
  );

  assert.doesNotMatch(
    payrollRules,
    /Afvigelsestolerance/,
  );
  assert.doesNotMatch(
    payrollRules,
    /requireNoteForManualEntry/,
  );
});

test("lønsektionen handler kun om løn og arbejdstid", () => {
  assert.match(
    payrollRules,
    /CinemaSettingsPayrollModeSection/,
  );
  assert.match(
    payrollRules,
    /Brug overarbejdsregler/,
  );
});
