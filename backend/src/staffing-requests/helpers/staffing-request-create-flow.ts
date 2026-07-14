import { ForbiddenException } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  AuthUser,
  canManageStaffing,
  CreateStaffingRequestInput,
  resolveStaffingCinemaId,
  staffingRequestInclude,
} from './staffing-request-helpers';
import {
  ensureStaffingRequestActorAccess,
  ensureStaffingRequestTargetUserExists,
  resolveStaffingRequestShift,
  resolveStaffingRequestWorkTypeId,
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

  const cinemaId = resolveStaffingCinemaId(
    user,
    dto.cinemaId,
  );

  await ensureStaffingRequestActorAccess({
    prisma,
    user,
    cinemaId,
  });

  await ensureStaffingRequestTargetUserExists({
    prisma,
    cinemaId,
    targetUserId: dto.targetUserId,
  });

  let shift = await resolveStaffingRequestShift({
    prisma,
    cinemaId,
    shiftId: dto.shiftId,
  });

  const schedule = resolveStaffingRequestSchedule({
    dto,
    shift,
  });

  const requestedWorkTypeId =
    await resolveStaffingRequestWorkTypeId({
      prisma,
      cinemaId,
      dto,
      shift,
    });

  shift = await createUnassignedStaffingShiftIfNeeded({
    prisma,
    realtimeGateway,
    cinemaId,
    dto,
    shift,
    requestedWorkTypeId,
    schedule,
  });

  const request = await prisma.staffingRequest.create({
    data: {
      cinemaId,
      requestedByUserId: user.sub,
      targetUserId: dto.targetUserId ?? null,
      shiftId: shift.id,
      requestStartTime: shift.startTime,
      requestEndTime: shift.endTime,
      workTypeId: requestedWorkTypeId,
      type: dto.type,
      priority: dto.priority ?? 1,
      message: dto.message,
      aiGenerated: dto.aiGenerated ?? false,
      expiresAt: dto.expiresAt
        ? new Date(dto.expiresAt)
        : undefined,
    },
    include: staffingRequestInclude,
  });

  await createNotificationForStaffingRequest(
    prisma,
    request.id,
  );

  emitStaffingRequestsUpdate(
    realtimeGateway,
    request.cinemaId,
  );

  return request;
}

function emitStaffingRequestsUpdate(
  realtimeGateway: RealtimeGateway,
  cinemaId: number,
) {
  realtimeGateway.server
    .to(`cinema-${cinemaId}`)
    .emit('staffingRequestsUpdated', {
      cinemaId,
    });
}
