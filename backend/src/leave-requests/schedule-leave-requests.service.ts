import {
  Injectable,
} from '@nestjs/common';

import {
  PrismaService,
} from '../prisma/prisma.service';
import {
  ensureLeaveActorCinemaAccess,
} from './helpers/leave-request-cinema-access';
import {
  findScheduleLeaveRequestsForDay,
} from './helpers/schedule-leave-request-read';
import {
  type AuthUser,
  resolveLeaveCinemaId,
} from './helpers/leave-request-service-helpers';
import {
  LeaveRequestExpiryService,
} from './leave-request-expiry.service';

@Injectable()
export class ScheduleLeaveRequestsService {
  constructor(
    private readonly prisma:
      PrismaService,
    private readonly expiryService:
      LeaveRequestExpiryService,
  ) {}

  async findForDay(
    user: AuthUser,
    selectedCinemaId:
      number | null | undefined,
    date: string,
  ) {
    const cinemaId =
      resolveLeaveCinemaId(
        user,
        selectedCinemaId,
      );

    await ensureLeaveActorCinemaAccess(
      this.prisma,
      user,
      cinemaId,
    );
    await this.expiryService.expirePendingLeaveRequests(
      {
        cinemaId,
      },
    );

    return findScheduleLeaveRequestsForDay(
      this.prisma,
      user,
      cinemaId,
      date,
    );
  }
}
