import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import type {
  AuthUser,
  CinemaContextValue,
  UserJobFunctionAssignData,
  UserJobFunctionReplaceData,
} from './job-function-service-helpers';
import {
  ensureAssignableJobFunctionUser,
  ensureAssignableJobFunctionUsers,
  ensureJobFunctionAssignmentAdmin,
  findJobFunctionForCinema,
  getActorUserId,
  getRequiredJobFunctionCinemaId,
  parsePositiveIdList,
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
  ensureJobFunctionAssignmentAdmin(user);
  const cinemaId = getRequiredJobFunctionCinemaId(user, selectedCinemaId);
  await findJobFunctionForCinema(prisma, jobFunctionId, cinemaId);
  return prisma.userJobFunction.findMany({
    where: { cinemaId, jobFunctionId },
    include: userJobFunctionInclude,
    orderBy: [
      { user: { firstName: 'asc' } },
      { user: { lastName: 'asc' } },
      { createdAt: 'asc' },
    ],
  });
}

export async function replaceJobFunctionUsers(
  prisma: PrismaService,
  user: AuthUser,
  jobFunctionId: number,
  data: UserJobFunctionReplaceData,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureJobFunctionAssignmentAdmin(user);
  const cinemaId = getRequiredJobFunctionCinemaId(
    user,
    selectedCinemaId ?? data?.cinemaId,
  );
  const userIds = parsePositiveIdList(data?.userIds) ?? [];
  const assignedByUserId = getActorUserId(user);

  return withJobFunctionCinemaLock(prisma, cinemaId, async (transaction) => {
    await findJobFunctionForCinema(transaction, jobFunctionId, cinemaId, true);
    await ensureAssignableJobFunctionUsers(transaction, userIds, cinemaId);
    await transaction.userJobFunction.deleteMany({
      where: { cinemaId, jobFunctionId },
    });
    if (userIds.length > 0) {
      await transaction.userJobFunction.createMany({
        data: userIds.map((userId) => ({
          cinemaId,
          userId,
          jobFunctionId,
          assignedByUserId,
        })),
      });
    }
    return transaction.userJobFunction.findMany({
      where: { cinemaId, jobFunctionId },
      include: userJobFunctionInclude,
      orderBy: [{ user: { firstName: 'asc' } }, { user: { lastName: 'asc' } }],
    });
  });
}

export async function findUserJobFunctions(
  prisma: PrismaService,
  user: AuthUser,
  targetUserId: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureJobFunctionAssignmentAdmin(user);
  const cinemaId = getRequiredJobFunctionCinemaId(user, selectedCinemaId);
  await ensureAssignableJobFunctionUser(prisma, targetUserId, cinemaId);
  return prisma.userJobFunction.findMany({
    where: { cinemaId, userId: targetUserId },
    include: userJobFunctionInclude,
    orderBy: [
      { jobFunction: { sortOrder: 'asc' } },
      { jobFunction: { name: 'asc' } },
    ],
  });
}

export async function replaceUserJobFunctions(
  prisma: PrismaService,
  user: AuthUser,
  targetUserId: number,
  data: UserJobFunctionReplaceData,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureJobFunctionAssignmentAdmin(user);
  const cinemaId = getRequiredJobFunctionCinemaId(
    user,
    selectedCinemaId ?? data?.cinemaId,
  );
  const jobFunctionIds = parsePositiveIdList(data?.jobFunctionIds) ?? [];
  const assignedByUserId = getActorUserId(user);

  return withJobFunctionCinemaLock(prisma, cinemaId, async (transaction) => {
    await ensureAssignableJobFunctionUser(transaction, targetUserId, cinemaId);
    const functions = await transaction.jobFunction.findMany({
      where: { id: { in: jobFunctionIds }, cinemaId, isActive: true },
      select: { id: true },
    });
    const validIds = new Set(functions.map((item) => item.id));
    const invalidIds = jobFunctionIds.filter((id) => !validIds.has(id));
    if (invalidIds.length > 0) {
      throw new BadRequestException(
        `Følgende jobfunktioner kan ikke tildeles i biografen: ${invalidIds.join(', ')}.`,
      );
    }
    await transaction.userJobFunction.deleteMany({
      where: { cinemaId, userId: targetUserId },
    });
    if (jobFunctionIds.length > 0) {
      await transaction.userJobFunction.createMany({
        data: jobFunctionIds.map((jobFunctionId) => ({
          cinemaId,
          userId: targetUserId,
          jobFunctionId,
          assignedByUserId,
        })),
      });
    }
    return transaction.userJobFunction.findMany({
      where: { cinemaId, userId: targetUserId },
      include: userJobFunctionInclude,
      orderBy: [
        { jobFunction: { sortOrder: 'asc' } },
        { jobFunction: { name: 'asc' } },
      ],
    });
  });
}

export async function assignUserJobFunction(
  prisma: PrismaService,
  user: AuthUser,
  jobFunctionId: number,
  data: UserJobFunctionAssignData,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureJobFunctionAssignmentAdmin(user);
  const cinemaId = getRequiredJobFunctionCinemaId(
    user,
    selectedCinemaId ?? data?.cinemaId,
  );
  const userId = parseRequiredPositiveId(
    data?.userId,
    'Medarbejder skal være et gyldigt ID.',
  );
  const assignedByUserId = getActorUserId(user);

  return withJobFunctionCinemaLock(prisma, cinemaId, async (transaction) => {
    await findJobFunctionForCinema(transaction, jobFunctionId, cinemaId, true);
    await ensureAssignableJobFunctionUser(transaction, userId, cinemaId);
    const existing = await transaction.userJobFunction.findFirst({
      where: { cinemaId, userId, jobFunctionId },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException(
        'Medarbejderen har allerede denne jobfunktion.',
      );
    }
    return transaction.userJobFunction.create({
      data: { cinemaId, userId, jobFunctionId, assignedByUserId },
      include: userJobFunctionInclude,
    });
  });
}

export async function removeUserJobFunction(
  prisma: PrismaService,
  user: AuthUser,
  jobFunctionId: number,
  userId: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureJobFunctionAssignmentAdmin(user);
  const cinemaId = getRequiredJobFunctionCinemaId(user, selectedCinemaId);
  return withJobFunctionCinemaLock(prisma, cinemaId, async (transaction) => {
    await findJobFunctionForCinema(transaction, jobFunctionId, cinemaId);
    const existing = await transaction.userJobFunction.findFirst({
      where: { cinemaId, userId, jobFunctionId },
      select: { id: true },
    });
    if (!existing) {
      throw new NotFoundException(
        'Medarbejderen har ikke denne jobfunktion.',
      );
    }
    return transaction.userJobFunction.delete({
      where: { id: existing.id },
      include: userJobFunctionInclude,
    });
  });
}
