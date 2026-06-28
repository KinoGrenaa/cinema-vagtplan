import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type {
  AuthUser,
  CinemaContextValue,
  UserJobFunctionAssignData,
} from './job-function-service-helpers';
import {
  ensureJobFunctionAdmin,
  findJobFunctionForCinema,
  getActorUserId,
  getRequiredJobFunctionCinemaId,
  parseRequiredPositiveId,
  userJobFunctionInclude,
} from './job-function-service-helpers';

export async function findJobFunctionUsers(
  prisma: PrismaService,
  user: AuthUser,
  jobFunctionId: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureJobFunctionAdmin(user);

  const cinemaId = getRequiredJobFunctionCinemaId(user, selectedCinemaId);
  await findJobFunctionForCinema(prisma, jobFunctionId, cinemaId);

  return prisma.userJobFunction.findMany({
    where: {
      cinemaId,
      jobFunctionId,
    },
    include: userJobFunctionInclude,
    orderBy: [
      { user: { firstName: 'asc' } },
      { user: { lastName: 'asc' } },
      { createdAt: 'asc' },
    ],
  });
}

export async function assignUserJobFunction(
  prisma: PrismaService,
  user: AuthUser,
  jobFunctionId: number,
  data: UserJobFunctionAssignData,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureJobFunctionAdmin(user);

  const cinemaId = getRequiredJobFunctionCinemaId(
    user,
    selectedCinemaId ?? data.cinemaId,
  );
  await findJobFunctionForCinema(prisma, jobFunctionId, cinemaId, true);

  const userId = parseRequiredPositiveId(
    data.userId,
    'Medarbejder skal være et gyldigt ID.',
  );

  const employee = await prisma.user.findFirst({
    where: {
      id: userId,
      cinemaId,
      isActive: true,
      role: { not: 'MASTER' },
    },
    select: {
      id: true,
    },
  });

  if (!employee) {
    throw new BadRequestException(
      'Medarbejderen findes ikke for den valgte biograf.',
    );
  }

  const existing = await prisma.userJobFunction.findFirst({
    where: {
      cinemaId,
      userId,
      jobFunctionId,
    },
  });

  if (existing) {
    throw new BadRequestException(
      'Medarbejderen har allerede denne jobfunktion.',
    );
  }

  return prisma.userJobFunction.create({
    data: {
      cinemaId,
      userId,
      jobFunctionId,
      assignedByUserId: getActorUserId(user),
    },
    include: userJobFunctionInclude,
  });
}

export async function removeUserJobFunction(
  prisma: PrismaService,
  user: AuthUser,
  jobFunctionId: number,
  userId: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureJobFunctionAdmin(user);

  const cinemaId = getRequiredJobFunctionCinemaId(user, selectedCinemaId);
  await findJobFunctionForCinema(prisma, jobFunctionId, cinemaId);

  const existing = await prisma.userJobFunction.findFirst({
    where: {
      cinemaId,
      userId,
      jobFunctionId,
    },
  });

  if (!existing) {
    throw new NotFoundException('Medarbejderen har ikke denne jobfunktion.');
  }

  return prisma.userJobFunction.delete({
    where: {
      id: existing.id,
    },
    include: userJobFunctionInclude,
  });
}
