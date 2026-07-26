import {
  Injectable,
} from '@nestjs/common';

import {
  PrismaService,
} from '../prisma/prisma.service';
import {
  RealtimeGateway,
} from '../realtime/realtime.gateway';
import {
  StaffingAiService,
} from '../staffing-ai/staffing-ai.service';
import {
  createAiEmergencyStaffingRequests,
} from './helpers/staffing-request-ai-flow';
import {
  createStaffingRequest,
} from './helpers/staffing-request-create-flow';
import {
  AuthUser,
  CreateStaffingRequestInput,
} from './helpers/staffing-request-helpers';
import {
  type StaffingRequestPageOptions,
} from './helpers/staffing-request-page';
import {
  findAllStaffingRequests,
  findMineStaffingRequests,
  findStaffingRequestsPage,
} from './helpers/staffing-request-read-flow';
import {
  acceptStaffingRequest,
  cancelStaffingRequest,
  rejectStaffingRequest,
} from './helpers/staffing-request-status-flow';

@Injectable()
export class StaffingRequestsService {
  constructor(
    private readonly prisma:
      PrismaService,
    private readonly realtimeGateway:
      RealtimeGateway,
    private readonly staffingAiService:
      StaffingAiService,
  ) {}

  async findAll(
    user: AuthUser,
    selectedCinemaId?:
      number | null,
  ) {
    return findAllStaffingRequests(
      this.prisma,
      user,
      selectedCinemaId,
    );
  }

  async findPage(
    user: AuthUser,
    selectedCinemaId:
      number | null | undefined,
    options:
      StaffingRequestPageOptions = {},
  ) {
    return findStaffingRequestsPage(
      this.prisma,
      user,
      selectedCinemaId,
      options,
    );
  }

  async findMine(
    user: AuthUser,
    selectedCinemaId?:
      number | null,
  ) {
    return findMineStaffingRequests(
      this.prisma,
      user,
      selectedCinemaId,
    );
  }

  async create(
    user: AuthUser,
    dto:
      CreateStaffingRequestInput,
  ) {
    return createStaffingRequest({
      prisma: this.prisma,
      realtimeGateway:
        this.realtimeGateway,
      user,
      dto,
    });
  }

  async accept(
    user: AuthUser,
    id: number,
    selectedCinemaId?:
      number | null,
  ) {
    return acceptStaffingRequest({
      prisma: this.prisma,
      realtimeGateway:
        this.realtimeGateway,
      user,
      id,
      selectedCinemaId,
    });
  }

  async reject(
    user: AuthUser,
    id: number,
    selectedCinemaId?:
      number | null,
  ) {
    return rejectStaffingRequest({
      prisma: this.prisma,
      realtimeGateway:
        this.realtimeGateway,
      user,
      id,
      selectedCinemaId,
    });
  }

  async cancel(
    user: AuthUser,
    id: number,
    selectedCinemaId?:
      number | null,
  ) {
    return cancelStaffingRequest({
      prisma: this.prisma,
      realtimeGateway:
        this.realtimeGateway,
      user,
      id,
      selectedCinemaId,
    });
  }

  async createAiEmergencyRequests(
    params: {
      cinemaId: number;
      requestedByUserId:
        number;
      startTime: Date;
      endTime: Date;
      shiftId?: number;
      message?: string;
      limit?: number;
    },
  ) {
    return createAiEmergencyStaffingRequests({
      prisma: this.prisma,
      realtimeGateway:
        this.realtimeGateway,
      staffingAiService:
        this.staffingAiService,
      params,
    });
  }
}
