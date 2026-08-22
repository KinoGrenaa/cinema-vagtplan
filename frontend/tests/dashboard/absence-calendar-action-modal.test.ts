import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const page =
  readFileSync(
    "app/(app)/absence-calendar/page.tsx",
    "utf8",
  );

const grid =
  readFileSync(
    "app/(app)/absence-calendar/components/calendar/AbsenceCalendarGrid.tsx",
    "utf8",
  );

const hook =
  readFileSync(
    "app/(app)/absence-calendar/hooks/data/useAbsenceCalendarData.ts",
    "utf8",
  );

test("fraværskalenderens detaljer vises i modal i stedet for fast panel under kalenderen", () => {
  assert.ok(
    grid.includes(
      'import BaseModal from "@/app/components/modals/BaseModal";',
    ),
  );
  assert.ok(
    grid.includes(
      "<BaseModal",
    ),
  );
  assert.ok(
    grid.includes(
      'width="xl"',
    ),
  );
  assert.equal(
    grid.includes(
      "Vælg en dag i kalenderen for at",
    ),
    false,
  );
  assert.equal(
    grid.includes(
      "Ingen fravær på den valgte dag med de aktuelle filtre.",
    ),
    false,
  );
});

test("fraværskalenderen genbruger samme behandlingskort som fraværsgodkendelsen", () => {
  assert.ok(
    grid.includes(
      "LeaveApprovalRequestCard",
    ),
  );
  assert.ok(
    grid.includes(
      "onUpdateStatus={",
    ),
  );
  assert.ok(
    page.includes(
      "onUpdateStatus={",
    ),
  );
  assert.ok(
    page.includes(
      "updateStatus",
    ),
  );
});

test("statusændringer sender note til backend og genhenter måneden", () => {
  assert.ok(
    hook.includes(
      'method:\n                  "PATCH"',
    ),
  );
  assert.ok(
    hook.includes(
      "/leave-requests/${requestId}/status",
    ),
  );
  assert.ok(
    hook.includes(
      "JSON.stringify({",
    ),
  );
  assert.ok(
    hook.includes(
      "note,",
    ),
  );
  assert.ok(
    hook.includes(
      "await fetchRequests();",
    ),
  );
});

test("fraværskalenderen viser statusafhængig success-toast", () => {
  assert.ok(
    page.includes(
      "LeaveApprovalSuccessToast",
    ),
  );
  assert.ok(
    page.includes(
      "successToast",
    ),
  );
  assert.ok(
    hook.includes(
      "Fraværsansøgningen er godkendt.",
    ),
  );
  assert.ok(
    hook.includes(
      "Fraværsansøgningen er afvist.",
    ),
  );
  assert.ok(
    hook.includes(
      "Fraværsansøgningen er annulleret.",
    ),
  );
});

test("tomme kalenderdage åbner ikke en tom detaljemodal", () => {
  assert.ok(
    grid.includes(
      "dayRequests.length >",
    ),
  );
  assert.ok(
    grid.includes(
      "? date",
    ),
  );
  assert.ok(
    grid.includes(
      ": null",
    ),
  );
});
