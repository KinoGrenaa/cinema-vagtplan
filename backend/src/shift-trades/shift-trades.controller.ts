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
import {
  parseOptionalPositiveIntegerQuery,
  parseRequiredPositiveInteger,
} from '../common/query-validation';
import { ShiftTradesService } from './shift-trades.service';

function parseOptionalBodyId(
  value: unknown,
  message: string,
) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return undefined;
  }

  return parseRequiredPositiveInteger(
    value,
    message,
  );
}

@Controller('shift-trades')
@UseGuards(JwtGuard)
export class ShiftTradesController {
  constructor(
    private readonly shiftTradesService: ShiftTradesService,
  ) {}

  @Get('notification-overview')
  getNotificationOverview(
    @Req() req: any,
    @Query('cinemaId')
    cinemaId?: string,
  ) {
    return this.shiftTradesService.getNotificationOverview(
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @Get('pool-count')
  getPoolCount(
    @Req() req: any,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftTradesService.getPoolCount(
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @Get('direct-count')
  getDirectCount(
    @Req() req: any,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftTradesService.getDirectCount(
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @Get()
  findAll(
    @Req() req: any,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftTradesService.findAll(
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
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
        shiftId:
          parseRequiredPositiveInteger(
            body?.shiftId,
            'Vagt skal være et gyldigt ID',
          ),
        type: body?.type,
        targetUserId: parseOptionalBodyId(
          body?.targetUserId,
          'Modtager skal være et gyldigt ID',
        ),
        message: body?.message,
      },
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @Patch(':id/accept')
  acceptTrade(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.shiftTradesService.acceptTrade(
      parseRequiredPositiveInteger(
        id,
        'Vagtbytte skal være et gyldigt ID',
      ),
      req.user,
    );
  }

  @Patch(':id/reject')
  rejectTrade(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.shiftTradesService.rejectTrade(
      parseRequiredPositiveInteger(
        id,
        'Vagtbytte skal være et gyldigt ID',
      ),
      req.user,
    );
  }

  @Patch(':id/cancel')
  cancelTrade(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.shiftTradesService.cancelTrade(
      parseRequiredPositiveInteger(
        id,
        'Vagtbytte skal være et gyldigt ID',
      ),
      req.user,
    );
  }
}
