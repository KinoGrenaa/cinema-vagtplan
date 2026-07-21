import type { Prisma } from '@prisma/client';
import { parseRequiredPositiveInteger } from '../../common/query-validation';
import type { PrismaService } from '../../prisma/prisma.service';

export type UserWriteDbClient =
  Prisma.TransactionClient;

const USER_WRITE_LOCK_NAMESPACE = 1_431_658_342;

export async function withUserWriteLock<T>(
  prisma: PrismaService,
  userIdValue: unknown,
  action: (
    transaction: UserWriteDbClient,
    userId: number,
  ) => Promise<T>,
) {
  const userId = parseRequiredPositiveInteger(
    userIdValue,
    'Bruger skal være et gyldigt ID',
  );

  return prisma.$transaction(
    async (transaction) => {
      await transaction.$executeRaw`
        SELECT pg_advisory_xact_lock(
          ${USER_WRITE_LOCK_NAMESPACE},
          ${userId}
        )
      `;

      return action(transaction, userId);
    },
  );
}
