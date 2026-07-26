import {
  Injectable,
} from '@nestjs/common';
import {
  ShiftTradeType,
} from '@prisma/client';

import {
  PrismaService,
} from '../prisma/prisma.service';
import {
  resolveShiftTradeActorUserId,
} from './helpers/shift-trade-accept-validation';
import {
  findOpenShiftTradePage,
} from './helpers/shift-trade-page';
import {
  resolveShiftTradeCinemaId,
} from './helpers/shift-trade-service-helpers';

@Injectable()
export class ShiftTradeOpenPageService {
  constructor(
    private readonly prisma:
      PrismaService,
  ) {}

  findPage(
    user: any,
    selectedCinemaId:
      number | null | undefined,
    options: {
      type: ShiftTradeType;
      limit?: number;
      beforeId?: number;
    },
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

    return findOpenShiftTradePage(
      this.prisma,
      userId,
      cinemaId,
      options,
    );
  }
}
