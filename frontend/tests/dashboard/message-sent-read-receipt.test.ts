import assert from "node:assert/strict";
import {
  readFileSync,
} from "node:fs";
import test from "node:test";

const typeSource =
  readFileSync(
    "app/types/messages.ts",
    "utf8",
  );

const helperSource =
  readFileSync(
    "app/(app)/messages/sent/helpers/core/sentMessageHelpers.ts",
    "utf8",
  );

const listSource =
  readFileSync(
    "app/(app)/messages/sent/components/list/SentMessagesList.tsx",
    "utf8",
  );

test(
  "sendte beskeder har individuel læsekvittering i frontend-typen",
  () => {
    assert.match(
      typeSource,
      /readReceipt\?: MessageReadReceipt/,
    );
    assert.match(
      typeSource,
      /readBy: MessageParticipant\[\]/,
    );
    assert.match(
      typeSource,
      /unreadBy: MessageParticipant\[\]/,
    );
  },
);

test(
  "sendte beskeder viser læst af alle eller en delvis læsetæller",
  () => {
    assert.match(
      helperSource,
      /Læst af alle/,
    );
    assert.match(
      helperSource,
      /Læst af \$\{receipt\.readCount\} af \$\{receipt\.totalRecipients\}/,
    );
    assert.match(
      helperSource,
      /Modtageren er ikke længere aktiv/,
    );
  },
);

test(
  "åben sendt besked viser hvem der har og ikke har læst",
  () => {
    assert.match(
      listSource,
      /Læsestatus/,
    );
    assert.match(
      listSource,
      /Læst af:/,
    );
    assert.match(
      listSource,
      /Ikke læst af:/,
    );
  },
);
