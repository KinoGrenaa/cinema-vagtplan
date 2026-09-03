import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const payrollSource =
  readFileSync(
    "app/(app)/payroll/components/report/PayrollEmployeesSection.tsx",
    "utf8",
  );

const approvalActionsSource =
  readFileSync(
    "app/(app)/time-approval/hooks/actions/useTimeApprovalActions.ts",
    "utf8",
  );

test(
  "payroll viser manuel registrering uden vagt som ikke-sammenlignelig frem for afvigelse",
  () => {
    assert.match(
      payrollSource,
      /entry\.deviation\?\.types\.includes\(\s*"MANUAL_WITHOUT_SHIFT"\s*,?\s*\)/,
    );
    assert.match(
      payrollSource,
      />\s*Ikke relevant\s*</,
    );
  },
);

test(
  "godkendelses-toast kalder kun en planlagt vagt med afvigelse for en afvigelse",
  () => {
    assert.match(
      approvalActionsSource,
      /entry\.shift\s*&&\s*entry\.deviation\s*\?\.hasDeviation/,
    );
    assert.match(
      approvalActionsSource,
      /"Timeregistrering godkendt"/,
    );
  },
);
