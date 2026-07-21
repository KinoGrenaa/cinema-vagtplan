import type { PrismaService } from '../../prisma/prisma.service';
import {
  ensureCinemaNameAvailable,
  normalizeCinemaName,
  withCinemaWriteLock,
} from './cinema-write-access';

export type CreateCinemaData = {
  name?: unknown;
};

export async function createCinema(
  prisma: PrismaService,
  data: CreateCinemaData,
) {
  const name = normalizeCinemaName(
    data?.name,
  );

  return withCinemaWriteLock(
    prisma,
    async (transaction) => {
      await ensureCinemaNameAvailable(
        transaction,
        name,
      );

      return transaction.cinema.create({
        data: {
          name,
        },
      });
    },
  );
}
