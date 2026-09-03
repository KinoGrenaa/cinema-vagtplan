import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const pageSource = readFileSync(
  "app/(app)/cinema-settings/payroll-export-codes/page.tsx",
  "utf8",
);
const headerSource = readFileSync(
  "app/(app)/cinema-settings/payroll-export-codes/components/layout/PayrollTypesHeader.tsx",
  "utf8",
);
const formSource = readFileSync(
  "app/(app)/cinema-settings/payroll-export-codes/components/form/PayrollTypeCreateForm.tsx",
  "utf8",
);
const tableSource = readFileSync(
  "app/(app)/cinema-settings/payroll-export-codes/components/list/PayrollTypesTable.tsx",
  "utf8",
);
const actionSource = readFileSync(
  "app/(app)/cinema-settings/payroll-export-codes/hooks/actions/usePayrollTypeActions.ts",
  "utf8",
);

test(
  "eksportkodesiden har dark mode på side, kort, felter og tabel",
  () => {
    assert.match(
      pageSource,
      /dark:bg-gray-950/,
    );
    assert.match(
      headerSource,
      /dark:bg-gray-900/,
    );
    assert.match(
      formSource,
      /dark:bg-gray-950/,
    );
    assert.match(
      tableSource,
      /dark:bg-gray-900/,
    );
    assert.match(
      tableSource,
      /dark:bg-gray-800/,
    );
  },
);

test(
  "manuel registrering er en beskyttet systemløntype med redigerbar eksportkode",
  () => {
    assert.match(
      tableSource,
      /isManualEntryPayrollType/,
    );
    assert.match(
      tableSource,
      />\s*SYSTEM\s*</,
    );
    assert.match(
      tableSource,
      /Eksportkode til manuel registrering/,
    );
    assert.match(
      tableSource,
      /Gem eksportkode/,
    );
    assert.match(
      actionSource,
      /updateSystemExportCode/,
    );
    assert.match(
      actionSource,
      /exportCode: nextExportCode/,
    );
  },
);
