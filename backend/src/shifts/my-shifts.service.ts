import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  findMyShiftsForMonth,
} from './helpers/my-shifts-month';
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
    private readonly prisma: PrismaService,
  ) {}

  async findMonth(
    user: AuthUser,
    selectedCinemaId: number | null | undefined,
    options: {
      month: unknown;
      targetId?: number;
    },
  ) {
    const cinemaId = resolveShiftCinemaId(
      user,
      selectedCinemaId,
    );

    await ensureShiftActorHasCinemaAccess(
      this.prisma,
      user,
      cinemaId,
    );

    return findMyShiftsForMonth(
      this.prisma,
      {
        userId: user.sub,
        cinemaId,
        month: options.month,
        targetId: options.targetId,
      },
    );
  }
}
