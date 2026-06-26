import { BadRequestException, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export async function ensureUniqueUserEmail(
  prisma: PrismaService,
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
    throw new BadRequestException(errorMessage);
  }
}

export async function findRequiredUser(prisma: PrismaService, id: number) {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new NotFoundException('Bruger blev ikke fundet');
  }

  return user;
}
