import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const payrollHeaderPath = resolve(
  process.cwd(),
  "app/(app)/payroll/components/layout/PayrollHeader.tsx",
);

test("payroll bruger den fælles søgbare medarbejdervælger", () => {
  const source = readFileSync(payrollHeaderPath, "utf8");

  assert.match(
    source,
    /EmployeePickerModal/,
    "PayrollHeader skal bruge den fælles EmployeePickerModal.",
  );
  assert.match(
    source,
    /profileImage:\s*user\.profileImage\s*\?\?\s*null/,
    "Profilbilledet skal sendes videre til medarbejdervælgeren.",
  );
  assert.match(
    source,
    /onSetUserId\(""\)/,
    "Filteret skal fortsat kunne nulstilles til alle medarbejdere.",
  );
  assert.match(
    source,
    /Alle medarbejdere/,
    "Alle medarbejdere skal fortsat være en tydelig filtertilstand.",
  );
  assert.doesNotMatch(
    source,
    /<select\b/,
    "PayrollHeader skal ikke have en almindelig medarbejder-dropdown.",
  );
});
