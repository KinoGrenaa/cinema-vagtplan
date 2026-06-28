import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type {
  AuthUser,
  CinemaContextValue,
} from './job-function-service-helpers';
import {
  ensureJobFunctionAdmin,
  findJobFunctionForCinema,
  getRequiredJobFunctionCinemaId,
  jobFunctionInclude,
} from './job-function-service-helpers';

export async function archiveJobFunction(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureJobFunctionAdmin(user);

  const cinemaId = getRequiredJobFunctionCinemaId(user, selectedCinemaId);
  const existing = await findJobFunctionForCinema(prisma, id, cinemaId);

  if (!existing.isActive) {
    throw new BadRequestException('Jobfunktionen er allerede arkiveret.');
  }

  return prisma.jobFunction.update({
    where: { id },
    data: {
      isActive: false,
      archivedAt: new Date(),
    },
    include: jobFunctionInclude,
  });
}

export async function reactivateJobFunction(
  prisma: PrismaService,
  user: AuthUser,
  id: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureJobFunctionAdmin(user);

  const cinemaId = getRequiredJobFunctionCinemaId(user, selectedCinemaId);
  const existing = await findJobFunctionForCinema(prisma, id, cinemaId);

  if (existing.isActive) {
    throw new BadRequestException('Jobfunktionen er allerede aktiv.');
  }

  const duplicate = await prisma.jobFunction.findFirst({
    where: {
      name: existing.name,
      isActive: true,
      id: { not: id },
      cinemaId,
    },
  });

  if (duplicate) {
    throw new BadRequestException(
      'Der findes allerede en aktiv jobfunktion med samme navn.',
    );
  }

  return prisma.jobFunction.update({
    where: { id },
    data: {
      isActive: true,
      archivedAt: null,
    },
    include: jobFunctionInclude,
  });
}
