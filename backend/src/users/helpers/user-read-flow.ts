import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { AuthUser } from './user-service-helpers';
import { ensureCinemaExists } from './user-service-data-helpers';

export async function findAllUsers(
  prisma: PrismaService,
  currentUser: AuthUser,
  selectedCinemaId?: number,
) {
  if (currentUser.role === 'MASTER') {
    if (selectedCinemaId) {
      await ensureCinemaExists(prisma, selectedCinemaId);
    }

    return prisma.user.findMany({
      where: selectedCinemaId
        ? {
            cinemaId: selectedCinemaId,
          }
        : {},
      include: {
        cinema: true,
      },
      orderBy: {
        firstName: 'asc',
      },
    });
  }

  if (!currentUser.cinemaId) {
    throw new ForbiddenException('Din bruger er ikke tilknyttet en biograf');
  }

  const cinemaId = currentUser.cinemaId;

  return prisma.user.findMany({
    where: {
      cinemaId,
    },
    include: {
      cinema: true,
    },
    orderBy: {
      firstName: 'asc',
    },
  });
}

export async function findUserByEmail(prisma: PrismaService, email: string) {
  return prisma.user.findFirst({
    where: {
      email,
      isActive: true,
    },
  });
}

export async function findUserByEmailIncludingInactive(
  prisma: PrismaService,
  email: string,
) {
  return prisma.user.findUnique({
    where: {
      email,
    },
  });
}

export async function findUserOwnProfile(prisma: PrismaService, id: number) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      cinemaId: true,
      profileImage: true,
      address: true,
      birthDate: true,
      emergencyPhone: true,
      skills: true,
    },
  });

  if (!user) {
    throw new NotFoundException('Bruger blev ikke fundet');
  }

  return user;
}
