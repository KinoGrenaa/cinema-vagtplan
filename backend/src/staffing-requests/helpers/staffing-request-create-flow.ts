import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  AuthUser,
  canManageStaffing,
  CreateStaffingRequestInput,
  parseStaffingRequestDate,
  resolveStaffingCinemaId,
  staffingRequestInclude,
} from './staffing-request-helpers';

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

  const cinemaId = resolveStaffingCinemaId(user, dto.cinemaId);

  const targetUser = dto.targetUserId
    ? await prisma.user.findFirst({
        where: {
          id: dto.targetUserId,
          cinemaId,
        },
      })
    : null;

  if (dto.targetUserId && !targetUser) {
    throw new NotFoundException('Medarbejder blev ikke fundet');
  }

  let shift = dto.shiftId
    ? await prisma.shift.findFirst({
        where: {
          id: dto.shiftId,
          cinemaId,
        },
        include: {
          user: true,
          workType: true,
        },
      })
    : null;

  if (dto.shiftId && !shift) {
    throw new NotFoundException('Vagt blev ikke fundet');
  }

  const requestStartTime = shift
    ? shift.startTime
    : parseStaffingRequestDate(dto.requestStartTime);
  const requestEndTime = shift
    ? shift.endTime
    : parseStaffingRequestDate(dto.requestEndTime);

  if (!shift && (!requestStartTime || !requestEndTime)) {
    throw new BadRequestException(
      'Vælg dato og tidsinterval for bemandingsbehovet.',
    );
  }

  if (
    requestStartTime &&
    requestEndTime &&
    requestEndTime <= requestStartTime
  ) {
    throw new BadRequestException(
      'Sluttidspunktet skal være efter starttidspunktet.',
    );
  }

  const requestedWorkTypeId = shift?.workTypeId ?? dto.workTypeId ?? null;

  if (!requestedWorkTypeId) {
    throw new BadRequestException('Vælg jobfunktion for bemandingsbehovet.');
  }

  const workType = await prisma.workType.findFirst({
    where: {
      id: requestedWorkTypeId,
      cinemaId,
    },
  });

  if (!workType) {
    throw new NotFoundException('Jobfunktionen blev ikke fundet');
  }

  if (!shift) {
    shift = await prisma.shift.create({
      data: {
        cinemaId,
        userId: null,
        workTypeId: requestedWorkTypeId,
        startTime: requestStartTime!,
        endTime: requestEndTime!,
        note:
          dto.message?.trim() ||
          'Ikke tildelt vagt oprettet fra bemandingsforespørgsel',
      },
      include: {
        user: true,
        workType: true,
      },
    });

    realtimeGateway.notifyCinema(cinemaId, 'shiftsUpdated', shift);
  }

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
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
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
  realtimeGateway.server.to(`cinema-${cinemaId}`).emit('staffingRequestsUpdated', {
    cinemaId,
  });
}

async function createNotificationForStaffingRequest(
  prisma: PrismaService,
  requestId: number,
) {
  const request = await prisma.staffingRequest.findUnique({
    where: {
      id: requestId,
    },
    include: {
      targetUser: true,
      requestedByUser: true,
    },
  });

  if (!request) return;

  const notification = {
    title: 'Ny bemandingsforespørgsel',
    message:
      request.message ||
      'Der er brug for ekstra bemanding. Kan du tage en vagt?',
    type: 'STAFFING_REQUEST',
    linkUrl: '/staffing-requests',
  };

  if (request.targetUserId) {
    await prisma.notification.create({
      data: {
        cinemaId: request.cinemaId,
        userId: request.targetUserId,
        ...notification,
      },
    });

    return;
  }

  const staffUsers = await prisma.user.findMany({
    where: {
      cinemaId: request.cinemaId,
      role: {
        in: ['ADMIN', 'EMPLOYEE'],
      },
      isActive: true,
    },
    select: {
      id: true,
    },
  });

  if (staffUsers.length === 0) return;

  await prisma.notification.createMany({
    data: staffUsers.map((staffUser) => ({
      cinemaId: request.cinemaId,
      userId: staffUser.id,
      ...notification,
    })),
  });
}
