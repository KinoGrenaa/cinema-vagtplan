import { NotificationsService } from '../../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
import { AbsenceImpactEngineService } from '../../staffing-ai/absence-impact-engine.service';
import {
  AuthUser,
  requireUserId,
  resolveLeaveCinemaId,
  validateLeaveRequestDates,
} from './leave-request-service-helpers';
import { notifyLeaveRequestCreated } from './leave-request-notifications';
import {
  analyzeAbsenceImpact,
  ensureNoOverlappingShift,
  notifyLeaveRequestsUpdated,
} from './leave-request-processing-helpers';

export async function createLeaveRequestFlow(params: {
  prisma: PrismaService;
  absenceImpactEngineService: AbsenceImpactEngineService;
  realtimeGateway: RealtimeGateway;
  notificationsService: NotificationsService;
  user: AuthUser;
  data: {
    startDate: string;
    endDate: string;
    reason?: string;
  };
}) {
  const userId = requireUserId(params.user);
  const cinemaId = resolveLeaveCinemaId(params.user);

  const startDate = new Date(params.data.startDate);
  const endDate = new Date(params.data.endDate);

  validateLeaveRequestDates(startDate, endDate);

  await ensureNoOverlappingShift({
    prisma: params.prisma,
    userId,
    cinemaId,
    startDate,
    endDate,
  });

  const leaveRequest = await params.prisma.leaveRequest.create({
    data: {
      startDate,
      endDate,
      reason: params.data.reason,
      cinemaId,
      userId,
    },
    include: {
      user: true,
    },
  });

  await notifyLeaveRequestCreated({
    prisma: params.prisma,
    notificationsService: params.notificationsService,
    leaveRequest,
    actorUserId: userId,
  });

  notifyLeaveRequestsUpdated(params.realtimeGateway, leaveRequest.cinemaId);

  const absenceImpact = await analyzeAbsenceImpact({
    absenceImpactEngineService: params.absenceImpactEngineService,
    leaveRequest,
  });

  return {
    leaveRequest,
    absenceImpact,
  };
}
