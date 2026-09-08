import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const inboxPage = readFileSync(
  "app/(app)/messages/page.tsx",
  "utf8",
);
const newPage = readFileSync(
  "app/(app)/messages/new/page.tsx",
  "utf8",
);
const sentPage = readFileSync(
  "app/(app)/messages/sent/page.tsx",
  "utf8",
);
const deletedPage = readFileSync(
  "app/(app)/messages/deleted/page.tsx",
  "utf8",
);
const nav = readFileSync(
  "app/(app)/messages/components/layout/MessagesWorkspaceNav.tsx",
  "utf8",
);
const inboxList = readFileSync(
  "app/(app)/messages/components/list/InboxMessagesList.tsx",
  "utf8",
);
const inboxDetail = readFileSync(
  "app/(app)/messages/components/detail/InboxConversationDetail.tsx",
  "utf8",
);
const sentList = readFileSync(
  "app/(app)/messages/sent/components/workspace/SentMessagesWorkspaceList.tsx",
  "utf8",
);
const sentDetail = readFileSync(
  "app/(app)/messages/sent/components/workspace/SentMessageDetail.tsx",
  "utf8",
);
const deletedList = readFileSync(
  "app/(app)/messages/archive/components/workspace/DeletedMessagesWorkspaceList.tsx",
  "utf8",
);
const deletedDetail = readFileSync(
  "app/(app)/messages/archive/components/workspace/DeletedMessageDetail.tsx",
  "utf8",
);
const inboxHook = readFileSync(
  "app/(app)/messages/hooks/page/useInboxMessagesPage.ts",
  "utf8",
);
const legacySend = readFileSync(
  "app/(app)/messages/send/page.tsx",
  "utf8",
);
const legacyDeleted = readFileSync(
  "app/(app)/messages/archive/page.tsx",
  "utf8",
);

test("Indbakke bruger desktop-arbejdsflade med mapper, liste og detalje", () => {
  assert.match(
    inboxPage,
    /lg:grid-cols-\[190px_minmax\(300px,410px\)_minmax\(0,1fr\)\]/,
  );
  assert.match(inboxPage, /MessagesWorkspaceNav/);
  assert.match(inboxPage, /InboxMessagesList/);
  assert.match(inboxPage, /InboxConversationDetail/);
  assert.match(inboxList, /selectedConversationId/);
  assert.match(inboxDetail, /Vælg en samtale/);
});

test("Ny besked bliver i den samme beskedarbejdsflade", () => {
  assert.match(newPage, /MessagesWorkspaceNav/);
  assert.match(newPage, /active="new"/);
  assert.match(newPage, /SendMessageForm/);
  assert.match(newPage, /MessageConversationContext/);
});

test("Sendt bruger kompakt liste og separat detaljepanel med læsestatus", () => {
  assert.match(sentPage, /MessagesWorkspaceNav/);
  assert.match(sentPage, /active="sent"/);
  assert.match(sentPage, /SentMessagesWorkspaceList/);
  assert.match(sentPage, /SentMessageDetail/);
  assert.match(sentList, /getReadReceiptSummary/);
  assert.match(sentDetail, /Læsestatus/);
  assert.match(sentDetail, />\s*Slet\s*</);
});

test("Slettet bruger kompakt liste, Modtagne-Sendte skift og separat detaljepanel", () => {
  assert.match(deletedPage, /MessagesWorkspaceNav/);
  assert.match(deletedPage, /active="deleted"/);
  assert.match(deletedPage, /DeletedMessagesWorkspaceList/);
  assert.match(deletedPage, /DeletedMessageDetail/);
  assert.match(deletedPage, /Modtagne/);
  assert.match(deletedPage, /Sendte/);
  assert.match(deletedList, /Slettet:/);
  assert.match(deletedDetail, /Flyt samtalen tilbage/);
  assert.match(deletedDetail, /Flyt beskeden tilbage/);
});

test("beskedmapperne har tydelige canonical routes", () => {
  assert.match(nav, /Indbakke/);
  assert.match(nav, /Ny besked/);
  assert.match(nav, /Sendt/);
  assert.match(nav, /Slettet/);
  assert.match(nav, /\/messages\/new/);
  assert.match(nav, /\/messages\/deleted/);
  assert.match(inboxHook, /\/messages\/new\?replyTo=/);
});

test("gamle send- og archive-links viderestilles uden at miste query-parametre", () => {
  assert.match(
    legacySend,
    /\/messages\/new\$\{window\.location\.search\}/,
  );
  assert.match(
    legacyDeleted,
    /\/messages\/deleted\$\{window\.location\.search\}/,
  );
});
