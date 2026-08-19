import assert from "node:assert/strict";
import test from "node:test";

import {
  formatPayrollPeriodDateRange,
  formatPayrollPeriodDialogDateRange,
  resolvePayrollPeriodStatus,
  isPayrollReportReady,
} from "../../app/(app)/payroll/helpers/payrollPeriodUi";

test("lønperiodedatoer vises i dansk dag-måned-år rækkefølge", () => {
  assert.equal(
    formatPayrollPeriodDateRange(
      "2026-07-21",
      "2026-08-20",
    ),
    "21.07.2026 – 20.08.2026",
  );
});

test("ukendt lønperiodestatus behandles ikke som åben mens den indlæses", () => {
  assert.equal(
    resolvePayrollPeriodStatus(
      undefined,
      true,
    ),
    null,
  );

  assert.equal(
    resolvePayrollPeriodStatus(
      undefined,
      false,
    ),
    "OPEN",
  );
});

test("låst status skjules som ukendt under genindlæsning", () => {
  assert.equal(
    resolvePayrollPeriodStatus(
      "LOCKED",
      true,
    ),
    null,
  );

  assert.equal(
    resolvePayrollPeriodStatus(
      "LOCKED",
      false,
    ),
    "LOCKED",
  );
});

test("ugyldigt ISO-datoformat ændres ikke skjult", () => {
  assert.equal(
    formatPayrollPeriodDateRange(
      "2026/07/21",
      "2026-08-20",
    ),
    "2026/07/21 – 20.08.2026",
  );
});

test("fejl ved hentning af periodestatus behandles aldrig som åben", () => {
  assert.equal(
    resolvePayrollPeriodStatus(
      undefined,
      false,
      true,
    ),
    null,
  );

  assert.equal(
    resolvePayrollPeriodStatus(
      "LOCKED",
      false,
      true,
    ),
    null,
  );
});

test("lønrapporten er kun klar når den hverken indlæses eller er fejlet", () => {
  assert.equal(
    isPayrollReportReady(
      true,
      false,
    ),
    false,
  );

  assert.equal(
    isPayrollReportReady(
      false,
      true,
    ),
    false,
  );

  assert.equal(
    isPayrollReportReady(
      false,
      false,
    ),
    true,
  );
});

test("dialogens dato-interval kan ikke brydes mellem fra- og til-dato", () => {
  assert.equal(
    formatPayrollPeriodDialogDateRange(
      "2026-07-21",
      "2026-08-20",
    ),
    "21.07.2026\u00a0–\u00a020.08.2026",
  );
});
