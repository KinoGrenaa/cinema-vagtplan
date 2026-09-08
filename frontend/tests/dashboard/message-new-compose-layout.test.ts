import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(
  "app/(app)/messages/new/page.tsx",
  "utf8",
);
const form = readFileSync(
  "app/(app)/messages/send/components/form/SendMessageForm.tsx",
  "utf8",
);

test("Ny besked bruger workspace-bredden uden et indre formular-kort", () => {
  assert.match(
    page,
    /className="space-y-5 p-5 lg:p-6"/,
  );
  assert.doesNotMatch(
    page,
    /max-w-4xl/,
  );
  assert.match(
    form,
    /className="space-y-5"/,
  );
  assert.doesNotMatch(
    form,
    /className="[^"]*rounded-2xl[^"]*shadow-sm/,
  );
});

test("Modtagere og Send til alle hører visuelt sammen", () => {
  assert.match(
    form,
    /mb-1 flex items-center justify-between gap-4/,
  );
  assert.match(
    form,
    /Send til alle/,
  );
  assert.match(
    form,
    /Alle medarbejdere/,
  );
});

test("selve modtagerfeltet åbner vælgeren uden en ekstra Vælg-knap", () => {
  assert.match(
    form,
    /aria-haspopup="dialog"/,
  );
  assert.match(
    form,
    /Vælg modtagere\.\.\./,
  );
  assert.match(
    form,
    /onClick=\{\(\) => setEmployeePickerOpen\(true\)\}/,
  );
  assert.doesNotMatch(
    form,
    /Ingen modtagere valgt/,
  );
  assert.doesNotMatch(
    form,
    /Rediger modtagere/,
  );
});

test("compose-handlinger er kompakte og funktionaliteten er bevaret", () => {
  assert.match(
    form,
    /ml-auto block min-w-36/,
  );
  assert.match(
    form,
    /min-h-64 w-full/,
  );
  assert.match(
    form,
    /selectedRecipientIds/,
  );
  assert.match(
    form,
    /MessageRecipientPickerModal/,
  );
  assert.match(
    form,
    /replyMode/,
  );
  assert.match(
    form,
    /replyRecipients/,
  );
});
