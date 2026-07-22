import type { Prisma } from '@prisma/client';

type ShiftAdvisoryLockClient = Pick<
  Prisma.TransactionClient,
  '$executeRaw'
>;

export const SHIFT_USER_LOCK_NAMESPACE =
  56_001;
export const SHIFT_RECORD_LOCK_NAMESPACE =
  56_002;

export async function acquireShiftAdvisoryLock(
  prisma: ShiftAdvisoryLockClient,
  namespace: number,
  resourceId: number,
) {
  await prisma.$executeRaw`
    SELECT pg_advisory_xact_lock(
      CAST(${namespace} AS integer),
      CAST(${resourceId} AS integer)
    )
  `;
}
