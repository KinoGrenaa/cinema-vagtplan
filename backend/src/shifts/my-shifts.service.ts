import {
  Injectable,
} from '@nestjs/common';

import {
  PrismaService,
} from '../prisma/prisma.service';
import {
  findMyShiftsForMonth,
} from './helpers/my-shifts-month';
import {
  findMyShiftsStaticData,
} from './helpers/my-shifts-static-data';
import {
  type AuthUser,
  resolveShiftCinemaId,
} from './helpers/shift-service-helpers';
import {
  ensureShiftActorHasCinemaAccess,
} from './helpers/shift-user-access';

@Injectable()
export class MyShiftsService {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  private async resolveCinema(
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

    return cinemaId;
  }

  async findMonth(
    user: AuthUser,
    selectedCinemaId:
      number | null | undefined,
    options: {
      month: unknown;
      targetId?: number;
    },
  ) {
    const cinemaId =
      await this.resolveCinema(
        user,
        selectedCinemaId,
      );

    return findMyShiftsForMonth(
      this.prisma,
      {
        userId: user.sub,
        cinemaId,
        month: options.month,
        targetId:
          options.targetId,
      },
    );
  }

  async findStaticData(
    user: AuthUser,
    selectedCinemaId:
      number | null | undefined,
  ) {
    const cinemaId =
      await this.resolveCinema(
        user,
        selectedCinemaId,
      );

    return findMyShiftsStaticData(
      this.prisma,
      {
        userId: user.sub,
        cinemaId,
      },
    );
  }
}
