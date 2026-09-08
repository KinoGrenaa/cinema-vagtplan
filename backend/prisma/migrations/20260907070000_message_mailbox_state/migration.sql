-- Individual mailbox state for messages.
-- Legacy Message.isRead/readAt/archivedAt are intentionally retained during
-- the compatibility phase. New reads/deletes use MessageRecipient state.

ALTER TABLE "Message"
ADD COLUMN "senderDeletedAt" TIMESTAMP(3);

CREATE TABLE "MessageRecipient" (
    "id" SERIAL NOT NULL,
    "messageId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "readAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageRecipient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MessageRecipient_messageId_userId_key"
ON "MessageRecipient"("messageId", "userId");

CREATE INDEX "MessageRecipient_userId_deletedAt_idx"
ON "MessageRecipient"("userId", "deletedAt");

CREATE INDEX "MessageRecipient_userId_readAt_idx"
ON "MessageRecipient"("userId", "readAt");

CREATE INDEX "MessageRecipient_messageId_idx"
ON "MessageRecipient"("messageId");

ALTER TABLE "MessageRecipient"
ADD CONSTRAINT "MessageRecipient_messageId_fkey"
FOREIGN KEY ("messageId") REFERENCES "Message"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MessageRecipient"
ADD CONSTRAINT "MessageRecipient_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve the current direct-message mailbox state.
INSERT INTO "MessageRecipient" (
    "messageId",
    "userId",
    "readAt",
    "deletedAt",
    "createdAt"
)
SELECT
    m."id",
    m."receiverId",
    CASE
        WHEN m."isRead" THEN COALESCE(m."readAt", m."createdAt")
        ELSE NULL
    END,
    CASE
        WHEN m."archivedAt" IS NOT NULL THEN CURRENT_TIMESTAMP
        ELSE NULL
    END,
    m."createdAt"
FROM "Message" m
WHERE m."receiverId" IS NOT NULL
ON CONFLICT ("messageId", "userId") DO NOTHING;

-- Existing broadcasts had one shared read/archive state. Preserve that state
-- for all cinema memberships at migration time; future state is per user.
INSERT INTO "MessageRecipient" (
    "messageId",
    "userId",
    "readAt",
    "deletedAt",
    "createdAt"
)
SELECT
    m."id",
    membership."userId",
    CASE
        WHEN m."isRead" THEN COALESCE(m."readAt", m."createdAt")
        ELSE NULL
    END,
    CASE
        WHEN m."archivedAt" IS NOT NULL THEN CURRENT_TIMESTAMP
        ELSE NULL
    END,
    m."createdAt"
FROM "Message" m
JOIN "UserCinemaMembership" membership
  ON membership."cinemaId" = m."cinemaId"
 AND membership."userId" <> m."senderId"
WHERE m."isBroadcast" = TRUE
ON CONFLICT ("messageId", "userId") DO NOTHING;

-- The legacy archive flag affected the shared row. Preserve the sender's
-- current visibility and give migrated deleted items a fresh 60-day window.
UPDATE "Message"
SET "senderDeletedAt" = CURRENT_TIMESTAMP
WHERE "archivedAt" IS NOT NULL;
