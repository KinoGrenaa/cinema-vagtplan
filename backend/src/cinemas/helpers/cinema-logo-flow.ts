import { NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';

export async function updateCinemaLogo(
  prisma: PrismaService,
  id: number,
  logoUrl: string | null,
) {
  const cinema = await prisma.cinema.findUnique({
    where: { id },
    select: {
      id: true,
    },
  });

  if (!cinema) {
    throw new NotFoundException('Biograf blev ikke fundet');
  }

  return prisma.cinema.update({
    where: { id },
    data: {
      logoUrl,
    },
  });
}
