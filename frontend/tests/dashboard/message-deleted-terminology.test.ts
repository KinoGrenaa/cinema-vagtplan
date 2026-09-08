import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const menu = readFileSync(
  "app/components/AppMenu.tsx",
  "utf8",
);
const inboxHook = readFileSync(
  "app/(app)/messages/hooks/page/useInboxMessagesPage.ts",
  "utf8",
);
const inboxDetail = readFileSync(
  "app/(app)/messages/components/detail/InboxConversationDetail.tsx",
  "utf8",
);
const sentHook = readFileSync(
  "app/(app)/messages/sent/hooks/page/useSentMessagesPage.ts",
  "utf8",
);
const sentList = readFileSync(
  "app/(app)/messages/sent/components/list/SentMessagesList.tsx",
  "utf8",
);
const deletedHeader = readFileSync(
  "app/(app)/messages/archive/components/layout/ArchivedMessagesHeader.tsx",
  "utf8",
);
const deletedList = readFileSync(
  "app/(app)/messages/archive/components/list/ArchivedMessagesListSection.tsx",
  "utf8",
);
const deletedHook = readFileSync(
  "app/(app)/messages/archive/hooks/page/useArchivedMessages.ts",
  "utf8",
);

test("beskedflowet kalder den gendannelige mappe Slettet og bruger canonical URL", () => {
  assert.match(
    menu,
    /href: "\/messages\/deleted"[\s\S]*?label: "Slettet"/,
  );
  assert.match(
    deletedHeader,
    />\s*Slettet\s*</,
  );
  assert.match(
    deletedHeader,
    /du har slettet/,
  );
  assert.match(
    deletedList,
    /modtagne slettede samtaler/,
  );
  assert.match(
    deletedList,
    /sendte slettede beskeder/,
  );
  assert.match(
    deletedList,
    /Slettet:/,
  );
  assert.match(
    deletedHook,
    /modtagne slettede samtaler/,
  );
});

test("slettehandlinger bruger Slet og ikke Arkiver som synligt begreb", () => {
  assert.match(inboxHook, /Slet samtale/);
  assert.match(inboxHook, /Samtalen er slettet/);
  assert.match(sentHook, /Slet besked/);
  assert.match(inboxDetail, />\s*Slet\s*</);
  assert.match(sentList, />\s*Slet\s*</);

  for (const source of [
    inboxHook,
    inboxDetail,
    sentHook,
    sentList,
    deletedHeader,
    deletedList,
    deletedHook,
  ]) {
    assert.doesNotMatch(
      source,
      /Arkiverede beskeder|Arkiver samtale|Arkiver besked|>\s*Arkiver\s*<|Arkiveret:/,
    );
  }
});
