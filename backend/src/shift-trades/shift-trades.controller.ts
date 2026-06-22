import {
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
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { ShiftTradesService } from './shift-trades.service';
import { ShiftTradeType } from '@prisma/client';

@Controller('shift-trades')
@UseGuards(JwtGuard)
export class ShiftTradesController {
  constructor(private shiftTradesService: ShiftTradesService) {}

  @Get('pool-count')
  getPoolCount(@Req() req: any, @Query('cinemaId') cinemaId?: string) {
    const selectedCinemaId = cinemaId ? Number(cinemaId) : undefined;

    return this.shiftTradesService.getPoolCount(
      req.user,
      req.user.sub,
      selectedCinemaId,
    );
  }

  @Get('direct-count')
  getDirectCount(@Req() req: any, @Query('cinemaId') cinemaId?: string) {
    const selectedCinemaId = cinemaId ? Number(cinemaId) : undefined;

    return this.shiftTradesService.getDirectCount(
      req.user,
      req.user.sub,
      selectedCinemaId,
    );
  }

  @Get()
  findAll(@Req() req: any, @Query('cinemaId') cinemaId?: string) {
    const selectedCinemaId = cinemaId ? Number(cinemaId) : undefined;

    return this.shiftTradesService.findAll(req.user, selectedCinemaId);
  }

  @Post()
  create(@Req() req: any, @Body() body: any) {
    return this.shiftTradesService.create({
      shiftId: Number(body.shiftId),
      offeredByUserId: req.user.sub,
      cinemaId: req.user.cinemaId,
      type: body.type ?? ShiftTradeType.POOL,
      targetUserId: body.targetUserId ? Number(body.targetUserId) : undefined,
      message: body.message,
    });
  }

  @Patch(':id/accept')
  acceptTrade(@Req() req: any, @Param('id') id: string) {
    return this.shiftTradesService.acceptTrade(Number(id), req.user.sub);
  }

  @Patch(':id/reject')
  rejectTrade(@Req() req: any, @Param('id') id: string) {
    return this.shiftTradesService.rejectTrade(Number(id), req.user.sub);
  }

  @Patch(':id/cancel')
  cancelTrade(@Req() req: any, @Param('id') id: string) {
    return this.shiftTradesService.cancelTrade(Number(id), req.user.sub);
  }
}
