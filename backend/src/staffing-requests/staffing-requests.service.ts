import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { StaffingRequestStatus, StaffingRequestType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';
import { CreateStaffingRequestDto } from './dto/create-staffing-request.dto';
import { StaffingAiService } from '../staffing-ai/staffing-ai.service';

type AuthUser = {
  sub: number;
  email: string;
  role: 'MASTER' | 'ADMIN' | 'EMPLOYEE';
  cinemaId: number;
};

@Injectable()
export class StaffingRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeGateway: RealtimeGateway,
    private readonly staffingAiService: StaffingAiService,
  ) {}

  private getCinemaFilter(user: AuthUser) {
    if (user.role === 'MASTER') return {};
    return { cinemaId: user.cinemaId };
  }

  private canManageStaffing(user: AuthUser) {
    return user.role === 'MASTER' || user.role === 'ADMIN';
  }

  private emitUpdate(cinemaId: number) {
    this.realtimeGateway.server
      .to(`cinema-${cinemaId}`)
      .emit('staffingRequestsUpdated', {
        cinemaId,
      });
  }

  async findAll(user: AuthUser) {
    if (!this.canManageStaffing(user)) {
      return this.findMine(user);
    }

    return this.prisma.staffingRequest.findMany({
      where: this.getCinemaFilter(user),
      include: {
        cinema: true,
        shift: {
          include: {
            user: true,
            workType: true,
          },
        },
        requestedByUser: true,
        targetUser: true,
      },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findMine(user: AuthUser) {
    return this.prisma.staffingRequest.findMany({
      where: {
        ...this.getCinemaFilter(user),
        OR: [{ targetUserId: user.sub }, { requestedByUserId: user.sub }],
      },
      include: {
        cinema: true,
        shift: {
          include: {
            user: true,
            workType: true,
          },
        },
        requestedByUser: true,
        targetUser: true,
      },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async create(user: AuthUser, dto: CreateStaffingRequestDto) {
    if (!this.canManageStaffing(user) && !dto.aiGenerated) {
      throw new ForbiddenException('Du må ikke oprette staffing requests');
    }

    const targetUser = dto.targetUserId
      ? await this.prisma.user.findFirst({
          where: {
            id: dto.targetUserId,
            ...this.getCinemaFilter(user),
          },
        })
      : null;

    if (dto.targetUserId && !targetUser) {
      throw new NotFoundException('Medarbejder blev ikke fundet');
    }

    const shift = dto.shiftId
      ? await this.prisma.shift.findFirst({
          where: {
            id: dto.shiftId,
            ...this.getCinemaFilter(user),
          },
        })
      : null;

    if (dto.shiftId && !shift) {
      throw new NotFoundException('Vagt blev ikke fundet');
    }

    const request = await this.prisma.staffingRequest.create({
      data: {
        cinemaId: user.cinemaId,
        requestedByUserId: user.sub,
        targetUserId: dto.targetUserId,
        shiftId: dto.shiftId,
        type: dto.type,
        priority: dto.priority ?? 1,
        message: dto.message,
        aiGenerated: dto.aiGenerated ?? false,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
      include: {
        cinema: true,
        shift: {
          include: {
            user: true,
            workType: true,
          },
        },
        requestedByUser: true,
        targetUser: true,
      },
    });

    await this.createNotificationForRequest(request.id);
    this.emitUpdate(request.cinemaId);

    return request;
  }

  async accept(user: AuthUser, id: number) {
    const request = await this.findOneForUser(user, id);

    if (request.status !== StaffingRequestStatus.PENDING) {
      throw new BadRequestException('Staffing request er ikke længere åben');
    }

    if (
      user.role === 'EMPLOYEE' &&
      request.targetUserId &&
      request.targetUserId !== user.sub
    ) {
      throw new ForbiddenException('Du kan ikke acceptere denne request');
    }

    const updated = await this.prisma.staffingRequest.update({
      where: { id },
      data: {
        status: StaffingRequestStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
      include: {
        cinema: true,
        shift: {
          include: {
            user: true,
            workType: true,
          },
        },
        requestedByUser: true,
        targetUser: true,
      },
    });

    if (!updated.shiftId) {
      const defaultWorkType = await this.prisma.workType.findFirst({
        where: {
          cinemaId: updated.cinemaId,
        },
        orderBy: {
          id: 'asc',
        },
      });

      if (defaultWorkType) {
        const now = new Date();

        const startTime = new Date(now);
        startTime.setMinutes(0, 0, 0);

        const endTime = new Date(startTime);
        endTime.setHours(endTime.getHours() + 2);

        await this.prisma.shift.create({
          data: {
            cinemaId: updated.cinemaId,
            userId: user.sub,
            workTypeId: defaultWorkType.id,
            startTime,
            endTime,
            note: `Auto-created from staffing request #${updated.id}`,
          },
        });

        const admins = await this.prisma.user.findMany({
          where: {
            cinemaId: updated.cinemaId,
            role: {
              in: ['MASTER', 'ADMIN'],
            },
          },
          select: {
            id: true,
          },
        });

        await this.prisma.notification.createMany({
          data: admins.map((admin) => ({
            cinemaId: updated.cinemaId,
            userId: admin.id,
            title: 'Emergency staffing accepted',
            message: `${user.email} accepterede staffing request #${updated.id}`,
            type: 'STAFFING_ACCEPTED',
            linkUrl: '/staffing-requests',
          })),
        });
      }
    }

    await this.prisma.staffingRequest.updateMany({
      where: {
        cinemaId: updated.cinemaId,
        id: {
          not: updated.id,
        },
        status: StaffingRequestStatus.PENDING,
        type: updated.type,
      },
      data: {
        status: StaffingRequestStatus.CANCELLED,
      },
    });

    await this.prisma.staffingRequest.updateMany({
      where: {
        cinemaId: updated.cinemaId,
        id: {
          not: updated.id,
        },
        status: StaffingRequestStatus.PENDING,
        type: updated.type,
      },
      data: {
        status: StaffingRequestStatus.CANCELLED,
      },
    });

    this.emitUpdate(updated.cinemaId);

    return updated;
  }

  async reject(user: AuthUser, id: number) {
    const request = await this.findOneForUser(user, id);

    if (request.status !== StaffingRequestStatus.PENDING) {
      throw new BadRequestException('Staffing request er ikke længere åben');
    }

    if (
      user.role === 'EMPLOYEE' &&
      request.targetUserId &&
      request.targetUserId !== user.sub
    ) {
      throw new ForbiddenException('Du kan ikke afvise denne request');
    }

    const updated = await this.prisma.staffingRequest.update({
      where: { id },
      data: {
        status: StaffingRequestStatus.REJECTED,
        rejectedAt: new Date(),
      },
      include: {
        cinema: true,
        shift: {
          include: {
            user: true,
            workType: true,
          },
        },
        requestedByUser: true,
        targetUser: true,
      },
    });

    this.emitUpdate(updated.cinemaId);

    return updated;
  }

  async cancel(user: AuthUser, id: number) {
    if (!this.canManageStaffing(user)) {
      throw new ForbiddenException('Du må ikke annullere staffing requests');
    }

    const request = await this.findOneForUser(user, id);

    if (request.status !== StaffingRequestStatus.PENDING) {
      throw new BadRequestException('Kun åbne requests kan annulleres');
    }

    const updated = await this.prisma.staffingRequest.update({
      where: { id },
      data: {
        status: StaffingRequestStatus.CANCELLED,
      },
      include: {
        cinema: true,
        shift: {
          include: {
            user: true,
            workType: true,
          },
        },
        requestedByUser: true,
        targetUser: true,
      },
    });

    this.emitUpdate(updated.cinemaId);

    return updated;
  }

  async createAiEmergencyRequests(params: {
    cinemaId: number;
    requestedByUserId: number;
    startTime: Date;
    endTime: Date;
    shiftId?: number;
    message?: string;
    limit?: number;
  }) {
    const candidates = await this.staffingAiService.getTopEmergencyCandidates(
      params.cinemaId,
      params.startTime,
      params.endTime,
      params.limit ?? 5,
    );

    const createdRequests: any[] = [];

    for (const candidate of candidates) {
      const request = await this.prisma.staffingRequest.create({
        data: {
          cinemaId: params.cinemaId,
          requestedByUserId: params.requestedByUserId,
          targetUserId: candidate.userId,
          shiftId: params.shiftId,
          type: 'EMERGENCY',
          status: 'PENDING',
          priority: Math.max(1, Math.round(candidate.totalScore)),
          aiGenerated: true,
          message: params.message || '🚨 AI detected emergency staffing need.',
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

      await this.prisma.notification.create({
        data: {
          cinemaId: params.cinemaId,
          userId: candidate.userId,
          title: 'Emergency staffing request',
          message:
            params.message || '🚨 Der er akut behov for ekstra bemanding.',
          type: 'STAFFING_REQUEST',
          linkUrl: '/staffing-requests',
        },
      });
    }

    this.realtimeGateway.notifyStaffingRequestsUpdated(params.cinemaId);

    return createdRequests;
  }

  private async findOneForUser(user: AuthUser, id: number) {
    const request = await this.prisma.staffingRequest.findFirst({
      where: {
        id,
        ...this.getCinemaFilter(user),
      },
    });

    if (!request) {
      throw new NotFoundException('Staffing request blev ikke fundet');
    }

    return request;
  }

  private async createNotificationForRequest(requestId: number) {
    const request = await this.prisma.staffingRequest.findUnique({
      where: { id: requestId },
      include: {
        targetUser: true,
        requestedByUser: true,
      },
    });

    if (!request || !request.targetUserId) return;

    await this.prisma.notification.create({
      data: {
        cinemaId: request.cinemaId,
        userId: request.targetUserId,
        title: 'Ny staffing request',
        message:
          request.message ||
          'Der er brug for ekstra bemanding. Kan du tage en vagt?',
        type: 'STAFFING_REQUEST',
        linkUrl: '/my-shifts',
      },
    });
  }
}
