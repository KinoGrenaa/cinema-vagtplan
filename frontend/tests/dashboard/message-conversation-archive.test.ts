import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const archiveHook = readFileSync(
  "app/(app)/messages/archive/hooks/page/useArchivedMessages.ts",
  "utf8",
);
const archiveList = readFileSync(
  "app/(app)/messages/archive/components/list/ArchivedMessagesListSection.tsx",
  "utf8",
);
const archiveThread = readFileSync(
  "app/(app)/messages/archive/components/list/ArchivedConversationThread.tsx",
  "utf8",
);
const archiveTypes = readFileSync(
  "app/(app)/messages/archive/helpers/core/archiveMessageTypes.ts",
  "utf8",
);

test("modtagne slettede samtaler vises som samtaler mens sendte arkiver fortsat er beskeder", () => {
  assert.match(
    archiveList,
    /modtagne slettede samtaler/,
  );
  assert.match(
    archiveList,
    /sendte slettede beskeder/,
  );
  assert.match(
    archiveList,
    /Hent ældre modtagne samtaler/,
  );
});

test("en modtaget slettet samtale kan vise hele tråden i et afgrænset område", () => {
  assert.match(
    archiveList,
    /ArchivedConversationThread/,
  );
  assert.match(
    archiveThread,
    /conversationMessages\.map/,
  );
  assert.match(
    archiveThread,
    /max-h-\[32rem\]/,
  );
  assert.match(
    archiveTypes,
    /conversationMessages\?: Message\[\]/,
  );
});

test("gendannelse bruger samtalebegreb og giver success-toast for modtagne slettede samtaler", () => {
  assert.match(
    archiveHook,
    /Flyt samtale tilbage/,
  );
  assert.match(
    archiveHook,
    /Samtalen er flyttet tilbage til indbakken/,
  );
  assert.match(
    archiveHook,
    /toast\.success/,
  );
});
