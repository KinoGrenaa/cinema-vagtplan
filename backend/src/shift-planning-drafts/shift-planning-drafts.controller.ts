import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import {
  parseOptionalPositiveIntegerQuery,
  parseRequiredIntegerInRange,
  parseRequiredPositiveInteger,
} from '../common/query-validation';
import { ShiftPlanningDraftsService } from './shift-planning-drafts.service';

type PrepareMonthBody = {
  year?: unknown;
  month?: unknown;
  cinemaId?: unknown;
  note?: string | null;
};

function parseYear(value: unknown) {
  return parseRequiredIntegerInRange(
    value,
    2000,
    2100,
    'År skal være mellem 2000 og 2100.',
  );
}

function parseMonth(value: unknown) {
  return parseRequiredIntegerInRange(
    value,
    1,
    12,
    'Måned skal være et tal fra 1 til 12.',
  );
}

function parseOptionalCinemaId(value: unknown) {
  return parseOptionalPositiveIntegerQuery(
    value,
    'Biograf skal være et gyldigt ID.',
  );
}

function parseOptionalCinemaIdAsString(value: unknown) {
  const cinemaId = parseOptionalCinemaId(value);
  return cinemaId === undefined ? undefined : String(cinemaId);
}

function normalizePrepareBody(body: unknown): PrepareMonthBody {
  if (body === undefined || body === null) {
    return {};
  }

  if (typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException(
      'Forhåndsvisningen skal have et gyldigt input.',
    );
  }

  const input = body as Record<string, unknown>;

  if (
    input.note !== undefined &&
    input.note !== null &&
    typeof input.note !== 'string'
  ) {
    throw new BadRequestException(
      'Intern note skal være tekst eller tom.',
    );
  }

  return input as PrepareMonthBody;
}

@Controller('shift-planning-drafts')
export class ShiftPlanningDraftsController {
  constructor(
    private shiftPlanningDraftsService: ShiftPlanningDraftsService,
  ) {}

  @UseGuards(JwtGuard)
  @Get()
  findMonth(
    @Req() req: any,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftPlanningDraftsService.findMonth(
      req.user,
      String(parseYear(year)),
      String(parseMonth(month)),
      parseOptionalCinemaIdAsString(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Post('prepare')
  prepareMonth(
    @Req() req: any,
    @Body() body: unknown,
    @Query('year') year?: string,
    @Query('month') month?: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    const normalizedBody = normalizePrepareBody(body);
    const selectedYear = normalizedBody.year ?? year;
    const selectedMonth = normalizedBody.month ?? month;
    const selectedCinemaId = normalizedBody.cinemaId ?? cinemaId;

    return this.shiftPlanningDraftsService.prepareMonth(req.user, {
      ...normalizedBody,
      year: parseYear(selectedYear),
      month: parseMonth(selectedMonth),
      cinemaId: parseOptionalCinemaId(selectedCinemaId),
    });
  }

  @UseGuards(JwtGuard)
  @Get(':id/validate')
  validateDraft(
    @Req() req: any,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftPlanningDraftsService.validateDraft(
      req.user,
      parseRequiredPositiveInteger(
        id,
        'Planlægningskladde skal være et gyldigt ID.',
      ),
      parseOptionalCinemaIdAsString(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Delete(':id')
  deleteDraft(
    @Req() req: any,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftPlanningDraftsService.deleteDraft(
      req.user,
      parseRequiredPositiveInteger(
        id,
        'Forhåndsvisning skal være et gyldigt ID.',
      ),
      parseOptionalCinemaIdAsString(cinemaId),
    );
  }

  @UseGuards(JwtGuard)
  @Get(':id')
  findOne(
    @Req() req: any,
    @Param('id') id: string,
    @Query('cinemaId') cinemaId?: string,
  ) {
    return this.shiftPlanningDraftsService.findOne(
      req.user,
      parseRequiredPositiveInteger(
        id,
        'Planlægningskladde skal være et gyldigt ID.',
      ),
      parseOptionalCinemaIdAsString(cinemaId),
    );
  }
}
