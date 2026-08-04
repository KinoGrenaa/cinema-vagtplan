import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  AuthUser,
  canManageStaffing,
  CreateStaffingRequestInput,
  normalizeCreateStaffingRequestInput,
  resolveStaffingCinemaId,
  staffingRequestInclude,
} from './staffing-request-helpers';
import {
  ensureStaffingRequestActorAccess,
  ensureStaffingRequestTargetUserExists,
  resolveStaffingRequestShift,
  resolveStaffingRequestJobFunction,
} from './staffing-request-create-lookups';
import { createNotificationForStaffingRequest } from './staffing-request-create-notifications';
import { resolveStaffingRequestSchedule } from './staffing-request-create-schedule';
import { createUnassignedStaffingShiftIfNeeded } from './staffing-request-create-unassigned-shift';

type CreateStaffingRequestParams = {
  prisma: PrismaService;
  realtimeGateway: RealtimeGateway;
  user: AuthUser;
  dto: CreateStaffingRequestInput;
};

export async function createStaffingRequest({
  prisma,
  realtimeGateway,
  user,
  dto,
}: CreateStaffingRequestParams) {
  if (!canManageStaffing(user)) {
    throw new ForbiddenException(
      'Du må ikke oprette bemandingsforespørgsler',
    );
  }

  const normalizedDto = normalizeCreateStaffingRequestInput(dto);
  const cinemaId = resolveStaffingCinemaId(
    user,
    normalizedDto.cinemaId,
  );

  await ensureStaffingRequestActorAccess({ prisma, user, cinemaId });
  await ensureStaffingRequestTargetUserExists({
    prisma,
    cinemaId,
    targetUserId: normalizedDto.targetUserId,
  });

  let shift = await resolveStaffingRequestShift({
    prisma,
    cinemaId,
    shiftId: normalizedDto.shiftId,
  });
  const schedule = resolveStaffingRequestSchedule({
    dto: normalizedDto,
    shift,
  });
  const jobFunction = await resolveStaffingRequestJobFunction({
    prisma,
    cinemaId,
    dto: normalizedDto,
    shift,
  });

  shift = await createUnassignedStaffingShiftIfNeeded({
    prisma,
    realtimeGateway,
    cinemaId,
    dto: normalizedDto,
    shift,
    jobFunction,
    schedule,
  });

  const request = await prisma.staffingRequest.create({
    data: {
      cinemaId,
      requestedByUserId: user.sub,
      targetUserId: normalizedDto.targetUserId ?? null,
      shiftId: shift.id,
      requestStartTime: shift.startTime,
      requestEndTime: shift.endTime,
      jobFunctionId: jobFunction.id,
      workTypeId: null,
      type: normalizedDto.type,
      priority: normalizedDto.priority ?? 1,
      message: normalizedDto.message,
      aiGenerated: normalizedDto.aiGenerated ?? false,
      expiresAt: normalizedDto.expiresAt
        ? new Date(normalizedDto.expiresAt)
        : undefined,
    },
    include: staffingRequestInclude,
  });

  await createNotificationForStaffingRequest(prisma, request.id);
  emitStaffingRequestsUpdate(realtimeGateway, request.cinemaId);

  return request;
}

function emitStaffingRequestsUpdate(
  realtimeGateway: RealtimeGateway,
  cinemaId: number,
) {
  realtimeGateway.server
    .to(`cinema-${cinemaId}`)
    .emit('staffingRequestsUpdated', { cinemaId });
}
