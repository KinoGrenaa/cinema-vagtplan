import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type {
  AuthUser,
  CinemaContextValue,
  UserJobFunctionAssignData,
} from './job-function-service-helpers';
import {
  ensureAssignableJobFunctionUser,
  ensureJobFunctionAdmin,
  findJobFunctionForCinema,
  getActorUserId,
  getRequiredJobFunctionCinemaId,
  parseRequiredPositiveId,
  userJobFunctionInclude,
  withJobFunctionCinemaLock,
} from './job-function-service-helpers';

export async function findJobFunctionUsers(
  prisma: PrismaService,
  user: AuthUser,
  jobFunctionId: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureJobFunctionAdmin(user);

  const cinemaId =
    getRequiredJobFunctionCinemaId(
      user,
      selectedCinemaId,
    );

  await findJobFunctionForCinema(
    prisma,
    jobFunctionId,
    cinemaId,
  );

  return prisma.userJobFunction.findMany({
    where: {
      cinemaId,
      jobFunctionId,
    },
    include: userJobFunctionInclude,
    orderBy: [
      {
        user: {
          firstName: 'asc',
        },
      },
      {
        user: {
          lastName: 'asc',
        },
      },
      {
        createdAt: 'asc',
      },
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

  const cinemaId =
    getRequiredJobFunctionCinemaId(
      user,
      selectedCinemaId ?? data?.cinemaId,
    );
  const userId = parseRequiredPositiveId(
    data?.userId,
    'Medarbejder skal være et gyldigt ID.',
  );
  const assignedByUserId = getActorUserId(user);

  return withJobFunctionCinemaLock(
    prisma,
    cinemaId,
    async (transaction) => {
      await findJobFunctionForCinema(
        transaction,
        jobFunctionId,
        cinemaId,
        true,
      );

      await ensureAssignableJobFunctionUser(
        transaction,
        userId,
        cinemaId,
      );

      const existing =
        await transaction.userJobFunction.findFirst({
          where: {
            cinemaId,
            userId,
            jobFunctionId,
          },
          select: {
            id: true,
          },
        });

      if (existing) {
        throw new BadRequestException(
          'Medarbejderen har allerede denne jobfunktion.',
        );
      }

      return transaction.userJobFunction.create({
        data: {
          cinemaId,
          userId,
          jobFunctionId,
          assignedByUserId,
        },
        include: userJobFunctionInclude,
      });
    },
  );
}

export async function removeUserJobFunction(
  prisma: PrismaService,
  user: AuthUser,
  jobFunctionId: number,
  userId: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureJobFunctionAdmin(user);

  const cinemaId =
    getRequiredJobFunctionCinemaId(
      user,
      selectedCinemaId,
    );

  return withJobFunctionCinemaLock(
    prisma,
    cinemaId,
    async (transaction) => {
      await findJobFunctionForCinema(
        transaction,
        jobFunctionId,
        cinemaId,
      );

      const existing =
        await transaction.userJobFunction.findFirst({
          where: {
            cinemaId,
            userId,
            jobFunctionId,
          },
          select: {
            id: true,
          },
        });

      if (!existing) {
        throw new NotFoundException(
          'Medarbejderen har ikke denne jobfunktion.',
        );
      }

      return transaction.userJobFunction.delete({
        where: {
          id: existing.id,
        },
        include: userJobFunctionInclude,
      });
    },
  );
}
