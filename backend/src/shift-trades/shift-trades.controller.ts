import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
  getPoolCount(@Req() req: any) {
    return this.shiftTradesService.getPoolCount(
      req.user.cinemaId,
      req.user.sub,
    );
  }

  @Get('direct-count')
  getDirectCount(@Req() req: any) {
    return this.shiftTradesService.getDirectCount(
      req.user.cinemaId,
      req.user.sub,
    );
  }

  @Get()
  findAll(@Req() req: any) {
    return this.shiftTradesService.findAll(req.user);
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
