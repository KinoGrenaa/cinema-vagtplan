import { BadRequestException } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';
import {
  AuthUser,
  CinemaContextValue,
  ensureAssignableUserForJobFunction,
  ensureScheduleTemplateAdmin,
  findScheduleTemplateForCinema,
  findScheduleTemplateJobFunctionForCinema,
  getRequiredScheduleTemplateCinemaId,
  parseOptionalSortOrder,
  parseRequiredPositiveId,
  ScheduleTemplateAssignmentData,
  scheduleTemplateJobFunctionInclude,
} from './schedule-template-service-helpers';

export async function addScheduleTemplateAssignment(
  prisma: PrismaService,
  user: AuthUser,
  templateId: number,
  templateJobFunctionId: number,
  data: ScheduleTemplateAssignmentData,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureScheduleTemplateAdmin(user);
  const cinemaId = getRequiredScheduleTemplateCinemaId(
    user,
    selectedCinemaId ?? data?.cinemaId,
  );
  await findScheduleTemplateForCinema(prisma, templateId, cinemaId, true);
  const templateJobFunction = await findScheduleTemplateJobFunctionForCinema(
    prisma,
    templateJobFunctionId,
    templateId,
    cinemaId,
  );
  const userId = parseRequiredPositiveId(
    data?.userId,
    'Medarbejder skal være et gyldigt ID.',
  );
  await ensureAssignableUserForJobFunction(
    prisma,
    userId,
    templateJobFunction.jobFunctionId,
    cinemaId,
  );

  const duplicate = await prisma.scheduleTemplateAssignment.findFirst({
    where: {
      templateJobFunctionId: templateJobFunction.id,
      userId,
    },
    select: { id: true },
  });

  if (duplicate) {
    throw new BadRequestException(
      'Medarbejderen er allerede standardmedarbejder på denne linje.',
    );
  }

  const sortOrder = parseOptionalSortOrder(data?.sortOrder) ?? 0;

  await prisma.scheduleTemplateAssignment.create({
    data: {
      cinemaId,
      templateJobFunctionId: templateJobFunction.id,
      userId,
      sortOrder,
    },
  });

  return prisma.scheduleTemplateJobFunction.findUnique({
    where: { id: templateJobFunction.id },
    include: scheduleTemplateJobFunctionInclude,
  });
}

export async function removeScheduleTemplateAssignment(
  prisma: PrismaService,
  user: AuthUser,
  templateId: number,
  templateJobFunctionId: number,
  assignmentId: number,
  selectedCinemaId?: CinemaContextValue,
) {
  ensureScheduleTemplateAdmin(user);
  const cinemaId = getRequiredScheduleTemplateCinemaId(user, selectedCinemaId);
  await findScheduleTemplateForCinema(prisma, templateId, cinemaId, true);
  const templateJobFunction = await findScheduleTemplateJobFunctionForCinema(
    prisma,
    templateJobFunctionId,
    templateId,
    cinemaId,
  );

  const assignment = await prisma.scheduleTemplateAssignment.findFirst({
    where: {
      id: assignmentId,
      cinemaId,
      templateJobFunctionId: templateJobFunction.id,
    },
    select: { id: true },
  });

  if (!assignment) {
    throw new BadRequestException(
      'Standardmedarbejderen findes ikke på denne skabelonlinje.',
    );
  }

  await prisma.scheduleTemplateAssignment.delete({
    where: { id: assignment.id },
  });

  return prisma.scheduleTemplateJobFunction.findUnique({
    where: { id: templateJobFunction.id },
    include: scheduleTemplateJobFunctionInclude,
  });
}
