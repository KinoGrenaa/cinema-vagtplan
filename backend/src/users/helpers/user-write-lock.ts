import type { Prisma } from '@prisma/client';
import { parseRequiredPositiveInteger } from '../../common/query-validation';
import type { PrismaService } from '../../prisma/prisma.service';

export type UserWriteDbClient =
  Prisma.TransactionClient;

const USER_WRITE_LOCK_NAMESPACE = 1_431_658_342;
const USER_DIRECTORY_LOCK_NAMESPACE = 1_431_658_343;

export async function lockUserWrite(
  transaction: UserWriteDbClient,
  userIdValue: unknown,
) {
  const userId = parseRequiredPositiveInteger(
    userIdValue,
    'Bruger skal være et gyldigt ID',
  );

  await transaction.$executeRaw`
    SELECT pg_advisory_xact_lock(
      ${USER_WRITE_LOCK_NAMESPACE},
      ${userId}
    )
  `;

  return userId;
}

export async function withUserWriteLock<T>(
  prisma: PrismaService,
  userIdValue: unknown,
  action: (
    transaction: UserWriteDbClient,
    userId: number,
  ) => Promise<T>,
) {
  return prisma.$transaction(
    async (transaction) => {
      const userId = await lockUserWrite(
        transaction,
        userIdValue,
      );

      return action(transaction, userId);
    },
  );
}

export async function withUserDirectoryWriteLock<T>(
  prisma: PrismaService,
  action: (
    transaction: UserWriteDbClient,
  ) => Promise<T>,
) {
  return prisma.$transaction(
    async (transaction) => {
      await transaction.$executeRaw`
        SELECT pg_advisory_xact_lock(
          ${USER_DIRECTORY_LOCK_NAMESPACE},
          0
        )
      `;

      return action(transaction);
    },
  );
}
