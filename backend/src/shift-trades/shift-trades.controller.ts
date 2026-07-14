import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ShiftTradeType } from '@prisma/client';

import { JwtGuard } from '../auth/jwt/jwt.guard';
import { ShiftTradesService } from './shift-trades.service';

@Controller('shift-trades')
@UseGuards(JwtGuard)
export class ShiftTradesController {
  constructor(
    private shiftTradesService: ShiftTradesService,
  ) {}

  private parseRequiredId(value: unknown, label: string) {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException(
        `${label} skal være et gyldigt ID`,
      );
    }

    return parsed;
  }

  private parseOptionalId(value: unknown, label: string) {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return undefined;
    }

    return this.parseRequiredId(value, label);
  }

  @Get('pool-count')
  getPoolCount(
    @Req() req: any,
    @Query('cinemaId') cinemaId?: string,
  ) {
    const selectedCinemaId = this.parseOptionalId(
      cinemaId,
      'Biograf',
    );

    return this.shiftTradesService.getPoolCount(
      req.user,
      req.user.sub,
      selectedCinemaId,
    );
  }

  @Get('direct-count')
  getDirectCount(
    @Req() req: any,
    @Query('cinemaId') cinemaId?: string,
  ) {
    const selectedCinemaId = this.parseOptionalId(
      cinemaId,
      'Biograf',
    );

    return this.shiftTradesService.getDirectCount(
      req.user,
      req.user.sub,
      selectedCinemaId,
    );
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('cinemaId') cinemaId?: string,
  ) {
    const selectedCinemaId = this.parseOptionalId(
      cinemaId,
      'Biograf',
    );

    return this.shiftTradesService.findAll(
      req.user,
      selectedCinemaId,
    );
  }

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.shiftTradesService.create({
      shiftId: this.parseRequiredId(body.shiftId, 'Vagt'),
      offeredByUserId: req.user.sub,
      cinemaId: req.user.cinemaId,
      type: body.type ?? ShiftTradeType.POOL,
      targetUserId: this.parseOptionalId(
        body.targetUserId,
        'Modtager',
      ),
      message: body.message,
    });
  }

  @Patch(':id/accept')
  acceptTrade(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const tradeId = this.parseRequiredId(
      id,
      'Vagtbytte',
    );

    return this.shiftTradesService.acceptTrade(
      tradeId,
      req.user,
    );
  }

  @Patch(':id/reject')
  rejectTrade(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const tradeId = this.parseRequiredId(
      id,
      'Vagtbytte',
    );

    return this.shiftTradesService.rejectTrade(
      tradeId,
      req.user,
    );
  }

  @Patch(':id/cancel')
  cancelTrade(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const tradeId = this.parseRequiredId(
      id,
      'Vagtbytte',
    );

    return this.shiftTradesService.cancelTrade(
      tradeId,
      req.user.sub,
    );
  }
}
