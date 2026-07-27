import {
  Injectable,
} from '@nestjs/common';

import {
  PrismaService,
} from '../prisma/prisma.service';
import {
  resolveShiftTradeActorUserId,
} from './helpers/shift-trade-accept-validation';
import {
  findMyShiftTradeOverview,
} from './helpers/my-shift-trade-overview';
import {
  resolveShiftTradeCinemaId,
} from './helpers/shift-trade-service-helpers';

@Injectable()
export class MyShiftTradeOverviewService {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  findOverview(
    user: any,
    selectedCinemaId:
      number | null | undefined,
    month: unknown,
  ) {
    const cinemaId =
      resolveShiftTradeCinemaId(
        user,
        selectedCinemaId,
      );
    const userId =
      resolveShiftTradeActorUserId(
        user,
      );

    return findMyShiftTradeOverview(
      this.prisma,
      {
        userId,
        cinemaId,
        month,
      },
    );
  }
}
