import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const utility =
  readFileSync(
    "app/utils/messageSubject.ts",
    "utf8",
  );
const inboxList =
  readFileSync(
    "app/(app)/messages/components/list/InboxMessagesList.tsx",
    "utf8",
  );
const archiveList =
  readFileSync(
    "app/(app)/messages/archive/components/list/ArchivedMessagesListSection.tsx",
    "utf8",
  );

test("samtaleoverskrifter fjerner Sv-prefix uden at ændre enkeltstående sendte arkivbeskeder", () => {
  assert.match(
    utility,
    /\^\(\?:sv:/i,
  );
  assert.match(
    inboxList,
    /getConversationDisplaySubject/,
  );
  assert.match(
    archiveList,
    /activeSection ===/,
  );
  assert.match(
    archiveList,
    /"received"/,
  );
  assert.match(
    archiveList,
    /getConversationDisplaySubject/,
  );
  assert.match(
    archiveList,
    /: message\.subject/,
  );
});
