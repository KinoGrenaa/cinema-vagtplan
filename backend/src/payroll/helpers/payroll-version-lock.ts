const VERSION_LOCK_NAMESPACE = 8_302_026n;
const MAX_LOCK_SCOPE = 0xffff_ffff;

/**
 * PostgreSQL supports advisory transaction locks as either one bigint key or
 * two signed 32-bit integer keys. Prisma serializes JavaScript numbers as
 * bigint parameters, so passing two numbers selects a non-existent
 * pg_advisory_xact_lock(bigint, bigint) overload.
 *
 * Pack namespace and scope into one signed-positive bigint key instead.
 */
export function payrollVersionLockKey(scopeId: number) {
  if (
    !Number.isSafeInteger(scopeId) ||
    scopeId < 0 ||
    scopeId > MAX_LOCK_SCOPE
  ) {
    throw new RangeError('Låsens scope-ID skal være et usigneret 32-bit heltal.');
  }

  return (VERSION_LOCK_NAMESPACE << 32n) | BigInt(scopeId);
}
