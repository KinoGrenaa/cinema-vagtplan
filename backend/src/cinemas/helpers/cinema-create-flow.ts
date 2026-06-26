import { BadRequestException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export type CreateCinemaData = {
  name?: string;
};

export async function createCinema(
  prisma: PrismaService,
  data: CreateCinemaData,
) {
  const name = data.name?.trim();

  if (!name) {
    throw new BadRequestException('Biografnavn mangler');
  }

  const existingCinema = await prisma.cinema.findFirst({
    where: {
      name,
    },
    select: {
      id: true,
    },
  });

  if (existingCinema) {
    throw new BadRequestException(
      'Der findes allerede en biograf med dette navn',
    );
  }

  return prisma.cinema.create({
    data: {
      name,
    },
  });
}
