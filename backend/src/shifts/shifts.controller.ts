import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import {
  parseOptionalPositiveIntegerQuery,
  parseRequiredPositiveInteger,
} from '../common/query-validation';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { ShiftsService } from './shifts.service';

@Controller('shifts')
export class ShiftsController {
  constructor(
    private readonly shiftsService: ShiftsService,
  ) {}

  @UseGuards(JwtGuard)
  @Get('month-overview')
  getShiftMonthOverview(
    @Req() req: any,
    @Query('year') year: string,
    @Query('month') month: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftsService.findMonthOverview(
      req.user,
      parseRequiredPositiveInteger(year, 'År skal være et gyldigt tal'),
      parseRequiredPositiveInteger(month, 'Måned skal være et gyldigt tal'),
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }
  @UseGuards(JwtGuard)
  @Get('planning-replacement-preview')
  previewPlanningShiftReplacement(
    @Req() req: any,
    @Query('draftId') draftId?: string,
    @Query('scope') scope?: string,
    @Query('date') date?: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftsService.previewPlanningShiftReplacement(
      req.user,
      parseRequiredPositiveInteger(
        draftId ?? '',
        'Kladde skal være et gyldigt ID',
      ),
      scope,
      date,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Post('planning-replacement')
  replacePlanningShifts(
    @Req() req: any,
    @Body() body: unknown,
    @Query('cinemaId') cinemaId?: string,
  ) {
    const input =
      body && typeof body === 'object' && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : {};

    return this.shiftsService.replacePlanningShifts(
      req.user,
      {
        draftId: parseRequiredPositiveInteger(
          String(input.draftId ?? ''),
          'Kladde skal være et gyldigt ID',
        ),
        scope: input.scope,
        dateKey: input.date,
        confirmationText: input.confirmationText,
      },
      parseOptionalPositiveIntegerQuery(
        input.cinemaId ?? cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @UseGuards(JwtGuard)
  @Get('planning-removal-preview')
  previewPlanningShiftRemoval(
    @Req() req: any,
    @Query('scope') scope?: string,
    @Query('date') date?: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftsService.previewPlanningShiftRemoval(
      req.user,
      scope,
      date,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Post('planning-removal')
  removePlanningShifts(
    @Req() req: any,
    @Body() body: unknown,
    @Query('cinemaId') cinemaId?: string,
  ) {
    const input =
      body && typeof body === 'object' && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : {};
    return this.shiftsService.removePlanningShifts(
      req.user,
      {
        scope: input.scope,
        dateKey: input.date,
        confirmationText: input.confirmationText,
      },
      parseOptionalPositiveIntegerQuery(
        input.cinemaId ?? cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @UseGuards(JwtGuard)
  @Get()
  getAllShifts(
    @Req() req: any,
    @Query('date') date?: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftsService.findAll(
      req.user,
      date,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Post()
  createShift(
    @Req() req: any,
    @Body() body: CreateShiftDto,
  ) {
    return this.shiftsService.createShift(
      req.user,
      body,
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Patch(':id')
  updateShift(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: UpdateShiftDto,
  ) {
    return this.shiftsService.updateShift(
      req.user,
      parseRequiredPositiveInteger(
        id,
        'Vagt skal være et gyldigt ID',
      ),
      body,
    );
  }

  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN', 'MASTER')
  @Delete(':id')
  deleteShift(
    @Req() req: any,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftsService.deleteShift(
      req.user,
      parseRequiredPositiveInteger(
        id,
        'Vagt skal være et gyldigt ID',
      ),
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }


  @UseGuards(JwtGuard)
  @Get('range')
  getShiftRange(
    @Req() req: any,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftsService.findRange(
      req.user,
      startDate,
      endDate,
      parseOptionalPositiveIntegerQuery(
        cinemaId,
        'Biograf skal være et gyldigt ID',
      ),
    );
  }
}
