import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ShiftTradeType,
} from '@prisma/client';

import {
  JwtGuard,
} from '../auth/jwt/jwt.guard';
import {
  parseOptionalPositiveIntegerQuery,
} from '../common/query-validation';
import {
  ShiftTradeOpenPageService,
} from './shift-trade-open-page.service';

function parseOpenShiftTradeType(
  value: unknown,
) {
  if (
    value ===
      ShiftTradeType.DIRECT ||
    value ===
      ShiftTradeType.POOL
  ) {
    return value;
  }

  throw new BadRequestException(
    'Vagtbyttetype skal være DIRECT eller POOL',
  );
}

@Controller('shift-trades')
@UseGuards(JwtGuard)
export class ShiftTradeOpenPageController {
  constructor(
    private readonly service:
      ShiftTradeOpenPageService,
  ) {}

  @Get('open-page')
  findPage(
    @Req() req: any,
    @Query('type')
    type?: string,
    @Query('cinemaId')
    cinemaId?: string,
    @Query('limit')
    limit?: string,
    @Query('beforeId')
    beforeId?: string,
  ) {
    return this.service.findPage(
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
      {
        type:
          parseOpenShiftTradeType(
            type,
          ),
        limit:
          parseOptionalPositiveIntegerQuery(
            limit,
            'Antal vagtbytter skal være et gyldigt tal',
          ),
        beforeId:
          parseOptionalPositiveIntegerQuery(
            beforeId,
            'Vagtbyttecursor skal være et gyldigt ID',
          ),
      },
    );
  }
}
