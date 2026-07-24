import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { withUserWriteLock } from '../../users/helpers/user-write-lock';

type AuthDefaultCinemaDbClient =
  Prisma.TransactionClient;

export async function updateAuthDefaultCinemaFlow(
  prisma: PrismaService,
  userId: number,
  cinemaId: number | null,
) {
  return withUserWriteLock(
    prisma,
    userId,
    async (
      transaction: AuthDefaultCinemaDbClient,
      lockedUserId,
    ) => {
      const user =
        await transaction.user.findUnique({
          where: {
            id: lockedUserId,
          },
          select: {
            id: true,
            role: true,
            isActive: true,
          },
        });

      if (!user) {
        throw new NotFoundException(
          'Brugeren blev ikke fundet',
        );
      }

      if (!user.isActive) {
        throw new UnauthorizedException(
          'Brugeren er deaktiveret',
        );
      }

      if (user.role === 'MASTER') {
        if (cinemaId !== null) {
          const cinema =
            await transaction.cinema.findUnique({
              where: {
                id: cinemaId,
              },
              select: {
                id: true,
              },
            });

          if (!cinema) {
            throw new BadRequestException(
              'Den valgte biograf findes ikke',
            );
          }
        }
      } else {
        if (cinemaId === null) {
          throw new BadRequestException(
            'ADMIN og EMPLOYEE skal have en standardbiograf',
          );
        }

        const membership =
          await transaction.userCinemaMembership.findFirst(
            {
              where: {
                userId: lockedUserId,
                cinemaId,
                isActive: true,
              },
              select: {
                id: true,
              },
            },
          );

        if (!membership) {
          throw new ForbiddenException(
            'Du kan kun vælge standard blandt dine aktive biograftilknytninger',
          );
        }
      }

      await transaction.user.update({
        where: {
          id: lockedUserId,
        },
        data: {
          defaultCinemaId: cinemaId,
        },
      });

      return {
        userId: lockedUserId,
        defaultCinemaId: cinemaId,
      };
    },
  );
}
