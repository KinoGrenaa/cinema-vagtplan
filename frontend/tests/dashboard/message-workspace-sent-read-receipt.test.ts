import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const detail = readFileSync(
  "app/(app)/messages/sent/components/workspace/SentMessageDetail.tsx",
  "utf8",
);
const list = readFileSync(
  "app/(app)/messages/sent/components/workspace/SentMessagesWorkspaceList.tsx",
  "utf8",
);

test("workspace for Sendt bevarer individuel og fler-modtager læsestatus", () => {
  assert.match(detail, /getReadReceiptSummary/);
  assert.match(detail, /readReceipt/);
  assert.match(detail, /Læst af:/);
  assert.match(detail, /Ikke læst af:/);
  assert.match(list, /getReadReceiptBadgeClass/);
  assert.match(list, /getSentRecipientLabel/);
});
