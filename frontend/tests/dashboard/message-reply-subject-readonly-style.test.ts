import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sendForm = readFileSync(
  "app/(app)/messages/send/components/form/SendMessageForm.tsx",
  "utf8",
);

test("låst svar-emne er visuelt nedtonet", () => {
  assert.match(sendForm, /readOnly=\{isReply\}/);
  assert.match(sendForm, /!bg-gray-100/);
  assert.match(sendForm, /dark:!bg-gray-800/);
  assert.match(sendForm, /!text-gray-600/);
  assert.match(sendForm, /dark:!text-gray-400/);
});
