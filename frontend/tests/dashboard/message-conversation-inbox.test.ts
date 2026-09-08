import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const inboxList = readFileSync(
  "app/(app)/messages/components/list/InboxMessagesList.tsx",
  "utf8",
);
const inboxDetail = readFileSync(
  "app/(app)/messages/components/detail/InboxConversationDetail.tsx",
  "utf8",
);
const inboxHook = readFileSync(
  "app/(app)/messages/hooks/page/useInboxMessagesPage.ts",
  "utf8",
);
const messagesHook = readFileSync(
  "app/hooks/useMessages.ts",
  "utf8",
);
const messageTypes = readFileSync(
  "app/types/messages.ts",
  "utf8",
);

test("indbakken bruger én stabil samtaleidentitet og viser tråden i separat detaljepanel", () => {
  assert.match(inboxList, /message\.conversationId/);
  assert.match(inboxList, /conversationLastActivityAt/);
  assert.match(inboxList, /conversationUnreadCount/);
  assert.doesNotMatch(inboxList, /conversation\.messages\.map/);
  assert.match(inboxDetail, /messages\.map/);
  assert.match(inboxDetail, /overflow-y-auto/);
});

test("målrettede beskedlinks opløses til den aktuelle samtale", () => {
  assert.match(inboxHook, /targetConversationId/);
  assert.match(inboxHook, /focusedConversationId/);
  assert.match(inboxHook, /fetchMessageConversation/);
  assert.match(inboxHook, /inbox-conversation-/);
});

test("sletning og læst-status behandles som samtalehandlinger i indbakken", () => {
  assert.match(inboxHook, /Slet samtale/);
  assert.match(inboxHook, /Vil du slette hele samtalen/);
  assert.match(messagesHook, /conversationUnreadCount:\s*0/);
});

test("beskedtypen kan bære samtalens samlede liste-status", () => {
  assert.match(messageTypes, /conversationLastActivityId\?: number/);
  assert.match(messageTypes, /conversationLastActivityAt\?: string/);
  assert.match(messageTypes, /conversationMessageCount\?: number/);
  assert.match(messageTypes, /conversationUnreadCount\?: number/);
});
