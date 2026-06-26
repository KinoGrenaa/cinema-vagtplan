import { StaffingRequestStatus } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeGateway } from '../../realtime/realtime.gateway';
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

export async function createAiEmergencyStaffingRequests({
  prisma,
  realtimeGateway,
  staffingAiService,
  params,
}: CreateAiEmergencyStaffingRequestsParams) {
  const candidates = await staffingAiService.getTopEmergencyCandidates(
    params.cinemaId,
    params.startTime,
    params.endTime,
    params.limit ?? 5,
  );

  const createdRequests: any[] = [];

  for (const candidate of candidates) {
    const request = await prisma.staffingRequest.create({
      data: {
        cinemaId: params.cinemaId,
        requestedByUserId: params.requestedByUserId,
        targetUserId: candidate.userId,
        shiftId: params.shiftId,
        type: 'EMERGENCY',
        status: StaffingRequestStatus.PENDING,
        priority: Math.max(1, Math.round(candidate.totalScore)),
        aiGenerated: true,
        message: params.message || 'Der er akut behov for ekstra bemanding.',
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
        cinemaId: params.cinemaId,
        userId: candidate.userId,
        title: 'Akut bemandingsforespørgsel',
        message: params.message || 'Der er akut behov for ekstra bemanding.',
        type: 'STAFFING_REQUEST',
        linkUrl: '/staffing-requests',
      },
    });
  }

  realtimeGateway.notifyStaffingRequestsUpdated(params.cinemaId);

  return createdRequests;
}
