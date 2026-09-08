-- Stable conversation identity and optional reply relation.
-- Existing messages become one-message conversations; new replies inherit
-- the conversationId of the message they reply to.

ALTER TABLE "Message"
ADD COLUMN "conversationId" TEXT,
ADD COLUMN "replyToMessageId" INTEGER;

UPDATE "Message"
SET "conversationId" = 'legacy-' || "id"::text
WHERE "conversationId" IS NULL;

ALTER TABLE "Message"
ALTER COLUMN "conversationId" SET NOT NULL;

CREATE INDEX "Message_conversationId_createdAt_id_idx"
ON "Message"("conversationId", "createdAt", "id");

CREATE INDEX "Message_replyToMessageId_idx"
ON "Message"("replyToMessageId");

ALTER TABLE "Message"
ADD CONSTRAINT "Message_replyToMessageId_fkey"
FOREIGN KEY ("replyToMessageId") REFERENCES "Message"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
