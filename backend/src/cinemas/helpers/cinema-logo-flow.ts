import type { PrismaService } from '../../prisma/prisma.service';
import {
  findCinemaForWrite,
  normalizeCinemaLogoUrl,
  withCinemaWriteLock,
} from './cinema-write-access';

export async function updateCinemaLogo(
  prisma: PrismaService,
  id: number,
  logoUrl: string | null,
) {
  const normalizedLogoUrl =
    normalizeCinemaLogoUrl(logoUrl);

  return withCinemaWriteLock(
    prisma,
    async (transaction) => {
      const cinema = await findCinemaForWrite(
        transaction,
        id,
      );

      return transaction.cinema.update({
        where: {
          id: cinema.id,
        },
        data: {
          logoUrl: normalizedLogoUrl,
        },
      });
    },
  );
}
