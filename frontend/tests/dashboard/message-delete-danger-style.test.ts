import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const inboxDetail = readFileSync(
  "app/(app)/messages/components/detail/InboxConversationDetail.tsx",
  "utf8",
);
const sentDetail = readFileSync(
  "app/(app)/messages/sent/components/workspace/SentMessageDetail.tsx",
  "utf8",
);
const inboxHook = readFileSync(
  "app/(app)/messages/hooks/page/useInboxMessagesPage.ts",
  "utf8",
);
const sentHook = readFileSync(
  "app/(app)/messages/sent/hooks/page/useSentMessagesPage.ts",
  "utf8",
);

test("Slet-knapper i besked-workspace er røde destruktive handlinger", () => {
  for (const source of [
    inboxDetail,
    sentDetail,
  ]) {
    assert.match(
      source,
      />\s*Slet\s*</,
    );
    assert.match(
      source,
      /bg-red-700/,
    );
    assert.match(
      source,
      /dark:bg-red-600/,
    );
    assert.doesNotMatch(
      source,
      /bg-amber-600|dark:bg-amber-500/,
    );
  }
});

test("Slet-dialoger bruger danger-varianten", () => {
  assert.match(
    inboxHook,
    /title: "Slet samtale"[\s\S]*?confirmText: "Slet"[\s\S]*?confirmVariant\s*:\s*"danger"/,
  );
  assert.match(
    sentHook,
    /title: "Slet besked"[\s\S]*?confirmText: "Slet"[\s\S]*?confirmVariant\s*:\s*"danger"/,
  );
});
