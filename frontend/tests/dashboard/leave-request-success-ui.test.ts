import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const formSource =
  readFileSync(
    "app/(app)/leave-requests/hooks/form/useLeaveRequestForm.ts",
    "utf8",
  );

const listSource =
  readFileSync(
    "app/(app)/leave-requests/components/list/LeaveRequestsListSection.tsx",
    "utf8",
  );

test("egen fraværsansøgning kvitteres med modal i stedet for grøn statuslinje", () => {
  assert.match(
    formSource,
    /"Fraværsansøgning sendt"/,
  );
  assert.match(
    formSource,
    /Din fraværsansøgning for \${period} er sendt og afventer behandling\./,
  );
  assert.doesNotMatch(
    formSource,
    /setSuccess\("Fraværsansøgningen er sendt\."\)/,
  );
});

test("dagsrækkens fokusmarkering følger de afrundede hjørner", () => {
  assert.match(
    listSource,
    /isExpanded\s*\? "rounded-t-2xl"\s*:\s*"rounded-2xl"/,
  );
  assert.match(
    listSource,
    /focus-visible:ring-inset/,
  );
  assert.match(
    listSource,
    /focus-visible:ring-gray-400/,
  );
  assert.match(
    listSource,
    /dark:focus-visible:ring-gray-500/,
  );
  assert.doesNotMatch(
    listSource,
    /focus-visible:ring-blue-600 dark:bg-gray-950/,
  );
});
