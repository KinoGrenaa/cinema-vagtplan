import { PrismaService } from '../../prisma/prisma.service';
import { AbsenceImpactEngineService } from '../../staffing-ai/absence-impact-engine.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { createOverlappingShiftException } from './leave-request-service-helpers';

export async function ensureNoOverlappingShift(params: {
  prisma: PrismaService;
  userId: number;
  cinemaId: number;
  startDate: Date;
  endDate: Date;
}) {
  const shift = await params.prisma.shift.findFirst({
    where: {
      userId: params.userId,
      cinemaId: params.cinemaId,
      startTime: { lt: params.endDate },
      endTime: { gt: params.startDate },
    },
    include: {
      workType: true,
    },
  });

  if (shift) {
    throw createOverlappingShiftException(shift);
  }
}

export function notifyLeaveRequestsUpdated(
  realtimeGateway: RealtimeGateway,
  cinemaId: number,
) {
  realtimeGateway.notifyCinema(cinemaId, 'leaveRequestsUpdated', {
    cinemaId,
  });
}

export async function analyzeAbsenceImpact(params: {
  absenceImpactEngineService: AbsenceImpactEngineService;
  leaveRequest: {
    id: number;
    userId: number;
    cinemaId: number;
    startDate: Date;
    endDate: Date;
  };
}) {
  try {
    return await params.absenceImpactEngineService.analyzeLeaveImpact({
      leaveRequestId: params.leaveRequest.id,
      userId: params.leaveRequest.userId,
      cinemaId: params.leaveRequest.cinemaId,
      startDate: params.leaveRequest.startDate,
      endDate: params.leaveRequest.endDate,
    });
  } catch (error) {
    console.error('Absence impact analysis failed', error);
    return null;
  }
}
