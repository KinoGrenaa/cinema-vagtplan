import { BadRequestException } from '@nestjs/common';
import { AbsenceImpactEngineService } from '../../staffing-ai/absence-impact-engine.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import {
  createOverlappingShiftException,
} from './leave-request-service-helpers';

type LeaveConflictClient = {
  shift: {
    findFirst(args: any): Promise<any>;
  };
  leaveRequest: {
    findFirst(args: any): Promise<any>;
  };
};

export async function ensureNoOverlappingShift(
  params: {
    prisma: LeaveConflictClient;
    userId: number;
    cinemaId: number;
    startDate: Date;
    endDate: Date;
  },
) {
  const shift = await params.prisma.shift.findFirst({
    where: {
      userId: params.userId,
      cinemaId: params.cinemaId,
      startTime: {
        lt: params.endDate,
      },
      endTime: {
        gt: params.startDate,
      },
    },
    select: {
      startTime: true,
      endTime: true,
      jobFunction: {
        select: {
          name: true,
        },
      },
      jobFunctionNameSnapshot: true,
    },
  });

  if (shift) {
    throw createOverlappingShiftException(shift);
  }
}

export async function ensureNoOverlappingLeaveRequest(
  params: {
    prisma: LeaveConflictClient;
    userId: number;
    cinemaId: number;
    startDate: Date;
    endDate: Date;
    excludeLeaveRequestId?: number;
    statuses?: string[];
  },
) {
  const overlappingLeaveRequest =
    await params.prisma.leaveRequest.findFirst({
      where: {
        userId: params.userId,
        cinemaId: params.cinemaId,
        status: {
          in: params.statuses ?? [
            'PENDING',
            'APPROVED',
          ],
        },
        startDate: {
          lt: params.endDate,
        },
        endDate: {
          gt: params.startDate,
        },
        ...(params.excludeLeaveRequestId
          ? {
              id: {
                not:
                  params.excludeLeaveRequestId,
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

  if (overlappingLeaveRequest) {
    throw new BadRequestException(
      'Der findes allerede en fraværsansøgning i dette tidsrum.',
    );
  }
}

export function notifyLeaveRequestsUpdated(
  realtimeGateway: RealtimeGateway,
  cinemaId: number,
) {
  realtimeGateway.notifyCinema(
    cinemaId,
    'leaveRequestsUpdated',
    {
      cinemaId,
    },
  );
}

export async function analyzeAbsenceImpact(
  params: {
    absenceImpactEngineService:
      AbsenceImpactEngineService;
    leaveRequest: {
      id: number;
      userId: number;
      cinemaId: number;
      startDate: Date;
      endDate: Date;
    };
  },
) {
  try {
    return await params.absenceImpactEngineService.analyzeLeaveImpact(
      {
        leaveRequestId:
          params.leaveRequest.id,
        userId:
          params.leaveRequest.userId,
        cinemaId:
          params.leaveRequest.cinemaId,
        startDate:
          params.leaveRequest.startDate,
        endDate:
          params.leaveRequest.endDate,
      },
    );
  } catch (error) {
    console.error(
      'Absence impact analysis failed',
      error,
    );
    return null;
  }
}
