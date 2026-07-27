import {
  Injectable,
} from '@nestjs/common';

import {
  PrismaService,
} from '../prisma/prisma.service';
import {
  findScheduleStaticData,
} from './helpers/schedule-static-data';
import {
  type AuthUser,
  resolveShiftCinemaId,
} from './helpers/shift-service-helpers';
import {
  ensureShiftActorHasCinemaAccess,
} from './helpers/shift-user-access';

@Injectable()
export class ScheduleStaticDataService {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  async findData(
    user: AuthUser,
    selectedCinemaId:
      number | null | undefined,
  ) {
    const cinemaId =
      resolveShiftCinemaId(
        user,
        selectedCinemaId,
      );

    await ensureShiftActorHasCinemaAccess(
      this.prisma,
      user,
      cinemaId,
    );

    return findScheduleStaticData(
      this.prisma,
      cinemaId,
    );
  }
}
