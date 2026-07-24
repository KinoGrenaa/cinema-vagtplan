-- Convert legacy global deactivation of ordinary users into
-- cinema-scoped inactive memberships.
UPDATE "UserCinemaMembership" AS membership
SET
  "isActive" = false,
  "deactivatedAt" = COALESCE(
    membership."deactivatedAt",
    app_user."deactivatedAt",
    CURRENT_TIMESTAMP
  )
FROM "User" AS app_user
WHERE
  app_user."id" = membership."userId"
  AND app_user."role" <> 'MASTER'::"Role"
  AND app_user."isActive" = false;

-- Global active status is retained only as an account-wide/system block.
-- Ordinary cinema access is now controlled by UserCinemaMembership.
UPDATE "User"
SET
  "isActive" = true,
  "deactivatedAt" = NULL
WHERE
  "role" <> 'MASTER'::"Role"
  AND "isActive" = false;
