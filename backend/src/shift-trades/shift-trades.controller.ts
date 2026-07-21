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
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { ShiftTradesService } from './shift-trades.service';

@Controller('shift-trades')
@UseGuards(JwtGuard)
export class ShiftTradesController {
  constructor(
    private readonly shiftTradesService: ShiftTradesService,
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
    return this.shiftTradesService.getPoolCount(
      req.user,
      this.parseOptionalId(cinemaId, 'Biograf'),
    );
  }

  @Get('direct-count')
  getDirectCount(
    @Req() req: any,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftTradesService.getDirectCount(
      req.user,
      this.parseOptionalId(cinemaId, 'Biograf'),
    );
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftTradesService.findAll(
      req.user,
      this.parseOptionalId(cinemaId, 'Biograf'),
    );
  }

  @Post()
  create(
    @Req() req: any,
    @Body() body: any,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftTradesService.create(
      req.user,
      {
        shiftId: this.parseRequiredId(
          body?.shiftId,
          'Vagt',
        ),
        type: body?.type,
        targetUserId: this.parseOptionalId(
          body?.targetUserId,
          'Modtager',
        ),
        message: body?.message,
      },
      this.parseOptionalId(cinemaId, 'Biograf'),
    );
  }

  @Patch(':id/accept')
  acceptTrade(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.shiftTradesService.acceptTrade(
      this.parseRequiredId(id, 'Vagtbytte'),
      req.user,
    );
  }

  @Patch(':id/reject')
  rejectTrade(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.shiftTradesService.rejectTrade(
      this.parseRequiredId(id, 'Vagtbytte'),
      req.user,
    );
  }

  @Patch(':id/cancel')
  cancelTrade(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.shiftTradesService.cancelTrade(
      this.parseRequiredId(id, 'Vagtbytte'),
      req.user,
    );
  }
}
