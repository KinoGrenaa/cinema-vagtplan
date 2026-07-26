import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  CinemaRole,
  StaffingRequestStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  getStaffingRequestNotificationLink,
} from '../../notifications/helpers/notification-deep-links';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  ensureAiRequestActorAccess,
  getActiveCinemaUserWhere,
} from '../../staffing-ai/staffing-ai-cinema-access';
import { StaffingAiService } from '../../staffing-ai/staffing-ai.service';

type CreateAiEmergencyStaffingRequestsParams = {
  prisma: PrismaService;
  realtimeGateway: RealtimeGateway;
  staffingAiService: StaffingAiService;
  params: {
    cinemaId: number;
    requestedByUserId: number;
    startTime: Date;
    endTime: Date;
    shiftId?: number;
    message?: string;
    limit?: number;
  };
};

function getRequiredPositiveId(
  value: unknown,
  message: string,
) {
  const id = Number(value);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    throw new BadRequestException(message);
  }

  return id;
}

function getOptionalPositiveId(
  value: unknown,
  message: string,
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return undefined;
  }

  return getRequiredPositiveId(
    value,
    message,
  );
}

function getRequiredDate(
  value: unknown,
  message: string,
) {
  const date =
    value instanceof Date
      ? value
      : new Date(value as string);

  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(message);
  }

  return date;
}

function getValidatedDateRange(
  startTime: unknown,
  endTime: unknown,
) {
  const start = getRequiredDate(
    startTime,
    'Starttid skal være en gyldig dato',
  );
  const end = getRequiredDate(
    endTime,
    'Sluttid skal være en gyldig dato',
  );

  if (end.getTime() <= start.getTime()) {
    throw new BadRequestException(
      'Sluttid skal være efter starttid',
    );
  }

  return {
    start,
    end,
  };
}

function getSafeLimit(value: unknown) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return 5;
  }

  const limit = Number(value);

  if (
    !Number.isInteger(limit) ||
    limit <= 0
  ) {
    throw new BadRequestException(
      'Antal kandidater skal være et positivt heltal',
    );
  }

  return Math.min(limit, 20);
}

async function ensureShiftBelongsToCinema(
  params: {
    prisma: PrismaService;
    shiftId?: number;
    cinemaId: number;
  },
) {
  if (!params.shiftId) {
    return undefined;
  }

  const shift =
    await params.prisma.shift.findUnique({
      where: {
        id: params.shiftId,
      },
      select: {
        id: true,
        cinemaId: true,
      },
    });

  if (!shift) {
    throw new NotFoundException(
      'Vagten blev ikke fundet',
    );
  }

  if (shift.cinemaId !== params.cinemaId) {
    throw new ForbiddenException(
      'Vagten tilhører ikke den valgte biograf',
    );
  }

  return shift.id;
}

export async function createAiEmergencyStaffingRequests({
  prisma,
  realtimeGateway,
  staffingAiService,
  params,
}: CreateAiEmergencyStaffingRequestsParams) {
  const cinemaId = getRequiredPositiveId(
    params.cinemaId,
    'Biograf skal være et gyldigt ID',
  );
  const requestedByUserId =
    getRequiredPositiveId(
      params.requestedByUserId,
      'Bruger skal være et gyldigt ID',
    );
  const shiftId = getOptionalPositiveId(
    params.shiftId,
    'Vagt skal være et gyldigt ID',
  );
  const {
    start,
    end,
  } = getValidatedDateRange(
    params.startTime,
    params.endTime,
  );
  const limit = getSafeLimit(
    params.limit,
  );
  const message =
    typeof params.message === 'string' &&
    params.message.trim() !== ''
      ? params.message
      : 'Der er akut behov for ekstra bemanding.';

  await ensureAiRequestActorAccess({
    prisma,
    requestedByUserId,
    cinemaId,
  });
  const validatedShiftId =
    await ensureShiftBelongsToCinema({
      prisma,
      shiftId,
      cinemaId,
    });
  const candidates =
    await staffingAiService.getTopEmergencyCandidates(
      cinemaId,
      start,
      end,
      limit,
    );

  const createdRequests: any[] = [];

  for (const candidate of candidates) {
    const activeCandidate =
      await prisma.user.findFirst({
        where: getActiveCinemaUserWhere({
          cinemaId,
          role:
            CinemaRole.EMPLOYEE,
          userId: candidate.userId,
        }),
        select: {
          id: true,
        },
      });

    if (!activeCandidate) {
      continue;
    }

    const request =
      await prisma.staffingRequest.create({
        data: {
          cinemaId,
          requestedByUserId,
          targetUserId:
            candidate.userId,
          shiftId: validatedShiftId,
          type: 'EMERGENCY',
          status:
            StaffingRequestStatus.PENDING,
          priority: Math.max(
            1,
            Math.round(
              candidate.totalScore,
            ),
          ),
          aiGenerated: true,
          message,
        },
        include: {
          targetUser: true,
          requestedByUser: true,
          shift: true,
        },
      });

    createdRequests.push({
      request,
      candidate,
    });

    await prisma.notification.create({
      data: {
        cinemaId,
        userId: candidate.userId,
        title:
          'Akut bemandingsforespørgsel',
        message,
        type: 'STAFFING_REQUEST',
        linkUrl:
          getStaffingRequestNotificationLink(
            request.id,
          ),
      },
    });
  }

  realtimeGateway
    .notifyStaffingRequestsUpdated(
      cinemaId,
    );

  return createdRequests;
}
