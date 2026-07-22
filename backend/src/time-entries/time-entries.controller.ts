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
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import {
  parseOptionalPositiveIntegerQuery,
  parseRequiredPositiveInteger,
} from '../common/query-validation';
import { ManualTimeEntryDto } from './dto/manual-time-entry.dto';
import { RejectTimeEntryDto } from './dto/reject-time-entry.dto';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto';
import { TimeEntriesService } from './time-entries.service';

function parseOptionalBodyId(
  value: unknown,
  message: string,
) {
  if (value === undefined || value === null) {
    return undefined;
  }

  return parseRequiredPositiveInteger(
    value,
    message,
  );
}

function parseNullableBodyId(
  value: unknown,
  message: string,
) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return parseRequiredPositiveInteger(
    value,
    message,
  );
}

function parseOptionalBoolean(
  value: unknown,
  message: string,
) {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw new BadRequestException(message);
  }

  return value;
}

@Controller('time-entries')
export class TimeEntriesController {
  constructor(
    private timeEntriesService: TimeEntriesService,
  ) {}

  @UseGuards(JwtGuard)
  @Get('me')
  getMyEntries(@Req() req: any) {
    return this.timeEntriesService.findForUser(
      req.user.sub,
      req.user,
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Get()
  getEntries(
    @Req() req: any,
    @Query('userId') userId?: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    const selectedCinemaId =
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      );

    if (userId !== undefined) {
      return this.timeEntriesService.findForUser(
        parseRequiredPositiveInteger(
          userId,
          'Bruger skal være et gyldigt ID',
        ),
        req.user,
        selectedCinemaId,
      );
    }

    return this.timeEntriesService.findAll(
      req.user,
      selectedCinemaId,
    );
  }

  @UseGuards(JwtGuard)
  @Get('open')
  getOpenEntry(
    @Req() req: any,
    @Query('userId') userId?: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.timeEntriesService.findOpenEntry(
      req.user,
      parseOptionalPositiveIntegerQuery(
        userId,
        'Bruger skal være et gyldigt ID',
      ),
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @UseGuards(JwtGuard)
  @Post('manual')
  submitManualEntry(
    @Req() req: any,
    @Body() body: ManualTimeEntryDto,
  ) {
    return this.timeEntriesService.submitManualEntry(
      req.user,
      body,
    );
  }

  @UseGuards(JwtGuard)
  @Post('clock-in')
  clockIn(
    @Req() req: any,
    @Body()
    body: {
      userId?: number;
      cinemaId?: number;
      shiftId?: number | null;
      clockIn?: string;
      note?: string;
      clockInNote?: string;
    },
  ) {
    return this.timeEntriesService.clockIn(
      req.user,
      {
        ...body,
        userId: parseOptionalBodyId(
          body?.userId,
          'Bruger skal være et gyldigt ID',
        ),
        cinemaId: parseOptionalBodyId(
          body?.cinemaId,
          'Biograf skal være et gyldigt ID',
        ),
        shiftId: parseNullableBodyId(
          body?.shiftId,
          'Vagt skal være et gyldigt ID',
        ),
      },
    );
  }

  @UseGuards(JwtGuard)
  @Patch(':id/clock-out')
  clockOut(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      clockOut?: string;
      note?: string;
      clockOutNote?: string;
    },
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.timeEntriesService.clockOut(
      req.user,
      parseRequiredPositiveInteger(
        id,
        'Tidsregistrering skal være et gyldigt ID',
      ),
      body,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Patch(':id/approve')
  approveEntry(
    @Req() req: any,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
    @Body()
    body?: {
      confirmPayrollAdjustment?: boolean;
    },
  ) {
    return this.timeEntriesService.approveEntry(
      parseRequiredPositiveInteger(
        id,
        'Tidsregistrering skal være et gyldigt ID',
      ),
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
      parseOptionalBoolean(
        body?.confirmPayrollAdjustment,
        'Bekræftelse af lønregulering skal være sand eller falsk',
      ) ?? false,
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Patch(':id/unapprove')
  unapproveEntry(
    @Req() req: any,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
    @Body()
    body?: {
      confirmPayrollAdjustment?: boolean;
    },
  ) {
    return this.timeEntriesService.unapproveEntry(
      parseRequiredPositiveInteger(
        id,
        'Tidsregistrering skal være et gyldigt ID',
      ),
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
      parseOptionalBoolean(
        body?.confirmPayrollAdjustment,
        'Bekræftelse af lønregulering skal være sand eller falsk',
      ) ?? false,
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Patch(':id/reject')
  rejectEntry(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: RejectTimeEntryDto,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.timeEntriesService.rejectEntry(
      parseRequiredPositiveInteger(
        id,
        'Tidsregistrering skal være et gyldigt ID',
      ),
      body.adminNote,
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Patch(':id/void')
  voidEntry(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: RejectTimeEntryDto & {
      confirmPayrollAdjustment?: boolean;
    },
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.timeEntriesService.voidEntry(
      parseRequiredPositiveInteger(
        id,
        'Tidsregistrering skal være et gyldigt ID',
      ),
      body.adminNote,
      req.user,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
      parseOptionalBoolean(
        body.confirmPayrollAdjustment,
        'Bekræftelse af lønregulering skal være sand eller falsk',
      ) ?? false,
    );
  }

  @UseGuards(JwtGuard)
  @Patch('me/:id')
  updateMyEntry(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      clockIn: string;
      clockOut?: string | null;
      note?: string | null;
    },
  ) {
    return this.timeEntriesService.updateOwnEntry(
      req.user,
      parseRequiredPositiveInteger(
        id,
        'Tidsregistrering skal være et gyldigt ID',
      ),
      body,
    );
  }

  @UseGuards(JwtGuard)
  @Get(':id/revisions')
  getEntryRevisions(
    @Req() req: any,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.timeEntriesService.findRevisionsForEntry(
      req.user,
      parseRequiredPositiveInteger(
        id,
        'Tidsregistrering skal være et gyldigt ID',
      ),
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Patch(':id')
  updateEntry(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: UpdateTimeEntryDto,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.timeEntriesService.updateEntry(
      req.user,
      parseRequiredPositiveInteger(
        id,
        'Tidsregistrering skal være et gyldigt ID',
      ),
      body,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }
}
