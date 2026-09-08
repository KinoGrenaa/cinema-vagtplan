import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const sendForm = readFileSync(
  "app/(app)/messages/send/components/form/SendMessageForm.tsx",
  "utf8",
);
const recipientPicker = readFileSync(
  "app/(app)/messages/send/components/form/MessageRecipientPickerModal.tsx",
  "utf8",
);
const conversationContext = readFileSync(
  "app/(app)/messages/send/components/layout/MessageConversationContext.tsx",
  "utf8",
);
const inboxDetail = readFileSync(
  "app/(app)/messages/components/detail/InboxConversationDetail.tsx",
  "utf8",
);
const sendHook = readFileSync(
  "app/(app)/messages/send/hooks/page/useSendMessagePage.ts",
  "utf8",
);

test(
  "beskeder kan vælge flere modtagere i den dedikerede modtagervælger",
  () => {
    assert.match(
      sendForm,
      /selectedRecipientIds/,
    );
    assert.match(
      recipientPicker,
      /role="listbox"/,
    );
    assert.match(
      recipientPicker,
      /aria-multiselectable="true"/,
    );
    assert.match(
      recipientPicker,
      /role="option"/,
    );
    assert.match(
      recipientPicker,
      /aria-selected=/,
    );
    assert.match(
      recipientPicker,
      /toggleRecipient/,
    );
    assert.match(
      recipientPicker,
      /Søg modtager/,
    );
    assert.doesNotMatch(
      recipientPicker,
      /type="checkbox"/,
    );
  },
);

test("indbakkens detaljepanel tilbyder svar og svar alle", () => {
  assert.match(inboxDetail, />\s*Svar\s*</);
  assert.match(inboxDetail, /Svar alle/);
  assert.match(inboxDetail, /canSendBroadcastMessages/);
});

test("svar viser den eksisterende samtale som kontekst", () => {
  assert.match(
    conversationContext,
    /Den oprindelige besked og tidligere svar vises her/,
  );
  assert.match(sendHook, /fetchMessageConversation/);
  assert.match(sendHook, /Svaret er sendt/);
});
