import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sendForm = readFileSync(
  "app/(app)/messages/send/components/form/SendMessageForm.tsx",
  "utf8",
);
const sendHook = readFileSync(
  "app/(app)/messages/send/hooks/page/useSendMessagePage.ts",
  "utf8",
);

test("send besked kræver modtager, emne og besked før knappen aktiveres", () => {
  assert.match(sendForm, /const hasRecipient =/);
  assert.match(sendForm, /selectedRecipientIds\.length > 0/);
  assert.match(sendForm, /subject\.trim\(\)\.length > 0/);
  assert.match(sendForm, /body\.trim\(\)\.length > 0/);
  assert.match(sendForm, /disabled=\{sending \|\| !canSubmit\}/);
});

test("svar låser emnet og kræver reel svartekst", () => {
  assert.match(sendForm, /readOnly=\{isReply\}/);
  assert.match(sendForm, /aria-readonly=\{isReply\}/);
  assert.match(sendForm, /\(isReply \|\| hasRecipient\)/);
});

test("vellykket svar lukker svarflowet og går tilbage til indbakken", () => {
  assert.match(sendHook, /useRouter/);
  assert.match(sendHook, /router\.push\("\/messages"\)/);
  assert.doesNotMatch(
    sendHook,
    /toast\.success\("Svaret er sendt\."\);\s*await loadConversation\(replyToMessageId\)/,
  );
});
