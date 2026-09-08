-- Preserve the recipient snapshot from send time while allowing recipients
-- to leave old read-receipt flows permanently after deactivation/removal.

ALTER TABLE "MessageRecipient"
ADD COLUMN "receiptExcludedAt" TIMESTAMP(3);

CREATE INDEX "MessageRecipient_messageId_receiptExcludedAt_readAt_idx"
ON "MessageRecipient"("messageId", "receiptExcludedAt", "readAt");

-- Existing recipients that are no longer active in the message's cinema
-- must not appear as unread in old sender receipts.
UPDATE "MessageRecipient" recipient
SET "receiptExcludedAt" = CURRENT_TIMESTAMP
FROM "Message" message
WHERE message."id" = recipient."messageId"
  AND recipient."receiptExcludedAt" IS NULL
  AND (
    NOT EXISTS (
      SELECT 1
      FROM "User" account
      WHERE account."id" = recipient."userId"
        AND account."isActive" = TRUE
    )
    OR NOT EXISTS (
      SELECT 1
      FROM "UserCinemaMembership" membership
      WHERE membership."userId" = recipient."userId"
        AND membership."cinemaId" = message."cinemaId"
        AND membership."isActive" = TRUE
    )
  );

CREATE OR REPLACE FUNCTION exclude_message_receipts_for_membership_change()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id INTEGER;
  target_cinema_id INTEGER;
  excluded_at TIMESTAMP(3);
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_user_id := OLD."userId";
    target_cinema_id := OLD."cinemaId";
    excluded_at := COALESCE(OLD."deactivatedAt", CURRENT_TIMESTAMP);
  ELSE
    IF NOT (OLD."isActive" = TRUE AND NEW."isActive" = FALSE) THEN
      RETURN NEW;
    END IF;

    target_user_id := NEW."userId";
    target_cinema_id := NEW."cinemaId";
    excluded_at := COALESCE(NEW."deactivatedAt", CURRENT_TIMESTAMP);
  END IF;

  UPDATE "MessageRecipient" recipient
  SET "receiptExcludedAt" = excluded_at
  FROM "Message" message
  WHERE message."id" = recipient."messageId"
    AND recipient."userId" = target_user_id
    AND message."cinemaId" = target_cinema_id
    AND recipient."receiptExcludedAt" IS NULL;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "UserCinemaMembership_exclude_message_receipts"
AFTER UPDATE OF "isActive" OR DELETE
ON "UserCinemaMembership"
FOR EACH ROW
EXECUTE FUNCTION exclude_message_receipts_for_membership_change();

CREATE OR REPLACE FUNCTION exclude_message_receipts_for_user_deactivation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE "MessageRecipient"
  SET "receiptExcludedAt" = COALESCE(NEW."deactivatedAt", CURRENT_TIMESTAMP)
  WHERE "userId" = NEW."id"
    AND "receiptExcludedAt" IS NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "User_exclude_message_receipts"
AFTER UPDATE OF "isActive"
ON "User"
FOR EACH ROW
WHEN (OLD."isActive" = TRUE AND NEW."isActive" = FALSE)
EXECUTE FUNCTION exclude_message_receipts_for_user_deactivation();
