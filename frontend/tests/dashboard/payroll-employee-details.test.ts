import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const source =
  readFileSync(
    "app/(app)/payroll/components/report/PayrollEmployeesSection.tsx",
    "utf8",
  );

test(
  "payroll employee details use clear Danish presentation labels",
  () => {
    assert.match(
      source,
      /formatDateDK\(entry\.date\)/,
    );

    assert.match(
      source,
      />Løntype</,
    );

    assert.doesNotMatch(
      source,
      />Navn</,
    );

    assert.doesNotMatch(
      source,
      />Eksportkode</,
    );

    assert.match(
      source,
      /entry\.jobFunction !== "-"/,
    );

    assert.match(
      source,
      /"Manuel registrering"/,
    );

    assert.match(
      source,
      /entry\.payrollName \|\| "-"/,
    );
  },
);
