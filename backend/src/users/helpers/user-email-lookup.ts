import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';

type UserLookupClient = Pick<
  Prisma.TransactionClient,
  'user'
>;

export async function ensureUniqueUserEmail(
  prisma: UserLookupClient,
  email: string,
  errorMessage: string,
  excludedUserId?: number,
) {
  const existingUser =
    excludedUserId === undefined
      ? await prisma.user.findUnique({
          where: {
            email,
          },
        })
      : await prisma.user.findFirst({
          where: {
            email,
            id: {
              not: excludedUserId,
            },
          },
        });

  if (existingUser) {
    throw new BadRequestException(
      errorMessage,
    );
  }
}

export async function findRequiredUser(
  prisma: UserLookupClient,
  id: number,
) {
  const user = await prisma.user.findUnique({
    where: {
      id,
    },
  });

  if (!user) {
    throw new NotFoundException(
      'Bruger blev ikke fundet',
    );
  }

  return user;
}
