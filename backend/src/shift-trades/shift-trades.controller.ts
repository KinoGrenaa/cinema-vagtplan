import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ShiftTradesService } from './shift-trades.service';
import { JwtGuard } from '../auth/jwt/jwt.guard';

@Controller('shift-trades')
export class ShiftTradesController {
  constructor(private shiftTradesService: ShiftTradesService) {}

  @UseGuards(JwtGuard)
  @Get()
  getAllTrades() {
    return this.shiftTradesService.findAll();
  }

  @UseGuards(JwtGuard)
  @Post()
  createTrade(
    @Body()
    body: {
      shiftId: number;
      offeredByUserId: number;
      cinemaId: number;
      message?: string;
    },
  ) {
    return this.shiftTradesService.create(body);
  }

  @UseGuards(JwtGuard)
  @Patch(':id/accept')
  acceptTrade(
    @Param('id') id: string,
    @Body() body: { acceptedByUserId: number },
  ) {
    return this.shiftTradesService.acceptTrade(
      Number(id),
      body.acceptedByUserId,
    );
  }

  @UseGuards(JwtGuard)
  @Patch(':id/cancel')
  cancelTrade(@Param('id') id: string) {
    return this.shiftTradesService.cancelTrade(Number(id));
  }
}